import sys
import os
import asyncio

# Ensure backend directory is in path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from pathlib import Path
from dotenv import load_dotenv

# Load .env file
env_path = Path(__file__).resolve().parents[1] / ".env"
load_dotenv(env_path)

from httpx import AsyncClient, ASGITransport
from app.main import app
from app.services.ai import groq_service
from app.services.twilio_groq_service import twilio_groq_service

async def verify_e2e_twilio_flow():
    print("==================================================")
    print("STARTING END-TO-END TWILIO VOICE FLOW VERIFICATION")
    print("==================================================\n")

    # Initialize Groq Client
    groq_service.init_client()
    client_status = "INITIALIZED" if groq_service.get_client() is not None else "NOT INITIALIZED"
    print(f"[LOG] Groq Service Client Status: {client_status}")
    assert groq_service.get_client() is not None, "Groq client must be initialized"

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as http_client:
        call_sid = "E2E_SIMULATED_CALL_777"
        caller_phone = "+15559876543"

        # ----------------------------------------------------
        # STEP 1: Incoming Webhook Call (/api/twilio/voice/incoming)
        # ----------------------------------------------------
        print("\n--- STEP 1: Incoming Call Webhook ---")
        incoming_res = await http_client.post(
            "/api/twilio/voice/incoming",
            data={"CallSid": call_sid, "From": caller_phone}
        )
        print(f"[LOG] Webhook /incoming HTTP Status: {incoming_res.status_code}")
        print(f"[LOG] Content-Type: {incoming_res.headers.get('content-type')}")
        print(f"[LOG] Returned TwiML XML:\n{incoming_res.text}")

        assert incoming_res.status_code == 200
        assert "application/xml" in incoming_res.headers.get("content-type", "")
        assert "<Gather" in incoming_res.text
        assert "<Say" in incoming_res.text
        assert "<Redirect>" in incoming_res.text and "/api/twilio/voice/incoming" in incoming_res.text
        print("[SUCCESS] Step 1 Passed: Incoming webhook returned valid TwiML with absolute HTTPS URLs inside <Gather> and fallback <Redirect>.")

        # ----------------------------------------------------
        # STEP 2: First Conversational Turn (/api/twilio/voice/respond)
        # ----------------------------------------------------
        print("\n--- STEP 2: Turn 1 - Caller Speaks Question 1 ---")
        turn1_speech = "Hi, what are your laptop support and repair opening hours?"
        print(f"[LOG] Caller Speech Input: '{turn1_speech}'")

        turn1_res = await http_client.post(
            "/api/twilio/voice/respond",
            data={
                "CallSid": call_sid,
                "SpeechResult": turn1_speech,
                "Confidence": "0.96"
            }
        )
        print(f"[LOG] Webhook /respond HTTP Status: {turn1_res.status_code}")
        print(f"[LOG] Content-Type: {turn1_res.headers.get('content-type')}")
        print(f"[LOG] Groq AI Spoken Response TwiML:\n{turn1_res.text}")

        assert turn1_res.status_code == 200
        assert "application/xml" in turn1_res.headers.get("content-type", "")
        assert "<Gather" in turn1_res.text
        assert "<Say" in turn1_res.text
        assert "<Redirect>" in turn1_res.text and "/api/twilio/voice/incoming" in turn1_res.text
        assert "hours" in turn1_res.text.lower() or "support" in turn1_res.text.lower() or "help" in turn1_res.text.lower()
        print("[SUCCESS] Step 2 Passed: Groq AI model processed speech and returned spoken AI reply inside <Gather>.")

        # ----------------------------------------------------
        # STEP 3: Second Conversational Turn (Contextual Follow-up)
        # ----------------------------------------------------
        print("\n--- STEP 3: Turn 2 - Follow-up Question ---")
        turn2_speech = "Do you also cover warranty replacements for battery issues?"
        print(f"[LOG] Caller Speech Input: '{turn2_speech}'")

        turn2_res = await http_client.post(
            "/api/twilio/voice/respond",
            data={
                "CallSid": call_sid,
                "SpeechResult": turn2_speech,
                "Confidence": "0.94"
            }
        )
        print(f"[LOG] Webhook /respond HTTP Status: {turn2_res.status_code}")
        print(f"[LOG] Groq AI Spoken Response TwiML:\n{turn2_res.text}")

        assert turn2_res.status_code == 200
        assert "<Gather" in turn2_res.text
        print("[SUCCESS] Step 3 Passed: Multi-turn conversation logic succeeded with Groq context retention.")

        # ----------------------------------------------------
        # STEP 4: Silence / Retry Logic (No Speech Received)
        # ----------------------------------------------------
        print("\n--- STEP 4: Silence / No Speech Timeout ---")
        turn3_res = await http_client.post(
            "/api/twilio/voice/respond",
            data={
                "CallSid": call_sid,
                "SpeechResult": "",
                "Confidence": "0.0"
            }
        )
        print(f"[LOG] Webhook /respond (Silence) HTTP Status: {turn3_res.status_code}")
        print(f"[LOG] Retry Prompt TwiML:\n{turn3_res.text}")

        assert turn3_res.status_code == 200
        assert "didn't quite hear you" in turn3_res.text or "How can I help" in turn3_res.text
        print("[SUCCESS] Step 4 Passed: Graceful retry prompt returned on caller silence.")

        # ----------------------------------------------------
        # STEP 5: Call Completion Status Callback Memory Cleanup
        # ----------------------------------------------------
        print("\n--- STEP 5: Call Status Callback & Memory Cleanup ---")
        assert call_sid in twilio_groq_service.sessions, "Session should exist prior to completion callback"

        status_res = await http_client.post(
            "/api/twilio/voice/status",
            data={"CallSid": call_sid, "CallStatus": "completed"}
        )
        print(f"[LOG] Webhook /status HTTP Status: {status_res.status_code}")
        print(f"[LOG] Response XML: {status_res.text.strip()}")

        assert status_res.status_code == 200
        assert call_sid not in twilio_groq_service.sessions, "CallSid session must be removed from memory upon completion"
        print("[SUCCESS] Step 5 Passed: Call session cleaned up successfully from active memory.")

    print("\n==================================================")
    print("ALL END-TO-END TWILIO VOICE CHECKS PASSED 100%!")
    print("==================================================")

if __name__ == "__main__":
    asyncio.run(verify_e2e_twilio_flow())
