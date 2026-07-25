"""Analytics Engine — real KPI calculations over live operational data.

Design contract
---------------
Every function here is **pure**: it takes already-fetched lists of dicts and
returns numbers. No repository calls, no network, no clock reads except through
``now`` parameters that always default to real UTC but can be injected by tests.
That is what makes this module exhaustively testable without a database.

Why this exists alongside ``dashboard_service``
-----------------------------------------------
``dashboard_service.compute_kpis`` renders *today's* dashboard tiles. This module
computes the six governance KPIs that get **persisted as snapshots** for trend
analysis, and it is stricter in three ways that matter:

1. It derives machine-down state from actual open tickets rather than trusting
   the denormalised ``has_open_tickets`` flag, which goes stale.
2. It parses ISO-8601 timestamps (``2026-07-25T10:30:00Z``) that
   ``dashboard_service._parse_dt`` silently drops, because Supabase returns that
   format while the xlsx store returns ``%Y-%m-%d %H:%M:%S``.
3. It distinguishes "metric is zero" from "we have no data to compute it",
   returning ``None`` plus a coverage flag for the latter. A PM compliance of
   0% when no PM schedule exists is a lie; ``None`` is the truth.

Metrics
-------
- plant_health_pct   : share of machines with no open ticket
- machines_down      : machines carrying at least one open ticket
- urgent_tickets     : open tickets at High urgency
- avg_repair_hours   : mean closed-ticket repair duration
- cost_by_month      : spare-part spend bucketed by calendar month
- pm_compliance_pct  : preventive maintenance completed on time vs. due
"""

from __future__ import annotations

from collections import defaultdict
from datetime import date, datetime, timedelta, timezone
from typing import Any, Iterable, Optional

# Ticket status/urgency values arrive with inconsistent casing across the three
# storage backends (xlsx title-case, Supabase lower-case), so every comparison
# in this module goes through a normaliser rather than an equality check.
OPEN_STATUSES = {"open", "in_progress", "in progress", "assigned", "reopened"}
CLOSED_STATUSES = {"closed", "done", "completed", "resolved", "verified"}
HIGH_URGENCIES = {"high", "critical", "urgent", "p1"}

# Timestamp formats seen in the wild, tried in order after ISO-8601.
_FALLBACK_FORMATS = (
    "%Y-%m-%d %H:%M:%S",
    "%Y-%m-%d %H:%M",
    "%Y-%m-%d",
    "%d/%m/%Y %H:%M",
    "%d/%m/%Y",
)


# ---------------------------------------------------------------------------
# Parsing helpers — deliberately total functions: they never raise.
# ---------------------------------------------------------------------------

def parse_timestamp(value: Any) -> Optional[datetime]:
    """Parse a timestamp from any backend into a tz-aware UTC datetime.

    Returns None for anything unparseable rather than raising, because a single
    malformed row in a 50k-ticket export must not take down the whole dashboard.
    Naive timestamps are assumed UTC — every writer in TurboFix stores UTC.
    """
    if value is None or value == "":
        return None
    if isinstance(value, datetime):
        return value if value.tzinfo else value.replace(tzinfo=timezone.utc)
    if isinstance(value, date):
        return datetime(value.year, value.month, value.day, tzinfo=timezone.utc)

    text = str(value).strip()
    if not text:
        return None

    # ISO-8601 first — this is the Supabase shape, and the one the old
    # dashboard parser dropped on the floor.
    try:
        parsed = datetime.fromisoformat(text.replace("Z", "+00:00"))
        return parsed if parsed.tzinfo else parsed.replace(tzinfo=timezone.utc)
    except (ValueError, TypeError):
        pass

    for fmt in _FALLBACK_FORMATS:
        try:
            return datetime.strptime(text, fmt).replace(tzinfo=timezone.utc)
        except (ValueError, TypeError):
            continue
    return None


def safe_float(value: Any) -> Optional[float]:
    """Coerce to float, tolerating currency symbols and thousands separators."""
    if value is None or value == "":
        return None
    if isinstance(value, bool):  # bool is an int subclass; never a measurement
        return None
    if isinstance(value, (int, float)):
        return float(value)
    cleaned = str(value).strip().replace(",", "").replace("₹", "").replace("Rs", "").strip()
    if not cleaned:
        return None
    try:
        return float(cleaned)
    except (ValueError, TypeError):
        return None


