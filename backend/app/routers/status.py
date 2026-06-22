from fastapi import APIRouter
from datetime import datetime

router = APIRouter(prefix="/api/status", tags=["status"])

@router.get("")
def status():
    return {"status": "ok", "time": datetime.utcnow().isoformat()}
