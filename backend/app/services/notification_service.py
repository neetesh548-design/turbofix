"""Notification service — handles Email and WhatsApp routing for POs and requests."""

from typing import Optional

from app.email_client import send_email
from app.infrastructure import whatsapp
from app.infrastructure.logging import get_logger
from app.repositories.supabase_repo import SupabaseUserRepository

log = get_logger("turbofix.notification")
_user_repo = SupabaseUserRepository()

async def send_po_notification(phone: str, params: list) -> None:
    """Send PO/Part request notifications via Email (always) and WhatsApp (if not opted out).
    
    params usually: [po_code, item_name, qty, status]
    """
    if not phone:
        return

    # Find the user by phone to check preferences and get email
    user = _user_repo.get_by_identifier(phone)
    if not user:
        log.warning("notification.user_not_found", phone=phone)
        # Fallback to just WhatsApp if we don't know who this is
        await _send_whatsapp(phone, params)
        return

    email = user.get("email")
    opt_out_whatsapp = user.get("opt_out_whatsapp", False)

    # 1. Send Email (mandatory)
    if email:
        _send_po_email(email, params)
    else:
        log.info("notification.no_email", phone=phone)

    # 2. Send WhatsApp (if not opted out)
    if not opt_out_whatsapp:
        await _send_whatsapp(phone, params)
    else:
        log.info("notification.whatsapp_opted_out", phone=phone)

def _send_po_email(email: str, params: list) -> None:
    # If legacy PO callers provide 4 params: [reference, part, quantity/reason, status]
    # We build a simple template.
    if len(params) >= 4:
        reference, part, qty, status = params[:4]
    else:
        reference, part, qty, status = "Unknown", "Unknown", "Unknown", "Unknown"
        
    subject = f"TurboFix Notification: Part Request/PO {status} ({reference})"
    body = (
        f"Hello,\n\n"
        f"This is an automated notification from TurboFix regarding your request.\n\n"
        f"Reference: {reference}\n"
        f"Part: {part}\n"
        f"Quantity/Reason: {qty}\n"
        f"Status: {status}\n\n"
        f"Please check the TurboFix dashboard for more details.\n"
    )
    send_email(email, subject, body)
    log.info("notification.email_sent", to=email, reference=reference)

async def _send_whatsapp(phone: str, params: list) -> None:
    # Expand to the six placeholders used by turbofix_part_request as before
    if len(params) == 4:
        reference, part, quantity, status = params
        expanded_params = [reference, "Not specified", part, quantity, phone, status]
    else:
        expanded_params = params
    await whatsapp.send_part_request_template(phone, expanded_params)
    log.info("notification.whatsapp_sent", to=phone)
