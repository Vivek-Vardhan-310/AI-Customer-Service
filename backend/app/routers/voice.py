from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect, Response, Form, Request, Depends
import base64
from io import BytesIO
import os
import asyncio
import logging
import json
import re
from urllib.parse import urlencode, urlparse, urlunparse, parse_qsl
from pydantic import BaseModel

try:
    from twilio.base.exceptions import TwilioRestException
    from twilio.rest import Client
    from twilio.twiml.voice_response import VoiceResponse as TwilioVoiceResponse
except ImportError as exc:  # pragma: no cover - runtime dependency guard
    TwilioRestException = Exception
    Client = None
    TwilioVoiceResponse = None
    TWILIO_IMPORT_ERROR = exc
else:
    TWILIO_IMPORT_ERROR = None

from ..dependencies import require_user
from ..schemas import VoiceChatRequest, VoiceChatResponse
from ..services.ai import groq_service, split_sentences

router = APIRouter(tags=["voice"])
logger = logging.getLogger("voice_ws")

VOICE_SYSTEM_PROMPT_BASE = (
    "You are a friendly, concise voice assistant for LaptopCare customer support. "
    "Keep responses short (1-3 sentences) since you are speaking out loud. "
    "Be helpful with laptop issues, warranty questions, and troubleshooting. "
    "Don't use markdown formatting, bullet points, or special characters — speak naturally."
)


def _build_voice_system_prompt(user_context=None):
    """Build a personalized voice system prompt with user context."""
    prompt = VOICE_SYSTEM_PROMPT_BASE

    if user_context:
        context_parts = ["\n\nCustomer Context:"]
        if user_context.get("name"):
            context_parts.append(f"Name: {user_context['name']}.")
        if user_context.get("email"):
            context_parts.append(f"Email: {user_context['email']}.")
        if user_context.get("phone"):
            context_parts.append(f"Phone: {user_context['phone']}.")

        products = user_context.get("products", [])
        if products:
            context_parts.append("Registered Products:")
            for i, prod in enumerate(products, 1):
                name = prod.get('name', 'Unknown')
                serial = prod.get('serial', 'N/A')
                warranty = prod.get('warranty', 'N/A')
                warranty_days = prod.get('warrantyDays', 'N/A')
                amc = prod.get('amc', 'N/A')
                amc_days = prod.get('amcDays', 'N/A')
                model = prod.get('model', '')
                context_parts.append(
                    f"  {i}. {name} (Model: {model}, Serial: {serial}), "
                    f"Warranty: {warranty} ({warranty_days} days left), "
                    f"AMC: {amc} ({amc_days} days left)"
                )

        prompt += " ".join(context_parts)

    return prompt


@router.post("/api/voice", response_model=VoiceChatResponse)
async def voice_chat(req: VoiceChatRequest):
    client = groq_service.get_client()
    if client is None:
        raise HTTPException(status_code=502, detail="Groq client not initialized")

    try:
        audio_bytes = base64.b64decode(req.audio_base64)
        
        audio_file_like = BytesIO(audio_bytes)
        extension = "webm"
        if req.mime_type:
            extension = req.mime_type.split(";")[0].split("/")[-1] or extension
        audio_file_like.name = f"audio.{extension}"

        transcript = client.audio.transcriptions.create(
            file=audio_file_like,
            model="whisper-large-v3"
        )
        user_text = transcript.text
        print(f"User (STT): {user_text}")

        completion = client.chat.completions.create(
            model=os.environ.get("GROQ_MODEL", "llama-3.3-70b-versatile"),
            messages=[{"role": "user", "content": user_text}],
            temperature=float(os.environ.get("GROQ_TEMPERATURE", "1")),
            max_completion_tokens=int(os.environ.get("GROQ_MAX_COMPLETION_TOKENS", "1024")),
            top_p=float(os.environ.get("GROQ_TOP_P", "1")),
            stream=False,
            stop=None
        )
        reply_text = groq_service.extract_reply(completion) or "I'm sorry, I couldn't generate a response at this time."
        print(f"Bot (Llama): {reply_text}")

        return VoiceChatResponse(transcript=user_text, reply_text=reply_text)

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Voice chat processing failed: {e}")

