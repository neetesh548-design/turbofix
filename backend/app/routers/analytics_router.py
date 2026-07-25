"""Analytics router — real-time KPI computation and snapshot history.

Endpoints
---------
GET  /analytics/kpis      compute the six KPIs live for the caller's company
POST /analytics/snapshot  compute and persist a snapshot (owner/maintenance head)
GET  /analytics/trend     read stored snapshots for trend charts

Multi-tenancy: every handler derives the company from the JWT and never accepts
a company/factory identifier from the request body, so one tenant can never
read or write another's analytics.
"""

from __future__ import annotations

from datetime import date, datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field

from app.auth import CurrentUser, get_current_user
from app.dependencies import (
    get_analytics_snapshots,
    get_machines,
    get_tickets,
)
from app.infrastructure.logging import get_logger
from app.repositories.base import (
    AnalyticsSnapshotRepository,
    MachineRepository,
    TicketRepository,
)
from app.services import analytics_service

router = APIRouter(prefix="/analytics")
log = get_logger("turbofix.analytics")

MAX_COST_MONTHS = 24
MAX_PM_WINDOW_DAYS = 365
MAX_TREND_LIMIT = 180


class SnapshotRequest(BaseModel):
    """Body for POST /analytics/snapshot.

    Note there is deliberately no factory_id/company_code field — the tenant is
    taken from the JWT so a caller cannot write into another company's history.
    """

    period_kind: str = Field(default="daily", pattern="^(daily|weekly|monthly)$")
    months: int = Field(default=6, ge=1, le=MAX_COST_MONTHS)
    pm_window_days: int = Field(default=90, ge=1, le=MAX_PM_WINDOW_DAYS)


def _load_cost_and_pm(company_code: str) -> tuple[list[dict], list[dict], list[dict]]:
    """Fetch work-order parts and PM rows when the Supabase backend is active.

    These three tables live only in Supabase — the xlsx and Sheets stores have
    no equivalent. Rather than fail, we return empty lists so the KPIs that do
    have data still compute, and ``coverage`` in the response marks cost and PM
    compliance as unavailable. Never let an analytics read raise.
    """
    try:
        from app import config

        if config.TICKET_STORE != "supabase":
            return [], [], []

        from app.repositories.supabase_repo import _client, _factory_id_for_code

        factory_id = _factory_id_for_code(company_code)
        if not factory_id:
            return [], [], []

        scope = {"factory_id": f"eq.{factory_id}"}
        parts = _client.select("work_order_parts", scope)
        schedules = _client.select("pm_schedules", scope)
        logs = _client.select("pm_logs", scope)
        return parts, schedules, logs
    except Exception as exc:
        log.warning("analytics.cost_pm_fetch_failed", company_code=company_code, error=str(exc))
        return [], [], []


def _resolve_factory_id(company_code: str) -> Optional[str]:
    """Map a company code to its factory UUID, or None outside Supabase mode."""
    try:
        from app import config

        if config.TICKET_STORE != "supabase":
            return None
        from app.repositories.supabase_repo import _factory_id_for_code

        return _factory_id_for_code(company_code)
    except Exception as exc:
        log.warning("analytics.factory_lookup_failed", company_code=company_code, error=str(exc))
        return None


def _compute(
    company_code: str,
    tickets_repo: TicketRepository,
    machines_repo: MachineRepository,
    months: int,
    pm_window_days: int,
) -> dict:
    machines = machines_repo.get_company_machines(company_code)
    tickets = tickets_repo.get_company_tickets(company_code)
    parts, schedules, pm_logs = _load_cost_and_pm(company_code)

    return analytics_service.compute_analytics(
        company_code=company_code,
        machines=machines,
        tickets=tickets,
        work_order_parts=parts,
        pm_schedules=schedules,
        pm_logs=pm_logs,
        months=months,
        pm_window_days=pm_window_days,
    )


@router.get("/kpis")
def get_analytics_kpis(
    months: int = Query(default=6, ge=1, le=MAX_COST_MONTHS),
    pm_window_days: int = Query(default=90, ge=1, le=MAX_PM_WINDOW_DAYS),
    user: CurrentUser = Depends(get_current_user),
    tickets: TicketRepository = Depends(get_tickets),
    machines: MachineRepository = Depends(get_machines),
):
    """Compute the six headline KPIs live for the caller's company."""
    return _compute(user.company_code, tickets, machines, months, pm_window_days)


@router.post("/snapshot")
def capture_analytics_snapshot(
    body: SnapshotRequest,
    user: CurrentUser = Depends(get_current_user),
    tickets: TicketRepository = Depends(get_tickets),
    machines: MachineRepository = Depends(get_machines),
    snapshots: AnalyticsSnapshotRepository = Depends(get_analytics_snapshots),
):
    """Compute and persist today's snapshot. Owner / maintenance head only."""
    user.assert_can_write()

    factory_id = _resolve_factory_id(user.company_code) or user.company_code
    analytics = _compute(
        user.company_code, tickets, machines, body.months, body.pm_window_days
    )

    today = datetime.now(timezone.utc).date()
    period_start, period_end = _period_bounds(body.period_kind, today)

    row = analytics_service.to_snapshot_row(
        analytics,
        factory_id=factory_id,
        period_kind=body.period_kind,
        period_start=period_start,
        period_end=period_end,
        captured_by=user.user_id,
    )

    try:
        stored = snapshots.upsert(row)
    except Exception as exc:
        log.error(
            "analytics.snapshot_write_failed",
            company_code=user.company_code,
            error=str(exc),
        )
        raise HTTPException(status_code=503, detail="could not store analytics snapshot")

    log.info(
        "analytics.snapshot_captured",
        company_code=user.company_code,
        period_kind=body.period_kind,
        period_start=str(period_start),
    )
    return {"snapshot": stored, "analytics": analytics}


@router.get("/trend")
def get_analytics_trend(
    period_kind: str = Query(default="daily", pattern="^(daily|weekly|monthly)$"),
    limit: int = Query(default=30, ge=1, le=MAX_TREND_LIMIT),
    user: CurrentUser = Depends(get_current_user),
    snapshots: AnalyticsSnapshotRepository = Depends(get_analytics_snapshots),
):
    """Return stored snapshots for the caller's company, newest first."""
    factory_id = _resolve_factory_id(user.company_code) or user.company_code
    rows = snapshots.list_snapshots(factory_id, period_kind=period_kind, limit=limit)
    return {
        "period_kind": period_kind,
        "count": len(rows),
        "snapshots": rows,
    }


def _period_bounds(period_kind: str, today: date) -> tuple[date, date]:
    """Calendar bounds for the period containing `today`.

    Snapshots are keyed by period_start, so these bounds are what make a
    re-run within the same day/week/month overwrite rather than duplicate.
    """
    if period_kind == "weekly":
        start = today.fromordinal(today.toordinal() - today.weekday())
        return start, start.fromordinal(start.toordinal() + 6)
    if period_kind == "monthly":
        start = today.replace(day=1)
        if start.month == 12:
            next_month = start.replace(year=start.year + 1, month=1)
        else:
            next_month = start.replace(month=start.month + 1)
        return start, next_month.fromordinal(next_month.toordinal() - 1)
    return today, today
