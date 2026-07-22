import sys
import os
import json

sys.path.insert(0, r"c:\Users\user\OneDrive\Desktop\AI-Customer-Service\backend")
from app.services.customer_context import build_customer_context
from app.services.ai_prompt import build_system_prompt

class MockChatRequest:
    def __init__(self, user_context, message="Hi", history=None):
        self.user_context = user_context
        self.message = message
        self.history = history or []

def run_chat_trace():
    print("==================================================")
    print("CHAT PIPELINE 5-STAGE CONTEXT TRACE")
    print("==================================================\n")

    os.environ["SUPABASE_URL"] = "https://upoufbjvcsywyqgpkhhp.supabase.co"
    os.environ["VITE_SUPABASE_PUBLISHABLE_KEY"] = "sb_publishable_L5_cDB0Bi_SJBPf5cBHXsw_hf0GLFga"
    os.environ["ENV"] = "production"

    raw_user_context = {
        "name": "Meenakshi",
        "email": "meenakshiadapa6@gmail.com",
        "phone": "8688915402",
        "products": [
            {"name": "Legion Pro 7i Gen 9", "serial": "PF4321"},
            {"name": "Yoga Slim 7i Carbon", "serial": "PF1234"}
        ]
    }
    
    req = MockChatRequest(user_context=raw_user_context)

    # 1. Immediately after entering the route
    print("--- STAGE 1: req.user_context ---")
    print(json.dumps(req.user_context, indent=2))

    # 2. Immediately after context = build_customer_context(...)
    print("\n--- STAGE 2: context = build_customer_context(...) ---")
    user_ctx_dict = req.user_context
    context = build_customer_context(client_provided_context=user_ctx_dict)
    print(json.dumps(context, indent=2))

    # 3. Immediately before build_system_prompt(...)
    print("\n--- STAGE 3: context immediately before prompt building ---")
    print(json.dumps(context, indent=2))

    # 4. Immediately after system_prompt = build_system_prompt(...)
    print("\n--- STAGE 4: system_prompt = build_system_prompt(...) ---")
    system_prompt = build_system_prompt(context, mode="chat")
    print(system_prompt)

    # 5. Immediately before client.chat.completions.create(...)
    print("\n--- STAGE 5: messages[0] (system prompt) ---")
    messages = [{"role": "system", "content": system_prompt}]
    print(json.dumps(messages[0], indent=2))

if __name__ == "__main__":
    run_chat_trace()
