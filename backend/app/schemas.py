from pydantic import BaseModel, Field
from typing import List, Optional

class TicketCreate(BaseModel):
    product: str
    category: str
    priority: Optional[str] = 'Medium'
    description: str

class Ticket(BaseModel):
    id: str
    product: str
    category: str
    status: str
    priority: str
    date: str
    description: str

class ChatRequest(BaseModel):
    message: str

class FeedbackCreate(BaseModel):
    ticket_id: Optional[str]
    rating: int = Field(..., ge=1, le=5)
    comment: Optional[str]

class VoiceChatRequest(BaseModel):
    audio_base64: str
    mime_type: Optional[str] = "audio/webm"

class VoiceChatResponse(BaseModel):
    transcript: str
    reply_text: str
    audio_base64: Optional[str] = None
    audio_mime_type: Optional[str] = None
