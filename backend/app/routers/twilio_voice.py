from fastapi import APIRouter, Form, Response, Request
from typing import Optional
from xml.sax.saxutils import escape
import logging
from ..services.twilio_groq_service import twilio_groq_service

router = APIRouter(prefix="/api/twilio/voice", tags=["twilio-voice"])
logger = logging.getLogger("twilio_voice")

def build_twiml_response(prompt_text: str, voice: str, language: str, action_url: str = "/api/twilio/voice/respond", include_gather: bool = True) -> str:
    """Generate compliant TwiML XML with <Say> nested INSIDE <Gather> and <Redirect> fallback to maintain the conversation loop."""
    escaped_text = escape(prompt_text)
    
    if include_gather:
        twiml = f"""<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Gather input="speech" action="{action_url}" method="POST" speechTimeout="auto" language="{language}">
        <Say voice="{voice}" language="{language}">{escaped_text}</Say>
    </Gather>
    <Say voice="{voice}" language="{language}">I didn't catch that. Please speak your question clearly.</Say>
    <Redirect>/api/twilio/voice/incoming</Redirect>
</Response>"""
    else:
        twiml = f"""<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="{voice}" language="{language}">{escaped_text}</Say>
    <Hangup/>
</Response>"""

    return twiml


@router.api_route("/incoming", methods=["GET", "POST"])
async def handle_incoming_call(
    request: Request,
    CallSid: Optional[str] = Form(None),
    From: Optional[str] = Form(None)
):
    """Webhook for incoming voice calls from Twilio."""
    # Extract params from Query if Form is empty (e.g. GET requests)
    if not CallSid and request.query_params.get("CallSid"):
        CallSid = request.query_params.get("CallSid")
    if not From and request.query_params.get("From"):
        From = request.query_params.get("From")

    logger.info(f"Incoming Twilio call connection via {request.method} from caller {From} (CallSid: {CallSid})")
    
    greeting = twilio_groq_service.get_initial_greeting()
    voice = twilio_groq_service.get_voice()
    language = twilio_groq_service.get_language()

    if CallSid:
        twilio_groq_service.get_session(CallSid)

    twiml = build_twiml_response(greeting, voice=voice, language=language, include_gather=True)
    logger.info(f"[CallSid: {CallSid}] Sending incoming call TwiML response:\n{twiml}")
    
    return Response(content=twiml, media_type="application/xml")


@router.api_route("/respond", methods=["GET", "POST"])
async def handle_speech_response(
    request: Request,
    CallSid: Optional[str] = Form(None),
    SpeechResult: Optional[str] = Form(None),
    Confidence: Optional[float] = Form(None)
):
    """Webhook for handling speech collected by Twilio <Gather>."""
    if not CallSid and request.query_params.get("CallSid"):
        CallSid = request.query_params.get("CallSid") or "UNKNOWN_CALL"
    if not SpeechResult and request.query_params.get("SpeechResult"):
        SpeechResult = request.query_params.get("SpeechResult")

    logger.info(f"[CallSid: {CallSid}] Received Gather speech callback. SpeechResult='{SpeechResult}', Confidence={Confidence}")
    
    voice = twilio_groq_service.get_voice()
    language = twilio_groq_service.get_language()

    if SpeechResult and SpeechResult.strip():
        # Process user speech through Groq AI agent
        ai_reply = twilio_groq_service.generate_response(CallSid, SpeechResult.strip())
        twiml = build_twiml_response(ai_reply, voice=voice, language=language, include_gather=True)
    else:
        # User silent or speech recognition failed to capture input
        logger.warning(f"[CallSid: {CallSid}] No speech detected in Gather input")
        retry_prompt = "I didn't quite hear you. How can I help you today?"
        twiml = build_twiml_response(retry_prompt, voice=voice, language=language, include_gather=True)

    logger.info(f"[CallSid: {CallSid}] Returning Gather TwiML response:\n{twiml}")
    return Response(content=twiml, media_type="application/xml")


@router.api_route("/status", methods=["GET", "POST"])
async def handle_call_status(
    request: Request,
    CallSid: Optional[str] = Form(None),
    CallStatus: Optional[str] = Form(None)
):
    """Callback for call status changes to ensure proper session memory cleanup."""
    if not CallSid:
        CallSid = request.query_params.get("CallSid", "UNKNOWN_CALL")
    if not CallStatus:
        CallStatus = request.query_params.get("CallStatus", "unknown")

    logger.info(f"Call status callback received for CallSid {CallSid}: status='{CallStatus}'")
    
    finished_statuses = {"completed", "failed", "canceled", "busy", "no-answer"}
    if CallStatus.lower() in finished_statuses:
        twilio_groq_service.clear_session(CallSid)
        
    twiml = """<?xml version="1.0" encoding="UTF-8"?><Response/>"""
    return Response(content=twiml, media_type="application/xml")
