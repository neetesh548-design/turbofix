"""Escalation engine — checks ticket timers and fires WhatsApp notifications.

Two chains run in parallel:
  1. Breakdown Repair: Technician → Supervisor → Maint. Engineer → Head → Owner
  2. Consumables/Spares: Machine Owner → Store Incharge → Store Manager → VP/Owner

Each factory defines its own per-level thresholds in the escalation_config table.
The background worker (wired into main.py lifespan) calls `run_escalation_sweep`
every ESCALATION_CHECK_INTERVAL_SECONDS.
"""

from datetime import datetime, timedelta, timezone

from app import config
from app.infrastructure.logging import get_logger
from app.repositories.supabase_repo import (
    SupabaseEscalationConfigRepository,
    SupabasePartRequestRepository,
    SupabaseTicketRepository,
)

log = get_logger("turbofix.escalation")

_ticket_repo = SupabaseTicketRepository()
_config_repo = SupabaseEscalationConfigRepository()
_part_repo = SupabasePartRequestRepository()


async def _send_escalation_whatsapp(phone: str, params: list) -> None:
    from app.infrastructure import whatsapp
    from app.infrastructure.http_client import resilient_post

    if not config.WHATSAPP_ACCESS_TOKEN or not config.WHATSAPP_PHONE_NUMBER_ID:
        log.info("escalation.whatsapp_skipped", reason="no_credentials")
        return

    headers = {
        "Authorization": f"Bearer {config.WHATSAPP_ACCESS_TOKEN}",
        "Content-Type": "application/json",
    }
    payload = {
        "messaging_product": "whatsapp",
        "to": phone,
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
    url = f"https://graph.facebook.com/{config.WHATSAPP_API_VERSION}/{config.WHATSAPP_PHONE_NUMBER_ID}/messages"
    await resilient_post(url, headers=headers, json=payload)
    log.info("escalation.whatsapp_sent", to=phone,
             template=config.WHATSAPP_ESCALATION_TEMPLATE_NAME)


async def _send_approval_request(phone: str, params: list) -> None:
    from app.infrastructure.http_client import resilient_post

    if not config.WHATSAPP_ACCESS_TOKEN or not config.WHATSAPP_PHONE_NUMBER_ID:
        return

    headers = {
        "Authorization": f"Bearer {config.WHATSAPP_ACCESS_TOKEN}",
        "Content-Type": "application/json",
    }
    payload = {
        "messaging_product": "whatsapp",
        "to": phone,
        "type": "template",
        "template": {
            "name": config.WHATSAPP_APPROVAL_TEMPLATE_NAME,
            "language": {"code": config.WHATSAPP_APPROVAL_TEMPLATE_LANGUAGE},
            "components": [{
                "type": "body",
                "parameters": [{"type": "text", "text": str(p)} for p in params],
            }],
        },
    }
    url = f"https://graph.facebook.com/{config.WHATSAPP_API_VERSION}/{config.WHATSAPP_PHONE_NUMBER_ID}/messages"
    await resilient_post(url, headers=headers, json=payload)
    log.info("escalation.approval_request_sent", to=phone)


async def _send_rejection_notification(phone: str, params: list) -> None:
    from app.infrastructure.http_client import resilient_post

    if not config.WHATSAPP_ACCESS_TOKEN or not config.WHATSAPP_PHONE_NUMBER_ID:
        return

    headers = {
        "Authorization": f"Bearer {config.WHATSAPP_ACCESS_TOKEN}",
        "Content-Type": "application/json",
    }
    payload = {
        "messaging_product": "whatsapp",
        "to": phone,
        "type": "template",
        "template": {
            "name": config.WHATSAPP_REJECTION_TEMPLATE_NAME,
            "language": {"code": config.WHATSAPP_REJECTION_TEMPLATE_LANGUAGE},
            "components": [{
                "type": "body",
                "parameters": [{"type": "text", "text": str(p)} for p in params],
            }],
        },
    }
    url = f"https://graph.facebook.com/{config.WHATSAPP_API_VERSION}/{config.WHATSAPP_PHONE_NUMBER_ID}/messages"
    await resilient_post(url, headers=headers, json=payload)
    log.info("escalation.rejection_sent", to=phone)


# ---- Core escalation logic ------------------------------------------------

async def escalate_ticket(ticket: dict) -> bool:
    """Advance a single ticket to the next escalation level."""
    ticket_id = ticket["ticket_id"]
    factory_id = ticket.get("factory_id", "")
    current_level = ticket.get("current_escalation_level", 1)
    next_level = current_level + 1

    threshold = _config_repo.get_threshold_for_level(
        factory_id, "breakdown", next_level
    )
    if not threshold:
        log.info("escalation.max_level_reached", ticket_id=ticket_id,
                 level=current_level)
        _ticket_repo.pause_escalation(ticket_id)
        return False

    next_at = (datetime.now(timezone.utc)
               + timedelta(minutes=threshold["threshold_min"])).isoformat()

    _ticket_repo.update_escalation_level(ticket_id, next_level, next_at)

    if threshold["notify_phone"]:
        params = [
            ticket.get("machine_name", ""),
            ticket_id,
            ticket.get("ai_summary") or ticket.get("description", ""),
            ticket.get("urgency", "medium"),
            threshold["role_label"],
            str(current_level),
        ]
        try:
            await _send_escalation_whatsapp(threshold["notify_phone"], params)
        except Exception as exc:
            log.error("escalation.whatsapp_failed", ticket_id=ticket_id,
                      phone=threshold["notify_phone"], error=str(exc))

    log.info("escalation.advanced", ticket_id=ticket_id,
             from_level=current_level, to_level=next_level,
             role=threshold["role_label"])
    return True


async def escalate_part_request(pr: dict) -> bool:
    """Advance a part request to the next escalation level."""
    request_id = pr["id"]
    factory_id = pr.get("factory_id", "")
    current_level = pr.get("current_escalation_level", 1)
    next_level = current_level + 1

    threshold = _config_repo.get_threshold_for_level(
        factory_id, "consumable", next_level
    )
    if not threshold:
        log.info("escalation.part_max_level", request_id=request_id,
                 level=current_level)
        return False

    next_at = (datetime.now(timezone.utc)
               + timedelta(minutes=threshold["threshold_min"])).isoformat()

    _part_repo.update_escalation(request_id, next_level, next_at)
    _part_repo.update_status(request_id, "escalated")

    if threshold["notify_phone"]:
        params = [
            pr.get("part_name", ""),
            pr.get("request_code", ""),
            str(pr.get("qty", 1)),
            pr.get("machine_id", ""),
            threshold["role_label"],
            str(current_level),
        ]
        try:
            await _send_escalation_whatsapp(threshold["notify_phone"], params)
        except Exception as exc:
            log.error("escalation.part_whatsapp_failed",
                      request_id=request_id, error=str(exc))

    log.info("escalation.part_advanced", request_id=request_id,
             from_level=current_level, to_level=next_level)
    return True


def initialize_ticket_escalation(ticket_id: str, factory_id: str) -> None:
    """Set the first escalation timer on a newly created ticket."""
    threshold = _config_repo.get_threshold_for_level(
        factory_id, "breakdown", 1
    )
    if not threshold:
        log.warning("escalation.no_config", factory_id=factory_id,
                    ticket_id=ticket_id)
        return

    next_at = (datetime.now(timezone.utc)
               + timedelta(minutes=threshold["threshold_min"])).isoformat()
    _ticket_repo.update_escalation_level(ticket_id, 1, next_at)
    log.info("escalation.initialized", ticket_id=ticket_id,
             threshold_min=threshold["threshold_min"])


def initialize_part_request_escalation(request_id: str,
                                       factory_id: str) -> None:
    """Set the first escalation timer on a new part request."""
    threshold = _config_repo.get_threshold_for_level(
        factory_id, "consumable", 1
    )
    if not threshold:
        return

    next_at = (datetime.now(timezone.utc)
               + timedelta(minutes=threshold["threshold_min"])).isoformat()
    _part_repo.update_escalation(request_id, 1, next_at)


# ---- Closure approval flow ------------------------------------------------

async def submit_closure(ticket_id: str, evidence_url: str,
                         maintenance_head_phone: str) -> bool:
    """Technician submits evidence photo; notify Maintenance Head for approval."""
    ok = _ticket_repo.submit_closure_evidence(ticket_id, evidence_url)
    if not ok:
        return False

    _ticket_repo.pause_escalation(ticket_id)

    ticket = _ticket_repo.get(ticket_id)
    if ticket and maintenance_head_phone:
        params = [
            ticket.get("machine_name", ""),
            ticket_id,
            ticket.get("ai_summary") or ticket.get("description", ""),
            evidence_url,
        ]
        try:
            await _send_approval_request(maintenance_head_phone, params)
        except Exception as exc:
            log.error("escalation.approval_request_failed",
                      ticket_id=ticket_id, error=str(exc))

    log.info("escalation.closure_submitted", ticket_id=ticket_id)
    return True


async def approve_ticket_closure(ticket_id: str,
                                 approved_by: str) -> bool:
    """Maintenance Head approves closure — ticket resolved."""
    ok = _ticket_repo.approve_closure(ticket_id, approved_by)
    if not ok:
        return False
    log.info("escalation.closure_approved", ticket_id=ticket_id,
             approved_by=approved_by)
    return True


async def reject_ticket_closure(ticket_id: str, reason: str,
                                technician_phone: str) -> bool:
    """Maintenance Head rejects closure — ticket reopened, technician notified."""
    ok = _ticket_repo.reject_closure(ticket_id, reason)
    if not ok:
        return False

    ticket = _ticket_repo.get(ticket_id)
    if ticket:
        _ticket_repo.resume_escalation(
            ticket_id,
            (datetime.now(timezone.utc) + timedelta(minutes=30)).isoformat(),
        )

    if technician_phone:
        params = [
            ticket.get("machine_name", "") if ticket else "",
            ticket_id,
            reason,
        ]
        try:
            await _send_rejection_notification(technician_phone, params)
        except Exception as exc:
            log.error("escalation.rejection_notify_failed",
                      ticket_id=ticket_id, error=str(exc))

    log.info("escalation.closure_rejected", ticket_id=ticket_id, reason=reason)
    return True


# ---- Delegation & outsourcing ---------------------------------------------

def delegate_to_colleague(ticket_id: str, from_phone: str,
                          to_phone: str) -> bool:
    """Delegate ticket to a colleague; resets the escalation timer."""
    ok = _ticket_repo.delegate_ticket(ticket_id, from_phone, to_phone)
    if not ok:
        return False

    ticket = _ticket_repo.get(ticket_id)
    factory_id = ticket.get("factory_id", "") if ticket else ""
    level = ticket.get("current_escalation_level", 1) if ticket else 1

    threshold = _config_repo.get_threshold_for_level(
        factory_id, "breakdown", level
    )
    if threshold:
        next_at = (datetime.now(timezone.utc)
                   + timedelta(minutes=threshold["threshold_min"])).isoformat()
        _ticket_repo.update_escalation_level(ticket_id, level, next_at)

    log.info("escalation.delegated", ticket_id=ticket_id,
             from_phone=from_phone, to_phone=to_phone)
    return True


def mark_outsourced(ticket_id: str, vendor: str, reason: str,
                    evidence_url: str) -> bool:
    """Manager marks ticket as outsourced; escalation pauses."""
    ok = _ticket_repo.mark_outsourced(ticket_id, vendor, reason, evidence_url)
    if not ok:
        return False
    log.info("escalation.outsourced", ticket_id=ticket_id, vendor=vendor)
    return True


# ---- Background sweep (called from main.py lifespan) ----------------------

async def run_escalation_sweep() -> None:
    """Check all open tickets and part requests for overdue escalations."""
    now = datetime.now(timezone.utc)

    tickets = _ticket_repo.get_open_escalatable()
    for t in tickets:
        next_at_str = t.get("next_escalation_at", "")
        if not next_at_str:
            continue
        try:
            next_at = datetime.fromisoformat(next_at_str.replace("Z", "+00:00"))
        except (ValueError, TypeError):
            continue
        if now >= next_at:
            try:
                await escalate_ticket(t)
            except Exception as exc:
                log.error("escalation.sweep_ticket_error",
                          ticket_id=t.get("ticket_id"), error=str(exc))

    part_requests = _part_repo.get_open_escalatable()
    for pr in part_requests:
        next_at_str = pr.get("next_escalation_at", "")
        if not next_at_str:
            continue
        try:
            next_at = datetime.fromisoformat(next_at_str.replace("Z", "+00:00"))
        except (ValueError, TypeError):
            continue
        if now >= next_at:
            try:
                await escalate_part_request(pr)
            except Exception as exc:
                log.error("escalation.sweep_part_error",
                          request_id=pr.get("id"), error=str(exc))

    log.debug("escalation.sweep_complete",
              tickets_checked=len(tickets),
              parts_checked=len(part_requests))
