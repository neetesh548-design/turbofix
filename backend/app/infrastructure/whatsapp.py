"""WhatsApp messaging — routes through WaCRM when configured, else direct Meta Cloud API.

When WACRM_API_URL + WACRM_API_KEY are set, all sends go through WaCRM's public API,
giving TurboFix shared inbox, contact management, broadcasts, and conversation tracking.
Falls back to direct Meta Graph API calls when WaCRM is not configured.
"""

import mimetypes
from typing import List

from app import config
from app.infrastructure.http_client import resilient_get, resilient_post
from app.infrastructure.logging import get_logger

log = get_logger("turbofix.whatsapp")


def _use_wacrm() -> bool:
    from app.infrastructure.wacrm_client import is_configured
    return is_configured()


def _graph_url(path: str) -> str:
    return f"https://graph.facebook.com/{config.WHATSAPP_API_VERSION}/{path}"


async def download_media(media_id: str) -> str:
    """Resolve a WhatsApp media ID → download → save to MEDIA_STORE_DIR.

    Returns the local file path as a string (consumed by the AI transcription step).
    Raises on any HTTP/network error after retries.
    """
    headers = {"Authorization": f"Bearer {config.WHATSAPP_ACCESS_TOKEN}"}

    meta_resp = await resilient_get(_graph_url(media_id), headers=headers)
    meta = meta_resp.json()

    media_resp = await resilient_get(meta["url"], headers=headers)

    mime_type = meta.get("mime_type", "application/octet-stream")
    extension = mimetypes.guess_extension(mime_type.split(";")[0].strip()) or ""
    dest = config.MEDIA_STORE_DIR / f"{media_id}{extension}"
    dest.write_bytes(media_resp.content)
    log.info("whatsapp.media_downloaded", media_id=media_id, path=str(dest))
    return str(dest)


async def send_template_message(to: str, params: List[str]) -> None:
    """Send the pre-approved ticket notification template to `to`."""
    if _use_wacrm():
        from app.infrastructure import wacrm_client
        await wacrm_client.send_template_message(
            to=to,
            template_name=config.WHATSAPP_TICKET_TEMPLATE_NAME,
            language=config.WHATSAPP_TICKET_TEMPLATE_LANGUAGE,
            params=params,
        )
        return

    headers = {
        "Authorization": f"Bearer {config.WHATSAPP_ACCESS_TOKEN}",
        "Content-Type": "application/json",
    }
    payload = {
        "messaging_product": "whatsapp",
        "to": to,
        "type": "template",
        "template": {
            "name": config.WHATSAPP_TICKET_TEMPLATE_NAME,
            "language": {"code": config.WHATSAPP_TICKET_TEMPLATE_LANGUAGE},
            "components": [{
                "type": "body",
                "parameters": [{"type": "text", "text": str(p)} for p in params],
            }],
        },
    }
    await resilient_post(
        _graph_url(f"{config.WHATSAPP_PHONE_NUMBER_ID}/messages"),
        headers=headers,
        json=payload,
    )
    log.info("whatsapp.template_sent", to=to, template=config.WHATSAPP_TICKET_TEMPLATE_NAME)


async def send_closure_template(to: str, params: List[str]) -> None:
    """Send the ticket-closed notification template to `to`."""
    if _use_wacrm():
        from app.infrastructure import wacrm_client
        await wacrm_client.send_template_message(
            to=to,
            template_name=config.WHATSAPP_CLOSURE_TEMPLATE_NAME,
            language=config.WHATSAPP_CLOSURE_TEMPLATE_LANGUAGE,
            params=params,
        )
        return

    headers = {
        "Authorization": f"Bearer {config.WHATSAPP_ACCESS_TOKEN}",
        "Content-Type": "application/json",
    }
    payload = {
        "messaging_product": "whatsapp",
        "to": to,
        "type": "template",
        "template": {
            "name": config.WHATSAPP_CLOSURE_TEMPLATE_NAME,
            "language": {"code": config.WHATSAPP_CLOSURE_TEMPLATE_LANGUAGE},
            "components": [{
                "type": "body",
                "parameters": [{"type": "text", "text": str(p)} for p in params],
            }],
        },
    }
    await resilient_post(
        _graph_url(f"{config.WHATSAPP_PHONE_NUMBER_ID}/messages"),
        headers=headers,
        json=payload,
    )
    log.info("whatsapp.closure_sent", to=to, template=config.WHATSAPP_CLOSURE_TEMPLATE_NAME)


