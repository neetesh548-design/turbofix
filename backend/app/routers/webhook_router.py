"""Webhook router — WhatsApp webhook receive + verify.

This router is intentionally thin:
- Parse the incoming HTTP request.
- Return 200 OK to WhatsApp as fast as possible.
- Delegate all business logic to ticket_service.
"""

import hashlib
import hmac
import re

from fastapi import APIRouter, BackgroundTasks, Depends, Request, Response

from app.dependencies import get_events, get_machines, get_tickets
from app.infrastructure.rate_limit import limiter
from app.repositories.base import EventRepository, MachineRepository, TicketRepository
from app.services import ticket_service
from app.sessions import SessionStore
from app import config
from app.infrastructure.logging import get_logger

log = get_logger("turbofix.webhook")

router = APIRouter()


def _verify_webhook_signature(body: bytes, signature_header: str) -> bool:
    """Verify the X-Hub-Signature-256 HMAC from Meta."""
    if not config.WHATSAPP_APP_SECRET:
        log.warning("webhook.signature_skip", reason="WHATSAPP_APP_SECRET not set")
        return True
    if not signature_header:
        return False
    expected = "sha256=" + hmac.new(
        config.WHATSAPP_APP_SECRET.encode(), body, hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(expected, signature_header)

_sessions = SessionStore()


def get_sessions() -> SessionStore:
    """Dependency that returns the module-level session store."""
    return _sessions


@router.get("/webhook")
def verify_webhook(request: Request):
    """Meta's one-time handshake when you register the webhook URL."""
    mode = request.query_params.get("hub.mode")
    token = request.query_params.get("hub.verify_token")
    challenge = request.query_params.get("hub.challenge", "")

    if mode == "subscribe" and token == config.WHATSAPP_VERIFY_TOKEN:
        return Response(content=challenge, media_type="text/plain")
    return Response(status_code=403)


def _iter_messages(payload: dict):
    for entry in payload.get("entry", []):
        for change in entry.get("changes", []):
            value = change.get("value", {})
            for message in value.get("messages", []):
                yield message


@router.post("/webhook")
@limiter.limit("60/minute")
async def receive_webhook(
    request: Request,
    background_tasks: BackgroundTasks,
    tickets: TicketRepository = Depends(get_tickets),
    machines: MachineRepository = Depends(get_machines),
    events: EventRepository = Depends(get_events),
):
    """Receive and dispatch an incoming WhatsApp message.

    Returns 200 immediately (WhatsApp requires a fast ack); all slow work
    (AI, fan-out) is dispatched as background tasks.
    """
    body = await request.body()
    signature = request.headers.get("X-Hub-Signature-256", "")
    if not _verify_webhook_signature(body, signature):
        log.warning("webhook.invalid_signature")
        return Response(status_code=403)

    import json
    payload = json.loads(body)
    sessions = get_sessions()

    for message in _iter_messages(payload):
        phone = message.get("from", "")
        if phone and not phone.startswith("+"):
            phone = "+" + phone
        msg_type = message.get("type")

        if msg_type == "text":
            text_body = message.get("text", {}).get("body", "")
            await ticket_service.handle_text_message(
                phone=phone,
                text=text_body,
                background_tasks=background_tasks,
                sessions=sessions,
                tickets=tickets,
                machines=machines,
                events=events,
            )
        elif msg_type == "audio":
            await ticket_service.handle_audio_message(
                phone=phone,
                media_id=message.get("audio", {}).get("id", ""),
                background_tasks=background_tasks,
                sessions=sessions,
                tickets=tickets,
                machines=machines,
                events=events,
            )
        elif msg_type == "image":
            media_id = message.get("image", {}).get("id", "")
            caption = message.get("image", {}).get("caption", "")
            close_match = re.search(
                r"(?:close|evidence|proof)\s*(T[\w-]+)", caption, re.IGNORECASE,
            )
            if close_match:
                background_tasks.add_task(
                    ticket_service.handle_closure_evidence,
                    phone, close_match.group(1), media_id, tickets, machines,
                )
            else:
                await ticket_service.handle_image_message(
                    phone=phone,
                    media_id=media_id,
                    background_tasks=background_tasks,
                    sessions=sessions,
                    tickets=tickets,
                    machines=machines,
                    events=events,
                )
        else:
            log.info("webhook.unsupported_type", msg_type=msg_type, phone=phone)

    return Response(status_code=200)


# ---------------------------------------------------------------------------
# WaCRM webhook receiver — receives events from WaCRM (message.received, etc.)
# ---------------------------------------------------------------------------

def _verify_wacrm_signature(body: bytes, signature_header: str) -> bool:
    """Verify X-Wacrm-Signature: t=unix,v1=hmac-sha256."""
    if not config.WACRM_WEBHOOK_SECRET:
        log.warning("wacrm_webhook.signature_skip", reason="WACRM_WEBHOOK_SECRET not set")
        return True
    if not signature_header:
        return False

    parts = {}
    for part in signature_header.split(","):
        key, _, val = part.partition("=")
        parts[key.strip()] = val.strip()

    timestamp = parts.get("t", "")
    received_sig = parts.get("v1", "")
    if not timestamp or not received_sig:
        return False

    signed_payload = f"{timestamp}.".encode() + body
    expected = hmac.new(
        config.WACRM_WEBHOOK_SECRET.encode(), signed_payload, hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(expected, received_sig)


@router.post("/wacrm-webhook")
@limiter.limit("120/minute")
async def receive_wacrm_webhook(
    request: Request,
    background_tasks: BackgroundTasks,
    tickets: TicketRepository = Depends(get_tickets),
    machines: MachineRepository = Depends(get_machines),
    events: EventRepository = Depends(get_events),
):
    """Receive webhook events from WaCRM.

    WaCRM fires events for: message.received, message.sent, message.delivered,
    message.read, contact.created, contact.updated, conversation.opened,
    conversation.closed.

    We only act on message.received — the rest are logged for future use.
    """
    body = await request.body()
    signature = request.headers.get("X-Wacrm-Signature", "")
    if not _verify_wacrm_signature(body, signature):
        log.warning("wacrm_webhook.invalid_signature")
        return Response(status_code=403)

    import json
    payload = json.loads(body)
    event_type = payload.get("event", "")
    data = payload.get("data", {})

    log.info("wacrm_webhook.received", event=event_type)

    if event_type == "message.received":
        message = data.get("message", {})
        contact = data.get("contact", {})
        phone = contact.get("phone", "") or message.get("from", "")
        if phone and not phone.startswith("+"):
            phone = "+" + phone
        msg_type = message.get("type", "text")
        sessions = get_sessions()

        if msg_type == "text":
            text_body = message.get("text", "") or message.get("body", "")
            await ticket_service.handle_text_message(
                phone=phone,
                text=text_body,
                background_tasks=background_tasks,
                sessions=sessions,
                tickets=tickets,
                machines=machines,
                events=events,
            )
        elif msg_type == "audio":
            media_id = message.get("media_id", "") or message.get("id", "")
            await ticket_service.handle_audio_message(
                phone=phone,
                media_id=media_id,
                background_tasks=background_tasks,
                sessions=sessions,
                tickets=tickets,
                machines=machines,
                events=events,
            )
        elif msg_type == "image":
            media_id = message.get("media_id", "") or message.get("id", "")
            caption = message.get("caption", "")
            close_match = re.search(
                r"(?:close|evidence|proof)\s*(T[\w-]+)", caption, re.IGNORECASE,
            )
            if close_match:
                background_tasks.add_task(
                    ticket_service.handle_closure_evidence,
                    phone, close_match.group(1), media_id, tickets, machines,
                )
            else:
                await ticket_service.handle_image_message(
                    phone=phone,
                    media_id=media_id,
                    background_tasks=background_tasks,
                    sessions=sessions,
                    tickets=tickets,
                    machines=machines,
                    events=events,
                )

    return Response(status_code=200)
