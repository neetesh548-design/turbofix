"""Intelligence service — Phase 2 capabilities.

1. AI Feedback Loop: technician confirms/overrides AI diagnosis → accuracy tracked
2. Load-aware Delegation: check technician workload before routing
3. Repeat Failure Detection: flag machines with >2 tickets in 30 days
4. Shift Handover: digest of open tickets sent at shift boundaries
"""

from datetime import datetime, timedelta, timezone
from typing import Optional

from app import config
from app.infrastructure.logging import get_logger
from app.repositories.supabase_repo import (
    SupabaseAIFeedbackRepository,
    SupabaseShiftConfigRepository,
    SupabaseTicketRepository,
)

log = get_logger("turbofix.intelligence")

_ticket_repo = SupabaseTicketRepository()
_feedback_repo = SupabaseAIFeedbackRepository()
_shift_repo = SupabaseShiftConfigRepository()


# ---- AI Feedback Loop -----------------------------------------------------

async def confirm_ai_diagnosis(ticket_id: str, phone: str) -> bool:
    """Technician confirms AI diagnosis was correct."""
    ticket = _ticket_repo.get(ticket_id)
    if not ticket:
        return False

    _feedback_repo.confirm_diagnosis(ticket_id)

    factory_id = ticket.get("factory_id", "")
    machine_id = ticket.get("machine_id", "")
    if factory_id and machine_id:
        _feedback_repo.record_feedback(factory_id, machine_id, confirmed=True)

    log.info("intelligence.diagnosis_confirmed", ticket_id=ticket_id, phone=phone)
    return True


async def override_ai_diagnosis(ticket_id: str, phone: str,
                                reason: str) -> bool:
    """Technician overrides AI diagnosis with their own assessment."""
    ticket = _ticket_repo.get(ticket_id)
    if not ticket:
        return False

    _feedback_repo.override_diagnosis(ticket_id, reason)

    factory_id = ticket.get("factory_id", "")
    machine_id = ticket.get("machine_id", "")
    if factory_id and machine_id:
        _feedback_repo.record_feedback(factory_id, machine_id, confirmed=False)

    log.info("intelligence.diagnosis_overridden", ticket_id=ticket_id,
             phone=phone, reason=reason)
    return True


def get_machine_ai_accuracy(factory_id: str, machine_id: str) -> Optional[dict]:
    """Get AI diagnosis accuracy stats for a specific machine."""
    return _feedback_repo.get_accuracy(factory_id, machine_id)


def get_factory_ai_stats(factory_id: str) -> list:
    """Get AI accuracy stats for all machines in a factory."""
    return _feedback_repo.get_factory_stats(factory_id)


# ---- Load-Aware Delegation ------------------------------------------------

def get_technician_load(factory_id: str) -> list:
    """Return open ticket count per technician for a factory."""
    from app.repositories.supabase_repo import _client

    rows = _client.select("tickets", {
        "factory_id": f"eq.{factory_id}",
        "status": "in.Open,in_progress,pending_approval",
    })

    load_map: dict[str, int] = {}
    for row in rows:
        machine_id = row.get("machine_id", "")
        if not machine_id:
            continue
        machine = _client.select_one("machines", {
            "id": f"eq.{machine_id}",
            "select": "assigned_technician_phone",
        })
        if machine:
            phone = machine.get("assigned_technician_phone", "")
            if phone:
                load_map[phone] = load_map.get(phone, 0) + 1

    return [
        {"phone": phone, "open_tickets": count}
        for phone, count in sorted(load_map.items(), key=lambda x: x[1])
    ]


def get_least_loaded_technician(factory_id: str,
                                candidates: list[str]) -> Optional[str]:
    """From a list of candidate phones, return the one with fewest open tickets."""
    if not candidates:
        return None

    load = get_technician_load(factory_id)
    load_map = {item["phone"]: item["open_tickets"] for item in load}

    best_phone = candidates[0]
    best_count = load_map.get(best_phone, 0)
    for phone in candidates[1:]:
        count = load_map.get(phone, 0)
        if count < best_count:
            best_phone = phone
            best_count = count

    return best_phone


def is_technician_overloaded(phone: str, factory_id: str,
                             threshold: int = 3) -> bool:
    """Check if a technician has >= threshold open tickets."""
    load = get_technician_load(factory_id)
    for item in load:
        if item["phone"] == phone:
            return item["open_tickets"] >= threshold
    return False


# ---- Repeat Failure Detection ----------------------------------------------

def check_repeat_failure(factory_id: str, machine_id: str,
                         days: int = 30, threshold: int = 2) -> dict:
    """Check if machine has had more than `threshold` tickets in last `days` days."""
    from app.repositories.supabase_repo import _client

    cutoff = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()

    rows = _client.select("tickets", {
        "factory_id": f"eq.{factory_id}",
        "machine_id": f"eq.{machine_id}",
        "created_at": f"gte.{cutoff}",
    })

    count = len(rows)
    is_repeat = count > threshold

    if is_repeat:
        log.warning("intelligence.repeat_failure_detected",
                    machine_id=machine_id, factory_id=factory_id,
                    ticket_count=count, days=days)

    return {
        "is_repeat_failure": is_repeat,
        "ticket_count_in_period": count,
        "period_days": days,
        "threshold": threshold,
    }


def flag_repeat_failure(ticket_id: str, count: int) -> bool:
    """Mark a ticket as a repeat failure case."""
    from app.repositories.supabase_repo import _client

    try:
        _client.update("tickets", {"id": f"eq.{ticket_id}"}, {
            "repeat_failure_flag": True,
            "repeat_failure_count": count,
        })
        return True
    except Exception:
        return False


