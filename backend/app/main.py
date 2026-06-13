from fastapi import FastAPI, HTTPException, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from pathlib import Path
from datetime import datetime
from . import storage
from .schemas import TicketCreate, ChatRequest, FeedbackCreate
from . import db, auth
import uuid
import os
import asyncio

app = FastAPI(title="AI Customer Service - Backend")

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
    # For now provide a safe mock response based on keywords matching the frontend.
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
