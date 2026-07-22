"""
services/ticket_service.py
===========================
Phase 2: Real Ticket Service.

Responsibilities:
  - Generate a unique, human-readable ticket ID (TKT-XXXXX)
  - Map tool arguments + user context into the canonical ticket record
  - Persist to Supabase REST API (production) OR local db.json (dev fallback)
  - Return the saved ticket record

Design principles:
  - SYNCHRONOUS: The chat endpoint is sync (not async), so this service
    uses the same urllib-based HTTP client as supabase_repository.py
  - NO BUSINESS LOGIC IN THE HANDLER: All creation logic lives here.
    The handler only calls ticket_service.create() and returns the result.
  - DUAL PERSISTENCE: Supabase first, local JSON fallback on failure or
    when DATABASE_URL / SUPABASE_URL is not configured.
  - NEVER trusts raw LLM arguments — handler validates first, service
    maps validated data into the DB schema.

Extending (Phase 7+):
  - Add track_ticket(), cancel_ticket() etc. as methods here.
  - The handler for each new tool calls the appropriate method.
"""

import os
import json
import uuid
import random
import logging
import urllib.request
import urllib.parse
from datetime import datetime, timezone
from typing import Any, Dict, Optional

from .. import storage

logger = logging.getLogger("ticket_service")


# ---------------------------------------------------------------------------
# Ticket ID generation
# ---------------------------------------------------------------------------

def _generate_ticket_id() -> str:
    """
    Generate a unique, human-readable ticket ID in the format TKT-XXXXX.

    Uses a combination of a random number and UUID entropy to ensure
    uniqueness without needing a database sequence.
    """
    # Use last 4 hex digits of a UUID for entropy + a random 1-digit prefix
    uid_fragment = uuid.uuid4().int % 100000
    return f"TKT-{uid_fragment:05d}"


# ---------------------------------------------------------------------------
# Supabase REST helper (sync, mirrors supabase_repository.py pattern)
# ---------------------------------------------------------------------------

def _get_supabase_url() -> str:
    return (os.environ.get("SUPABASE_URL") or os.environ.get("VITE_SUPABASE_URL") or "").strip()


def _get_supabase_key() -> str:
    return (
        (os.environ.get("SUPABASE_KEY") or "").strip()
        or (os.environ.get("VITE_SUPABASE_PUBLISHABLE_KEY") or "").strip()
    )


def _lookup_user_product_id(
    user_id: str,
    laptop_brand: str,
    laptop_model: str,
    serial_number: str,
    jwt: Optional[str] = None,
) -> Optional[str]:
    """
    Look up the UUID of the matching row in the `user_products` table.

    Fetches all products for the user and matches against the laptop
    the LLM identified using the following priority order:
      1. Serial number exact match (most precise)
      2. Model name fuzzy match (case-insensitive substring)
      3. Brand + model combined fuzzy match

    Returns the `id` UUID string if found, or None if no match.
    This UUID is then stored as `user_product_id` in the tickets table.
    """
    supabase_url = _get_supabase_url()
    supabase_key = _get_supabase_key()

    if not supabase_url or not supabase_key or not user_id:
        return None

    auth_token = jwt if jwt else supabase_key
    headers = {
        "apikey": supabase_key,
        "Authorization": f"Bearer {auth_token}",
        "Content-Type": "application/json",
    }

    # Fetch all user_products with product catalog joined for name/model
    escaped_id = urllib.parse.quote(user_id)
    endpoint = (
        f"{supabase_url.rstrip('/')}/rest/v1/"
        f"user_products?select=id,serial_number,nickname,product:product_catalog(name,model)"
        f"&user_id=eq.{escaped_id}"
    )
    req = urllib.request.Request(endpoint, headers=headers)

    try:
        with urllib.request.urlopen(req, timeout=5) as resp:
            products = json.loads(resp.read().decode("utf-8"))
    except Exception as e:
        logger.warning(f"[TICKET SERVICE] Could not fetch user_products for matching: {e}")
        return None

    if not products:
        logger.info("[TICKET SERVICE] No user_products found for this user — user_product_id will be null.")
        return None

    serial_lower = serial_number.lower().strip() if serial_number else ""
    model_lower = laptop_model.lower().strip() if laptop_model else ""
    brand_lower = laptop_brand.lower().strip() if laptop_brand else ""

    for product in products:
        product_id = product.get("id")
        product_serial = (product.get("serial_number") or "").lower().strip()
        product_nickname = (product.get("nickname") or "").lower().strip()

        # Resolve catalog details if the join returned them
        catalog = product.get("product") or {}
        catalog_name = (catalog.get("name") or "").lower().strip()
        catalog_model = (catalog.get("model") or "").lower().strip()

        # 1. Serial number match (highest confidence)
        if serial_lower and product_serial and serial_lower == product_serial:
            logger.info(f"[TICKET SERVICE] Matched user_product by serial: {product_id}")
            return product_id

        # 2. Model substring match
        if model_lower and (
            (catalog_model and model_lower in catalog_model)
            or (catalog_model and catalog_model in model_lower)
            or (catalog_name and model_lower in catalog_name)
            or (catalog_name and catalog_name in model_lower)
            or (product_nickname and model_lower in product_nickname)
        ):
            logger.info(f"[TICKET SERVICE] Matched user_product by model name: {product_id}")
            return product_id

        # 3. Brand + model combined match
        combined_search = f"{brand_lower} {model_lower}".strip()
        combined_catalog = f"{catalog_name} {catalog_model}".strip()
        if combined_search and combined_catalog and (
            combined_search in combined_catalog
            or combined_catalog in combined_search
        ):
            logger.info(f"[TICKET SERVICE] Matched user_product by brand+model: {product_id}")
            return product_id

    logger.warning(
        f"[TICKET SERVICE] No user_product match found for "
        f"brand='{laptop_brand}' model='{laptop_model}' serial='{serial_number}'. "
        f"user_product_id will be null."
    )
    return None


