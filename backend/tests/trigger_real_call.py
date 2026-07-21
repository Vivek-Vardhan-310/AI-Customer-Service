import os
import sys
import time
from pathlib import Path
from dotenv import load_dotenv

# Load backend/.env
env_path = Path(__file__).resolve().parents[1] / ".env"
load_dotenv(env_path)

from twilio.rest import Client

account_sid = os.getenv("TWILIO_ACCOUNT_SID")
auth_token = os.getenv("TWILIO_AUTH_TOKEN")
from_number = os.getenv("TWILIO_PHONE_NUMBER")
public_base_url = os.getenv("PUBLIC_BASE_URL") or os.getenv("TWILIO_WEBHOOK_BASE_URL")
to_number = "+917569828918"

print("==================================================")
print("TRIGGERING REAL TWILIO NETWORK PHONE CALL")
print("==================================================")
print(f"Account SID    : {account_sid}")
print(f"From Number    : {from_number}")
print(f"To Number      : {to_number}")
print(f"Public Base URL: {public_base_url}")

client = Client(account_sid, auth_token)

# Clean TwiML using relative action/redirect paths or public HTTPS URL
if public_base_url:
    action_url = f"{public_base_url.rstrip('/')}/api/twilio/voice/respond"
    redirect_url = f"{public_base_url.rstrip('/')}/api/twilio/voice/incoming"
else:
    action_url = "/api/twilio/voice/respond"
    redirect_url = "/api/twilio/voice/incoming"

twiml_payload = f"""<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Gather input="speech" action="{action_url}" method="POST" speechTimeout="auto" language="en-US">
        <Say voice="Polly.Amy" language="en-US">Hello! Thank you for calling LaptopCare customer support. How can I help you today?</Say>
    </Gather>
    <Say voice="Polly.Amy" language="en-US">I didn't catch that. Goodbye!</Say>
    <Redirect>{redirect_url}</Redirect>
</Response>"""

try:
    call = client.calls.create(
        to=to_number,
        from_=from_number,
        twiml=twiml_payload
    )

    call_sid = call.sid
    print(f"\n[OK] REAL CALL PLACED OVER TWILIO NETWORK!")
    print(f"Real Twilio CallSid: {call_sid}")
    print(f"Initial Status     : {call.status}")

    # Monitor progress for 15 seconds
    for i in range(5):
        time.sleep(3)
        updated_call = client.calls(call_sid).fetch()
        print(f"Status at t+{(i+1)*3}s   : {updated_call.status} (Duration: {updated_call.duration or 0}s)")

    # Fetch Call Inspector Notifications
    notifications = client.calls(call_sid).notifications.list()
    print(f"\nTwilio Console Inspector Notifications Count: {len(notifications)}")
    for n in notifications:
        print(f" - [{n.error_code}] {n.message_text} (URL: {n.request_url})")

except Exception as e:
    print(f"\n[ERROR] Twilio API Error: {e}")
