from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime
import uuid
import os
from ..schemas import TicketCreate
from .. import db, storage
from ..dependencies import require_user

router = APIRouter(prefix="/api", tags=["tickets"])

@router.get("/products")
def products():
    return storage.get_all("products")

@router.get("/tickets")
async def list_tickets():
    # prefer DB if available
    tickets = await db.get_tickets_db()
    if tickets:
        return tickets
    return storage.get_all("tickets")

@router.post("/tickets", status_code=201)
async def create_ticket(payload: TicketCreate, user=Depends(require_user)):
    ticket_id = f"TKT-{10000 + int(uuid.uuid4().int % 10000)}"
    ticket = {
        "id": ticket_id,
        "product": payload.product,
        "category": payload.category,
        "status": "Open",
        "priority": payload.priority,
        "date": datetime.utcnow().strftime("%Y-%m-%d"),
        "description": payload.description,
        "timeline": ["Open"],
        "owner": user.get("sub")
    }
    created = None
    if os.environ.get("DATABASE_URL"):
        created = await db.create_ticket_db(ticket)
    if not created:
        storage.save_item("tickets", ticket)
    return ticket

@router.get("/tickets/{ticket_id}")
def get_ticket(ticket_id: str):
    t = storage.find_item("tickets", "id", ticket_id)
    if not t:
        raise HTTPException(status_code=404, detail="Ticket not found")
    return t

@router.delete("/tickets/{ticket_id}")
async def delete_ticket(ticket_id: str):
    deleted_from_db = False
    if os.environ.get("DATABASE_URL"):
        deleted_from_db = await db.delete_ticket_db(ticket_id)

    deleted_from_storage = storage.delete_item("tickets", "id", ticket_id)
    if not deleted_from_db and not deleted_from_storage:
        raise HTTPException(status_code=404, detail="Ticket not found")

    return {"deleted": True, "id": ticket_id}
