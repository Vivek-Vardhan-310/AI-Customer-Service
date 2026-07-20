# Twilio-Groq AI Voice Integration Setup Guide

This guide explains how to set up, configure, and test the Twilio-Groq AI voice handler for automated incoming phone calls.

---

## 1. Prerequisites

- **Python 3.10+** environment with project dependencies installed (`pip install -r requirements.txt`).
- A **Groq API Key** (from [console.groq.com](https://console.groq.com/)).
- A **Twilio Account** with an active Phone Number (from [twilio.com](https://www.twilio.com/)).
- A public URL or local tunnel tool (such as [ngrok](https://ngrok.com/)) to expose your local FastAPI backend to Twilio's webhooks.

---

## 2. Environment Variables Configuration

Add the following environment variables to your `backend/.env` file:

```env
# Groq API Configuration
GROQ_API_KEY=gsk_your_groq_api_key_here
GROQ_MODEL=llama-3.3-70b-versatile
GROQ_TEMPERATURE=0.7

# Twilio Voice Agent Settings (Optional - Has sensible defaults)
TWILIO_INITIAL_GREETING=Hello! Thank you for calling LaptopCare customer support. How can I help you today?
TWILIO_VOICE=Polly.Amy
TWILIO_LANGUAGE=en-US
TWILIO_SYSTEM_PROMPT=You are a friendly, concise AI voice assistant for LaptopCare customer support on a phone call. Keep responses short (1-3 sentences).
```

---

## 3. Running the Backend Server

From the root of the project directory (or inside `backend/`):

```powershell
python -m uvicorn app.main:app --reload --port 8000 --app-dir backend
```

Your FastAPI backend will start at `http://localhost:8000`.

---

## 4. Setting up Ngrok Tunnel

Twilio needs a public HTTPS URL to send incoming call webhooks to your local machine.

Run ngrok to forward port 8000:

```powershell
ngrok http 8000
```

Copy the generated HTTPS Forwarding URL (e.g., `https://abc123xyz.ngrok-free.app`).

---

## 5. Configuring Twilio Phone Number Webhook

1. Log into your **Twilio Console** -> **Phone Numbers** -> **Active Numbers**.
2. Click on your assigned phone number.
3. Scroll down to the **Voice & Fax** section.
4. Under **A CALL COMES IN**:
   - Select **Webhook**.
   - URL: `https://<your-ngrok-url>/api/twilio/voice/incoming`
   - HTTP Method: `HTTP POST`
5. Under **CALL STATUS CHANGES** (Optional for memory cleanup):
   - URL: `https://<your-ngrok-url>/api/twilio/voice/status`
   - HTTP Method: `HTTP POST`
6. Click **Save**.

---

## 6. Endpoints Reference

| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `/api/twilio/voice/incoming` | `POST` | Triggered when a phone call connects. Speaks initial greeting and starts speech recognition. |
| `/api/twilio/voice/respond` | `POST` | Triggered when caller speaks. Sends transcript to Groq AI and speaks response back. |
| `/api/twilio/voice/status` | `POST` | Called when call finishes (`completed`, `failed`, etc.) to clear conversation history from memory. |

---

## 7. Testing & Verification

- **Automated Tests**:
  Run the test suite from the backend directory:
  ```powershell
  pytest tests/test_twilio_voice.py
  ```

- **Live Testing**:
  Dial your Twilio Phone Number from your mobile phone. The AI assistant should answer immediately with your configured greeting and respond interactively to your spoken questions!
