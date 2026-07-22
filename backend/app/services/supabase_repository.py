import os
import json
import urllib.request
import urllib.parse
import logging
import re
from typing import Dict, Any, List, Optional

logger = logging.getLogger("supabase_repository")

def _get_supabase_url() -> str:
    return (os.environ.get("SUPABASE_URL") or os.environ.get("VITE_SUPABASE_URL") or "").strip()

def _get_supabase_key() -> str:
    return (
        (os.environ.get("SUPABASE_KEY") or "")
        .strip()
        or (os.environ.get("VITE_SUPABASE_PUBLISHABLE_KEY") or "")
        .strip()
    )

def normalize_phone_number_e164(phone: str) -> str:
    """Normalize phone numbers to canonical E.164 format."""
    raw = str(phone or "").strip()
    if not raw:
        return ""
    # Remove all non-digit characters except leading plus
    has_plus = raw.startswith("+")
    digits = re.sub(r"[^0-9]", "", raw)
    if not digits:
        return ""
    
    # If 10 digits, assume standard default country prefix (e.g., US +1 or India +91)
    # Defaulting to +91 country prefix if unspecified
    default_prefix = os.environ.get("DEFAULT_PHONE_COUNTRY_CODE", "91")
    if len(digits) == 10:
        return f"+{default_prefix}{digits}"
    if len(digits) == 11 and digits.startswith("0"):
        return f"+{default_prefix}{digits[1:]}"
    
    if has_plus:
        return f"+{digits}"
    return f"+{digits}"

def _execute_supabase_request(endpoint: str, jwt: Optional[str] = None) -> List[Dict[str, Any]]:
    """Execute authenticated HTTP request to Supabase REST API."""
    url = _get_supabase_url()
    key = _get_supabase_key()
    if not url or not key:
        logger.error("Supabase config is missing (URL or Key).")
        return []

    headers = {
        "apikey": key,
        "Authorization": f"Bearer {jwt}" if jwt else f"Bearer {key}",
        "Content-Type": "application/json"
    }

    full_url = f"{url.rstrip('/')}/rest/v1/{endpoint}"
    req = urllib.request.Request(full_url, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=5) as resp:
            return json.loads(resp.read().decode('utf-8'))
    except Exception as e:
        logger.error(f"[Supabase Repository] REST query failed for {endpoint}: {e}")
        return []

def get_profile_by_user_id(user_id: str, jwt: Optional[str] = None) -> Optional[Dict[str, Any]]:
    """Fetch user profile row by user_id from profiles table."""
    escaped_id = urllib.parse.quote(user_id)
    endpoint = f"profiles?select=*&id=eq.{escaped_id}"
    results = _execute_supabase_request(endpoint, jwt=jwt)
    return results[0] if results else None

def get_profile_by_phone(phone: str) -> Optional[Dict[str, Any]]:
    """Fetch user profile row by phone number (uses service key)."""
    normalized = normalize_phone_number_e164(phone)
    if not normalized:
        return None
    escaped_phone = urllib.parse.quote(normalized)
    endpoint = f"profiles?select=*&phone=eq.{escaped_phone}"
    results = _execute_supabase_request(endpoint)
    return results[0] if results else None

def get_user_products(user_id: str, jwt: Optional[str] = None) -> List[Dict[str, Any]]:
    """Fetch user's registered products with product catalog details joined (avows N+1)."""
    escaped_id = urllib.parse.quote(user_id)
    endpoint = f"user_products?select=*,product:product_catalog(name,model,image_url)&user_id=eq.{escaped_id}"
    return _execute_supabase_request(endpoint, jwt=jwt)

def get_user_tickets(user_id: str, jwt: Optional[str] = None) -> List[Dict[str, Any]]:
    """Fetch user's open or closed support tickets by user_id."""
    escaped_id = urllib.parse.quote(user_id)
    endpoint = f"tickets?select=*,user_product:user_products(product:product_catalog(name))&user_id=eq.{escaped_id}"
    return _execute_supabase_request(endpoint, jwt=jwt)
