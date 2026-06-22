from fastapi import Header, HTTPException
import os
from . import auth

def _get_supabase_url():
    return os.environ.get("VITE_SUPABASE_URL") or os.environ.get("SUPABASE_URL")

def require_user(authorization: str = Header(None)):
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing Authorization")
    if not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Invalid Authorization header")
    token = authorization.split(" ", 1)[1]
    supa = _get_supabase_url()
    if not supa:
        raise HTTPException(status_code=500, detail="Supabase URL not configured")
    try:
        payload = auth.verify_supabase_jwt(token, supa)
        return payload
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Invalid token: {e}")