@router.websocket("/ws/voice")
async def voice_websocket(websocket: WebSocket):
    await websocket.accept()
    logger.info("Voice WebSocket connected")

    # Start with base system prompt; will be updated when user_context arrives
    conversation_history: list[dict] = [
        {"role": "system", "content": VOICE_SYSTEM_PROMPT_BASE}
    ]

    user_context_received = False
    abort_flag = False

    async def process_audio(audio_bytes: bytes):
        nonlocal abort_flag
        abort_flag = False

        client = groq_service.get_client()
        if client is None:
            await websocket.send_json({"type": "error", "message": "Groq client not initialized"})
            return

        # ── Step 1: Speech-to-Text via Groq Whisper ──────────────────────
        try:
            audio_file = BytesIO(audio_bytes)
            audio_file.name = "audio.webm"

            transcript_result = await asyncio.to_thread(
                client.audio.transcriptions.create,
                file=audio_file,
                model="whisper-large-v3-turbo",
            )
            user_text = (transcript_result.text or "").strip()
            logger.info(f"STT result: '{user_text}'")
        except Exception as e:
            logger.error(f"STT failed: {e}")
            await websocket.send_json({"type": "error", "message": f"STT failed: {e}"})
            return

        # ── Step 2: Validate transcript — skip if empty or too short ─────
        if not user_text or len(user_text) < 2:
            await websocket.send_json({"type": "no_speech"})
            return

        await websocket.send_json({"type": "transcript", "text": user_text})
        conversation_history.append({"role": "user", "content": user_text})

        # ── Step 3: Streaming LLM response ───────────────────────────────
        try:
            stream = await asyncio.to_thread(
                client.chat.completions.create,
                model=os.environ.get("GROQ_MODEL", "llama-3.3-70b-versatile"),
                messages=conversation_history,
                temperature=float(os.environ.get("GROQ_TEMPERATURE", "0.7")),
                max_completion_tokens=int(os.environ.get("GROQ_MAX_COMPLETION_TOKENS", "512")),
                top_p=float(os.environ.get("GROQ_TOP_P", "1")),
                stream=True,
            )
        except Exception as e:
            logger.error(f"LLM request failed: {e}")
            await websocket.send_json({"type": "error", "message": f"LLM failed: {e}"})
            return

        # ── Step 4: Stream tokens, buffer into sentences, send for TTS ───
        full_response = ""
        buffer = ""
        sentence_idx = 0

        try:
            for chunk in stream:
                if abort_flag:
                    logger.info("Abort flag set — stopping LLM stream")
                    break

                delta = chunk.choices[0].delta if chunk.choices else None
                if not delta or not delta.content:
                    continue

                token = delta.content
                full_response += token
                buffer += token

                try:
                    await websocket.send_json({"type": "llm_token", "token": token})
                except Exception:
                    break

                sentences, remainder = split_sentences(buffer)
                if sentences:
                    for sentence in sentences:
                        if abort_flag:
                            break
                        try:
                            await websocket.send_json({
                                "type": "tts_text",
                                "text": sentence,
                                "idx": sentence_idx,
                                "final": False
                            })
                            sentence_idx += 1
                        except Exception:
                            break
                    buffer = remainder

        except Exception as e:
            logger.error(f"LLM streaming error: {e}")

        # ── Step 5: Flush any remaining buffer as the final sentence ─────
        if buffer.strip() and not abort_flag:
            try:
                await websocket.send_json({
                    "type": "tts_text",
                    "text": buffer.strip(),
                    "idx": sentence_idx,
                    "final": True
                })
            except Exception:
                pass

        if full_response:
            conversation_history.append({"role": "assistant", "content": full_response})
            if len(conversation_history) > 21:
                conversation_history[1:] = conversation_history[-20:]

        if not abort_flag:
            try:
                await websocket.send_json({"type": "turn_complete"})
            except Exception:
                pass

    current_task: asyncio.Task | None = None

    try:
        while True:
            message = await websocket.receive()

            if message.get("type") == "websocket.disconnect":
                break

            if "bytes" in message and message["bytes"]:
                audio_data = message["bytes"]
                logger.info(f"Received audio: {len(audio_data)} bytes")

                if current_task and not current_task.done():
                    abort_flag = True
                    current_task.cancel()
                    try:
                        await current_task
                    except (asyncio.CancelledError, Exception):
                        pass

                current_task = asyncio.create_task(process_audio(audio_data))

            elif "text" in message and message["text"]:
                try:
                    data = json.loads(message["text"])
                except json.JSONDecodeError:
                    continue

                if data.get("type") == "abort":
                    logger.info("Abort received — barge-in")
                    abort_flag = True
                    if current_task and not current_task.done():
                        current_task.cancel()
                        try:
                            await current_task
                        except (asyncio.CancelledError, Exception):
                            pass

                elif data.get("type") == "user_context" and not user_context_received:
                    # Update the system prompt with user context
                    user_context_received = True
                    user_ctx = data.get("context", {})
                    logger.info(f"Received user context for: {user_ctx.get('name', 'unknown')}")
                    new_system_prompt = _build_voice_system_prompt(user_ctx)
                    conversation_history[0] = {"role": "system", "content": new_system_prompt}

    except WebSocketDisconnect:
        logger.info("Voice WebSocket disconnected")
    except Exception as e:
        logger.error(f"Voice WebSocket error: {e}")
    finally:
        if current_task and not current_task.done():
            current_task.cancel()
        logger.info("Voice WebSocket session ended")


