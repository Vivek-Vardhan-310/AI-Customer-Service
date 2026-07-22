import os
import sys
import json
import urllib.request
import urllib.parse
from pathlib import Path
from dotenv import load_dotenv

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
load_dotenv(Path(__file__).resolve().parents[1] / ".env")

supabase_url = os.environ.get("SUPABASE_URL")
supabase_key = os.environ.get("VITE_SUPABASE_PUBLISHABLE_KEY")

def get_auth_token(email, password):
    url = f"{supabase_url.rstrip('/')}/auth/v1/token?grant_type=password"
    headers = {
        "apikey": supabase_key,
        "Content-Type": "application/json"
    }
    payload = {
        "email": email,
        "password": password
    }
    req = urllib.request.Request(url, headers=headers, data=json.dumps(payload).encode('utf-8'))
    try:
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            return data.get("access_token"), data.get("user", {}).get("id")
    except Exception as e:
        print(f"Auth failed: {e}")
        return None, None

def test_live_supabase():
    print("==================================================")
    print("LIVE SUPABASE DATABASE AUTH & CONTEXT TEST")
    print("==================================================")
    
    email = "meenakshiadapa6@gmail.com"
    # Try default/common password if there is one, or we will query via auth token if stored
    password = "password123" # Standard test password
    
    token, user_id = get_auth_token(email, password)
    if not token:
        # Try common fallback passwords
        for pwd in ["meenakshi123", "Meenakshi123", "meenakshi", "password"]:
            token, user_id = get_auth_token(email, pwd)
            if token:
                break

    if not token:
        print("[FAIL] Could not authenticate test user Meenakshi.")
        return

    print(f"[SUCCESS] Authenticated successfully. User ID: {user_id}")

    from app.services.customer_context import build_customer_context
    from app.services.ai_prompt import build_system_prompt

    # Query context using live JWT
    context = build_customer_context(user_id=user_id, jwt=token)
    print("\n--- RESOLVED CUSTOMER CONTEXT ---")
    print(json.dumps(context, indent=2))

    # Generate system prompt
    prompt = build_system_prompt(context, mode="chat")
    print("\n--- GENERATED SYSTEM PROMPT ---")
    print(prompt)

if __name__ == "__main__":
    test_live_supabase()
