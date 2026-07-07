from fastapi import Header, HTTPException
import os
import requests
from . import auth

def _get_supabase_url():
    return os.environ.get("VITE_SUPABASE_URL") or os.environ.get("SUPABASE_URL")


def _get_supabase_key():
    return (
        os.environ.get("SUPABASE_KEY")
        or os.environ.get("VITE_SUPABASE_PUBLISHABLE_KEY")
        or os.environ.get("SUPABASE_ANON_KEY")
        or os.environ.get("VITE_SUPABASE_ANON_KEY")
    )

def require_user(authorization: str = Header(None)):
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing Authorization")
    if not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Invalid Authorization header")
    token = authorization.split(" ", 1)[1]
    supa = _get_supabase_url()
    if not supa:
        raise HTTPException(status_code=500, detail="Supabase URL not configured")
    key = _get_supabase_key()
    if not key:
        raise HTTPException(status_code=500, detail="Supabase API key not configured")
    try:
        resp = requests.get(
            f"{supa}/auth/v1/user",
            headers={
                "Authorization": f"Bearer {token}",
                "apikey": key,
            },
            timeout=5,
        )
        if resp.status_code != 200:
            raise HTTPException(status_code=401, detail=f"Invalid token: {resp.text}")
        payload = resp.json()
        if "sub" not in payload and "id" in payload:
            payload["sub"] = payload["id"]
        return payload
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Invalid token: {e}")
