from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect, Response, Form, Request, Depends
import base64
from io import BytesIO
import os
import asyncio
import logging
import json
import re
from xml.sax.saxutils import escape
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
from ..services.customer_context import build_customer_context
from ..services.ai_prompt import build_system_prompt
from ..services.conversation_manager import conversation_manager

router = APIRouter(tags=["voice"])
logger = logging.getLogger("voice_ws")


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

    import uuid
    session_id = f"browser_{uuid.uuid4()}"

    # Extract auth token from query params and attempt backend profile lookup immediately
    token = websocket.query_params.get("token")
    user_context = None

    if token:
        logger.info("[ws/voice] Authenticating token from query param.")
        from ..dependencies import _get_supabase_url, _get_supabase_key
        import requests
        supa = _get_supabase_url()
        key = _get_supabase_key()
        if supa and key:
            try:
                resp = requests.get(
                    f"{supa}/auth/v1/user",
                    headers={"Authorization": f"Bearer {token}", "apikey": key},
                    timeout=5
                )
                if resp.status_code == 200:
                    user_data = resp.json()
                    user_id = user_data.get("id")
                    email = user_data.get("email")
                    logger.info(f"[ws/voice] Token authenticated successfully for {email}")
                    user_context = build_customer_context(user_id=user_id, email=email, jwt=token)
            except Exception as e:
                logger.error(f"[ws/voice] Auth verification failed: {e}")

    if not user_context:
        user_context = build_customer_context()

    conversation_manager.create_session(session_id, user_context=user_context, mode="voice")
    abort_flag = False

    async def process_audio(audio_bytes: bytes):
        nonlocal abort_flag
        abort_flag = False

        client = groq_service.get_client()
        if client is None:
            await websocket.send_json({"type": "error", "message": "Groq client not initialized"})
            return

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

        if not user_text or len(user_text) < 2:
            await websocket.send_json({"type": "no_speech"})
            return

        await websocket.send_json({"type": "transcript", "text": user_text})
        conversation_manager.append_message(session_id, "user", user_text)
        session = conversation_manager.get_session(session_id)

        try:
            stream = await asyncio.to_thread(
                client.chat.completions.create,
                model=os.environ.get("GROQ_MODEL", "llama-3.3-70b-versatile"),
                messages=session["history"],
                temperature=float(os.environ.get("GROQ_TEMPERATURE", "0.7")),
                max_completion_tokens=int(os.environ.get("GROQ_MAX_COMPLETION_TOKENS", "512")),
                top_p=float(os.environ.get("GROQ_TOP_P", "1")),
                stream=True,
            )
        except Exception as e:
            logger.error(f"LLM request failed: {e}")
            await websocket.send_json({"type": "error", "message": f"LLM failed: {e}"})
            return

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
            conversation_manager.append_message(session_id, "assistant", full_response)
            conversation_manager.trim_history(session_id, limit=20)

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

                elif data.get("type") == "user_context":
                    user_ctx = data.get("context", {})
                    logger.info(f"Received user context for: {user_ctx.get('name', 'unknown')}")
                    conversation_manager.create_session(session_id, user_context=user_ctx, mode="voice")

    except Exception as e:
        logger.error(f"Voice WebSocket error: {e}")
    finally:
        if current_task and not current_task.done():
            current_task.cancel()
        conversation_manager.clear_session(session_id)
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
    raw_url = TWILIO_CALLBACK_URL
    if not raw_url and os.environ.get("PUBLIC_BASE_URL"):
        raw_url = os.environ.get("PUBLIC_BASE_URL").rstrip("/") + "/api/twilio/voice/incoming"

    if raw_url:
        callback_url = raw_url.strip()
        if _is_public_callback_url(callback_url):
            logger.info(f"Using configured Twilio callback URL: {callback_url}")
            return callback_url
        logger.warning(
            "Configured TWILIO_CALLBACK_URL / PUBLIC_BASE_URL is not a publicly reachable URL. "
            "Falling back to inline TwiML."
        )

    callback_url = str(request.url_for("voice_webhook"))
    if _is_public_callback_url(callback_url):
        logger.info(f"Using generated Twilio callback URL: {callback_url}")
        return callback_url

    logger.warning(
        "No public Twilio callback URL available. Twilio will use inline TwiML instead. "
        "Set PUBLIC_BASE_URL or TWILIO_CALLBACK_URL to a public HTTPS endpoint if you want callback mode."
    )
    return None