def _norm(value: Any) -> str:
    return str(value or "").strip().lower()


def is_open(ticket: dict) -> bool:
    """True when a ticket is still outstanding.

    Unknown statuses count as open: an unrecognised state is more safely
    treated as unfinished work than as silently resolved.
    """
    status = _norm(ticket.get("status"))
    if not status:
        return True
    return status not in CLOSED_STATUSES


def is_closed(ticket: dict) -> bool:
    return _norm(ticket.get("status")) in CLOSED_STATUSES


def is_urgent(ticket: dict) -> bool:
    return _norm(ticket.get("urgency")) in HIGH_URGENCIES


# ---------------------------------------------------------------------------
# Metric 1 & 2 — plant health and machines down
# ---------------------------------------------------------------------------

def count_machines_down(machines: Iterable[dict], tickets: Iterable[dict]) -> int:
    """Machines carrying at least one open ticket.

    Derived from the ticket table rather than the denormalised
    ``has_open_tickets`` column, which drifts whenever a ticket is closed by a
    path that forgets to clear the flag. The flag is used only as a fallback for
    machines that have no ticket rows loaded at all.
    """
    machines = list(machines)
    tickets = list(tickets)

    down_ids = {
        str(t.get("machine_id"))
        for t in tickets
        if t.get("machine_id") and is_open(t)
    }

    down = 0
    for machine in machines:
        machine_id = str(machine.get("machine_id") or "")
        if machine_id and machine_id in down_ids:
            down += 1
            continue
        # No ticket rows referenced this machine. Trust the stored flag only
        # when we genuinely saw no tickets for it.
        has_any_ticket = any(str(t.get("machine_id")) == machine_id for t in tickets)
        if not has_any_ticket and _truthy(machine.get("has_open_tickets")):
            down += 1
    return down


def _truthy(value: Any) -> bool:
    if isinstance(value, bool):
        return value
    return _norm(value) in {"true", "yes", "1", "y"}


def calculate_plant_health(machines: Iterable[dict], tickets: Iterable[dict]) -> Optional[float]:
    """Percentage of machines that are healthy (no open ticket).

    Returns None when there are no machines — a plant with no registered assets
    has undefined health, not 100% health. Reporting 100% there would let an
    empty or misconfigured tenant look like the best-performing one.
    """
    machines = list(machines)
    total = len(machines)
    if total == 0:
        return None
    down = count_machines_down(machines, tickets)
    return round((total - down) / total * 100, 1)


# ---------------------------------------------------------------------------
# Metric 3 — urgent tickets
# ---------------------------------------------------------------------------

def count_urgent_tickets(tickets: Iterable[dict]) -> int:
    """Open tickets at High/Critical urgency — the "act today" queue."""
    return sum(1 for t in tickets if is_open(t) and is_urgent(t))


# ---------------------------------------------------------------------------
# Metric 4 — average repair hours
# ---------------------------------------------------------------------------

def calculate_avg_repair_hours(tickets: Iterable[dict]) -> Optional[float]:
    """Mean repair duration in hours across closed tickets.

    Prefers the recorded ``hours_to_fix``; when absent, falls back to the
    elapsed ``closed_at - reported_at``. Returns None when no closed ticket
    carries usable duration data, so callers can render "—" instead of a
    fabricated 0.0 that would look like instant repairs.
    """
    durations: list[float] = []
    for ticket in tickets:
        if not is_closed(ticket):
            continue

        recorded = safe_float(ticket.get("hours_to_fix"))
        if recorded is not None and recorded >= 0:
            durations.append(recorded)
            continue

        opened = parse_timestamp(ticket.get("reported_at"))
        closed = parse_timestamp(ticket.get("closed_at"))
        if opened and closed and closed >= opened:
            durations.append((closed - opened).total_seconds() / 3600)

    if not durations:
        return None
    return round(sum(durations) / len(durations), 1)


# ---------------------------------------------------------------------------
# Metric 5 — cost by month
# ---------------------------------------------------------------------------

def _month_key(moment: datetime) -> str:
    return f"{moment.year:04d}-{moment.month:02d}"


