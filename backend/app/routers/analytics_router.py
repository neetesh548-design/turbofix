"""Analytics router — trend, insight and risk endpoints over the KPI time series.

Scope boundary: the existing ``GET /vault/dashboard`` remains the endpoint for
"what is true right now". These endpoints answer the questions a live query
cannot — how metrics have moved over recorded history, and which machines carry
the most failure risk.

Every route is scoped to the authenticated user's company. Company code is taken
from the auth token, never from a query parameter, so one tenant cannot read
another's series.
"""

from fastapi import APIRouter, Depends, HTTPException, Query

from app.auth import CurrentUser, get_current_user
from app.dependencies import get_machines, get_snapshots, get_tickets, get_users
from app.infrastructure.logging import get_logger
from app.repositories.base import MachineRepository, TicketRepository
from app.repositories.snapshot_repo import SnapshotRepository
from app.services.analytics_service import (
    analyse_all,
    build_snapshot,
    cached_kpis,
    generate_insights,
    get_cache,
    rank_failure_risk,
    serialise_insight,
    serialise_trend,
)

router = APIRouter(prefix="/vault/analytics")
log = get_logger("turbofix.analytics.api")

# Bounds the work a single request can ask for; also the practical limit of
# what a dashboard chart can render usefully.
MAX_WINDOW_DAYS = 365


@router.get("/trends")
def get_trends(
    days: int = Query(30, ge=1, le=MAX_WINDOW_DAYS),
    user: CurrentUser = Depends(get_current_user),
    snapshots: SnapshotRepository = Depends(get_snapshots),
):
    """Trend direction and magnitude per metric over recorded snapshots.

    Returns `sample_count: 0` and `direction: "unknown"` for every metric until
    snapshots have accumulated — an empty series is not an error.
    """
    series = snapshots.list_since(user.company_code, days=days)
    trends = analyse_all(series)
    return {
        "company_code": user.company_code,
        "window_days": days,
        "snapshot_count": len(series),
        "trends": {name: serialise_trend(t) for name, t in trends.items()},
    }


@router.get("/insights")
def get_insights(
    days: int = Query(30, ge=1, le=MAX_WINDOW_DAYS),
    user: CurrentUser = Depends(get_current_user),
    snapshots: SnapshotRepository = Depends(get_snapshots),
    tickets: TicketRepository = Depends(get_tickets),
    machines: MachineRepository = Depends(get_machines),
    users=Depends(get_users),
):
    """Ranked, actionable findings from current KPIs plus recorded trends."""
    company = users.get_company(user.company_code)
    if not company:
        raise HTTPException(status_code=404, detail="company not found")

    payload = cached_kpis(
        company_code=user.company_code,
        company_name=company.get("company_name", ""),
        tickets_repo=tickets,
        machines_repo=machines,
    )
    current = {**payload.get("kpis", {}), **payload.get("auto_insights", {})}
    trends = analyse_all(snapshots.list_since(user.company_code, days=days))

    insights = generate_insights(current, trends)
    return {
        "company_code": user.company_code,
        "insights": [serialise_insight(i) for i in insights],
        "count": len(insights),
    }


@router.get("/failure-risk")
def get_failure_risk(
    days: int = Query(90, ge=1, le=MAX_WINDOW_DAYS),
    limit: int = Query(10, ge=1, le=100),
    user: CurrentUser = Depends(get_current_user),
    tickets: TicketRepository = Depends(get_tickets),
    machines: MachineRepository = Depends(get_machines),
):
    """Machines ranked by recency-weighted failure history.

    `risk_score` is a ranking heuristic derived from observed failures, not a
    calibrated probability — see rank_failure_risk() for the weighting.
    """
    ranked = rank_failure_risk(
        tickets.get_company_tickets(user.company_code),
        machines.get_company_machines(user.company_code),
        window_days=days,
    )
    return {
        "company_code": user.company_code,
        "window_days": days,
        "machines": ranked[:limit],
        "total_ranked": len(ranked),
    }


@router.post("/snapshot")
def capture_snapshot(
    user: CurrentUser = Depends(get_current_user),
    snapshots: SnapshotRepository = Depends(get_snapshots),
    tickets: TicketRepository = Depends(get_tickets),
    machines: MachineRepository = Depends(get_machines),
    users=Depends(get_users),
):
    """Record the current KPI set into the time series.

    Intended for a scheduler (daily is enough for trend purposes); exposed
    manually so history can be seeded without waiting a full cycle.
    """
    company = users.get_company(user.company_code)
    if not company:
        raise HTTPException(status_code=404, detail="company not found")

    snapshot = build_snapshot(
        company_code=user.company_code,
        company_name=company.get("company_name", ""),
        tickets_repo=tickets,
        machines_repo=machines,
        source="manual",
    )
    snapshots.append(snapshot)
    log.info(
        "analytics.snapshot_captured",
        company_code=user.company_code,
        metric_count=len(snapshot.metrics),
    )
    return {
        "captured_at": snapshot.captured_at.isoformat(),
        "metrics": snapshot.metrics,
        "source": snapshot.source,
    }


@router.get("/cache-stats")
def cache_stats(user: CurrentUser = Depends(get_current_user)):
    """Cache hit/miss counters — for verifying the cache is actually helping."""
    return get_cache().stats()
