"""
tools/handlers/create_ticket.py
================================
Phase 2: Real handler for the create_ticket tool.

This handler:
  1. Validates all required fields (unchanged from Phase 1)
  2. Calls TicketService.create() to save a real ticket
  3. Returns the real ticket ID to the LLM

The validation layer is intentionally kept here (not in the service) so
that the TicketService receives only already-validated, clean arguments.

Phase 1 → Phase 2 change:
  Only the execution block at the bottom changed.
  Validation logic is identical — ensuring the pipeline is stable.
"""

import json
import logging
from typing import Any, Dict, Optional

from ...services.ticket_service import ticket_service

logger = logging.getLogger("tool.create_ticket")

# ---------------------------------------------------------------------------
# Required fields and their human-readable labels for validation messages
# ---------------------------------------------------------------------------
REQUIRED_FIELDS: Dict[str, str] = {
    "customer_name": "Customer Name",
    "phone":         "Phone Number",
    "email":         "Email Address",
    "laptop_brand":  "Laptop Brand",
    "laptop_model":  "Laptop Model",
    "issue":         "Issue Description",
    "priority":      "Priority",
}

VALID_PRIORITIES = {"Low", "Medium", "High"}


def _validate_arguments(arguments: Dict[str, Any]) -> list:
    """
    Validate the arguments provided by the LLM.

    Returns a list of validation error messages.
    An empty list means all validations passed.
    """
    errors = []

    # Check required fields are present and non-empty
    for field, label in REQUIRED_FIELDS.items():
        value = arguments.get(field)
        if not value or (isinstance(value, str) and not value.strip()):
            errors.append(f"Missing required field: '{field}' ({label})")

    # Check priority is one of the allowed values
    priority = arguments.get("priority", "")
    if priority and priority not in VALID_PRIORITIES:
        errors.append(
            f"Invalid priority '{priority}'. Must be one of: {', '.join(VALID_PRIORITIES)}"
        )

    return errors


def handle(arguments: Dict[str, Any], context: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """
    Phase 2 real handler: validate arguments, then create a real ticket.

    Args:
        arguments: Parsed dict of arguments from the LLM tool call.
        context:   Optional dict with authenticated user info:
                     { "user_id": str, "email": str, "jwt": str }
                   Injected by the ToolDispatcher from the chat router.

    Returns:
        A dict with 'success', 'ticket_id', and 'message' keys.
    """
    logger.info("=" * 60)
    logger.info("[TOOL CALL] Tool: create_ticket")
    logger.info("[TOOL CALL] Arguments:")
    logger.info(json.dumps(arguments, indent=2, ensure_ascii=False))
    if context:
        logger.info(f"[TOOL CALL] Context: user_id={context.get('user_id')}, email={context.get('email')}")
    logger.info("=" * 60)

    # ------------------------------------------------------------------
    # Validation — never trust LLM arguments directly
    # ------------------------------------------------------------------
    validation_errors = _validate_arguments(arguments)
    if validation_errors:
        logger.warning(f"[TOOL VALIDATION FAILED] Errors: {validation_errors}")
        return {
            "success": False,
            "error": "Validation failed",
            "validation_errors": validation_errors,
        }

    logger.info("[TOOL VALIDATION] All required fields present and valid.")

    # ------------------------------------------------------------------
    # Phase 2: Delegate to TicketService for real persistence
    # ------------------------------------------------------------------
    user_id = context.get("user_id") if context else None
    jwt = context.get("jwt") if context else None

    result = ticket_service.create(
        arguments=arguments,
        user_id=user_id,
        jwt=jwt,
    )

    if result.get("success"):
        logger.info(
            f"[TOOL EXECUTION] Ticket created: {result['ticket_id']} "
            f"| Priority: {result.get('priority')} "
            f"| Saved to: {result.get('saved_to')}"
        )
    else:
        logger.error(f"[TOOL EXECUTION] Ticket creation failed: {result.get('error')}")

    return result