TWILIO_ACCOUNT_SID = os.environ.get("TWILIO_ACCOUNT_SID")
TWILIO_AUTH_TOKEN = os.environ.get("TWILIO_AUTH_TOKEN")
TWILIO_PHONE_NUMBER = os.environ.get("TWILIO_PHONE_NUMBER")
TWILIO_CALLBACK_URL = os.environ.get("TWILIO_CALLBACK_URL") or os.environ.get("VOICE_CALLBACK_URL")
DEFAULT_PHONE_COUNTRY_CODE = os.environ.get("DEFAULT_PHONE_COUNTRY_CODE", "91")

if not (TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN and TWILIO_PHONE_NUMBER):
    logger.warning(
        "Twilio configuration is incomplete. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER "
        "to enable outbound calls."
    )

if Client is None:
    logger.warning("Twilio package is not installed; outbound calls are disabled. %s", TWILIO_IMPORT_ERROR)
    _twilio_client = None
else:
    _twilio_client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN) if (
        TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN and TWILIO_PHONE_NUMBER
    ) else None


def _is_public_callback_url(url: str) -> bool:
    parsed = urlparse(url)
    if parsed.scheme not in {"http", "https"}:
        return False
    hostname = parsed.hostname or ""
    if hostname in {"localhost", "127.0.0.1", "::1"}:
        return False
    return True


def normalize_phone_number(phone: str) -> str:
    raw = str(phone or "").strip()
    if not raw:
        raise HTTPException(status_code=422, detail="Phone number is required")

    if raw.startswith("+"):
        digits = "+" + re.sub(r"[^0-9]", "", raw)
        return digits

    digits = re.sub(r"[^0-9]", "", raw)
    if not digits:
        raise HTTPException(status_code=422, detail="Phone number is invalid")

    if len(digits) == 10:
        normalized = f"+{DEFAULT_PHONE_COUNTRY_CODE}{digits}"
        logger.info(f"Normalized local phone {raw} to {normalized}")
        return normalized
    if len(digits) == 11 and digits.startswith("0"):
        normalized = f"+{DEFAULT_PHONE_COUNTRY_CODE}{digits[1:]}"
        logger.info(f"Normalized local phone {raw} to {normalized}")
        return normalized
    if len(digits) == 12 and digits.startswith(DEFAULT_PHONE_COUNTRY_CODE):
        normalized = f"+{digits}"
        logger.info(f"Normalized phone {raw} to {normalized}")
        return normalized

    normalized = f"+{digits}"
    logger.info(f"Normalized fallback phone {raw} to {normalized}")
    return normalized


def get_twiml_url(request: Request) -> str | None:
    if TWILIO_CALLBACK_URL:
        callback_url = TWILIO_CALLBACK_URL.strip()
        if _is_public_callback_url(callback_url):
            logger.info(f"Using configured Twilio callback URL: {callback_url}")
            return callback_url
        logger.warning(
            "Configured TWILIO_CALLBACK_URL is not a publicly reachable URL. "
            "Falling back to inline TwiML."
        )

    callback_url = str(request.url_for("voice_webhook"))
    if _is_public_callback_url(callback_url):
        logger.info(f"Using generated Twilio callback URL: {callback_url}")
        return callback_url

    logger.warning(
        "No public Twilio callback URL available. Twilio will use inline TwiML instead. "
        "Set TWILIO_CALLBACK_URL to a public HTTPS endpoint if you want callback mode."
    )
    return None


