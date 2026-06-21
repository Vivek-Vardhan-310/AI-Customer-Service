from fastapi import FastAPI, HTTPException, Depends, Header, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pathlib import Path
from datetime import datetime
from . import storage
from .schemas import TicketCreate, ChatRequest, FeedbackCreate, VoiceChatRequest, VoiceChatResponse
from . import db, auth
from dotenv import load_dotenv
from groq import Groq
import uuid
import os
import asyncio
import base64
import json
import logging
import tempfile
from io import BytesIO

logger = logging.getLogger("voice_ws")


app = FastAPI(title="AI Customer Service - Backend")
BASE_DIR = Path(__file__).resolve().parents[1]
load_dotenv(BASE_DIR / ".env")

groq_client = None

def _init_groq_client():
    api_key = os.environ.get("GROQ_API_KEY")
    if not api_key:
        return None
    return Groq(api_key=api_key)


def _extract_groq_reply(completion):
    choices = getattr(completion, "choices", None)
    if not choices:
        return str(completion)
    first = choices[0]
    message = getattr(first, "message", None)
    if isinstance(message, dict):
        return message.get("content") or message.get("text") or str(message)
    if message is not None:
        return getattr(message, "content", None) or getattr(message, "text", None) or str(message)
    return getattr(first, "text", None) or str(first)

# Default allowed origins for local dev and known deployments
default_origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "https://ai-customer-service-users.onrender.com",
    "https://ai-customer-service-vs5z.vercel.app",
]

# Allow overriding via environment variable `ALLOWED_ORIGINS` (comma-separated)
env_origins = os.environ.get("ALLOWED_ORIGINS") or os.environ.get("VITE_ALLOWED_ORIGINS") or ""
env_list = [o.strip() for o in env_origins.split(",") if o.strip()]

origins = env_list + default_origins if env_list else default_origins

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


async def _startup():
    # attempt DB connection if DATABASE_URL provided
    await db.connect_db()
    global groq_client
    groq_client = _init_groq_client()


async def _shutdown():
    await db.close_db()


app.add_event_handler("startup", _startup)
app.add_event_handler("shutdown", _shutdown)


def _get_supabase_url():
    return os.environ.get("VITE_SUPABASE_URL") or os.environ.get("SUPABASE_URL")


def require_user(authorization: str = Header(None)):
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing Authorization")
    if not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Invalid Authorization header")
    token = authorization.split(" ", 1)[1]
    supa = _get_supabase_url()
    if not supa:
        raise HTTPException(status_code=500, detail="Supabase URL not configured")
    try:
        payload = auth.verify_supabase_jwt(token, supa)
        return payload
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Invalid token: {e}")


@app.get("/api/status")
def status():
    return {"status": "ok", "time": datetime.utcnow().isoformat()}


@app.get("/api/products")
def products():
    return storage.get_all("products")


@app.get("/api/tickets")
async def list_tickets():
    # prefer DB if available
    tickets = await db.get_tickets_db()
    if tickets:
        return tickets
    return storage.get_all("tickets")


@app.post("/api/tickets", status_code=201)
async def create_ticket(payload: TicketCreate, user=Depends(require_user)):
    ticket_id = f"TKT-{10000 + int(uuid.uuid4().int % 10000)}"
    ticket = {
        "id": ticket_id,
        "product": payload.product,
        "category": payload.category,
        "status": "Open",
        "priority": payload.priority,
        "date": datetime.utcnow().strftime("%Y-%m-%d"),
        "description": payload.description,
        "timeline": ["Open"],
        "owner": user.get("sub") or user.get("sub")
    }
    created = None
    if os.environ.get("DATABASE_URL"):
        created = await db.create_ticket_db(ticket)
    if not created:
        storage.save_item("tickets", ticket)
    return ticket


@app.get("/api/tickets/{ticket_id}")
def get_ticket(ticket_id: str):
    t = storage.find_item("tickets", "id", ticket_id)
    if not t:
        raise HTTPException(status_code=404, detail="Ticket not found")
    return t


