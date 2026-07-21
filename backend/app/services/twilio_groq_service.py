import os
import logging
import time
from typing import Dict, List, Any
from .ai import groq_service

logger = logging.getLogger("twilio_groq_service")

TWILIO_PHONE_SYSTEM_PROMPT = (
    "You are a friendly, concise AI voice assistant for LaptopCare customer support on a phone call. "
    "Keep your responses short (1 to 3 sentences maximum) so that the caller can easily hear and understand you over the phone. "
    "Be helpful with laptop repairs, warranty queries, technical support, and ticket status. "
    "Do not use markdown formatting, bullet points, asterisks, or code snippets — write plain spoken language only."
)

class TwilioGroqService:
    def __init__(self):
        # Maps call_sid -> {"history": list, "last_active": float}
        self.sessions: Dict[str, Dict[str, Any]] = {}

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

    def get_session(self, call_sid: str) -> List[Dict[str, str]]:
        if call_sid not in self.sessions:
            system_prompt = os.environ.get("TWILIO_SYSTEM_PROMPT", TWILIO_PHONE_SYSTEM_PROMPT)
            logger.info(f"Initializing new conversation session for CallSid: {call_sid}")
            self.sessions[call_sid] = {
                "history": [{"role": "system", "content": system_prompt}],
                "last_active": time.time()
            }
        else:
            self.sessions[call_sid]["last_active"] = time.time()
        
        return self.sessions[call_sid]["history"]

    def generate_response(self, call_sid: str, user_speech: str) -> str:
        """Process caller speech transcript and generate an AI response via Groq."""
        logger.info(f"[CallSid: {call_sid}] Caller speech input: '{user_speech}'")
        history = self.get_session(call_sid)
        history.append({"role": "user", "content": user_speech})

        client = groq_service.get_client()
        if not client:
            logger.error(f"[CallSid: {call_sid}] Groq client is not initialized or GROQ_API_KEY is missing")
            fallback_msg = "I am currently experiencing technical difficulties connecting to my AI service. Please try calling back later."
            history.append({"role": "assistant", "content": fallback_msg})
            return fallback_msg

        try:
            logger.info(f"[CallSid: {call_sid}] Sending request to Groq model '{self.get_model()}' with {len(history)} messages in context")
            completion = client.chat.completions.create(
                model=self.get_model(),
                messages=history,
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
            history.append({"role": "assistant", "content": reply})

            # Trim history to maintain reasonable context size (keep system prompt + last 10 turns)
            if len(history) > 11:
                self.sessions[call_sid]["history"] = [history[0]] + history[-10:]

            return reply

        except Exception as e:
            logger.error(f"[CallSid: {call_sid}] Error calling Groq API: {e}", exc_info=True)
            fallback_msg = "I am having trouble processing your request right now. Could you please state your issue again?"
            history.append({"role": "assistant", "content": fallback_msg})
            return fallback_msg

    def clear_session(self, call_sid: str) -> None:
        """Remove call session data to free memory upon call completion."""
        if call_sid in self.sessions:
            del self.sessions[call_sid]
            logger.info(f"Cleared session state for finished CallSid: {call_sid}")

twilio_groq_service = TwilioGroqService()