def _save_to_supabase(supabase_payload: Dict[str, Any], jwt: Optional[str] = None) -> bool:
    """
    POST a ticket record to the Supabase REST API.

    IMPORTANT: Only the fields that exist in the Supabase `tickets` table schema
    are included in supabase_payload. Sending extra/unknown columns causes Supabase
    to return a 400/422 error and silently discard the record.

    Supabase tickets table columns (from supabase_schema.sql):
      id, user_id, product_id, title, category, status, description,
      contact_method, created_at, updated_at

    Returns True if successful, False otherwise.
    """
    supabase_url = _get_supabase_url()
    supabase_key = _get_supabase_key()

    if not supabase_url or not supabase_key:
        logger.info("[TICKET SERVICE] Supabase not configured — skipping Supabase save.")
        return False

    # Use the user JWT for RLS compliance; fall back to service key
    auth_token = jwt if jwt else supabase_key

    headers = {
        "apikey": supabase_key,
        "Authorization": f"Bearer {auth_token}",
        "Content-Type": "application/json",
        "Prefer": "return=minimal",   # Don't require column echoing — avoids schema-mismatch issues
    }

    endpoint = f"{supabase_url.rstrip('/')}/rest/v1/tickets"
    payload = json.dumps(supabase_payload).encode("utf-8")
    req = urllib.request.Request(endpoint, data=payload, headers=headers, method="POST")

    try:
        with urllib.request.urlopen(req, timeout=8) as resp:
            status = resp.getcode()
            if status in (200, 201, 204):
                logger.info(f"[TICKET SERVICE] Ticket saved to Supabase: {supabase_payload['id']}")
                return True
            logger.warning(f"[TICKET SERVICE] Supabase returned unexpected status {status}")
            return False
    except urllib.error.HTTPError as e:
        # Read the actual error body to understand why Supabase rejected the request
        try:
            error_body = e.read().decode("utf-8")
        except Exception:
            error_body = "(unreadable)"
        logger.error(
            f"[TICKET SERVICE] Supabase POST failed with HTTP {e.code}: {error_body}"
        )
        return False
    except Exception as e:
        logger.error(f"[TICKET SERVICE] Supabase POST exception: {e}")
        return False


