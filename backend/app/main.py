from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pathlib import Path
import os
from dotenv import load_dotenv

# Initialize dotenv before any other imports that might use env vars
BASE_DIR = Path(__file__).resolve().parents[1]
load_dotenv(BASE_DIR / ".env")

from .services.ai import groq_service
from . import db

# Import routers
from .routers import status, tickets, chat, feedback, voice

app = FastAPI(title="AI Customer Service - Backend")

# Default allowed origins for local dev and known deployments
default_origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "https://ai-customer-service-users.onrender.com",
    "https://ai-customer-service-userview.onrender.com",
]

env_origins = os.environ.get("ALLOWED_ORIGINS") or os.environ.get("VITE_ALLOWED_ORIGINS") or ""
env_list = [o.strip() for o in env_origins.split(",") if o.strip()]
origins = env_list + default_origins if env_list else default_origins

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
    # Initialize the Groq Client Service
    groq_service.init_client()

async def _shutdown():
    await db.close_db()

app.add_event_handler("startup", _startup)
app.add_event_handler("shutdown", _shutdown)

# Include routers
app.include_router(status.router)
app.include_router(tickets.router)
app.include_router(chat.router)
app.include_router(feedback.router)
app.include_router(voice.router)
