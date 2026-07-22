"""
tools/dispatcher.py
===================
The ToolDispatcher routes tool calls received from the LLM to the correct
handler in the ToolRegistry, validates arguments, and returns the result.

Responsibilities:
  - Parse the raw tool call object from the Groq response
  - Safely parse the JSON arguments string from the LLM
  - Look up the handler in the ToolRegistry
  - Execute the handler and capture the result (passing context if handler supports it)
  - Handle all failure modes (unknown tool, malformed JSON, runtime errors)
  - Log execution details including timing

Phase 2 addition:
  - Accepts an optional `context` dict (user_id, email, jwt) forwarded from
    the chat router. Handlers that declare a `context` parameter receive it;
    handlers that don't are called with arguments only (backward-compatible).

Design principle:
  The dispatcher is a pure router — it has NO knowledge of what any tool
  does. Business logic lives exclusively in the handlers.

  The chat endpoint calls:
      results = dispatcher.dispatch_all(tool_calls)
  and gets back a list of tool results ready to be sent to the LLM.
"""

import json
import time
import logging
import inspect
from typing import Any, Dict, List, Optional

from .registry import tool_registry

logger = logging.getLogger("tool_dispatcher")


class ToolDispatcher:
    """
    Routes LLM tool calls to registered handlers.
    """

    def dispatch(
        self,
        tool_name: str,
        raw_arguments: str,
        context: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        Execute a single tool call.

        Args:
            tool_name:      The name of the tool the LLM requested (e.g. "create_ticket")
            raw_arguments:  The raw JSON string of arguments from the LLM
            context:        Optional dict with authenticated user info:
                              { "user_id": str, "email": str, "jwt": str }
                            Passed to handlers that declare a `context` parameter.

        Returns:
            A dict with keys:
                "tool_call_id": str  (echoed back so LLM can correlate)
                "role":         "tool"
                "name":         str
                "content":      str  (JSON-encoded result or error)
        """
        start_time = time.perf_counter()
        logger.info(f"[DISPATCHER] Received tool call: '{tool_name}'")

        # ------------------------------------------------------------------
        # Step 1: Parse the JSON arguments safely.
        #         The LLM may send malformed JSON — we must handle this.
        # ------------------------------------------------------------------
        try:
            arguments = json.loads(raw_arguments) if raw_arguments else {}
            if not isinstance(arguments, dict):
                raise ValueError("Arguments must be a JSON object, not a list or scalar.")
        except (json.JSONDecodeError, ValueError) as e:
            logger.error(f"[DISPATCHER] Failed to parse arguments for '{tool_name}': {e}")
            logger.error(f"[DISPATCHER] Raw arguments received: {raw_arguments!r}")
            error_result = {
                "success": False,
                "error": f"Invalid tool arguments: {str(e)}",
            }
            return self._build_result(tool_name, json.dumps(error_result))

        # ------------------------------------------------------------------
        # Step 2: Look up the handler in the registry.
        #         Reject unknown tool names — never execute unregistered tools.
        # ------------------------------------------------------------------
        try:
            handler = tool_registry.get_handler(tool_name)
        except KeyError as e:
            logger.error(str(e))
            error_result = {
                "success": False,
                "error": f"Unknown tool '{tool_name}'. This tool is not registered.",
            }
            return self._build_result(tool_name, json.dumps(error_result))

        # ------------------------------------------------------------------
        # Step 3: Execute the handler.
        #         If the handler accepts a `context` parameter, pass it.
        #         Otherwise call with arguments only (backward-compatible).
        # ------------------------------------------------------------------
        try:
            sig = inspect.signature(handler)
            if "context" in sig.parameters and context is not None:
                result = handler(arguments, context=context)
            else:
                result = handler(arguments)
            elapsed_ms = (time.perf_counter() - start_time) * 1000
            logger.info(f"[DISPATCHER] Tool '{tool_name}' completed in {elapsed_ms:.1f}ms")
            return self._build_result(tool_name, json.dumps(result))
        except Exception as e:
            elapsed_ms = (time.perf_counter() - start_time) * 1000
            logger.error(f"[DISPATCHER] Tool '{tool_name}' raised an exception after {elapsed_ms:.1f}ms: {e}")
            error_result = {
                "success": False,
                "error": f"Tool execution failed: {str(e)}",
            }
            return self._build_result(tool_name, json.dumps(error_result))

    def dispatch_all(
        self,
        tool_calls: List[Any],
        context: Optional[Dict[str, Any]] = None,
    ) -> List[Dict[str, Any]]:
        """
        Dispatch a list of tool calls from the LLM response.

        Groq returns tool_calls as a list of objects with:
            .id                 — unique call identifier
            .function.name      — the tool name
            .function.arguments — JSON string of arguments

        Args:
            tool_calls: List of tool call objects from the LLM response.
            context:    Optional user context dict forwarded to each handler.

        Returns a list of tool result dicts, one per call.
        """
        results = []
        for tc in tool_calls:
            tool_name = tc.function.name
            raw_args = tc.function.arguments
            call_id = tc.id

            result = self.dispatch(tool_name, raw_args, context=context)
            # Attach the call ID so the LLM can correlate request → result
            result["tool_call_id"] = call_id
            results.append(result)

        return results

    # ------------------------------------------------------------------
    # Private helpers
    # ------------------------------------------------------------------
    @staticmethod
    def _build_result(tool_name: str, content_json: str) -> Dict[str, Any]:
        """Build the message dict format that Groq expects for tool results."""
        return {
            "tool_call_id": "",   # Will be overwritten in dispatch_all
            "role": "tool",
            "name": tool_name,
            "content": content_json,
        }


# Singleton dispatcher instance
tool_dispatcher = ToolDispatcher()
