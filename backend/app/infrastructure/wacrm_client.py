"""WaCRM public API client for TurboFix.

Routes WhatsApp operations through a self-hosted WaCRM instance, giving
TurboFix access to shared inbox, contact management, broadcasts, and
conversation tracking — all via WaCRM's REST API (/api/v1).

Only active when WACRM_API_URL + WACRM_API_KEY are configured.
"""

from typing import Optional

from app import config
from app.infrastructure.http_client import resilient_get, resilient_post
from app.infrastructure.logging import get_logger

log = get_logger("turbofix.wacrm")


def is_configured() -> bool:
    return bool(config.WACRM_API_URL and config.WACRM_API_KEY)


def _url(path: str) -> str:
    base = config.WACRM_API_URL.rstrip("/")
    return f"{base}/api/v1{path}"


def _headers() -> dict:
    return {
        "Authorization": f"Bearer {config.WACRM_API_KEY}",
        "Content-Type": "application/json",
    }


# ---- Messages --------------------------------------------------------------

async def send_text_message(to: str, text: str) -> dict:
    """Send a plain text WhatsApp message via WaCRM."""
    resp = await resilient_post(_url("/messages"), headers=_headers(), json={
        "to": to,
        "type": "text",
        "text": text,
    })
    data = resp.json()
    if "error" in data:
        log.error("wacrm.send_text_failed", to=to, error=data["error"])
        raise RuntimeError(f"WaCRM error: {data['error'].get('message', '')}")
    log.info("wacrm.text_sent", to=to, message_id=data.get("data", {}).get("message_id"))
    return data.get("data", {})


async def send_template_message(to: str, template_name: str,
                                language: str, params: list) -> dict:
    """Send a template WhatsApp message via WaCRM."""
    resp = await resilient_post(_url("/messages"), headers=_headers(), json={
        "to": to,
        "type": "template",
        "template": {
            "name": template_name,
            "language": language,
            "params": params,
        },
    })
    data = resp.json()
    if "error" in data:
        log.error("wacrm.send_template_failed", to=to, template=template_name,
                  error=data["error"])
        raise RuntimeError(f"WaCRM error: {data['error'].get('message', '')}")
    log.info("wacrm.template_sent", to=to, template=template_name,
             message_id=data.get("data", {}).get("message_id"))
    return data.get("data", {})


async def send_media_message(to: str, media_type: str, media_url: str,
                             caption: str = "") -> dict:
    """Send a media WhatsApp message (image/video/document/audio) via WaCRM."""
    payload = {
        "to": to,
        "type": media_type,
        "media_url": media_url,
    }
    if caption:
        payload["text"] = caption
    resp = await resilient_post(_url("/messages"), headers=_headers(), json=payload)
    data = resp.json()
    if "error" in data:
        raise RuntimeError(f"WaCRM error: {data['error'].get('message', '')}")
    return data.get("data", {})


# ---- Contacts --------------------------------------------------------------

async def get_or_create_contact(phone: str, name: str = "",
                                company: str = "",
                                tags: Optional[list] = None) -> dict:
    """Find or create a contact in WaCRM by phone number."""
    payload: dict = {"phone": phone}
    if name:
        payload["name"] = name
    if company:
        payload["company"] = company
    if tags:
        payload["tags"] = tags

    resp = await resilient_post(_url("/contacts"), headers=_headers(), json=payload)
    data = resp.json()
    if "error" in data:
        log.error("wacrm.contact_failed", phone=phone, error=data["error"])
        return {}
    return data.get("data", {})


async def list_contacts(search: str = "", tag: str = "",
                        limit: int = 50, cursor: str = "") -> dict:
    """List contacts with optional search/tag filter."""
    params = f"?limit={limit}"
    if search:
        params += f"&search={search}"
    if tag:
        params += f"&tag={tag}"
    if cursor:
        params += f"&cursor={cursor}"

    resp = await resilient_get(_url(f"/contacts{params}"), headers=_headers())
    data = resp.json()
    if "error" in data:
        return {"data": [], "meta": {}}
    return data


