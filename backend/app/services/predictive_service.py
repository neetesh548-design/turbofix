"""Predictive service — Phase 4 capabilities.

1. Predictive maintenance: flag machines overdue/upcoming for preventive service
2. Daily digest: morning plant health summary via WhatsApp
3. Downtime cost: calculate financial impact per ticket and machine
4. Threshold drift: monitor escalation window creep and alert
"""

from datetime import date, datetime, timedelta, timezone
from typing import Optional

from app import config
from app.infrastructure.logging import get_logger
from app.repositories.supabase_repo import (
    SupabaseEscalationConfigRepository,
    _client,
)

log = get_logger("turbofix.predictive")

_esc_config = SupabaseEscalationConfigRepository()


# ---- Predictive Maintenance -----------------------------------------------

async def run_predictive_maintenance_check() -> None:
    """Check all machines for overdue or upcoming maintenance."""
    factories = _client.select("factories", {})
    today = date.today()

    for factory in factories:
        factory_id = factory.get("id", "")
        if not factory_id:
            continue

        machines = _client.select("machines", {
            "factory_id": f"eq.{factory_id}",
        })

        for machine in machines:
            machine_id = machine.get("id", "")
            interval = machine.get("maintenance_interval_days") or 90
            last_maint = machine.get("last_maintenance_date")
            hourly_cost = float(machine.get("hourly_downtime_cost") or 0)

            if not last_maint:
                continue

            try:
                last_date = date.fromisoformat(str(last_maint))
            except (ValueError, TypeError):
                continue

            next_due = last_date + timedelta(days=interval)
            days_until = (next_due - today).days

            _client.update("machines", {"id": f"eq.{machine_id}"}, {
                "next_maintenance_due": next_due.isoformat(),
            })

            if days_until < 0:
                await _create_prediction(
                    factory_id, machine_id, "overdue", "high",
                    f"Maintenance overdue by {abs(days_until)} days "
                    f"(last: {last_date}, interval: {interval}d)",
                )
            elif days_until <= 7:
                await _create_prediction(
                    factory_id, machine_id, "upcoming", "medium",
                    f"Maintenance due in {days_until} days "
                    f"(next: {next_due})",
                )

            _check_failure_pattern(factory_id, machine_id, machine)


def _check_failure_pattern(factory_id: str, machine_id: str,
                           machine: dict) -> None:
    """Detect recurring failure patterns from ticket history."""
    cutoff = (datetime.now(timezone.utc) - timedelta(days=60)).isoformat()

    tickets = _client.select("tickets", {
        "factory_id": f"eq.{factory_id}",
        "machine_id": f"eq.{machine_id}",
        "created_at": f"gte.{cutoff}",
    })

    if len(tickets) >= 4:
        intervals = []
        sorted_tickets = sorted(tickets, key=lambda t: t.get("created_at", ""))
        for i in range(1, len(sorted_tickets)):
            try:
                t1 = datetime.fromisoformat(
                    str(sorted_tickets[i-1].get("created_at", "")).replace("Z", "+00:00"))
                t2 = datetime.fromisoformat(
                    str(sorted_tickets[i].get("created_at", "")).replace("Z", "+00:00"))
                intervals.append((t2 - t1).days)
            except (ValueError, TypeError):
                continue

        if intervals and max(intervals) - min(intervals) <= 5:
            avg_interval = sum(intervals) // len(intervals)
            _client.insert("maintenance_predictions", {
                "factory_id": factory_id,
                "machine_id": machine_id,
                "prediction_type": "pattern_detected",
                "severity": "high",
                "message": (
                    f"Recurring failure pattern: {len(tickets)} tickets in 60 days, "
                    f"avg interval {avg_interval} days. Consider preventive overhaul."
                ),
            })


