from fastapi import APIRouter, HTTPException, Header, Depends
from typing import Optional
import os
from ..schemas import ChatRequest
from ..services.ai import groq_service
from ..services.customer_context import build_customer_context
from ..services.ai_prompt import build_system_prompt
from ..dependencies import require_user
from .. import storage

router = APIRouter(prefix="/api/chat", tags=["chat"])


@router.post("")
def chat(
    req: ChatRequest,
    authorization: Optional[str] = Header(None),
    user = Depends(require_user)
):
    client = groq_service.get_client()
    if client is not None:
        try:
            # Build the messages list with system prompt and conversation history
            user_ctx_dict = req.user_context.dict() if hasattr(req.user_context, 'dict') else req.user_context
            
            token = None
            if authorization and authorization.lower().startswith("bearer "):
                token = authorization.split(" ", 1)[1].strip()

            user_id = user.get("id") or user.get("sub")
            email = user.get("email")

            normalized_context = build_customer_context(
                user_id=user_id,
                email=email,
                jwt=token,
                client_provided_context=user_ctx_dict
            )
            system_prompt = build_system_prompt(normalized_context, mode="chat")
            messages = [{"role": "system", "content": system_prompt}]

            # Add conversation history if provided
            if req.history:
                for msg in req.history:
                    messages.append({"role": msg.role, "content": msg.content})

            # Add the current user message
            messages.append({"role": "user", "content": req.message})

            completion = client.chat.completions.create(
                model=os.environ.get("GROQ_MODEL", "llama-3.3-70b-versatile"),
                messages=messages,
                temperature=float(os.environ.get("GROQ_TEMPERATURE", "0.7")),
                max_completion_tokens=int(os.environ.get("GROQ_MAX_COMPLETION_TOKENS", "1024")),
                top_p=float(os.environ.get("GROQ_TOP_P", "1")),
                stream=False,
                stop=None
            )
            reply = groq_service.extract_reply(completion) or "I'm sorry, I couldn't generate a response at this time."
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