async def update_contact(contact_id: str, name: str = "",
                         company: str = "",
                         tags: Optional[list] = None) -> dict:
    """Update a contact's details."""
    from app.infrastructure.http_client import resilient_post
    import httpx

    payload: dict = {}
    if name:
        payload["name"] = name
    if company:
        payload["company"] = company
    if tags is not None:
        payload["tags"] = tags

    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.patch(
            _url(f"/contacts/{contact_id}"),
            headers=_headers(),
            json=payload,
        )
    data = resp.json()
    if "error" in data:
        return {}
    return data.get("data", {})


# ---- Conversations ---------------------------------------------------------

async def list_conversations(status: str = "", contact_id: str = "",
                             limit: int = 50, cursor: str = "") -> dict:
    """List conversations with optional filters."""
    params = f"?limit={limit}"
    if status:
        params += f"&status={status}"
    if contact_id:
        params += f"&contact_id={contact_id}"
    if cursor:
        params += f"&cursor={cursor}"

    resp = await resilient_get(_url(f"/conversations{params}"), headers=_headers())
    data = resp.json()
    if "error" in data:
        return {"data": [], "meta": {}}
    return data


async def get_conversation(conversation_id: str) -> dict:
    """Get a single conversation."""
    resp = await resilient_get(
        _url(f"/conversations/{conversation_id}"), headers=_headers(),
    )
    data = resp.json()
    if "error" in data:
        return {}
    return data.get("data", {})


async def get_conversation_messages(conversation_id: str,
                                    limit: int = 50,
                                    cursor: str = "") -> dict:
    """Get messages in a conversation."""
    params = f"?limit={limit}"
    if cursor:
        params += f"&cursor={cursor}"

    resp = await resilient_get(
        _url(f"/conversations/{conversation_id}/messages{params}"),
        headers=_headers(),
    )
    data = resp.json()
    if "error" in data:
        return {"data": [], "meta": {}}
    return data


# ---- Broadcasts ------------------------------------------------------------

async def launch_broadcast(name: str, template_name: str,
                           template_language: str,
                           recipients: list[dict]) -> dict:
    """Launch a template broadcast to multiple recipients.

    recipients: [{"to": "+phone", "params": ["var1", "var2"]}, ...]
    Max 1000 per request.
    """
    resp = await resilient_post(_url("/broadcasts"), headers=_headers(), json={
        "name": name,
        "template_name": template_name,
        "template_language": template_language,
        "recipients": recipients[:1000],
    })
    data = resp.json()
    if "error" in data:
        log.error("wacrm.broadcast_failed", name=name, error=data["error"])
        raise RuntimeError(f"WaCRM error: {data['error'].get('message', '')}")
    log.info("wacrm.broadcast_launched", name=name,
             total=data.get("data", {}).get("total_recipients"))
    return data.get("data", {})


async def get_broadcast_status(broadcast_id: str) -> dict:
    """Get broadcast delivery status."""
    resp = await resilient_get(
        _url(f"/broadcasts/{broadcast_id}"), headers=_headers(),
    )
    data = resp.json()
    if "error" in data:
        return {}
    return data.get("data", {})


# ---- Webhooks (self-registration) ------------------------------------------

async def register_webhook(url: str, events: list[str]) -> dict:
    """Register a webhook endpoint in WaCRM to receive events."""
    resp = await resilient_post(_url("/webhooks"), headers=_headers(), json={
        "url": url,
        "events": events,
    })
    data = resp.json()
    if "error" in data:
        log.error("wacrm.webhook_register_failed", url=url, error=data["error"])
        return {}
    result = data.get("data", {})
    log.info("wacrm.webhook_registered", id=result.get("id"),
             secret=result.get("secret", "")[:10] + "...")
    return result


async def list_webhooks() -> list:
    """List registered webhook endpoints."""
    resp = await resilient_get(_url("/webhooks"), headers=_headers())
    data = resp.json()
    if "error" in data:
        return []
    return data.get("data", [])


# ---- Account info ----------------------------------------------------------

async def get_account_info() -> dict:
    """Verify API key and get account info."""
    resp = await resilient_get(_url("/me"), headers=_headers())
    data = resp.json()
    if "error" in data:
        return {}
    return data.get("data", {})
