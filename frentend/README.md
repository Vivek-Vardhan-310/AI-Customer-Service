# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.


## about project

Project Summary
Project name
AI Customer Service

Problem the project solves
Provides an AI-enabled customer support portal for laptop users, combining self-service troubleshooting, ticket management, voice assistance, and feedback collection in one interface.

Main features
User authentication and profile management
Product registration / warranty status display
Ticket creation, listing, detail view, and cancellation
AI chat assistant for support inquiries
Voice support with speech-to-text and real-time AI responses
Feedback submission
FAQ browsing and contextual help
Frontend technologies used
React 19
Vite
Tailwind CSS
Supabase JavaScript client
onnxruntime-web
@ricky0123/vad-web
Backend technologies used
Python 3.11
FastAPI
Uvicorn
asyncpg
Groq API client
Twilio SDK
python-dotenv
requests
Database used
Supabase-managed PostgreSQL (frontend data/storage)
Backend optional PostgreSQL via DATABASE_URL / asyncpg
Local JSON fallback persistence via db.json
Authentication / Authorization
Supabase Auth with email/password, OTP, password reset
Frontend stores Supabase access token
Backend protects endpoints with bearer token verification against Supabase
APIs developed or consumed
Backend REST APIs:
GET /api/products
GET /api/tickets
POST /api/tickets
GET /api/tickets/{ticket_id}
DELETE /api/tickets/{ticket_id}
POST /api/feedback
POST /api/chat
POST /api/voice
POST /api/voice/call
GET/POST /voice Twilio webhook
GET /api/status
Consumed:
Supabase Auth and database APIs
Groq Whisper STT and LLM completions
Twilio outbound calling API
AI / ML features
AI chat support using Groq LLM completions
Voice assistant using Groq Whisper speech-to-text
Real-time voice assistant pipeline with WebSocket streaming
Browser-side voice activity detection using ONNX/VAD models
Architecture and workflow
React SPA frontend routes users through login, ticketing, products, FAQ, chat, and voice screens
Supabase handles auth, profile lookup, product/ticket/FAQ storage, and secure session state
FastAPI backend exposes service APIs, CORS middleware, and startup/shutdown hooks
Backend optionally connects to PostgreSQL via asyncpg, else uses JSON persistence
Voice UI captures audio with browser VAD, streams it to backend WebSocket, backend performs STT then LLM response, and frontend plays TTS
A separate voice call endpoint orchestrates Twilio outbound calls with callback or inline TwiML
Deployment details
Backend has a Dockerfile for containerized deployment
Local development supported via uvicorn app.main:app --reload --port 8000
Frontend config supports local dev and environment-driven production API URL
CORS configured for local Vite dev origin and sample Render URLs
Challenges solved
Integrated secure Supabase auth across frontend and backend
Built hybrid persistence with PostgreSQL support and JSON fallback
Implemented real-time voice assistant flow with browser VAD, STT, streaming LLM, and TTS
Added Twilio outbound call orchestration with callback/inline TwiML fallback
Coordinated browser and server audio pipelines while keeping UI responsive
Specific contributions
Designed and implemented the full-stack AI Customer Service application
Built React/Vite frontend with ticket management, product dashboards, chat, voice, and feedback flows
Developed FastAPI backend with REST and WebSocket APIs, modular routers, and secure Supabase-backed auth
Integrated Groq AI for conversational chat and voice support, plus Twilio for outbound call handling
Added deployment readiness via Docker and environment-based configuration
A) Resume Description
Developed AI Customer Service, a full-stack React/Vite and FastAPI application with Supabase authentication, product/ticket management, and AI-powered support workflows.
Implemented secure Supabase email/password and OTP auth with backend bearer-token validation and CORS-safe REST/WebSocket APIs.
Engineered real-time voice support using browser VAD, Groq Whisper STT, streaming LLM responses, and SpeechSynthesis TTS.
Built hybrid persistence using PostgreSQL via asyncpg with JSON fallback storage and deployed backend using Docker.
B) Interview Explanation
I built AI Customer Service as a full-stack support portal that combines customer ticketing, product warranty tracking, AI chat, and voice assistance. The frontend is a React single-page app powered by Vite and Tailwind, while the backend uses FastAPI and Uvicorn. Authentication and user data are handled through Supabase, and the backend validates bearer tokens for secure protected routes. For AI, I integrated Groq to provide conversational chat and speech-to-text for the voice assistant. The voice workflow is browser-driven: a VAD model detects when the user speaks, audio is sent over WebSocket to the backend, the server transcribes and queries the LLM, then streams response sentences back for browser TTS playback. I also added Twilio outbound call support and a fallback JSON persistence layer so the app can run without a full database connection. This project demonstrates end-to-end full-stack integration with modern AI, authentication, and real-time voice capabilities.

C) 50-word Short Summary
Built an AI-enabled customer support platform with React/Vite frontend, FastAPI backend, Supabase authentication/storage, and Groq-powered chat and voice assistants. It supports product/ticket workflows, feedback, secured REST/WebSocket APIs, optional PostgreSQL persistence, and Dockerized backend deployment readiness.

D) Tech Stack
React 19
Vite
Tailwind CSS
JavaScript / JSX
Supabase (@supabase/supabase-js)
Python 3.11
FastAPI
Uvicorn
asyncpg
Groq API client
Twilio SDK
python-dotenv
ONNX Runtime Web
@ricky0123/vad-web
PostgreSQL-compatible storage
JSON fallback storage
Docker
E) Top 10 Interview Questions and Answers
What does this project do?

It delivers a laptop support portal with AI chat, voice assistance, ticket management, product warranty tracking, feedback, and FAQ browsing.
Why did you choose FastAPI and React?

FastAPI provides fast asynchronous API routing and automatic validation, while React/Vite delivers a responsive SPA experience with quick development and build speed.
How is authentication handled?

The app uses Supabase Auth for email/password, OTP, and profile access. The frontend stores the access token, and the backend validates it with Supabase before granting protected API access.
What AI functionality is included?

AI chat uses Groq LLM completions, and voice support uses Groq Whisper speech-to-text plus streaming LLM responses for real-time spoken support.
How does the voice assistant work?

The browser uses VAD to detect speech, sends audio to a WebSocket endpoint, backend transcribes and generates AI text, then streams response sentences back to the client for browser TTS.
How did you handle data storage?

Primary storage is Supabase PostgreSQL, with backend optional DATABASE_URL asyncpg access. If no DB is configured, the backend falls back to JSON persistence in db.json.
What APIs did you build?

Product and ticket CRUD APIs, chat support API, feedback API, voice processing API, Twilio call initiation endpoint, and a health/status endpoint.
How is Twilio used?

Twilio is used for outbound phone calls via api/voice/call, with callback URL or inline TwiML generation depending on configuration.
How did you keep the UI responsive during voice/AI flows?

I used WebSocket streaming for voice interactions and incremental sentence buffering so TTS playback starts before the entire response finishes.
What was the biggest technical challenge?

Integrating real-time voice AI with browser VAD, backend STT/LLM streaming, and secure token-based auth while preserving a smooth frontend experience.