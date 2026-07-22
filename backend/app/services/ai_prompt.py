from typing import Dict, Any, Optional

CHAT_SYSTEM_PROMPT_BASE = (
    "You are a friendly, helpful AI assistant for LaptopCare — a laptop care and support service website. "
    "You help customers with laptop troubleshooting, warranty inquiries, AMC (Annual Maintenance Contract) questions, "
    "ticket tracking, product information, and general laptop care advice. "
    "Be conversational, empathetic, and concise. Use markdown formatting for clarity when listing steps. "
    "If you cannot resolve an issue, suggest the customer raise a support ticket. "
)

VOICE_SYSTEM_PROMPT_BASE = (
    "You are a friendly, concise AI voice assistant for LaptopCare customer support on a phone call. "
    "Keep responses short (1-3 sentences maximum) since you are speaking out loud so that the caller can easily understand you. "
    "Be helpful with laptop repairs, warranty queries, technical support, and ticket status. "
    "Do not use markdown formatting, bullet points, asterisks, or code snippets — write plain spoken language only."
)

HALLUCINATION_GUARDRAILS = (
    "\n\n--- CRITICAL RULES FOR FACTUAL GROUNDING ---\n"
    "1. The Customer Context details below are authoritative and 100% correct.\n"
    "2. Never invent or hallucinate registered products, models, serial numbers, warranty status, or ticket numbers.\n"
    "3. Never ask the customer for information (such as their laptop model, serial, email, or ticket status) if it already exists in the Customer Context below.\n"
    "4. If the customer asks about their device details, warranty, or ticket and it is not listed in the context, explicitly say that you do not have that information on file instead of guessing or inventing details."
)

def build_system_prompt(user_context: Optional[Dict[str, Any]] = None, mode: str = "voice") -> str:
    """Build a unified system prompt with dynamic customer context and anti-hallucination guardrails."""
    prompt = VOICE_SYSTEM_PROMPT_BASE if mode == "voice" else CHAT_SYSTEM_PROMPT_BASE
    prompt += HALLUCINATION_GUARDRAILS

    if user_context:
        context_parts = ["\n\nCustomer Context:"]
        
        # Format profile details
        if user_context.get("name"):
            context_parts.append(f"Name: {user_context['name']}.")
        if user_context.get("email"):
            context_parts.append(f"Email: {user_context['email']}.")
        if user_context.get("phone"):
            context_parts.append(f"Phone: {user_context['phone']}.")

        # Format products list
        products = user_context.get("products", [])
        if products:
            context_parts.append("Registered Products:")
            for i, prod in enumerate(products, 1):
                name = prod.get('name', 'Unknown')
                serial = prod.get('serial', 'N/A')
                warranty = prod.get('warranty_status', 'Active')
                warranty_days = prod.get('warranty_days_remaining', 'N/A')
                amc = prod.get('amc_status', 'Inactive')
                amc_days = prod.get('amc_days_remaining', 'N/A')
                model = prod.get('model') or name

                parts = [f"  {i}. {name}"]
                if model and model != name:
                    parts.append(f"(Model: {model}, Serial: {serial})")
                else:
                    parts.append(f"(Serial: {serial})")
                
                parts.append(f"— Warranty: {warranty}")
                if warranty_days != 'N/A':
                    parts.append(f"({warranty_days} days left)")
                if amc_days != 'N/A':
                    parts.append(f", AMC: {amc} ({amc_days} days left)")

                context_parts.append(" ".join(parts))

        # Format tickets list
        tickets = user_context.get("tickets", [])
        if tickets:
            context_parts.append("Recent Support Tickets:")
            for i, t in enumerate(tickets, 1):
                t_id = t.get('id', 'N/A')
                t_prod = t.get('product', 'Unknown Device')
                t_status = t.get('status', 'Open')
                t_desc = t.get('description', 'No details')
                context_parts.append(f"  {i}. Ticket #{t_id} ({t_prod}): Status={t_status}, Issue={t_desc}")

        prompt += " ".join(context_parts)

    return prompt