async def send_text_message(to: str, text: str) -> None:
    """Send a plain text message."""
    if _use_wacrm():
        from app.infrastructure import wacrm_client
        await wacrm_client.send_text_message(to, text)
        return

    headers = {
        "Authorization": f"Bearer {config.WHATSAPP_ACCESS_TOKEN}",
        "Content-Type": "application/json",
    }
    payload = {
        "messaging_product": "whatsapp",
        "to": to,
        "type": "text",
        "text": {"body": text},
    }
    await resilient_post(
        _graph_url(f"{config.WHATSAPP_PHONE_NUMBER_ID}/messages"),
        headers=headers,
        json=payload,
    )
    log.info("whatsapp.text_sent", to=to)


async def send_escalation_template(to: str, params: List[str]) -> None:
    """Send escalation notification template."""
    if _use_wacrm():
        from app.infrastructure import wacrm_client
        await wacrm_client.send_template_message(
            to=to,
            template_name=config.WHATSAPP_ESCALATION_TEMPLATE_NAME,
            language=config.WHATSAPP_ESCALATION_TEMPLATE_LANGUAGE,
            params=params,
        )
        return

    headers = {
        "Authorization": f"Bearer {config.WHATSAPP_ACCESS_TOKEN}",
        "Content-Type": "application/json",
    }
    payload = {
        "messaging_product": "whatsapp",
        "to": to,
        "type": "template",
        "template": {
            "name": config.WHATSAPP_ESCALATION_TEMPLATE_NAME,
            "language": {"code": config.WHATSAPP_ESCALATION_TEMPLATE_LANGUAGE},
            "components": [{
                "type": "body",
                "parameters": [{"type": "text", "text": str(p)} for p in params],
            }],
        },
    }
    await resilient_post(
        _graph_url(f"{config.WHATSAPP_PHONE_NUMBER_ID}/messages"),
        headers=headers,
        json=payload,
    )
    log.info("whatsapp.escalation_sent", to=to)


async def send_broadcast(name: str, template_name: str, language: str,
                         recipients: List[dict]) -> dict:
    """Send a broadcast to multiple recipients. Only available via WaCRM.

    recipients: [{"to": "+phone", "params": ["var1"]}, ...]
    Falls back to individual sends if WaCRM is not configured.
    """
    if _use_wacrm():
        from app.infrastructure import wacrm_client
        return await wacrm_client.launch_broadcast(
            name=name,
            template_name=template_name,
            template_language=language,
            recipients=recipients,
        )

    sent = 0
    for r in recipients:
        try:
            to = r.get("to", "")
            params = r.get("params", [])
            headers = {
                "Authorization": f"Bearer {config.WHATSAPP_ACCESS_TOKEN}",
                "Content-Type": "application/json",
            }
            payload = {
                "messaging_product": "whatsapp",
                "to": to,
                "type": "template",
                "template": {
                    "name": template_name,
                    "language": {"code": language},
                    "components": [{
                        "type": "body",
                        "parameters": [{"type": "text", "text": str(p)} for p in params],
                    }],
                },
            }
            await resilient_post(
                _graph_url(f"{config.WHATSAPP_PHONE_NUMBER_ID}/messages"),
                headers=headers,
                json=payload,
            )
            sent += 1
        except Exception as exc:
            log.error("whatsapp.broadcast_individual_failed", to=r.get("to"), error=str(exc))

    return {"total_recipients": len(recipients), "accepted": sent}
