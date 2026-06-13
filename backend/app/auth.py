import os
import time
import requests
from jose import jwt

_jwks_cache = {}

def _get_jwks(supabase_url: str):
    now = time.time()
    cached = _jwks_cache.get(supabase_url)
    if cached and now - cached['fetched_at'] < 60 * 60:
        return cached['jwks']
    url = f"{supabase_url}/auth/v1/.well-known/jwks.json"
    r = requests.get(url, timeout=5)
    r.raise_for_status()
    jwks = r.json()
    _jwks_cache[supabase_url] = {'jwks': jwks, 'fetched_at': now}
    return jwks

def verify_supabase_jwt(token: str, supabase_url: str):
    """Verify a Supabase JWT using the project's JWKS endpoint.

    Returns the decoded token dict on success, raises on failure.
    """
    jwks = _get_jwks(supabase_url)
    # let python-jose pick the right key from jwks
    # do not enforce audience here; the backend can check claims as needed
    return jwt.decode(token, jwks, algorithms=["RS256"], options={"verify_aud": False})
