import time
import logging
from typing import Dict, Any, List, Optional
from .customer_context import build_customer_context, normalize_product, normalize_ticket
from .ai_prompt import build_system_prompt

logger = logging.getLogger("conversation_manager")

class ConversationManager:
    def __init__(self):
        # Maps session_id -> {
        #    "session_id": str,
        #    "user_context": dict,
        #    "history": list[dict],
        #    "created_at": float,
        #    "last_active": float,
        #    "recovered": bool,
        #    "session_origin": str
        # }
        self.sessions: Dict[str, Dict[str, Any]] = {}

    def create_session(
        self,
        session_id: str,
        user_context: Optional[Dict[str, Any]] = None,
        mode: str = "voice",
        is_recovery: bool = False
    ) -> Dict[str, Any]:
        """Create and initialize a new stateful session."""
        now = time.time()
        
        # Build normalized customer context
        normalized_context = build_customer_context(client_provided_context=user_context)

        if user_context:
            merged_context = dict(normalized_context)
            name = user_context.get("name") or user_context.get("full_name")
            if not merged_context.get("name") and name:
                merged_context["name"] = name
            if not merged_context.get("email") and user_context.get("email"):
                merged_context["email"] = user_context.get("email")
            if not merged_context.get("phone") and user_context.get("phone"):
                merged_context["phone"] = user_context.get("phone")
            if user_context.get("products") and not merged_context.get("products"):
                merged_context["products"] = [normalize_product(p) for p in user_context.get("products", [])]
            if user_context.get("tickets") and not merged_context.get("tickets"):
                merged_context["tickets"] = [normalize_ticket(t) for t in user_context.get("tickets", [])]
            normalized_context = merged_context

        user_id = user_context.get("id") or user_context.get("user_id") or user_context.get("sub") if user_context else None
        email = user_context.get("email") if user_context else None
        jwt = user_context.get("jwt") if user_context else None

        self.sessions[session_id] = {
            "session_id": session_id,
            "user_id": user_id,
            "email": email,
            "jwt": jwt,
            "user_context": normalized_context,
            "history": [{"role": "system", "content": system_prompt}],
            "created_at": now,
            "last_active": now,
            "recovered": is_recovery,
            "session_origin": "recovered" if is_recovery else "incoming"
        }
        
        logger.info(
            f"[SESSION CREATED] SessionID: {session_id} | Mode: {mode} | "
            f"Recovered: {is_recovery} | Products: {len(normalized_context.get('products', []))}"
        )
        return self.sessions[session_id]

    def get_session(self, session_id: str) -> Optional[Dict[str, Any]]:
        """Retrieve existing session and update last_active timestamp."""
        if session_id in self.sessions:
            self.sessions[session_id]["last_active"] = time.time()
            return self.sessions[session_id]
        return None

    def append_message(self, session_id: str, role: str, content: str) -> None:
        """Append a turn to the conversation history."""
        session = self.get_session(session_id)
        if session:
            session["history"].append({"role": role, "content": content})

    def trim_history(self, session_id: str, limit: int = 20) -> None:
        """Trim oldest history turns while strictly preserving index 0 (System Prompt)."""
        session = self.get_session(session_id)
        if session:
            history = session["history"]
            if len(history) > (limit + 1):
                session["history"] = [history[0]] + history[-limit:]
                logger.info(f"[SESSION TRIMMED] SessionID: {session_id} to last {limit} turns + system prompt")

    def clear_session(self, session_id: str) -> None:
        """Purge session data to free memory."""
        if session_id in self.sessions:
            del self.sessions[session_id]
            logger.info(f"[SESSION DELETED] SessionID: {session_id} purged from memory.")

conversation_manager = ConversationManager()
