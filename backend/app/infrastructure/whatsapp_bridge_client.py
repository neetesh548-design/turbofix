"""WhatsApp Bridge Client — integration for zero-cost whatsmeow WhatsApp Web QR mode.

Allows sending WhatsApp breakdown notifications, ticket closures, escalations, and voice notes
directly through a paired WhatsApp phone via local Go whatsmeow REST API.
"""

from typing import List, Optional
from app import config
from app.infrastructure.http_client import resilient_post, resilient_get
from app.infrastructure.logging import get_logger

log = get_logger("turbofix.whatsapp_bridge")


def is_configured() -> bool:
    """Check if WhatsApp bridge mode is active."""
    provider = str(getattr(config, "WHATSAPP_PROVIDER", "") or "").strip().lower()
    url = str(getattr(config, "WHATSAPP_BRIDGE_URL", "") or "").strip()
    return provider == "bridge" or bool(url and url != "none")


def _bridge_url(path: str) -> str:
    base = str(getattr(config, "WHATSAPP_BRIDGE_URL", "http://localhost:8080")).rstrip("/")
    return f"{base}/{path.lstrip('/')}"


async def send_text_message(to: str, text: str) -> None:
    """Send a plain text message via the Go whatsmeow bridge."""
    url = _bridge_url("/api/send")
    payload = {
        "recipient": to,
        "message": text,
    }
    await resilient_post(url, json=payload)
    log.info("whatsapp_bridge.text_sent", to=to)


async def send_template_message(to: str, template_name: str, language: str, params: List[str]) -> None:
    """Format template parameters into structured plain-text message and send via bridge."""
    if "closed" in template_name.lower():
        text = _format_closure_message(params)
    elif "escalation" in template_name.lower():
        text = _format_escalation_message(params)
    elif "approval" in template_name.lower():
        text = _format_approval_message(params)
    elif "rejection" in template_name.lower():
        text = _format_rejection_message(params)
    elif "part" in template_name.lower():
        text = _format_part_request_message(params)
    else:
        text = _format_ticket_message(params)

    await send_text_message(to, text)


def _format_ticket_message(params: List[str]) -> str:
    ticket = params[0] if len(params) > 0 else "N/A"
    machine = params[1] if len(params) > 1 else "N/A"
    location = params[2] if len(params) > 2 else "N/A"
    issue = params[3] if len(params) > 3 else "N/A"
    urgency = params[4] if len(params) > 4 else "N/A"
    assignee = params[5] if len(params) > 5 else "N/A"

    return (
        f"🚨 *TURBOFIX BREAKDOWN ALERT*\n\n"
        f"📋 *Ticket ID:* {ticket}\n"
        f"⚙️ *Machine:* {machine}\n"
        f"📍 *Location:* {location}\n"
        f"⚠️ *Urgency:* {urgency.upper()}\n"
        f"📝 *Issue:* {issue}\n"
        f"👤 *Assigned To:* {assignee}\n\n"
        f"Reply to update status or upload repair notes."
    )


def _format_closure_message(params: List[str]) -> str:
    ticket = params[0] if len(params) > 0 else "N/A"
    machine = params[1] if len(params) > 1 else "N/A"
    resolution = params[2] if len(params) > 2 else "N/A"
    closer = params[3] if len(params) > 3 else "N/A"
    duration = params[4] if len(params) > 4 else "N/A"

    return (
        f"✅ *TURBOFIX TICKET CLOSED*\n\n"
        f"📋 *Ticket ID:* {ticket}\n"
        f"⚙️ *Machine:* {machine}\n"
        f"🛠️ *Resolution:* {resolution}\n"
        f"👤 *Closed By:* {closer}\n"
        f"⏱️ *Duration:* {duration}\n\n"
        f"Machine is verified running."
    )


def _format_escalation_message(params: List[str]) -> str:
    ticket = params[0] if len(params) > 0 else "N/A"
    machine = params[1] if len(params) > 1 else "N/A"
    level = params[2] if len(params) > 2 else "N/A"
    issue = params[3] if len(params) > 3 else "N/A"
    elapsed = params[4] if len(params) > 4 else "N/A"

    return (
        f"⚠️ *TURBOFIX ESCALATION NOTICE ({level.upper()})*\n\n"
        f"📋 *Ticket ID:* {ticket}\n"
        f"⚙️ *Machine:* {machine}\n"
        f"⏱️ *Unresolved Duration:* {elapsed}\n"
        f"📝 *Issue:* {issue}\n\n"
        f"Immediate supervisor / lead intervention required."
    )


def _format_approval_message(params: List[str]) -> str:
    ticket = params[0] if len(params) > 0 else "N/A"
    machine = params[1] if len(params) > 1 else "N/A"
    tech = params[2] if len(params) > 2 else "N/A"

    return (
        f"🔍 *TURBOFIX CLOSURE APPROVAL REQUIRED*\n\n"
        f"📋 *Ticket ID:* {ticket}\n"
        f"⚙️ *Machine:* {machine}\n"
        f"👷 *Technician:* {tech}\n\n"
        f"Please review work order details and approve final closure."
    )


def _format_rejection_message(params: List[str]) -> str:
    ticket = params[0] if len(params) > 0 else "N/A"
    machine = params[1] if len(params) > 1 else "N/A"
    reason = params[2] if len(params) > 2 else "N/A"

    return (
        f"❌ *TURBOFIX WORK ORDER REJECTED*\n\n"
        f"📋 *Ticket ID:* {ticket}\n"
        f"⚙️ *Machine:* {machine}\n"
        f"📝 *Reason:* {reason}\n\n"
        f"Technician needs to perform follow-up work."
    )


def _format_part_request_message(params: List[str]) -> str:
    ticket = params[0] if len(params) > 0 else "N/A"
    machine = params[1] if len(params) > 1 else "N/A"
    part = params[2] if len(params) > 2 else "N/A"
    qty = params[3] if len(params) > 3 else "N/A"

    return (
        f"📦 *TURBOFIX SPARE PART REQUEST*\n\n"
        f"📋 *Ticket ID:* {ticket}\n"
        f"⚙️ *Machine:* {machine}\n"
        f"🔧 *Part Requested:* {part}\n"
        f"🔢 *Quantity:* {qty}\n\n"
        f"Inventory team has been notified."
    )
