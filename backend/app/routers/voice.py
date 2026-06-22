from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect
import base64
from io import BytesIO
import os
import asyncio
import logging
import json
from ..schemas import VoiceChatRequest, VoiceChatResponse
from ..services.ai import groq_service, split_sentences

router = APIRouter(tags=["voice"])
logger = logging.getLogger("voice_ws")

VOICE_SYSTEM_PROMPT = (
    "You are a friendly, concise voice assistant for LaptopCare customer support. "
    "Keep responses short (1-3 sentences) since you are speaking out loud. "
    "Be helpful with laptop issues, warranty questions, and troubleshooting. "
    "Don't use markdown formatting, bullet points, or special characters — speak naturally."
)

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

    conversation_history: list[dict] = [
        {"role": "system", "content": VOICE_SYSTEM_PROMPT}
    ]

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

    except WebSocketDisconnect:
        logger.info("Voice WebSocket disconnected")
    except Exception as e:
        logger.error(f"Voice WebSocket error: {e}")
    finally:
        if current_task and not current_task.done():
            current_task.cancel()
        logger.info("Voice WebSocket session ended")