async def check_and_flag_on_creation(ticket_id: str, factory_id: str,
                                     machine_id: str) -> None:
    """Called after ticket creation to detect repeat failures."""
    result = check_repeat_failure(factory_id, machine_id)

    if result["is_repeat_failure"]:
        flag_repeat_failure(ticket_id, result["ticket_count_in_period"])

        from app.services.escalation_service import _send_escalation_whatsapp
        from app.repositories.supabase_repo import (
            SupabaseEscalationConfigRepository,
        )

        esc_config = SupabaseEscalationConfigRepository()
        thresholds = esc_config.get_thresholds(factory_id, "breakdown")
        maint_head_threshold = next(
            (t for t in thresholds if "head" in t["role_label"].lower()), None
        )
        if maint_head_threshold and maint_head_threshold["notify_phone"]:
            ticket = _ticket_repo.get(ticket_id)
            params = [
                ticket.get("machine_name", "") if ticket else machine_id,
                ticket_id,
                f"REPEAT FAILURE: {result['ticket_count_in_period']} tickets in {result['period_days']} days",
                "high",
                "Maintenance Head",
                "Auto-flagged for preventive overhaul",
            ]
            try:
                await _send_escalation_whatsapp(
                    maint_head_threshold["notify_phone"], params,
                )
            except Exception as exc:
                log.error("intelligence.repeat_notify_failed",
                          ticket_id=ticket_id, error=str(exc))


# ---- Shift Handover -------------------------------------------------------

def get_shift_config(factory_id: str) -> list:
    """Get all shift configurations for a factory."""
    return _shift_repo.get_shifts(factory_id)


async def send_shift_handover(factory_id: str, shift_name: str) -> None:
    """Send a WhatsApp digest of open tickets to incoming shift technicians."""
    from app.infrastructure import whatsapp
    from app.repositories.supabase_repo import _client

    open_tickets = _client.select("tickets", {
        "factory_id": f"eq.{factory_id}",
        "status": "in.Open,in_progress,pending_approval,waiting_parts",
        "order": "urgency.desc,created_at.asc",
    })

    if not open_tickets:
        log.info("intelligence.handover_empty", factory_id=factory_id,
                 shift=shift_name)
        return

    machines = _client.select("machines", {
        "factory_id": f"eq.{factory_id}",
        "select": "id,assigned_technician_phone,name",
    })
    machine_map = {m["id"]: m for m in machines}

    technician_tickets: dict[str, list] = {}
    for t in open_tickets:
        m_id = t.get("machine_id", "")
        machine = machine_map.get(m_id, {})
        tech_phone = machine.get("assigned_technician_phone", "")
        if not tech_phone:
            continue
        if tech_phone not in technician_tickets:
            technician_tickets[tech_phone] = []
        technician_tickets[tech_phone].append({
            "ticket_id": t.get("id", ""),
            "machine_name": machine.get("name", m_id),
            "status": t.get("status", ""),
            "urgency": t.get("urgency", "medium"),
            "escalation_level": t.get("current_escalation_level", 1),
            "summary": (t.get("ai_summary") or {}).get("summary", "")
                       if isinstance(t.get("ai_summary"), dict)
                       else str(t.get("ai_summary") or t.get("issue_text") or ""),
        })

    if not config.WHATSAPP_ACCESS_TOKEN or not config.WHATSAPP_PHONE_NUMBER_ID:
        log.info("intelligence.handover_skipped", reason="no_credentials")
        return

    for phone, tickets in technician_tickets.items():
        lines = [f"Shift Handover ({shift_name}) - {len(tickets)} open ticket(s):"]
        for i, t in enumerate(tickets[:5], 1):
            urgency_marker = "!!" if t["urgency"] in ("critical", "high") else ""
            lines.append(
                f"{i}. {urgency_marker}{t['machine_name']} [{t['status']}] "
                f"L{t['escalation_level']} - {t['summary'][:80]}"
            )
        if len(tickets) > 5:
            lines.append(f"  ... and {len(tickets) - 5} more")

        try:
            await whatsapp.send_text_message(phone, "\n".join(lines))
            log.info("intelligence.handover_sent", phone=phone,
                     ticket_count=len(tickets))
        except Exception as exc:
            log.error("intelligence.handover_failed", phone=phone,
                      error=str(exc))


async def run_shift_handover_check() -> None:
    """Called periodically — checks if any factory is at a shift boundary."""
    from app.repositories.supabase_repo import _client

    now = datetime.now(timezone.utc)

    all_shifts = _client.select("shift_config", {})
    for shift in all_shifts:
        factory_id = shift.get("factory_id", "")
        shift_name = shift.get("shift_name", "")
        start_str = shift.get("start_time", "")

        if not start_str or not factory_id:
            continue

        try:
            shift_hour, shift_min = map(int, start_str.split(":")[:2])
        except (ValueError, TypeError):
            continue

        tz_name = shift.get("timezone", "Asia/Kolkata")
        offset_hours = 5.5 if "kolkata" in tz_name.lower() else 0
        local_now = now + timedelta(hours=offset_hours)

        if local_now.hour == shift_hour and local_now.minute == shift_min:
            try:
                await send_shift_handover(factory_id, shift_name)
            except Exception as exc:
                log.error("intelligence.handover_check_failed",
                          factory_id=factory_id, error=str(exc))
