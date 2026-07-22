"""
tools/registry.py
=================
The ToolRegistry is the central catalog of all available tools.

Responsibilities:
  - Maps tool names (str) → handler callables
  - Provides a clean registration API
  - Raises a clear error when an unknown tool is called

Design principle:
  The registry is the ONLY place that knows what tools exist.
  The dispatcher, chat router, and LLM definitions are completely
  unaware of each other — they all talk through the registry.

Extending:
  To add a new tool (e.g., track_ticket):
    1. Create a handler in tools/handlers/track_ticket.py
    2. Import it here and call registry.register("track_ticket", handler)
  No other files need to change.
"""

import logging
from typing import Callable, Dict, Any

logger = logging.getLogger("tool_registry")


class ToolRegistry:
    """
    Central registry that maps tool names to their handler functions.

    Each handler must follow the signature:
        def handler(arguments: dict) -> dict
    and must return a JSON-serializable dict.
    """

    def __init__(self):
        self._handlers: Dict[str, Callable[[Dict[str, Any]], Dict[str, Any]]] = {}

    def register(self, tool_name: str, handler: Callable[[Dict[str, Any]], Dict[str, Any]]) -> None:
        """
        Register a tool handler by name.

        Args:
            tool_name: The exact name used in the LLM tool definition (e.g. "create_ticket")
            handler:   A callable that accepts a dict of validated arguments and returns a dict result.
        """
        if tool_name in self._handlers:
            logger.warning(f"[REGISTRY] Tool '{tool_name}' is being re-registered. Previous handler will be replaced.")
        self._handlers[tool_name] = handler
        logger.info(f"[REGISTRY] Tool registered: '{tool_name}'")

    def get_handler(self, tool_name: str) -> Callable[[Dict[str, Any]], Dict[str, Any]]:
        """
        Retrieve a registered handler by tool name.

        Raises:
            KeyError: If the tool_name is not registered.
        """
        if tool_name not in self._handlers:
            available = list(self._handlers.keys())
            raise KeyError(
                f"[REGISTRY] Unknown tool '{tool_name}'. "
                f"Registered tools: {available}"
            )
        return self._handlers[tool_name]

    def is_registered(self, tool_name: str) -> bool:
        """Check whether a tool is registered without raising."""
        return tool_name in self._handlers

    def list_tools(self) -> list:
        """Return the names of all registered tools."""
        return list(self._handlers.keys())


# ---------------------------------------------------------------------------
# Singleton registry instance — import this everywhere.
# ---------------------------------------------------------------------------
tool_registry = ToolRegistry()
