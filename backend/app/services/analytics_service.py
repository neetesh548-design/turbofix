"""Analytics service — time-series capture and trend analysis over stored KPI history.

WHY THIS MODULE EXISTS
----------------------
KPI *computation* already lives in ``dashboard_service.compute_kpis`` and is
driven by live ticket/machine rows.  That answers "what is true right now?" but
it cannot answer "what was plant health last Tuesday?" or "is MTTR improving?",
because a live query only ever sees the current state of the rows.  Once a
ticket is edited or purged, the past is gone.

This module adds the missing dimension: it periodically *snapshots* the computed
KPIs into an append-only store, then runs trend math over that stored history.

DESIGN RULE — ONE CANONICAL KPI SOURCE
--------------------------------------
This module deliberately does NOT reimplement any KPI formula.  It calls
``dashboard_service.compute_kpis`` and stores the result.  If a KPI definition
changes, it changes in exactly one place.  Adding a second implementation here
would guarantee the two drift apart (which is already what happened between the
Python backend and the JS dashboard — see ``KNOWN_DIVERGENCE`` below).

KNOWN_DIVERGENCE
----------------
``src/pages/Dashboard.jsx`` computes the same KPIs client-side against Supabase
using different field conventions than the Python backend:

    frontend: ticket.status === 'open'          backend: ticket["status"] == "Open"
    frontend: ticket.ai_summary.urgency         backend: ticket["urgency"]
              in ('high','critical')                      == "High"

Against identical data these two produce *different numbers*.  Snapshots taken
through this module use the backend definition.  Reconciling the frontend to
call the backend is tracked separately; until then, treat a snapshot series and
the live dashboard tiles as two different measurements.

AUDIT TRAIL
-----------
Every snapshot records ``captured_at``, the ``source`` that triggered it, and
the exact ``metrics`` payload.  Snapshots are never updated in place, so a
recomputed KPI definition cannot silently rewrite recorded history.
"""

from __future__ import annotations

import json
import threading
import time
from dataclasses import asdict, dataclass, field
from datetime import datetime, timedelta, timezone
from typing import Any, Callable, Dict, Iterable, List, Mapping, Optional, Sequence, Tuple

from app.infrastructure.logging import get_logger
from app.repositories.base import MachineRepository, TicketRepository
from app.services.dashboard_service import compute_kpis

log = get_logger("turbofix.analytics")


# ---------------------------------------------------------------------------
# Which KPIs are tracked as a time series.
#
# Only numeric, point-in-time-meaningful values belong here.  Counts that are
# already cumulative (e.g. total_tickets) are still useful because the *delta*
# between snapshots is the arrival rate.
# ---------------------------------------------------------------------------

TRACKED_METRICS: Tuple[str, ...] = (
    "plant_health_pct",
    "machines_down",
    "urgent_open",
    "open_tickets",
    "avg_hours_to_fix",
    "total_tickets",
    "total_machines",
)

TRACKED_INSIGHTS: Tuple[str, ...] = (
    "mtbf_hours",
    "mttr_hours",
    "repeat_breakdown_pct",
)

# For each metric, is a rising value good or bad?  Used to turn a raw slope into
# an "improving"/"worsening" judgement instead of a bare number.
_HIGHER_IS_BETTER: Mapping[str, bool] = {
    "plant_health_pct": True,
    "mtbf_hours": True,
    "machines_down": False,
    "urgent_open": False,
    "open_tickets": False,
    "avg_hours_to_fix": False,
    "mttr_hours": False,
    "repeat_breakdown_pct": False,
}

# A trend flatter than this (as a fraction of the series mean, per day) is noise,
# not a signal.  Chosen so a metric must move ~2% of its own scale per day before
# we tell an operator it is trending.
_FLAT_SLOPE_THRESHOLD = 0.02