def make_call(to_number: str, twiml_url: str) -> str:
    """Place an outbound Twilio call using a callback URL and return the Call SID."""
    if _twilio_client is None:
        raise HTTPException(
            status_code=502,
            detail="Twilio integration is not configured. Please set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER in backend/.env."
        )
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
    """Place an outbound Twilio call using inline TwiML with Gather speech recognition."""
    if _twilio_client is None:
        raise HTTPException(
            status_code=502,
            detail="Twilio integration is not configured. Please set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER in backend/.env."
        )
    if TwilioVoiceResponse is not None:
        twiml_obj = TwilioVoiceResponse()
        gather = twiml_obj.gather(
            input="speech",
            action="/api/twilio/voice/respond",
            method="POST",
            speech_timeout="auto",
            language="en-US"
        )
        gather.say(twiml_text, voice="alice", language="en-US")
        twiml_obj.redirect("/api/twilio/voice/incoming")
        twiml_str = str(twiml_obj)
    else:
        escaped_text = escape(twiml_text)
        twiml_str = f"""<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Gather input="speech" action="/api/twilio/voice/respond" method="POST" speechTimeout="auto" language="en-US">
        <Say voice="alice" language="en-US">{escaped_text}</Say>
    </Gather>
    <Redirect>/api/twilio/voice/incoming</Redirect>
</Response>"""

    try:
        call = _twilio_client.calls.create(
            to=to_number,
            from_=TWILIO_PHONE_NUMBER,
            twiml=twiml_str,
        )
        logger.info(f"Twilio call created (inline TwiML mode): SID={call.sid} to={to_number}")
        return call.sid
    except TwilioRestException as exc:
        logger.error(f"Twilio call failed: {exc}")
        raise


class VoiceCallRequest(BaseModel):
    phone: str
    text: str = "Welcome to LaptopCare customer support."


async def generate_call_intro_text(default_text: str = "Welcome to LaptopCare customer support.") -> str:
    """Generate a short spoken greeting for outbound Twilio calls using the same Groq model."""
    client = groq_service.get_client()
    if client is None:
        return default_text

    try:
        completion = await asyncio.to_thread(
            client.chat.completions.create,
            model=os.environ.get("GROQ_MODEL", "llama-3.3-70b-versatile"),
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are a friendly voice assistant for LaptopCare customer support. "
                        "Reply with one short sentence that welcomes the caller and invites them to speak."
                    ),
                },
                {"role": "user", "content": default_text},
            ],
            temperature=float(os.environ.get("GROQ_TEMPERATURE", "0.7")),
            max_completion_tokens=int(os.environ.get("GROQ_MAX_COMPLETION_TOKENS", "256")),
            top_p=float(os.environ.get("GROQ_TOP_P", "1")),
            stream=False,
            stop=None,
        )
        reply = groq_service.extract_reply(completion)
        if reply:
            return reply.strip()
    except Exception as exc:
        logger.warning(f"Failed to generate Twilio intro text: {exc}")

    return default_text


def generate_voice_response(text: str) -> Response:
    """Generate TwiML that speaks the provided text and gathers speech response."""
    if TwilioVoiceResponse is not None:
        twiml_obj = TwilioVoiceResponse()
        gather = twiml_obj.gather(
            input="speech",
            action="/api/twilio/voice/respond",
            method="POST",
            speech_timeout="auto",
            language="en-US"
        )
        gather.say(text, voice="alice", language="en-US")
        twiml_obj.redirect("/api/twilio/voice/incoming")
        twiml_str = str(twiml_obj)
    else:
        escaped_text = escape(text)
        twiml_str = f"""<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Gather input="speech" action="/api/twilio/voice/respond" method="POST" speechTimeout="auto" language="en-US">
        <Say voice="alice" language="en-US">{escaped_text}</Say>
    </Gather>
    <Redirect>/api/twilio/voice/incoming</Redirect>
</Response>"""
    return Response(content=twiml_str, media_type="application/xml")


@router.post("/api/voice/call")
async def initiate_voice_call(
    payload: VoiceCallRequest,
    request: Request,
    user=Depends(require_user)
):
    """Start an outbound Twilio call to the user's phone number."""
    if _twilio_client is None:
        if Client is None:
            detail = "Twilio python package is missing. Please install it using 'pip install twilio'."
        else:
            detail = "Twilio is not configured. Please set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER in backend/.env."
        raise HTTPException(status_code=502, detail=detail)

    to_number = normalize_phone_number(payload.phone)

    try:
        twiml_url = get_twiml_url(request)
        if twiml_url:
            call_sid = make_call(to_number, twiml_url)
            return {"call_sid": call_sid, "to": to_number, "twiml_url": twiml_url}

        # No public callback URL is available; use inline TwiML directly.
        logger.info("Using inline TwiML for outbound call because no public callback URL is configured.")
        intro_text = await generate_call_intro_text(payload.text)
        call_sid = make_call_with_twiml(to_number, intro_text)
        return {"call_sid": call_sid, "to": to_number, "twiml": intro_text}
    except HTTPException:
        raise
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


@router.post("/api/voice/call/")
async def initiate_voice_call_with_slash(
    payload: VoiceCallRequest,
    request: Request,
    user=Depends(require_user)
):
    """Compatibility alias for deployments that request the trailing-slash route."""
    return await initiate_voice_call(payload, request, user)


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
