import os
import logging
import time
from typing import Dict, List, Any, Optional
from .ai import groq_service
from .conversation_manager import conversation_manager
from .customer_context import build_customer_context
from .ai_prompt import build_system_prompt

logger = logging.getLogger("twilio_groq_service")

class TwilioGroqService:
    @property
    def sessions(self):
        return conversation_manager.sessions

    def get_initial_greeting(self) -> str:
        return os.environ.get(
            "TWILIO_INITIAL_GREETING",
            "Hello! Thank you for calling LaptopCare customer support. How can I help you today?"
        )

    def get_voice(self) -> str:
        return os.environ.get("TWILIO_VOICE", "Polly.Amy")

    def get_language(self) -> str:
        return os.environ.get("TWILIO_LANGUAGE", "en-US")

    def get_model(self) -> str:
        return os.environ.get("GROQ_MODEL", "llama-3.3-70b-versatile")

    def get_session(self, call_sid: str, user_context: Optional[Dict[str, Any]] = None, is_recovery: bool = False) -> List[Dict[str, str]]:
        """Retrieve or initialize the conversation session with unified context and prompt building."""
        session = conversation_manager.get_session(call_sid)
        if not session:
            session = conversation_manager.create_session(
                session_id=call_sid,
                user_context=user_context,
                mode="voice",
                is_recovery=is_recovery
            )
        return session["history"]

    def generate_response(self, call_sid: str, user_speech: str) -> str:
        """Process caller speech transcript and generate an AI response via Groq."""
        logger.info(f"[CallSid: {call_sid}] Caller speech input: '{user_speech}'")
        history = self.get_session(call_sid)
        
        conversation_manager.append_message(call_sid, "user", user_speech)

        client = groq_service.get_client()
        if not client:
            logger.error(f"[CallSid: {call_sid}] Groq client is not initialized or GROQ_API_KEY is missing")
            fallback_msg = "I am currently experiencing technical difficulties connecting to my AI service. Please try calling back later."
            conversation_manager.append_message(call_sid, "assistant", fallback_msg)
            return fallback_msg

        try:
            session = conversation_manager.get_session(call_sid)
            logger.info(f"[CallSid: {call_sid}] Sending request to Groq model '{self.get_model()}' with {len(session['history'])} messages in context")
            
            completion = client.chat.completions.create(
                model=self.get_model(),
                messages=session["history"],
                temperature=float(os.environ.get("GROQ_TEMPERATURE", "0.7")),
                max_completion_tokens=int(os.environ.get("GROQ_MAX_COMPLETION_TOKENS", "256")),
                top_p=float(os.environ.get("GROQ_TOP_P", "1")),
                stream=False
            )
            reply = groq_service.extract_reply(completion)
            if not reply:
                reply = "I'm sorry, I didn't quite catch that. Could you please repeat?"

            reply = reply.strip()
            logger.info(f"[CallSid: {call_sid}] Groq AI generated reply: '{reply}'")
            conversation_manager.append_message(call_sid, "assistant", reply)
            conversation_manager.trim_history(call_sid, limit=20)

            return reply

        except Exception as e:
            logger.error(f"[CallSid: {call_sid}] Error calling Groq API: {e}", exc_info=True)
            fallback_msg = "I am having trouble processing your request right now. Could you please state your issue again?"
            conversation_manager.append_message(call_sid, "assistant", fallback_msg)
            return fallback_msg

    def clear_session(self, call_sid: str) -> None:
        """Remove call session data to free memory upon call completion."""
        conversation_manager.clear_session(call_sid)

twilio_groq_service = TwilioGroqService()