@app.post("/api/chat")
def chat(req: ChatRequest):
    if groq_client is not None:
        try:
            completion = groq_client.chat.completions.create(
                model=os.environ.get("GROQ_MODEL", "llama-3.3-70b-versatile"),
                messages=[{"role": "user", "content": req.message}],
                temperature=float(os.environ.get("GROQ_TEMPERATURE", "1")),
                max_completion_tokens=int(os.environ.get("GROQ_MAX_COMPLETION_TOKENS", "1024")),
                top_p=float(os.environ.get("GROQ_TOP_P", "1")),
                stream=False,
                stop=None
            )
            reply = _extract_groq_reply(completion) or "I'm sorry, I couldn't generate a response at this time."
            return {"reply": reply}
        except Exception as e:
            raise HTTPException(status_code=502, detail=f"Groq request failed: {e}")

    # fallback mock response when Groq is not configured.
    text = req.message.lower()
    if "warranty" in text:
        return {"reply": "Your product has an active warranty with 210 days remaining."}
    if "complaint" in text or "raise" in text:
        return {"reply": "I can help raise a complaint. Provide product, category, priority and description."}
    if "ticket" in text or "track" in text:
        tickets = storage.get_all("tickets")
        return {"reply": "Here are your tickets", "tickets": tickets}
    return {"reply": "Thanks for your message. Please provide more details."}


@app.post("/api/voice", response_model=VoiceChatResponse)
async def voice_chat(req: VoiceChatRequest):
    if groq_client is None:
        raise HTTPException(status_code=502, detail="Groq client not initialized")

    try:
        audio_bytes = base64.b64decode(req.audio_base64)
        
        audio_file_like = BytesIO(audio_bytes)
        extension = "webm"
        if req.mime_type:
            extension = req.mime_type.split(";")[0].split("/")[-1] or extension
        audio_file_like.name = f"audio.{extension}"

        transcript = groq_client.audio.transcriptions.create(
            file=audio_file_like,
            model="whisper-large-v3"
        )
        user_text = transcript.text
        print(f"User (STT): {user_text}")

        completion = groq_client.chat.completions.create(
            model=os.environ.get("GROQ_MODEL", "llama-3.3-70b-versatile"),
            messages=[{"role": "user", "content": user_text}],
            temperature=float(os.environ.get("GROQ_TEMPERATURE", "1")),
            max_completion_tokens=int(os.environ.get("GROQ_MAX_COMPLETION_TOKENS", "1024")),
            top_p=float(os.environ.get("GROQ_TOP_P", "1")),
            stream=False,
            stop=None
        )
        reply_text = _extract_groq_reply(completion) or "I'm sorry, I couldn't generate a response at this time."
        print(f"Bot (Llama): {reply_text}")

        return VoiceChatResponse(transcript=user_text, reply_text=reply_text)

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Voice chat processing failed: {e}")


# ═══════════════════════════════════════════════════════════════════════════════
#  REAL-TIME VOICE WEBSOCKET — Full-duplex STT → LLM (streaming) → TTS
#  Supports barge-in via "abort" messages from the client.
# ═══════════════════════════════════════════════════════════════════════════════

# System prompt for the voice assistant
VOICE_SYSTEM_PROMPT = (
    "You are a friendly, concise voice assistant for LaptopCare customer support. "
    "Keep responses short (1-3 sentences) since you are speaking out loud. "
    "Be helpful with laptop issues, warranty questions, and troubleshooting. "
    "Don't use markdown formatting, bullet points, or special characters — speak naturally."
)


def _split_sentences(text: str) -> list[str]:
    """Split text at sentence boundaries (.!?) for incremental TTS.
    Returns list of complete sentences found so far, plus any remaining fragment."""
    sentences = []
    current = []
    for char in text:
        current.append(char)
        if char in '.!?':
            sentence = ''.join(current).strip()
            if sentence:
                sentences.append(sentence)
            current = []
    remainder = ''.join(current).strip()
    return sentences, remainder