async def _create_prediction(factory_id: str, machine_id: str,
                             pred_type: str, severity: str,
                             message: str) -> None:
    """Create a prediction record and notify if high/critical."""
    existing = _client.select_one("maintenance_predictions", {
        "factory_id": f"eq.{factory_id}",
        "machine_id": f"eq.{machine_id}",
        "prediction_type": f"eq.{pred_type}",
        "acknowledged": "eq.false",
    })
    if existing:
        return

    _client.insert("maintenance_predictions", {
        "factory_id": factory_id,
        "machine_id": machine_id,
        "prediction_type": pred_type,
        "severity": severity,
        "message": message,
    })

    if severity in ("high", "critical"):
        thresholds = _esc_config.get_thresholds(factory_id, "breakdown")
        head = next(
            (t for t in thresholds if "head" in t["role_label"].lower()), None
        )
        if head and head["notify_phone"]:
            from app.infrastructure import whatsapp
            try:
                machine = _client.select_one("machines", {"id": f"eq.{machine_id}"})
                name = machine.get("name", machine_id) if machine else machine_id
                await whatsapp.send_text_message(
                    head["notify_phone"],
                    f"PREDICTIVE ALERT [{severity.upper()}]\n"
                    f"Machine: {name}\n{message}",
                )
            except Exception as exc:
                log.error("predictive.notify_failed", error=str(exc))

    log.info("predictive.created", machine_id=machine_id, type=pred_type,
             severity=severity)


def get_predictions(factory_id: str,
                    unacknowledged_only: bool = True) -> list:
    """Get maintenance predictions for a factory."""
    params = {"factory_id": f"eq.{factory_id}", "order": "created_at.desc"}
    if unacknowledged_only:
        params["acknowledged"] = "eq.false"

    rows = _client.select("maintenance_predictions", params)
    return [
        {
            "id": r.get("id", ""),
            "machine_id": r.get("machine_id", ""),
            "prediction_type": r.get("prediction_type", ""),
            "severity": r.get("severity", ""),
            "message": r.get("message", ""),
            "acknowledged": r.get("acknowledged", False),
            "created_at": str(r.get("created_at", "")),
        }
        for r in rows
    ]


def acknowledge_prediction(prediction_id: str, by: str) -> bool:
    """Mark a prediction as acknowledged."""
    try:
        _client.update("maintenance_predictions", {"id": f"eq.{prediction_id}"}, {
            "acknowledged": True,
            "acknowledged_by": by,
        })
        return True
    except Exception:
        return False


# ---- Daily Digest ----------------------------------------------------------

async def run_daily_digest_check() -> None:
    """Check if any factory is due for a daily digest."""
    now = datetime.now(timezone.utc)

    configs = _client.select("digest_config", {"enabled": "eq.true"})
    for cfg in configs:
        factory_id = cfg.get("factory_id", "")
        send_time_str = cfg.get("send_time", "08:00")
        tz_name = cfg.get("timezone", "Asia/Kolkata")
        recipients = cfg.get("recipient_phones") or []

        if not factory_id or not recipients:
            continue

        try:
            hour, minute = map(int, str(send_time_str).split(":")[:2])
        except (ValueError, TypeError):
            continue

        offset_hours = 5.5 if "kolkata" in tz_name.lower() else 0
        local_now = now + timedelta(hours=offset_hours)

        if local_now.hour != hour or local_now.minute != minute:
            continue

        last_sent = cfg.get("last_sent_at")
        if last_sent:
            try:
                last_ts = datetime.fromisoformat(
                    str(last_sent).replace("Z", "+00:00"))
                if (now - last_ts) < timedelta(hours=20):
                    continue
            except (ValueError, TypeError):
                pass

        await _send_daily_digest(factory_id, recipients)

        _client.update("digest_config", {"factory_id": f"eq.{factory_id}"}, {
            "last_sent_at": now.isoformat(),
        })