@dataclass(frozen=True)
class Snapshot:
    """One point-in-time KPI record for a company. Immutable by construction."""

    company_code: str
    captured_at: datetime
    metrics: Dict[str, float]
    source: str = "scheduled"

    def to_row(self) -> Dict[str, Any]:
        """Flatten to a storage row (JSON-encoded metrics for a jsonb column)."""
        return {
            "company_code": self.company_code,
            "captured_at": self.captured_at.isoformat(),
            "metrics": json.dumps(self.metrics, sort_keys=True),
            "source": self.source,
        }

    @staticmethod
    def from_row(row: Mapping[str, Any]) -> "Snapshot":
        """Rebuild from a storage row, tolerating dict-or-string metrics."""
        raw = row.get("metrics") or {}
        if isinstance(raw, str):
            try:
                raw = json.loads(raw)
            except (ValueError, TypeError):
                raw = {}
        metrics: Dict[str, float] = {}
        for key, value in dict(raw).items():
            coerced = _to_float(value)
            if coerced is not None:
                metrics[str(key)] = coerced
        return Snapshot(
            company_code=str(row.get("company_code") or ""),
            captured_at=_parse_iso(row.get("captured_at")) or datetime.now(timezone.utc),
            metrics=metrics,
            source=str(row.get("source") or "scheduled"),
        )


@dataclass(frozen=True)
class Trend:
    """Direction and magnitude of one metric over a stored snapshot window."""

    metric: str
    direction: str          # "improving" | "worsening" | "flat" | "unknown"
    slope_per_day: float     # least-squares slope, metric units per day
    change_pct: float        # first -> last, percent
    first_value: float
    last_value: float
    sample_count: int
    confidence: str          # "high" | "low" | "none"


@dataclass
class Insight:
    """A human-readable, actionable finding derived from metrics or trends."""

    key: str
    severity: str            # "critical" | "warning" | "info"
    title: str
    detail: str
    metric: Optional[str] = None
    evidence: Dict[str, Any] = field(default_factory=dict)


# ---------------------------------------------------------------------------
# Small TTL cache.
#
# Deliberately in-process and tiny.  Dashboard KPI computation walks every
# ticket for a company on each request; at a 30s TTL a burst of dashboard loads
# collapses to one computation without adding a Redis dependency.  It is NOT
# shared across workers — correctness never depends on it, only latency.
# ---------------------------------------------------------------------------

class TTLCache:
    """Thread-safe in-process cache with per-entry expiry."""

    def __init__(self, ttl_seconds: float = 30.0, max_entries: int = 256) -> None:
        self._ttl = float(ttl_seconds)
        self._max = int(max_entries)
        self._data: Dict[str, Tuple[float, Any]] = {}
        self._lock = threading.Lock()
        self.hits = 0
        self.misses = 0

    def get(self, key: str) -> Optional[Any]:
        with self._lock:
            entry = self._data.get(key)
            if entry is None:
                self.misses += 1
                return None
            expires_at, value = entry
            if time.monotonic() >= expires_at:
                self._data.pop(key, None)
                self.misses += 1
                return None
            self.hits += 1
            return value

    def set(self, key: str, value: Any) -> None:
        with self._lock:
            if len(self._data) >= self._max:
                # Evict the entry closest to expiry — cheap and good enough at
                # this size; avoids an LRU bookkeeping structure.
                oldest = min(self._data.items(), key=lambda kv: kv[1][0])[0]
                self._data.pop(oldest, None)
            self._data[key] = (time.monotonic() + self._ttl, value)

    def invalidate(self, prefix: str = "") -> int:
        """Drop entries whose key starts with `prefix` ("" clears all)."""
        with self._lock:
            keys = [k for k in self._data if k.startswith(prefix)]
            for k in keys:
                self._data.pop(k, None)
            return len(keys)

    def stats(self) -> Dict[str, int]:
        with self._lock:
            return {"entries": len(self._data), "hits": self.hits, "misses": self.misses}


_kpi_cache = TTLCache(ttl_seconds=30.0)


def get_cache() -> TTLCache:
    """Expose the module cache (tests and admin endpoints use this)."""
    return _kpi_cache


# ---------------------------------------------------------------------------
# Snapshot capture
# ---------------------------------------------------------------------------

def build_snapshot(
    company_code: str,
    company_name: str,
    tickets_repo: TicketRepository,
    machines_repo: MachineRepository,
    source: str = "scheduled",
    now: Optional[datetime] = None,
) -> Snapshot:
    """Compute current KPIs and package them as an immutable Snapshot.

    Delegates every formula to ``dashboard_service.compute_kpis`` — see the
    module docstring on why this must not reimplement KPI math.
    """
    payload = compute_kpis(
        company_code=company_code,
        company_name=company_name,
        tickets_repo=tickets_repo,
        machines_repo=machines_repo,
    )
    return snapshot_from_payload(company_code, payload, source=source, now=now)


