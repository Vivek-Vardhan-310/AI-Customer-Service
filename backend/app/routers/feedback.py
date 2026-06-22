from fastapi import APIRouter, Depends
from datetime import datetime
import uuid
from ..schemas import FeedbackCreate
from ..dependencies import require_user
from .. import storage

router = APIRouter(prefix="/api/feedback", tags=["feedback"])

@router.post("", status_code=201)
def submit_feedback(payload: FeedbackCreate, user=Depends(require_user)):
    fb = {
        "id": str(uuid.uuid4()),
        "ticket_id": payload.ticket_id,
        "rating": payload.rating,
        "comment": payload.comment,
        "date": datetime.utcnow().isoformat(),
        "owner": user.get("sub")
    }
    storage.save_item("feedback", fb)
    return fb
