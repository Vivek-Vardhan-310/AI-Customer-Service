"""
routers/chat.py
===============
Chat endpoint with full Tool Calling support (Phase 1+).

Flow:
  1. Build system prompt + conversation history
  2. Send to LLM with tool definitions attached
  3. If LLM returns tool_calls:
       a. Build a user context dict (user_id, email, jwt) — Phase 2
       b. Dispatch each tool call through ToolDispatcher (with context)
       c. Append the assistant message (with tool_calls) to history
       d. Append each tool result message to history
       e. Make a second LLM call for the final user-facing reply
  4. Return the final text reply to the frontend

Design principle:
  This router is a controller only — it orchestrates the flow.
  No business logic, no tool definitions, no handler code lives here.
  All tool execution is delegated to the ToolDispatcher.
"""

from fastapi import APIRouter, HTTPException, Header, Depends
from typing import Optional
import os
import logging

from ..schemas import ChatRequest
from ..services.ai import groq_service
from ..services.customer_context import build_customer_context
from ..services.ai_prompt import build_system_prompt
from ..dependencies import require_user
from .. import storage

# Import the tools package — this import triggers handler registration
from ..tools import tool_dispatcher
from ..tools.definitions import ALL_TOOL_DEFINITIONS

logger = logging.getLogger("chat_router")

router = APIRouter(prefix="/api/chat", tags=["chat"])


@router.post("")
def chat(
    req: ChatRequest,
    authorization: Optional[str] = Header(None),
    user = Depends(require_user)
):
    """
    Main chat endpoint with LLM tool calling support.

    Accepts a user message + conversation history and returns the AI reply.
    If the LLM decides to call a tool, the backend executes it and sends
    the result back to the LLM for a final human-readable response.
    """
    client = groq_service.get_client()

    if client is not None:
        try:
            # ------------------------------------------------------------------
            # Build customer context and system prompt
            # ------------------------------------------------------------------
            user_ctx_dict = (
                req.user_context.dict()
                if hasattr(req.user_context, "dict")
                else req.user_context
            )

            token = None
            if authorization and authorization.lower().startswith("bearer "):
                token = authorization.split(" ", 1)[1].strip()

            user_id = user.get("id") or user.get("sub")
            email = user.get("email")

            normalized_context = build_customer_context(
                user_id=user_id,
                email=email,
                jwt=token,
                client_provided_context=user_ctx_dict,
            )
            system_prompt = build_system_prompt(normalized_context, mode="chat")

            # ------------------------------------------------------------------
            # Assemble the messages list
            # ------------------------------------------------------------------
            messages = [{"role": "system", "content": system_prompt}]

            if req.history:
                for msg in req.history:
                    messages.append({"role": msg.role, "content": msg.content})

            messages.append({"role": "user", "content": req.message})

            # ------------------------------------------------------------------
            # Step 1: First LLM call — with tool definitions attached
            # ------------------------------------------------------------------
            model = os.environ.get("GROQ_MODEL", "llama-3.3-70b-versatile")
            temperature = float(os.environ.get("GROQ_TEMPERATURE", "0.7"))
            max_tokens = int(os.environ.get("GROQ_MAX_COMPLETION_TOKENS", "1024"))
            top_p = float(os.environ.get("GROQ_TOP_P", "1"))

            logger.info(f"[CHAT] Sending first LLM call. Tools available: {[t['function']['name'] for t in ALL_TOOL_DEFINITIONS]}")

            completion = client.chat.completions.create(
                model=model,
                messages=messages,
                tools=ALL_TOOL_DEFINITIONS,
                tool_choice="auto",          # LLM decides whether to call a tool
                temperature=temperature,
                max_completion_tokens=max_tokens,
                top_p=top_p,
                stream=False,
                stop=None,
            )

            first_message = completion.choices[0].message
            tool_calls = getattr(first_message, "tool_calls", None)

            # ------------------------------------------------------------------
            # Step 2: Check if the LLM requested tool calls
            # ------------------------------------------------------------------
            if tool_calls:
                logger.info(f"[CHAT] LLM requested {len(tool_calls)} tool call(s).")

                # ------------------------------------------------------------------
                # Phase 2: Build user context to pass into tool handlers.
                # This gives handlers access to user_id and jwt for DB writes
                # without exposing auth logic inside the handlers themselves.
                # ------------------------------------------------------------------
                user_context_for_tools = {
                    "user_id": user_id,
                    "email": email,
                    "jwt": token,
                }

                # Append the assistant's tool-call message to the conversation
                # We must convert the message object to a dict for the second call
                messages.append({
                    "role": "assistant",
                    "content": getattr(first_message, "content", None) or "",
                    "tool_calls": [
                        {
                            "id": tc.id,
                            "type": "function",
                            "function": {
                                "name": tc.function.name,
                                "arguments": tc.function.arguments,
                            },
                        }
                        for tc in tool_calls
                    ],
                })

                # Dispatch all tool calls and collect results
                # Pass the user context so handlers can persist data under the correct user
                tool_results = tool_dispatcher.dispatch_all(tool_calls, context=user_context_for_tools)

                # Append each tool result as a "tool" role message
                for result in tool_results:
                    messages.append(result)
                    logger.info(f"[CHAT] Tool result for '{result['name']}' appended to context.")

                # --------------------------------------------------------------
                # Step 3: Second LLM call — let LLM generate the final reply
                #         using the tool execution results as context
                # --------------------------------------------------------------
                logger.info("[CHAT] Sending second LLM call with tool results.")

                final_completion = client.chat.completions.create(
                    model=model,
                    messages=messages,
                    temperature=temperature,
                    max_completion_tokens=max_tokens,
                    top_p=top_p,
                    stream=False,
                    stop=None,
                    # No tools on the second call — we want a text reply
                )

                reply = (
                    groq_service.extract_reply(final_completion)
                    or "I've processed your request, but couldn't generate a summary."
                )
                logger.info("[CHAT] Final reply generated after tool execution.")
                return {"reply": reply}

            # ------------------------------------------------------------------
            # No tool calls — return the direct text reply
            # ------------------------------------------------------------------
            reply = (
                groq_service.extract_reply(completion)
                or "I'm sorry, I couldn't generate a response at this time."
            )
            return {"reply": reply}

        except Exception as e:
            logger.error(f"[CHAT] Error during chat processing: {e}", exc_info=True)
            raise HTTPException(status_code=502, detail=f"Groq request failed: {e}")

    # --------------------------------------------------------------------------
    # Fallback mock responses when Groq is not configured (local dev without API key)
    # --------------------------------------------------------------------------
    text = req.message.lower()
    if "warranty" in text:
        return {"reply": "Your product has an active warranty with 210 days remaining."}
    if "complaint" in text or "raise" in text:
        return {"reply": "I can help raise a complaint. Provide product, category, priority and description."}
    if "ticket" in text or "track" in text:
        tickets = storage.get_all("tickets")
        return {"reply": "Here are your tickets", "tickets": tickets}
    return {"reply": "Thanks for your message. Please provide more details."}
