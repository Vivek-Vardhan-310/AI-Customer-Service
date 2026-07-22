import sys
import os
import json
import time

def simulate_browser_voice_pipeline():
    print("==================================================")
    print("SIMULATED BROWSER VOICE PIPELINE & RACE CONDITION TRACE")
    print("==================================================\n")

    # STAGE 1: Authentication Simulation
    print("--- STAGE 1: AUTHENTICATION ---")
    user_id = "user-meenakshi-12345"
    email = "meenakshi@example.com"
    print(f"Authenticated User ID : {user_id}")
    print(f"User Email            : {email}")

    # STAGE 2: Profile Query Simulation
    print("\n--- STAGE 2: PROFILE QUERY ---")
    profile = {
        "id": user_id,
        "full_name": "Meenakshi",
        "email": email,
        "phone": "+13502070744"
    }
    print(f"fetchProfile() Result:\n{json.dumps(profile, indent=2)}")

    # STAGE 3: Product Query Simulation
    print("\n--- STAGE 3: PRODUCT QUERY ---")
    products = [
        {
            "name": "Legion Pro 7i Gen 9",
            "model": "Legion Pro 7i Gen 9",
            "serial": "PF4321",
            "warranty": "Active",
            "warrantyDays": 340,
            "amc": "Active",
            "amcDays": 340
        },
        {
            "name": "Yoga Slim 7i Carbon",
            "model": "Yoga Slim 7i Carbon",
            "serial": "PF1234",
            "warranty": "Active",
            "warrantyDays": 210,
            "amc": "Active",
            "amcDays": 210
        }
    ]
    print(f"fetchProducts() Result:\n{json.dumps(products, indent=2)}")

    # STAGE 4: Final userContext Construction (Asynchronous)
    print("\n--- STAGE 4: FINAL USERCONTEXT ---")
    user_context = {
        "name": profile["full_name"],
        "email": profile["email"],
        "phone": profile["phone"],
        "products": products
    }
    print(f"Resolved userContext:\n{json.dumps(user_context, indent=2)}")

    # STAGE 5: WebSocket Transmission Race Condition
    print("\n--- STAGE 5: WEBSOCKET TRANSMISSION (RACE CONDITION) ---")
    print("[EVENT] VoiceChat component mounts in React.")
    active_user_context_at_mount = None # Starts as null in React state
    print(f"[EVENT] ws.onopen triggered. Checking if context is present: {active_user_context_at_mount}")
    
    if active_user_context_at_mount is None:
        print("[WARNING] userContext is null. Skipping transmission of 'user_context' control message!")
    
    print("[EVENT] 200ms later: fetchProfile() and fetchProducts() resolve in parent component.")
    active_user_context_after_fetch = user_context
    print(f"[EVENT] parent state updated. userContext is now: {active_user_context_after_fetch['name']}")
    print("[WARNING] WebSocket already open. useEffect dependency array [] prevents resending userContext!")

    # STAGE 6: Backend Ingestion
    print("\n--- STAGE 6: BACKEND RECEIVED CONTEXT ---")
    received_context = None
    print(f"Backend user_context: {received_context}")

    # STAGE 7 & 8: Prompt Builder & History
    print("\n--- STAGE 7 & 8: PROMPT BUILDER & HISTORY[0] ---")
    import sys
    sys.path.insert(0, r"c:\Users\user\OneDrive\Desktop\AI-Customer-Service\backend")
    from app.services.voice_prompt import build_voice_system_prompt
    system_prompt = build_voice_system_prompt(received_context)
    print(f"Backend system_prompt:\n{system_prompt}")

    # STAGE 9: Groq Request Messages
    print("\n--- STAGE 9: GROQ REQUEST MESSAGES ---")
    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": "What is my name and what devices do I own?"}
    ]
    print(f"Messages Array:\n{json.dumps(messages, indent=2)}")

    print("\n--- STAGE 10: AI VERIFICATION ---")
    print("AI Answer: 'I am a generic voice assistant... I do not have your name or laptop details on file.'")

if __name__ == "__main__":
    simulate_browser_voice_pipeline()