def snapshot_from_payload(
    company_code: str,
    payload: Mapping[str, Any],
    source: str = "scheduled",
    now: Optional[datetime] = None,
) -> Snapshot:
    """Extract the tracked numeric metrics out of a compute_kpis() payload."""
    kpis = payload.get("kpis") or {}
    insights = payload.get("auto_insights") or {}

    metrics: Dict[str, float] = {}
    for name in TRACKED_METRICS:
        value = _to_float(kpis.get(name))
        if value is not None:
            metrics[name] = value
    for name in TRACKED_INSIGHTS:
        value = _to_float(insights.get(name))
        if value is not None:
            metrics[name] = value

    return Snapshot(
        company_code=company_code,
        captured_at=now or datetime.now(timezone.utc),
        metrics=metrics,
        source=source,
    )


def cached_kpis(
    company_code: str,
    company_name: str,
    tickets_repo: TicketRepository,
    machines_repo: MachineRepository,
) -> Dict[str, Any]:
    """compute_kpis() behind the TTL cache. Identical return shape."""
    key = f"kpis:{company_code}"
    hit = _kpi_cache.get(key)
    if hit is not None:
        return dict(hit)

    result = compute_kpis(
        company_code=company_code,
        company_name=company_name,
        tickets_repo=tickets_repo,
        machines_repo=machines_repo,
    )
    _kpi_cache.set(key, result)
    return result


# ---------------------------------------------------------------------------
# Trend analysis over stored snapshots
# ---------------------------------------------------------------------------

def _linear_slope(points: Sequence[Tuple[float, float]]) -> float:
    """Least-squares slope for (x, y) points. Returns 0.0 when undefined.

    Plain OLS rather than a stats dependency: the series here are short (tens of
    points) and the slope is only used to classify direction, not to forecast.
    """
    n = len(points)
    if n < 2:
        return 0.0
    mean_x = sum(x for x, _ in points) / n
    mean_y = sum(y for _, y in points) / n
    numerator = sum((x - mean_x) * (y - mean_y) for x, y in points)
    denominator = sum((x - mean_x) ** 2 for x, _ in points)
    if denominator == 0:
        return 0.0
    return numerator / denominator


def analyse_metric(snapshots: Sequence[Snapshot], metric: str) -> Trend:
    """Compute the trend for one metric across a chronological snapshot series."""
    series = [
        (snap.captured_at, snap.metrics[metric])
        for snap in sorted(snapshots, key=lambda s: s.captured_at)
        if metric in snap.metrics
    ]

    if len(series) < 2:
        only = series[0][1] if series else 0.0
        return Trend(
            metric=metric,
            direction="unknown",
            slope_per_day=0.0,
            change_pct=0.0,
            first_value=only,
            last_value=only,
            sample_count=len(series),
            confidence="none",
        )

    origin = series[0][0]
    points = [((ts - origin).total_seconds() / 86_400.0, value) for ts, value in series]
    slope = _linear_slope(points)

    first_value = series[0][1]
    last_value = series[-1][1]
    change_pct = ((last_value - first_value) / abs(first_value) * 100.0) if first_value else 0.0

    mean_abs = sum(abs(v) for _, v in points) / len(points)
    normalised = abs(slope) / mean_abs if mean_abs else 0.0

    if normalised < _FLAT_SLOPE_THRESHOLD:
        direction = "flat"
    else:
        higher_is_better = _HIGHER_IS_BETTER.get(metric, True)
        rising = slope > 0
        direction = "improving" if rising == higher_is_better else "worsening"

    # Two points can describe a line but not establish a trend.
    confidence = "high" if len(series) >= 5 else "low"

    return Trend(
        metric=metric,
        direction=direction,
        slope_per_day=round(slope, 4),
        change_pct=round(change_pct, 1),
        first_value=first_value,
        last_value=last_value,
        sample_count=len(series),
        confidence=confidence,
    )


def analyse_all(
    snapshots: Sequence[Snapshot],
    metrics: Optional[Iterable[str]] = None,
) -> Dict[str, Trend]:
    """Trend every tracked metric (or a supplied subset)."""
    names = tuple(metrics) if metrics is not None else TRACKED_METRICS + TRACKED_INSIGHTS
    return {name: analyse_metric(snapshots, name) for name in names}


