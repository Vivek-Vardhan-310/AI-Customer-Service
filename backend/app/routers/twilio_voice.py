import os
from fastapi import APIRouter, Form, Response, Request
from typing import Optional
from xml.sax.saxutils import escape
import logging
from ..services.twilio_groq_service import twilio_groq_service

router = APIRouter(prefix="/api/twilio/voice", tags=["twilio-voice"])
logger = logging.getLogger("twilio_voice")

def get_public_base_url(request: Optional[Request] = None) -> Optional[str]:
    """Resolve public HTTPS base URL from environment variables (PUBLIC_BASE_URL, RENDER_EXTERNAL_URL) or request headers."""
    base = os.environ.get("PUBLIC_BASE_URL") or os.environ.get("TWILIO_CALLBACK_URL") or os.environ.get("RENDER_EXTERNAL_URL")
    if base and base.strip():
        return base.strip().rstrip("/")
    if request:
        host = request.headers.get("x-forwarded-host") or request.headers.get("host")
        proto = request.headers.get("x-forwarded-proto") or request.url.scheme
        if host and not ("localhost" in host or "127.0.0.1" in host):
            return f"{proto}://{host}".rstrip("/")
    return None

def build_twiml_response(
    prompt_text: str,
    voice: str,
    language: str,
    request: Optional[Request] = None,
    include_gather: bool = True
) -> str:
    """Generate compliant TwiML XML with absolute HTTPS action and redirect URLs."""
    escaped_text = escape(prompt_text)
    base_url = get_public_base_url(request)

    if base_url:
        action_url = f"{base_url}/api/twilio/voice/respond"
        redirect_url = f"{base_url}/api/twilio/voice/incoming"
    else:
        action_url = "/api/twilio/voice/respond"
        redirect_url = "/api/twilio/voice/incoming"
    
    if include_gather:
        twiml = f"""<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Gather input="speech" action="{action_url}" method="POST" speechTimeout="auto" language="{language}">
        <Say voice="{voice}" language="{language}">{escaped_text}</Say>
    </Gather>
    <Say voice="{voice}" language="{language}">I didn't catch that. Please speak your question clearly.</Say>
    <Redirect>{redirect_url}</Redirect>
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

    twiml = build_twiml_response(greeting, voice=voice, language=language, request=request, include_gather=True)
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
        twiml = build_twiml_response(ai_reply, voice=voice, language=language, request=request, include_gather=True)
    else:
        # User silent or speech recognition failed to capture input
        logger.warning(f"[CallSid: {CallSid}] No speech detected in Gather input")
        retry_prompt = "I didn't quite hear you. How can I help you today?"
        twiml = build_twiml_response(retry_prompt, voice=voice, language=language, request=request, include_gather=True)

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