def _month_sequence(end: datetime, months: int) -> list[str]:
    """The last `months` calendar-month keys ending at `end`, oldest first."""
    keys: list[str] = []
    year, month = end.year, end.month
    for _ in range(months):
        keys.append(f"{year:04d}-{month:02d}")
        month -= 1
        if month == 0:
            month, year = 12, year - 1
    return list(reversed(keys))


def calculate_cost_by_month(
    work_order_parts: Iterable[dict],
    months: int = 6,
    now: Optional[datetime] = None,
) -> list[dict]:
    """Spare-part spend bucketed by calendar month, zero-filled and oldest first.

    Zero-filling matters: a month with no spend must appear as a 0 bar rather
    than vanish, otherwise a trend chart silently compresses the x-axis and a
    quiet month reads as if it never happened.

    Cost is taken from ``total_cost`` when present, else ``quantity × unit_price``
    so rows written before the total was denormalised still contribute.
    """
    now = now or datetime.now(timezone.utc)
    months = max(1, months)

    buckets: dict[str, float] = defaultdict(float)
    for row in work_order_parts:
        moment = parse_timestamp(row.get("created_at") or row.get("used_at"))
        if moment is None:
            continue

        total = safe_float(row.get("total_cost"))
        if total is None:
            quantity = safe_float(row.get("quantity"))
            unit_price = safe_float(row.get("unit_price"))
            if quantity is None or unit_price is None:
                continue
            total = quantity * unit_price
        buckets[_month_key(moment)] += total

    return [
        {"month": key, "cost": round(buckets.get(key, 0.0), 2)}
        for key in _month_sequence(now, months)
    ]


# ---------------------------------------------------------------------------
# Metric 6 — PM compliance
# ---------------------------------------------------------------------------

def calculate_pm_compliance(
    pm_schedules: Iterable[dict],
    pm_logs: Iterable[dict],
    window_days: int = 90,
    now: Optional[datetime] = None,
) -> Optional[float]:
    """Percentage of preventive maintenance completed on time.

    Numerator   : PM logs inside the window marked on-time.
    Denominator : those same logs, plus schedules that fell due in the window
                  and were never logged at all (a missed PM is a compliance
                  failure — counting only what was logged would let a plant
                  reach 100% by simply never doing the work).

    ``on_time`` is trusted when the writer set it; otherwise it is recomputed
    from ``completed_at <= due_at``. Returns None when nothing was due in the
    window, so the caller can say "no PM scheduled" rather than "0% compliant".
    """
    now = now or datetime.now(timezone.utc)
    cutoff = now - timedelta(days=max(1, window_days))

    completed = 0
    on_time = 0
    logged_schedule_ids: set[str] = set()

    for log in pm_logs:
        completed_at = parse_timestamp(log.get("completed_at"))
        if completed_at is None or completed_at < cutoff or completed_at > now:
            continue

        completed += 1
        schedule_id = str(log.get("pm_schedule_id") or "")
        if schedule_id:
            logged_schedule_ids.add(schedule_id)

        flag = log.get("on_time")
        if isinstance(flag, bool):
            if flag:
                on_time += 1
            continue
        if flag is not None and _norm(flag) in {"true", "yes", "1", "y"}:
            on_time += 1
            continue
        if flag is not None and _norm(flag) in {"false", "no", "0", "n"}:
            continue

        # Flag absent — recompute from the dates. A log with no due date is
        # counted as on time, since there was no deadline to miss.
        due_at = parse_timestamp(log.get("due_at"))
        if due_at is None or completed_at <= due_at:
            on_time += 1

    # Overdue schedules that produced no log at all in the window.
    missed = 0
    for schedule in pm_schedules:
        if not _schedule_active(schedule):
            continue
        if str(schedule.get("id") or "") in logged_schedule_ids:
            continue
        next_due = parse_timestamp(schedule.get("next_due_at"))
        if next_due is not None and cutoff <= next_due <= now:
            missed += 1

    denominator = completed + missed
    if denominator == 0:
        return None
    return round(on_time / denominator * 100, 1)