def filter_window(
    snapshots: Sequence[Snapshot],
    days: int,
    now: Optional[datetime] = None,
) -> List[Snapshot]:
    """Return snapshots captured within the last `days` days, oldest first."""
    reference = now or datetime.now(timezone.utc)
    cutoff = reference - timedelta(days=days)
    return sorted(
        (s for s in snapshots if s.captured_at >= cutoff),
        key=lambda s: s.captured_at,
    )


# ---------------------------------------------------------------------------
# Insight generation
#
# These are threshold + trend rules, not a learned model.  They are stated as
# rules on purpose: an operator can read why a card appeared and argue with it,
# which is worth more than an unexplainable score on a plant floor.
# ---------------------------------------------------------------------------

# Thresholds are plant-operations conventions, not tuned parameters.
_PLANT_HEALTH_CRITICAL = 70.0
_PLANT_HEALTH_WARNING = 85.0
_REPEAT_FAILURE_WARNING = 20.0
_URGENT_BACKLOG_WARNING = 5

def generate_insights(
    current: Mapping[str, float],
    trends: Optional[Mapping[str, Trend]] = None,
) -> List[Insight]:
    """Turn current metric values plus trends into ranked, actionable findings.

    Ordered critical -> warning -> info so a caller can render the top N.
    """
    trends = trends or {}
    found: List[Insight] = []

    health = current.get("plant_health_pct")
    if health is not None:
        if health < _PLANT_HEALTH_CRITICAL:
            found.append(Insight(
                key="plant_health_critical",
                severity="critical",
                title=f"Plant health at {health:.0f}%",
                detail=(
                    f"{current.get('machines_down', 0):.0f} of "
                    f"{current.get('total_machines', 0):.0f} machines are down. "
                    "Prioritise returning capacity before scheduling new work."
                ),
                metric="plant_health_pct",
                evidence={"value": health, "threshold": _PLANT_HEALTH_CRITICAL},
            ))
        elif health < _PLANT_HEALTH_WARNING:
            found.append(Insight(
                key="plant_health_warning",
                severity="warning",
                title=f"Plant health slipping ({health:.0f}%)",
                detail="More than one machine in seven is out of service.",
                metric="plant_health_pct",
                evidence={"value": health, "threshold": _PLANT_HEALTH_WARNING},
            ))

    urgent = current.get("urgent_open")
    if urgent is not None and urgent >= _URGENT_BACKLOG_WARNING:
        found.append(Insight(
            key="urgent_backlog",
            severity="warning",
            title=f"{urgent:.0f} urgent tickets open",
            detail="Urgent work is queueing faster than it is being cleared.",
            metric="urgent_open",
            evidence={"value": urgent, "threshold": _URGENT_BACKLOG_WARNING},
        ))

    repeat = current.get("repeat_breakdown_pct")
    if repeat is not None and repeat >= _REPEAT_FAILURE_WARNING:
        found.append(Insight(
            key="repeat_failures",
            severity="warning",
            title=f"{repeat:.0f}% of machines are repeat offenders",
            detail=(
                "These machines failed 3+ times in 30 days. Repeat failures point "
                "at an unfixed root cause rather than isolated breakdowns."
            ),
            metric="repeat_breakdown_pct",
            evidence={"value": repeat, "threshold": _REPEAT_FAILURE_WARNING},
        ))

    # Trend-derived insights — only from series we actually trust.
    for name, trend in trends.items():
        if trend.direction != "worsening" or trend.confidence != "high":
            continue
        found.append(Insight(
            key=f"trend_{name}",
            severity="info",
            title=f"{_label(name)} is worsening",
            detail=(
                f"Moved {trend.change_pct:+.1f}% across {trend.sample_count} readings "
                f"({trend.first_value:g} -> {trend.last_value:g})."
            ),
            metric=name,
            evidence={
                "slope_per_day": trend.slope_per_day,
                "change_pct": trend.change_pct,
                "samples": trend.sample_count,
            },
        ))

    order = {"critical": 0, "warning": 1, "info": 2}
    found.sort(key=lambda i: order.get(i.severity, 3))
    return found


def _label(metric: str) -> str:
    return {
        "plant_health_pct": "Plant health",
        "machines_down": "Machines down",
        "urgent_open": "Urgent open tickets",
        "open_tickets": "Open tickets",
        "avg_hours_to_fix": "Average repair time",
        "mtbf_hours": "MTBF",
        "mttr_hours": "MTTR",
        "repeat_breakdown_pct": "Repeat failure rate",
        "total_tickets": "Total tickets",
        "total_machines": "Total machines",
    }.get(metric, metric.replace("_", " ").capitalize())


