import sys
import os
import asyncio

# Ensure backend directory is in python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from httpx import AsyncClient, ASGITransport
from app.main import app
from app.services.twilio_groq_service import twilio_groq_service

async def run_all_tests():
    print("Running Twilio Voice unit tests...")
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        # Test 1: Incoming call webhook
        response = await client.post(
            "/api/twilio/voice/incoming",
            data={"CallSid": "TEST_CALL_101", "From": "+15551234567"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        assert "application/xml" in response.headers["content-type"]
        assert "<Say" in response.text
        assert "<Gather" in response.text
        print("[OK] Incoming call webhook test passed")

        # Test 2: Speech response webhook
        response = await client.post(
            "/api/twilio/voice/respond",
            data={
                "CallSid": "TEST_CALL_102",
                "SpeechResult": "What are your support hours?",
                "Confidence": "0.98"
            }
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        assert "application/xml" in response.headers["content-type"]
        assert "<Say" in response.text
        assert "<Gather" in response.text
        print("[OK] Speech response webhook test passed")

        # Test 3: Call status completion memory cleanup
        call_sid = "TEST_CALL_103"
        twilio_groq_service.get_session(call_sid)
        assert call_sid in twilio_groq_service.sessions, "Session should exist before completion"

        response = await client.post(
            "/api/twilio/voice/status",
            data={"CallSid": call_sid, "CallStatus": "completed"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        assert call_sid not in twilio_groq_service.sessions, "Session should be deleted after completed status"
        print("[OK] Call status session cleanup test passed")

    print("\nALL TWILIO VOICE TESTS PASSED SUCCESSFULLY!")

if __name__ == "__main__":
    asyncio.run(run_all_tests())