def _schedule_active(schedule: dict) -> bool:
    value = schedule.get("active")
    if value is None:
        return True
    if isinstance(value, bool):
        return value
    return _norm(value) not in {"false", "no", "0", "n"}


# ---------------------------------------------------------------------------
# Orchestrator
# ---------------------------------------------------------------------------

def compute_analytics(
    company_code: str,
    machines: Optional[Iterable[dict]] = None,
    tickets: Optional[Iterable[dict]] = None,
    work_order_parts: Optional[Iterable[dict]] = None,
    pm_schedules: Optional[Iterable[dict]] = None,
    pm_logs: Optional[Iterable[dict]] = None,
    months: int = 6,
    pm_window_days: int = 90,
    now: Optional[datetime] = None,
) -> dict:
    """Compute all six KPIs plus coverage metadata for one company.

    Every metric that can be undefined is returned as None alongside a
    ``coverage`` map telling the caller *why* — so the UI can render "no PM
    schedule configured" instead of a misleading 0%.
    """
    now = now or datetime.now(timezone.utc)
    machines = list(machines or [])
    tickets = list(tickets or [])
    work_order_parts = list(work_order_parts or [])
    pm_schedules = list(pm_schedules or [])
    pm_logs = list(pm_logs or [])

    plant_health = calculate_plant_health(machines, tickets)
    machines_down = count_machines_down(machines, tickets)
    urgent = count_urgent_tickets(tickets)
    avg_hours = calculate_avg_repair_hours(tickets)
    cost_series = calculate_cost_by_month(work_order_parts, months=months, now=now)
    pm_pct = calculate_pm_compliance(pm_schedules, pm_logs, window_days=pm_window_days, now=now)

    open_tickets = sum(1 for t in tickets if is_open(t))

    return {
        "company_code": company_code,
        "generated_at": now.isoformat(),
        "kpis": {
            "plant_health_pct": plant_health,
            "machines_down": machines_down,
            "urgent_tickets": urgent,
            "avg_repair_hours": avg_hours,
            "cost_total": round(sum(bucket["cost"] for bucket in cost_series), 2),
            "pm_compliance_pct": pm_pct,
        },
        "cost_by_month": cost_series,
        "context": {
            "total_machines": len(machines),
            "total_tickets": len(tickets),
            "open_tickets": open_tickets,
            "closed_tickets": sum(1 for t in tickets if is_closed(t)),
            "pm_window_days": pm_window_days,
            "cost_months": months,
        },
        # Lets the UI distinguish a real zero from an absent data source.
        "coverage": {
            "plant_health": plant_health is not None,
            "avg_repair_hours": avg_hours is not None,
            "cost": bool(work_order_parts),
            "pm_compliance": pm_pct is not None,
        },
    }


def to_snapshot_row(
    analytics: dict,
    factory_id: str,
    period_kind: str = "daily",
    period_start: Optional[date] = None,
    period_end: Optional[date] = None,
    captured_by: Optional[str] = None,
) -> dict:
    """Flatten a compute_analytics() result into an analytics_snapshots row.

    The table's numeric columns are NOT NULL, so undefined metrics (None) are
    stored as 0 in the column while ``coverage`` inside the payload preserves
    the distinction. Readers must consult coverage before trusting a zero.
    """
    generated = parse_timestamp(analytics.get("generated_at")) or datetime.now(timezone.utc)
    day = generated.date()
    kpis = analytics.get("kpis", {})

    return {
        "factory_id": factory_id,
        "period_kind": period_kind,
        "period_start": (period_start or day).isoformat(),
        "period_end": (period_end or day).isoformat(),
        "plant_health_pct": kpis.get("plant_health_pct") or 0,
        "machines_down": kpis.get("machines_down") or 0,
        "urgent_tickets": kpis.get("urgent_tickets") or 0,
        "avg_repair_hours": kpis.get("avg_repair_hours") or 0,
        "cost_total": kpis.get("cost_total") or 0,
        "pm_compliance_pct": kpis.get("pm_compliance_pct") or 0,
        "payload": {
            "cost_by_month": analytics.get("cost_by_month", []),
            "context": analytics.get("context", {}),
            "coverage": analytics.get("coverage", {}),
            "company_code": analytics.get("company_code"),
        },
        "captured_by": captured_by,
    }