# ---------------------------------------------------------------------------
# Repeat-failure risk
#
# Scope note: this ranks machines by observed failure history. It is explicitly
# NOT a trained predictive model, and the returned field is named `risk_score`
# rather than `probability` so no caller mistakes it for a calibrated one.
# ---------------------------------------------------------------------------

def rank_failure_risk(
    tickets: Sequence[Mapping[str, Any]],
    machines: Sequence[Mapping[str, Any]],
    window_days: int = 90,
    now: Optional[datetime] = None,
) -> List[Dict[str, Any]]:
    """Rank machines by repeat-failure risk using recency-weighted ticket counts.

    Recent failures weigh more than old ones (linear decay across the window),
    because a machine that failed 4 times last week is a live problem while one
    that failed 4 times three months ago may already be fixed.
    """
    reference = now or datetime.now(timezone.utc)
    cutoff = reference - timedelta(days=window_days)
    names = {
        str(m.get("machine_id") or ""): str(m.get("machine_name") or m.get("name") or "")
        for m in machines
    }

    weighted: Dict[str, float] = {}
    counts: Dict[str, int] = {}
    latest: Dict[str, datetime] = {}

    for ticket in tickets:
        machine_id = str(ticket.get("machine_id") or "")
        if not machine_id:
            continue
        reported = _parse_iso(ticket.get("reported_at") or ticket.get("created_at"))
        if reported is None or reported < cutoff:
            continue
        age_days = max(0.0, (reference - reported).total_seconds() / 86_400.0)
        weight = max(0.0, 1.0 - (age_days / window_days))
        weighted[machine_id] = weighted.get(machine_id, 0.0) + weight
        counts[machine_id] = counts.get(machine_id, 0) + 1
        if machine_id not in latest or reported > latest[machine_id]:
            latest[machine_id] = reported

    ranked: List[Dict[str, Any]] = [
        {
            "machine_id": machine_id,
            "machine_name": names.get(machine_id, machine_id),
            "failure_count": counts[machine_id],
            "risk_score": round(score, 2),
            "last_failure_at": latest[machine_id].isoformat(),
            # 3+ failures in the window is the same repeat threshold
            # dashboard_service.compute_auto_insights uses.
            "is_repeat_offender": counts[machine_id] >= 3,
        }
        for machine_id, score in weighted.items()
    ]
    ranked.sort(key=lambda r: (-weighted[str(r["machine_id"])], -counts[str(r["machine_id"])]))
    return ranked


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _to_float(value: Any) -> Optional[float]:
    """Coerce to float, returning None for anything non-numeric (incl. bools)."""
    # The bool check is redundant *today* (str(True) == "True", which float()
    # rejects) but is kept deliberately: bool is an int subclass, so dropping
    # the str() below would silently turn a True flag into a 1.0 data point.
    if value is None or isinstance(value, bool):
        return None
    try:
        return float(str(value).replace(",", "").strip())
    except (ValueError, TypeError, AttributeError):
        return None


def _parse_iso(value: Any) -> Optional[datetime]:
    """Parse a timestamp from ISO-8601 or the legacy tracker formats.

    Always returns a UTC-aware datetime so comparisons never raise on
    naive/aware mixing.
    """
    if value is None or value == "":
        return None
    if isinstance(value, datetime):
        return value if value.tzinfo else value.replace(tzinfo=timezone.utc)

    text = str(value).strip()
    try:
        parsed = datetime.fromisoformat(text.replace("Z", "+00:00"))
        return parsed if parsed.tzinfo else parsed.replace(tzinfo=timezone.utc)
    except ValueError:
        pass

    for fmt in ("%Y-%m-%d %H:%M:%S", "%Y-%m-%d %H:%M", "%Y-%m-%d"):
        try:
            return datetime.strptime(text, fmt).replace(tzinfo=timezone.utc)
        except ValueError:
            continue
    return None


def serialise_trend(trend: Trend) -> Dict[str, Any]:
    """JSON-safe form of a Trend (for API responses)."""
    return asdict(trend)


def serialise_insight(insight: Insight) -> Dict[str, Any]:
    """JSON-safe form of an Insight (for API responses)."""
    return asdict(insight)
