"""
tools/definitions.py
====================
Defines the JSON schemas for all tools that are sent to the LLM.

These definitions tell the LLM:
  - What tools are available
  - What arguments each tool accepts
  - Which arguments are required

Design principle:
  This file is the single source of truth for tool schemas.
  Adding a new tool here (and registering a handler in the registry)
  is all that is needed to expose it to the LLM.
"""

# ---------------------------------------------------------------------------
# Tool: create_ticket
# ---------------------------------------------------------------------------
CREATE_TICKET_DEFINITION = {
    "type": "function",
    "function": {
        "name": "create_ticket",
        "description": (
            "Creates a support ticket for a laptop customer service issue. "
            "Call this tool ONLY after you have collected ALL required information "
            "from the customer through conversation. Do NOT call this unless you "
            "have the customer's name, phone, email, laptop brand, laptop model, "
            "issue description, and priority."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "customer_name": {
                    "type": "string",
                    "description": "Full name of the customer",
                },
                "phone": {
                    "type": "string",
                    "description": "Customer's contact phone number",
                },
                "email": {
                    "type": "string",
                    "description": "Customer's email address",
                },
                "laptop_brand": {
                    "type": "string",
                    "description": "Brand of the laptop (e.g., Dell, HP, Lenovo, Apple)",
                },
                "laptop_model": {
                    "type": "string",
                    "description": "Model name or number of the laptop (e.g., Inspiron 15, ThinkPad X1)",
                },
                "issue": {
                    "type": "string",
                    "description": "Detailed description of the laptop issue or complaint",
                },
                "priority": {
                    "type": "string",
                    "enum": ["Low", "Medium", "High"],
                    "description": "Priority level of the ticket based on urgency",
                },
                "serial_number": {
                    "type": "string",
                    "description": "Laptop serial number (optional but recommended)",
                },
                "conversation_summary": {
                    "type": "string",
                    "description": "A brief summary of the support conversation that led to this ticket",
                },
            },
            "required": [
                "customer_name",
                "phone",
                "email",
                "laptop_brand",
                "laptop_model",
                "issue",
                "priority",
            ],
        },
    },
}


# ---------------------------------------------------------------------------
# Master list — this is what gets passed to the LLM in every chat call.
# To add a new tool: define its schema above and append it here.
# ---------------------------------------------------------------------------
ALL_TOOL_DEFINITIONS = [
    CREATE_TICKET_DEFINITION,
]
