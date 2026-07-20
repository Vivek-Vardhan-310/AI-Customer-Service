from fastapi import APIRouter, Form, Response, Request
from typing import Optional
from xml.sax.saxutils import escape
import logging
from ..services.twilio_groq_service import twilio_groq_service

router = APIRouter(prefix="/api/twilio/voice", tags=["twilio-voice"])
logger = logging.getLogger("twilio_voice")

def build_twiml_response(prompt_text: str, voice: str, language: str, include_gather: bool = True) -> str:
    """Generate clean TwiML XML containing <Say> and an interactive <Gather> block."""
    escaped_text = escape(prompt_text)
    
    if include_gather:
        return f"""<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="{voice}" language="{language}">{escaped_text}</Say>
    <Gather input="speech" action="/api/twilio/voice/respond" method="POST" speechTimeout="auto" language="{language}">
    </Gather>
    <Say voice="{voice}" language="{language}">We didn't receive any input. Thank you for calling LaptopCare. Goodbye!</Say>
</Response>"""
    else:
        return f"""<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="{voice}" language="{language}">{escaped_text}</Say>
    <Hangup/>
</Response>"""


@router.post("/incoming")
async def handle_incoming_call(
    CallSid: Optional[str] = Form(None),
    From: Optional[str] = Form(None)
):
    """Webhook for incoming voice calls from Twilio."""
    logger.info(f"Incoming Twilio call from {From} (CallSid: {CallSid})")
    
    greeting = twilio_groq_service.get_initial_greeting()
    voice = twilio_groq_service.get_voice()
    language = twilio_groq_service.get_language()

    # Pre-initialize session
    if CallSid:
        twilio_groq_service.get_session(CallSid)

    twiml = build_twiml_response(greeting, voice=voice, language=language, include_gather=True)
    return Response(content=twiml, media_type="application/xml")


@router.post("/respond")
async def handle_speech_response(
    CallSid: str = Form(...),
    SpeechResult: Optional[str] = Form(None),
    Confidence: Optional[float] = Form(None)
):
    """Webhook for handling speech collected by Twilio <Gather>."""
    logger.info(f"Twilio speech response for CallSid {CallSid}: '{SpeechResult}' (Confidence: {Confidence})")
    
    voice = twilio_groq_service.get_voice()
    language = twilio_groq_service.get_language()

    if SpeechResult and SpeechResult.strip():
        # Process user speech through Groq AI agent
        ai_reply = twilio_groq_service.generate_response(CallSid, SpeechResult.strip())
        twiml = build_twiml_response(ai_reply, voice=voice, language=language, include_gather=True)
    else:
        # User silent or speech recognition failed to capture input
        retry_prompt = "I didn't quite hear you. How can I help you today?"
        twiml = build_twiml_response(retry_prompt, voice=voice, language=language, include_gather=True)

    return Response(content=twiml, media_type="application/xml")


@router.post("/status")
async def handle_call_status(
    CallSid: str = Form(...),
    CallStatus: str = Form(...)
):
    """Callback for call status changes to ensure proper session memory cleanup."""
    logger.info(f"Call status update for CallSid {CallSid}: {CallStatus}")
    
    finished_statuses = {"completed", "failed", "canceled", "busy", "no-answer"}
    if CallStatus.lower() in finished_statuses:
        twilio_groq_service.clear_session(CallSid)
        
    twiml = """<?xml version="1.0" encoding="UTF-8"?><Response/>"""
    return Response(content=twiml, media_type="application/xml")