@app.websocket("/ws/voice")
async def voice_websocket(websocket: WebSocket):
    """Full-duplex voice chat WebSocket endpoint.

    Protocol:
      Client → Server:
        - Binary frame: raw audio blob (webm/opus) for STT
        - Text frame:   JSON {"type": "abort"} to cancel current response

      Server → Client:
        - {"type": "transcript", "text": "..."}       — STT result
        - {"type": "tts_text", "text": "...", "idx": N, "final": bool} — sentence for client-side TTS
        - {"type": "llm_token", "token": "..."}       — individual LLM token (for live transcript)
        - {"type": "no_speech"}                        — STT returned empty
        - {"type": "turn_complete"}                     — full response done
        - {"type": "error", "message": "..."}           — error occurred
    """
    await websocket.accept()
    logger.info("Voice WebSocket connected")

    # Per-connection conversation history for multi-turn context
    conversation_history: list[dict] = [
        {"role": "system", "content": VOICE_SYSTEM_PROMPT}
    ]

    # Abort flag — set to True when client sends "abort" to cancel in-progress response
    abort_flag = False

    async def process_audio(audio_bytes: bytes):
        """Pipeline: audio bytes → STT → streaming LLM → sentence-buffered TTS text."""
        nonlocal abort_flag
        abort_flag = False

        if groq_client is None:
            await websocket.send_json({"type": "error", "message": "Groq client not initialized"})
            return

        # ── Step 1: Speech-to-Text via Groq Whisper ──────────────────────
        try:
            audio_file = BytesIO(audio_bytes)
            audio_file.name = "audio.webm"  # Groq needs a filename with extension

            # Run STT in a thread pool to avoid blocking the event loop
            transcript_result = await asyncio.to_thread(
                groq_client.audio.transcriptions.create,
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

        # Send transcript back to client for display
        await websocket.send_json({"type": "transcript", "text": user_text})

        # Add user message to conversation history
        conversation_history.append({"role": "user", "content": user_text})

        # ── Step 3: Streaming LLM response ───────────────────────────────
        try:
            stream = await asyncio.to_thread(
                groq_client.chat.completions.create,
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
                # Check abort flag — client interrupted (barge-in)
                if abort_flag:
                    logger.info("Abort flag set — stopping LLM stream")
                    break

                delta = chunk.choices[0].delta if chunk.choices else None
                if not delta or not delta.content:
                    continue

                token = delta.content
                full_response += token
                buffer += token

                # Send individual token for live transcript display on client
                try:
                    await websocket.send_json({"type": "llm_token", "token": token})
                except Exception:
                    break

                # Check if buffer contains complete sentences
                sentences, remainder = _split_sentences(buffer)
                if sentences:
                    for sentence in sentences:
                        if abort_flag:
                            break
                        # Send each complete sentence for client-side TTS
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

        # Add assistant response to conversation history
        if full_response:
            conversation_history.append({"role": "assistant", "content": full_response})
            # Keep history manageable — last 20 messages + system prompt
            if len(conversation_history) > 21:
                conversation_history[1:] = conversation_history[-20:]

        # Signal turn complete
        if not abort_flag:
            try:
                await websocket.send_json({"type": "turn_complete"})
            except Exception:
                pass

    # ── Main receive loop ────────────────────────────────────────────────
    current_task: asyncio.Task | None = None

    try:
        while True:
            message = await websocket.receive()

            if message.get("type") == "websocket.disconnect":
                break

            # Binary frame = audio data for STT
            if "bytes" in message and message["bytes"]:
                audio_data = message["bytes"]
                logger.info(f"Received audio: {len(audio_data)} bytes")

                # Cancel any in-progress response before starting new one
                if current_task and not current_task.done():
                    abort_flag = True
                    current_task.cancel()
                    try:
                        await current_task
                    except (asyncio.CancelledError, Exception):
                        pass

                # Process new audio in a task so we can still receive abort messages
                current_task = asyncio.create_task(process_audio(audio_data))

            # Text frame = JSON control message
            elif "text" in message and message["text"]:
                try:
                    data = json.loads(message["text"])
                except json.JSONDecodeError:
                    continue

                if data.get("type") == "abort":
                    # BARGE-IN: client started speaking while AI was responding
                    logger.info("Abort received — barge-in")
                    abort_flag = True
                    if current_task and not current_task.done():
                        current_task.cancel()
                        try:
                            await current_task
                        except (asyncio.CancelledError, Exception):
                            pass

    except WebSocketDisconnect:
        logger.info("Voice WebSocket disconnected")
    except Exception as e:
        logger.error(f"Voice WebSocket error: {e}")
    finally:
        if current_task and not current_task.done():
            current_task.cancel()
        logger.info("Voice WebSocket session ended")


@app.post("/api/feedback", status_code=201)
def submit_feedback(payload: FeedbackCreate, user=Depends(require_user)):
    fb = {"id": str(uuid.uuid4()), "ticket_id": payload.ticket_id, "rating": payload.rating, "comment": payload.comment, "date": datetime.utcnow().isoformat(), "owner": user.get("sub")}
    storage.save_item("feedback", fb)
    return fb