def _build_supabase_payload(
    arguments: Dict[str, Any],
    user_id: Optional[str],
    ticket_id: str,
    title: str,
    description: str,
    user_product_id: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Build the Supabase-specific ticket payload.

    Matches the ACTUAL running Supabase `tickets` table schema exactly:

        id TEXT NOT NULL PRIMARY KEY
        user_id UUID NOT NULL -> auth.users
        user_product_id UUID NULL -> user_products  (resolved by _lookup_user_product_id)
        title TEXT NOT NULL
        category TEXT NULL
        status TEXT NULL DEFAULT 'Open'
              CHECK (status IN ('Open','In Progress','Resolved','Closed','Cancelled'))
        description TEXT NULL
        contact_method TEXT NULL DEFAULT 'email'
        created_at TIMESTAMPTZ DEFAULT now()
        updated_at TIMESTAMPTZ DEFAULT now()

    NOTE: There is NO `priority` column in Supabase.
          Priority is embedded in the description field instead.
    """
    return {
        "id": ticket_id,
        "user_id": user_id,              # Required NOT NULL — auth.uid() must match for RLS
        "user_product_id": user_product_id,  # UUID from user_products, resolved by lookup
        "title": title,
        "category": "Technical Support",
        "status": "Open",
        "description": description,
        "contact_method": "email",
    }


def _build_local_record(
    arguments: Dict[str, Any],
    user_id: Optional[str],
    ticket_id: str,
    product_name: str,
    title: str,
    description: str,
    priority: str,
) -> Dict[str, Any]:
    """
    Build the local storage ticket record.

    Includes all fields for compatibility with the local JSON storage
    and the legacy db.py asyncpg schema.
    """
    now_iso = datetime.now(timezone.utc).isoformat()
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")

    return {
        "id": ticket_id,
        "user_id": user_id,
        "title": title,
        "category": "Technical Support",
        "status": "Open",
        "priority": priority,
        "description": description,
        "contact_method": "email",
        "created_at": now_iso,
        "updated_at": now_iso,
        # Legacy / local storage compatibility
        "product": product_name,
        "date": today,
        "timeline": ["Open"],
        "owner": user_id,
    }


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

class TicketService:
    """
    Service class responsible for creating and persisting support tickets.

    Usage:
        ticket_service = TicketService()
        result = ticket_service.create(arguments, user_id="uuid...", jwt="token...")
    """

    def create(
        self,
        arguments: Dict[str, Any],
        user_id: Optional[str] = None,
        jwt: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Create a real support ticket from validated tool arguments.

        Args:
            arguments:  Validated dict from the create_ticket tool handler.
            user_id:    Authenticated user's UUID (from JWT payload).
            jwt:        User's JWT token (for Supabase RLS compliance).

        Returns:
            A dict with keys: success, ticket_id, ticket, message, saved_to.
        """
        ticket_id = _generate_ticket_id()
        logger.info(f"[TICKET SERVICE] Creating ticket: {ticket_id}")

        # Extract shared computed fields
        laptop_brand = arguments.get("laptop_brand", "").strip()
        laptop_model = arguments.get("laptop_model", "").strip()
        issue = arguments.get("issue", "").strip()
        priority = arguments.get("priority", "Medium").strip()
        serial_number = arguments.get("serial_number", "").strip()
        customer_name = arguments.get("customer_name", "").strip()
        email = arguments.get("email", "").strip()
        phone = arguments.get("phone", "").strip()
        conversation_summary = arguments.get("conversation_summary", "").strip()

        product_name = f"{laptop_brand} {laptop_model}".strip()
        title = f"{product_name} \u2014 {issue[:60]}" if issue else product_name

        description_parts = [f"Issue: {issue}", f"Priority: {priority}"]
        if serial_number:
            description_parts.append(f"Serial Number: {serial_number}")
        if customer_name:
            description_parts.append(f"Customer: {customer_name}")
        if email:
            description_parts.append(f"Email: {email}")
        if phone:
            description_parts.append(f"Phone: {phone}")
        if conversation_summary:
            description_parts.append(f"Conversation Summary: {conversation_summary}")
        description = " | ".join(description_parts)

        # ------------------------------------------------------------------
        # Resolve user_product_id: find the UUID of the matching user_products row.
        # This links the ticket to the specific registered laptop in Supabase.
        # Falls back to None gracefully if Supabase is not configured or no match.
        # ------------------------------------------------------------------
        user_product_id: Optional[str] = None
        if user_id:
            user_product_id = _lookup_user_product_id(
                user_id=user_id,
                laptop_brand=laptop_brand,
                laptop_model=laptop_model,
                serial_number=serial_number,
                jwt=jwt,
            )
            if user_product_id:
                logger.info(f"[TICKET SERVICE] user_product_id resolved: {user_product_id}")
            else:
                logger.info("[TICKET SERVICE] user_product_id not resolved — will be null in Supabase.")

        # Build two separate payloads:
        # (1) Supabase payload — ONLY the columns in the Supabase tickets table
        supabase_payload = _build_supabase_payload(
            arguments=arguments,
            user_id=user_id,
            ticket_id=ticket_id,
            title=title,
            description=description,
            user_product_id=user_product_id,
        )

        # (2) Local storage record — all fields including legacy compatibility
        local_record = _build_local_record(
            arguments=arguments,
            user_id=user_id,
            ticket_id=ticket_id,
            product_name=product_name,
            title=title,
            description=description,
            priority=priority,
        )

        # ------------------------------------------------------------------
        # Attempt 1: Save to Supabase (Supabase-schema-compatible payload)
        # ------------------------------------------------------------------
        saved_to = None
        supabase_ok = _save_to_supabase(supabase_payload, jwt=jwt)

        if supabase_ok:
            saved_to = "supabase"
        else:
            # ------------------------------------------------------------------
            # Attempt 2: Fall back to local JSON storage
            # ------------------------------------------------------------------
            try:
                storage.save_item("tickets", local_record)
                logger.info(f"[TICKET SERVICE] Ticket saved to local storage: {ticket_id}")
                saved_to = "local"
            except Exception as e:
                logger.error(f"[TICKET SERVICE] Local storage save failed: {e}")
                return {
                    "success": False,
                    "error": f"Failed to save ticket to any storage backend: {str(e)}",
                }

        logger.info(
            f"[TICKET SERVICE] Ticket created | "
            f"ID: {ticket_id} | Product: {product_name} | "
            f"Priority: {priority} | Saved to: {saved_to}"
        )

        return {
            "success": True,
            "ticket_id": ticket_id,
            "status": "Open",
            "priority": priority,
            "product": product_name,
            "saved_to": saved_to,
            "message": (
                f"Support ticket {ticket_id} has been successfully created. "
                f"Status: Open | Priority: {priority}. "
                f"Our team will contact the customer at {email or 'the registered email'}."
            ),
        }


# Singleton instance — import this in handlers
ticket_service = TicketService()
