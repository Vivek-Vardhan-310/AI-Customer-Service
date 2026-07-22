"""
tools/__init__.py
=================
Package initializer for the tools module.

Importing this package automatically registers all tool handlers with
the ToolRegistry. This means the chat router only needs to do:

    from app.tools import tool_registry, tool_dispatcher
    from app.tools.definitions import ALL_TOOL_DEFINITIONS

and all handlers are already wired up — no further configuration needed.

To add a new tool in a future phase:
    1. Create tools/handlers/my_new_tool.py with a handle() function
    2. Import it below and call tool_registry.register("my_new_tool", ...)
    3. Add its schema to tools/definitions.py
    That's it. No other file needs to change.
"""

from .registry import tool_registry
from .dispatcher import tool_dispatcher

# ---------------------------------------------------------------------------
# Register all tool handlers here.
# Order does not matter — the registry is a dict.
# ---------------------------------------------------------------------------
from .handlers import create_ticket as _create_ticket_handler

tool_registry.register("create_ticket", _create_ticket_handler.handle)

# Re-export the singletons for convenient external access
__all__ = ["tool_registry", "tool_dispatcher"]
