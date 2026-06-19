# FastAPI backend for AI Customer Service

This backend provides a simple FastAPI server to support the Vite frontend in this workspace. It includes in-memory + JSON-persistent endpoints for tickets, chat (mock), products and feedback.

Quick start (Windows PowerShell):

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r backend/requirements.txt
uvicorn app.main:app --reload --port 8000 --app-dir backend
uvicorn app.main:app --reload --port 8000
```

CORS is enabled for the default Vite dev origin `http://localhost:5173`.
