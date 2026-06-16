from fastapi import FastAPI, HTTPException, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from pathlib import Path
from datetime import datetime
from . import storage
from .schemas import TicketCreate, ChatRequest, FeedbackCreate
from . import db, auth
from dotenv import load_dotenv
from groq import Groq
import uuid
import os
import asyncio

app = FastAPI(title="AI Customer Service - Backend")
BASE_DIR = Path(__file__).resolve().parents[1]
load_dotenv(BASE_DIR / '.env')

groq_client = None

def _init_groq_client():
    api_key = os.environ.get('GROQ_API_KEY')
    if not api_key:
        return None
    return Groq(api_key=api_key)


def _extract_groq_reply(completion):
    choices = getattr(completion, 'choices', None)
    if not choices:
        return str(completion)
    first = choices[0]
    message = getattr(first, 'message', None)
    if isinstance(message, dict):
        return message.get('content') or message.get('text') or str(message)
    if message is not None:
        return getattr(message, 'content', None) or getattr(message, 'text', None) or str(message)
    return getattr(first, 'text', None) or str(first)

origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


async def _startup():
    # attempt DB connection if DATABASE_URL provided
    await db.connect_db()
    global groq_client
    groq_client = _init_groq_client()


async def _shutdown():
    await db.close_db()


app.add_event_handler("startup", _startup)
app.add_event_handler("shutdown", _shutdown)


def _get_supabase_url():
    return os.environ.get('VITE_SUPABASE_URL') or os.environ.get('SUPABASE_URL')


def require_user(authorization: str = Header(None)):
    if not authorization:
        raise HTTPException(status_code=401, detail='Missing Authorization')
    if not authorization.lower().startswith('bearer '):
        raise HTTPException(status_code=401, detail='Invalid Authorization header')
    token = authorization.split(' ', 1)[1]
    supa = _get_supabase_url()
    if not supa:
        raise HTTPException(status_code=500, detail='Supabase URL not configured')
    try:
        payload = auth.verify_supabase_jwt(token, supa)
        return payload
    except Exception as e:
        raise HTTPException(status_code=401, detail=f'Invalid token: {e}')


@app.get('/api/status')
def status():
    return {"status": "ok", "time": datetime.utcnow().isoformat()}


@app.get('/api/products')
def products():
    return storage.get_all('products')


@app.get('/api/tickets')
async def list_tickets():
    # prefer DB if available
    tickets = await db.get_tickets_db()
    if tickets:
        return tickets
    return storage.get_all('tickets')


@app.post('/api/tickets', status_code=201)
async def create_ticket(payload: TicketCreate, user=Depends(require_user)):
    ticket_id = f"TKT-{10000 + int(uuid.uuid4().int % 10000)}"
    ticket = {
        "id": ticket_id,
        "product": payload.product,
        "category": payload.category,
        "status": "Open",
        "priority": payload.priority,
        "date": datetime.utcnow().strftime('%Y-%m-%d'),
        "description": payload.description,
        "timeline": ["Open"],
        "owner": user.get('sub') or user.get('sub')
    }
    created = None
    if os.environ.get('DATABASE_URL'):
        created = await db.create_ticket_db(ticket)
    if not created:
        storage.save_item('tickets', ticket)
    return ticket


@app.get('/api/tickets/{ticket_id}')
def get_ticket(ticket_id: str):
    t = storage.find_item('tickets', 'id', ticket_id)
    if not t:
        raise HTTPException(status_code=404, detail='Ticket not found')
    return t


@app.post('/api/chat')
def chat(req: ChatRequest):
    if groq_client is not None:
        try:
            completion = groq_client.chat.completions.create(
                model=os.environ.get('GROQ_MODEL', 'llama-3.3-70b-versatile'),
                messages=[{"role": "user", "content": req.message}],
                temperature=float(os.environ.get('GROQ_TEMPERATURE', '1')),
                max_completion_tokens=int(os.environ.get('GROQ_MAX_COMPLETION_TOKENS', '1024')),
                top_p=float(os.environ.get('GROQ_TOP_P', '1')),
                stream=False,
                stop=None
            )
            reply = _extract_groq_reply(completion) or "I'm sorry, I couldn't generate a response at this time."
            return {"reply": reply}
        except Exception as e:
            raise HTTPException(status_code=502, detail=f'Groq request failed: {e}')

    # fallback mock response when Groq is not configured.
    text = req.message.lower()
    if 'warranty' in text:
        return {"reply": "Your product has an active warranty with 210 days remaining."}
    if 'complaint' in text or 'raise' in text:
        return {"reply": "I can help raise a complaint. Provide product, category, priority and description."}
    if 'ticket' in text or 'track' in text:
        tickets = storage.get_all('tickets')
        return {"reply": "Here are your tickets", "tickets": tickets}
    return {"reply": "Thanks for your message. Please provide more details."}


@app.post('/api/feedback', status_code=201)
def submit_feedback(payload: FeedbackCreate, user=Depends(require_user)):
    fb = {"id": str(uuid.uuid4()), "ticket_id": payload.ticket_id, "rating": payload.rating, "comment": payload.comment, "date": datetime.utcnow().isoformat(), "owner": user.get('sub')}
    storage.save_item('feedback', fb)
    return fb

''' uvicorn app.main:app --reload --port 8000 '''