async def _send_daily_digest(factory_id: str, recipients: list) -> None:
    """Build and send the daily plant health digest."""
    from app.infrastructure import whatsapp

    open_tickets = _client.select("tickets", {
        "factory_id": f"eq.{factory_id}",
        "status": "in.Open,in_progress,pending_approval,waiting_parts,outsourced",
    })
    pending_pos = _client.select("purchase_orders", {
        "factory_id": f"eq.{factory_id}",
        "status": "eq.pending",
    })
    predictions = _client.select("maintenance_predictions", {
        "factory_id": f"eq.{factory_id}",
        "acknowledged": "eq.false",
    })

    critical_tickets = [t for t in open_tickets
                        if str(t.get("urgency", "")).lower() in ("critical", "high")]
    escalated = [t for t in open_tickets
                 if (t.get("current_escalation_level") or 1) > 2]

    yesterday = (datetime.now(timezone.utc) - timedelta(days=1)).isoformat()
    resolved_yesterday = _client.select("tickets", {
        "factory_id": f"eq.{factory_id}",
        "status": "eq.resolved",
        "resolved_at": f"gte.{yesterday}",
    })

    total_downtime_cost = sum(
        float(t.get("hourly_downtime_cost", 0) or 0) *
        _hours_open(t)
        for t in open_tickets
    )

    lines = [
        f"DAILY PLANT DIGEST - {date.today().strftime('%d %b %Y')}",
        f"{'='*35}",
        f"Open Tickets: {len(open_tickets)} ({len(critical_tickets)} critical)",
        f"Escalated (L3+): {len(escalated)}",
        f"Resolved Yesterday: {len(resolved_yesterday)}",
        f"Pending POs: {len(pending_pos)}",
        f"Maintenance Alerts: {len(predictions)}",
    ]

    if total_downtime_cost > 0:
        lines.append(f"Est. Downtime Cost: Rs {total_downtime_cost:,.0f}")

    if critical_tickets:
        lines.append(f"\nCRITICAL TICKETS:")
        for t in critical_tickets[:3]:
            machine_id = t.get("machine_id", "")
            machine = _client.select_one("machines", {"id": f"eq.{machine_id}",
                                                      "select": "name"})
            name = machine.get("name", machine_id) if machine else machine_id
            lines.append(f"  - {name}: {_ticket_summary(t)[:60]}")

    if predictions:
        lines.append(f"\nMAINTENANCE ALERTS:")
        for p in predictions[:3]:
            lines.append(f"  - [{p.get('severity', '').upper()}] {p.get('message', '')[:60]}")

    digest_text = "\n".join(lines)

    if not config.WHATSAPP_ACCESS_TOKEN or not config.WHATSAPP_PHONE_NUMBER_ID:
        log.info("digest.skipped", reason="no_credentials")
        return

    for phone in recipients:
        try:
            await whatsapp.send_text_message(phone, digest_text)
        except Exception as exc:
            log.error("digest.send_failed", phone=phone, error=str(exc))

    log.info("digest.sent", factory_id=factory_id,
             recipient_count=len(recipients))


def _hours_open(ticket: dict) -> float:
    """Calculate hours a ticket has been open."""
    created = ticket.get("created_at", "")
    if not created:
        return 0
    try:
        created_dt = datetime.fromisoformat(str(created).replace("Z", "+00:00"))
        return (datetime.now(timezone.utc) - created_dt).total_seconds() / 3600
    except (ValueError, TypeError):
        return 0


def _ticket_summary(ticket: dict) -> str:
    """Extract a short summary from a ticket."""
    ai = ticket.get("ai_summary")
    if isinstance(ai, dict):
        return ai.get("summary", "")
    if isinstance(ai, str) and ai:
        return ai
    return ticket.get("issue_text", "")


# ---- Downtime Cost --------------------------------------------------------

def calculate_ticket_downtime_cost(ticket_id: str) -> Optional[dict]:
    """Calculate downtime cost for a specific ticket."""
    ticket = _client.select_one("tickets", {"id": f"eq.{ticket_id}"})
    if not ticket:
        return None

    machine_id = ticket.get("machine_id", "")
    machine = _client.select_one("machines", {"id": f"eq.{machine_id}"})
    hourly_cost = float(machine.get("hourly_downtime_cost", 0) or 0) if machine else 0

    hours = _hours_open(ticket)
    if ticket.get("status") == "resolved" and ticket.get("resolved_at"):
        try:
            created = datetime.fromisoformat(
                str(ticket["created_at"]).replace("Z", "+00:00"))
            resolved = datetime.fromisoformat(
                str(ticket["resolved_at"]).replace("Z", "+00:00"))
            hours = (resolved - created).total_seconds() / 3600
        except (ValueError, TypeError):
            pass

    cost = hours * hourly_cost
    return {
        "ticket_id": ticket_id,
        "hours_open": round(hours, 2),
        "hourly_rate": hourly_cost,
        "total_cost": round(cost, 2),
        "machine_id": machine_id,
        "machine_name": machine.get("name", "") if machine else "",
    }


