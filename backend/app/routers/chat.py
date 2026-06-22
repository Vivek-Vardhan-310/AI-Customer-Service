from fastapi import APIRouter, HTTPException
import os
from ..schemas import ChatRequest
from ..services.ai import groq_service
from .. import storage

router = APIRouter(prefix="/api/chat", tags=["chat"])

@router.post("")
def chat(req: ChatRequest):
    client = groq_service.get_client()
    if client is not None:
        try:
            completion = client.chat.completions.create(
                model=os.environ.get("GROQ_MODEL", "llama-3.3-70b-versatile"),
                messages=[{"role": "user", "content": req.message}],
                temperature=float(os.environ.get("GROQ_TEMPERATURE", "1")),
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