def make_call(to_number: str, twiml_url: str) -> str:
    """Place an outbound Twilio call using a callback URL and return the Call SID."""
    try:
        call = _twilio_client.calls.create(
            to=to_number,
            from_=TWILIO_PHONE_NUMBER,
            url=twiml_url,
        )
        logger.info(f"Twilio call created (callback URL mode): SID={call.sid} to={to_number}")
        return call.sid
    except TwilioRestException as exc:
        logger.error(f"Twilio call failed: {exc}")
        raise


def make_call_with_twiml(to_number: str, twiml_text: str) -> str:
    """Place an outbound Twilio call using inline TwiML and return the Call SID."""
    twiml = TwilioVoiceResponse()
    twiml.say(twiml_text, voice="alice", language="en-US")
    try:
        call = _twilio_client.calls.create(
            to=to_number,
            from_=TWILIO_PHONE_NUMBER,
            twiml=str(twiml),
        )
        logger.info(f"Twilio call created (inline TwiML mode): SID={call.sid} to={to_number}")
        return call.sid
    except TwilioRestException as exc:
        logger.error(f"Twilio call failed: {exc}")
        raise


class VoiceCallRequest(BaseModel):
    phone: str
    text: str = "Welcome to LaptopCare customer support."


def generate_voice_response(text: str) -> Response:
    """Generate TwiML that speaks the provided text."""
    twiml = TwilioVoiceResponse()
    twiml.say(text, voice="alice", language="en-US")
    return Response(content=str(twiml), media_type="application/xml")


@router.post("/api/voice/call")
async def initiate_voice_call(
    payload: VoiceCallRequest,
    request: Request,
    user=Depends(require_user)
):
    """Start an outbound Twilio call to the user's phone number."""
    to_number = normalize_phone_number(payload.phone)

    try:
        twiml_url = get_twiml_url(request)
        if twiml_url:
            call_sid = make_call(to_number, twiml_url)
            return {"call_sid": call_sid, "to": to_number, "twiml_url": twiml_url}

        # No public callback URL is available; use inline TwiML directly.
        logger.info("Using inline TwiML for outbound call because no public callback URL is configured.")
        call_sid = make_call_with_twiml(to_number, payload.text)
        return {"call_sid": call_sid, "to": to_number, "twiml": payload.text}
    except TwilioRestException as exc:
        detail = getattr(exc, 'msg', None) or str(exc)
        code = getattr(exc, 'code', None)
        if code == 21210:
            detail = (
                "The Twilio source phone number is not verified or not purchased for this account. "
                f"Set TWILIO_PHONE_NUMBER to a Twilio-owned number verified on your account. "
                "Trial accounts can only call verified numbers."
            )
        if code == 21408:
            detail = (
                "Your Twilio account is a trial account and cannot make outbound calls to this destination. "
                "Upgrade your Twilio account or verify the destination phone number."
            )
        twilio_message = f"Twilio error{f' ({code})' if code else ''}: {detail}"
        logger.error(f"Outbound Twilio call failed: {twilio_message}")
        raise HTTPException(status_code=502, detail=twilio_message)
    except Exception as exc:
        logger.exception("Failed to initiate outbound call")
        raise HTTPException(status_code=500, detail=f"Failed to start outbound call: {exc!r}")


@router.api_route("/voice", methods=["GET", "POST"])
async def voice_webhook(request: Request, text: str = Form("Welcome to LaptopCare customer support.")):
    """Twilio webhook endpoint returning TwiML for an outbound or inbound call."""
    if request.method == "GET":
        text = request.query_params.get("text", text)

    logger.info(f"Voice webhook called via {request.method} with text={text}")
    try:
        return generate_voice_response(text)
    except Exception as exc:
        logger.error(f"Failed to generate TwiML webhook response: {exc}")
        raise HTTPException(status_code=500, detail="Failed to generate TwiML response.")
