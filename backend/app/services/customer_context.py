import logging
import os
from typing import Dict, Any, List, Optional
from .. import storage
from . import supabase_repository

logger = logging.getLogger("customer_context")

def normalize_product(prod: Dict[str, Any]) -> Dict[str, Any]:
    """Normalize product attributes to use a single canonical schema."""
    name = prod.get('name') or prod.get('nickname')
    model = prod.get('model')
    image = prod.get('image')
    
    # Resolve catalog details if joined
    catalog_info = prod.get('product') or {}
    if catalog_info:
        name = name or catalog_info.get('name')
        model = model or catalog_info.get('model')
        image = image or catalog_info.get('image_url')
        
    name = name or 'Unknown Product'
    model = model or name
    serial = prod.get('serial') or prod.get('serial_number') or 'N/A'
    
    # Resolve warranty fields
    warranty_status = prod.get('warranty') or prod.get('status') or 'Active'
    warranty_days = prod.get('warranty_days_remaining') or prod.get('warranty_days_left') or prod.get('warrantyDays')
    if warranty_days is None:
        warranty_days = 'N/A'
    
    # Resolve AMC fields
    amc_status = prod.get('amc') or prod.get('amc_status') or 'Inactive'
    amc_days = prod.get('amc_days_remaining') or prod.get('amc_days_left') or prod.get('amcDays')
    if amc_days is None:
        amc_days = 'N/A'

    return {
        "name": name,
        "model": model,
        "serial": serial,
        "warranty_status": warranty_status,
        "warranty_days_remaining": warranty_days,
        "amc_status": amc_status,
        "amc_days_remaining": amc_days,
        "purchase_date": prod.get('purchaseDate') or prod.get('purchase_date') or 'N/A'
    }

def normalize_ticket(ticket: Dict[str, Any]) -> Dict[str, Any]:
    """Normalize ticket attributes."""
    user_prod = ticket.get("user_product") or {}
    catalog = user_prod.get("product") or {} if isinstance(user_prod, dict) else {}
    prod_name = catalog.get("name") if isinstance(catalog, dict) else None
    prod_name = prod_name or ticket.get("product") or ticket.get("product_name") or ticket.get("title") or "Laptop/Device"

    return {
        "id": ticket.get("id", "N/A"),
        "product": prod_name,
        "category": ticket.get("category", "General"),
        "status": ticket.get("status", "Open"),
        "priority": ticket.get("priority", "Medium"),
        "description": ticket.get("description") or ticket.get("title") or "No description",
        "date": ticket.get("date") or ticket.get("created_at") or "N/A"
    }

def build_customer_context(
    phone: Optional[str] = None,
    email: Optional[str] = None,
    user_id: Optional[str] = None,
    jwt: Optional[str] = None,
    client_provided_context: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """Build a unified customer context dictionary from Supabase repository, with a local dev fallback."""
    
    is_dev = os.environ.get("ENV") == "development" or not os.environ.get("SUPABASE_URL")
    
    # 1. Read directly from client-provided context if present and we're in dev mode
    if client_provided_context and is_dev:
        logger.info("[Customer Context] Constructing context from client-provided dev payload.")
        name = client_provided_context.get("name") or client_provided_context.get("full_name")
        email_address = client_provided_context.get("email") or email
        phone_number = client_provided_context.get("phone") or phone
        
        products = [normalize_product(p) for p in client_provided_context.get("products", [])]
        tickets = [normalize_ticket(t) for t in client_provided_context.get("tickets", [])]
        
        return {
            "name": name,
            "email": email_address,
            "phone": phone_number,
            "products": products,
            "tickets": tickets
        }

    # 2. Production/Supabase Mode: Load profile dynamically
    resolved_email = email
    resolved_phone = phone
    resolved_user_id = user_id

    if client_provided_context:
        resolved_email = resolved_email or client_provided_context.get("email")
        resolved_phone = resolved_phone or client_provided_context.get("phone")
        resolved_user_id = resolved_user_id or client_provided_context.get("id") or client_provided_context.get("user_id")

    profile = None

    try:
        # A. Look up profile by phone (e.g. Twilio Caller)
        if resolved_phone:
            profile = supabase_repository.get_profile_by_phone(resolved_phone)
            if profile:
                resolved_user_id = profile.get("id")

        # B. Look up profile by JWT token (e.g. Browser Voice)
        elif jwt and resolved_user_id:
            profile = supabase_repository.get_profile_by_user_id(resolved_user_id, jwt=jwt)

        # C. Look up profile by user_id directly
        elif resolved_user_id:
            profile = supabase_repository.get_profile_by_user_id(resolved_user_id)

        # D. Look up profile by email directly
        elif resolved_email:
            # If we don't have get_profile_by_email, query profiles matching email via REST
            from .supabase_repository import _execute_supabase_request
            escaped_email = urllib.parse.quote(resolved_email)
            endpoint = f"profiles?select=*&email=eq.{escaped_email}"
            results = _execute_supabase_request(endpoint)
            profile = results[0] if results else None
            if profile:
                resolved_user_id = profile.get("id")

    except Exception as e:
        logger.error(f"[Customer Context] Supabase lookup failed: {e}")
        if not is_dev:
            # In production, do not fall back to local mock data silently
            raise RuntimeError(f"Database query failed: {e}")

    # 3. Load user products and tickets from database
    products = []
    tickets = []

    if resolved_user_id:
        try:
            db_products = supabase_repository.get_user_products(resolved_user_id, jwt=jwt)
            products = [normalize_product(p) for p in db_products]
            
            db_tickets = supabase_repository.get_user_tickets(resolved_user_id, jwt=jwt)
            tickets = [normalize_ticket(t) for t in db_tickets]
        except Exception as e:
            logger.error(f"[Customer Context] Supabase products/tickets lookup failed: {e}")
            if not is_dev:
                raise RuntimeError(f"Database query failed: {e}")

    # Fallback to client-provided products/tickets if DB query returned empty
    if client_provided_context:
        if not products and client_provided_context.get("products"):
            products = [normalize_product(p) for p in client_provided_context.get("products", [])]
        if not tickets and client_provided_context.get("tickets"):
            tickets = [normalize_ticket(t) for t in client_provided_context.get("tickets", [])]

    # 4. Fallback to Local Mock JSON Storage if we are in development mode and no records were found
    if is_dev and not profile and not products:
        logger.info("[Customer Context] Database empty or unavailable. Falling back to local db.json.")
        name = "Alex Johnson"
        email_address = email or "alex@laptopcare.com"
        phone_number = phone or "+15559876543"
        
        db_products = storage.get_all("products")
        products = [normalize_product(p) for p in db_products]
        
        db_tickets = storage.get_all("tickets")
        tickets = [normalize_ticket(t) for t in db_tickets]
        
        return {
            "name": name,
            "email": email_address,
            "phone": phone_number,
            "products": products,
            "tickets": tickets
        }

    return {
        "name": profile.get("full_name") or profile.get("name") if profile else None,
        "email": profile.get("email") if profile else resolved_email,
        "phone": profile.get("phone") if profile else resolved_phone,
        "products": products,
        "tickets": tickets
    }