def get_factory_downtime_summary(factory_id: str, days: int = 30) -> dict:
    """Get downtime cost summary for a factory over the past N days."""
    cutoff = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()

    tickets = _client.select("tickets", {
        "factory_id": f"eq.{factory_id}",
        "created_at": f"gte.{cutoff}",
    })

    machines_cache: dict = {}
    total_cost = 0.0
    total_hours = 0.0
    machine_costs: dict = {}

    for t in tickets:
        machine_id = t.get("machine_id", "")
        if machine_id not in machines_cache:
            m = _client.select_one("machines", {"id": f"eq.{machine_id}"})
            machines_cache[machine_id] = m or {}

        machine = machines_cache[machine_id]
        hourly = float(machine.get("hourly_downtime_cost", 0) or 0)

        hours = _hours_open(t)
        if t.get("status") == "resolved" and t.get("resolved_at"):
            try:
                created = datetime.fromisoformat(
                    str(t["created_at"]).replace("Z", "+00:00"))
                resolved = datetime.fromisoformat(
                    str(t["resolved_at"]).replace("Z", "+00:00"))
                hours = (resolved - created).total_seconds() / 3600
            except (ValueError, TypeError):
                pass

        cost = hours * hourly
        total_cost += cost
        total_hours += hours

        name = machine.get("name", machine_id)
        if name not in machine_costs:
            machine_costs[name] = 0.0
        machine_costs[name] += cost

    top_machines = sorted(machine_costs.items(), key=lambda x: x[1], reverse=True)[:5]

    return {
        "period_days": days,
        "total_tickets": len(tickets),
        "total_downtime_hours": round(total_hours, 1),
        "total_downtime_cost": round(total_cost, 2),
        "avg_cost_per_ticket": round(total_cost / len(tickets), 2) if tickets else 0,
        "top_cost_machines": [
            {"machine_name": name, "cost": round(cost, 2)}
            for name, cost in top_machines
        ],
    }


# ---- Threshold Drift Monitoring -------------------------------------------

def check_threshold_drift(factory_id: str) -> list:
    """Check if escalation thresholds have drifted from safe limits."""
    alerts = []

    for chain_type in ("breakdown", "consumable"):
        thresholds = _esc_config.get_thresholds(factory_id, chain_type)
        if not thresholds:
            continue

        total_minutes = sum(t["threshold_min"] for t in thresholds)
        max_shift_minutes = 480  # 8 hours

        if total_minutes > max_shift_minutes:
            alerts.append({
                "chain_type": chain_type,
                "alert": "exceeds_shift",
                "message": (
                    f"Total escalation window ({total_minutes} min) exceeds "
                    f"one shift ({max_shift_minutes} min). "
                    f"A ticket could go unresolved for an entire shift."
                ),
                "total_minutes": total_minutes,
                "max_allowed": max_shift_minutes,
            })

        drift_rows = _client.select("threshold_drift_log", {
            "factory_id": f"eq.{factory_id}",
            "chain_type": f"eq.{chain_type}",
            "order": "changed_at.desc",
            "limit": 10,
        })

        for drift in drift_rows:
            old_val = drift.get("old_threshold", 0)
            new_val = drift.get("new_threshold", 0)
            if old_val > 0:
                pct_change = ((new_val - old_val) / old_val) * 100
                if pct_change > 20:
                    alerts.append({
                        "chain_type": chain_type,
                        "alert": "drift_detected",
                        "level": drift.get("level"),
                        "message": (
                            f"Level {drift.get('level')} threshold increased "
                            f"by {pct_change:.0f}% ({old_val} → {new_val} min)"
                        ),
                        "old_threshold": old_val,
                        "new_threshold": new_val,
                        "changed_at": str(drift.get("changed_at", "")),
                    })

    return alerts


def record_threshold_change(factory_id: str, chain_type: str, level: int,
                            old_threshold: int, new_threshold: int,
                            changed_by: str = "") -> None:
    """Log a threshold change for drift analysis."""
    if old_threshold == new_threshold:
        return
    _client.insert("threshold_drift_log", {
        "factory_id": factory_id,
        "chain_type": chain_type,
        "level": level,
        "old_threshold": old_threshold,
        "new_threshold": new_threshold,
        "changed_by": changed_by,
    })


async def run_threshold_drift_check() -> None:
    """Check all factories for threshold drift issues."""
    factories = _client.select("factories", {})

    for factory in factories:
        factory_id = factory.get("id", "")
        if not factory_id:
            continue

        alerts = check_threshold_drift(factory_id)
        for alert in alerts:
            if alert.get("alert") == "exceeds_shift":
                thresholds = _esc_config.get_thresholds(factory_id, "breakdown")
                head = next(
                    (t for t in thresholds if "head" in t["role_label"].lower()),
                    None,
                )
                if head and head["notify_phone"]:
                    from app.infrastructure import whatsapp
                    try:
                        await whatsapp.send_text_message(
                            head["notify_phone"],
                            f"THRESHOLD DRIFT ALERT\n{alert['message']}",
                        )
                    except Exception as exc:
                        log.error("drift.notify_failed", error=str(exc))

    log.debug("predictive.drift_check_complete")
