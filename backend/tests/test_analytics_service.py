"""Unit tests for analytics_service — snapshots, trends, insights, risk, caching.

These are pure-function tests: every input is constructed in-test, so there are
no repository fakes and no I/O. The one place a repository is involved
(build_snapshot / cached_kpis) uses a minimal stub.
"""

from datetime import datetime, timedelta, timezone

import pytest

from app.services.analytics_service import (
    TRACKED_INSIGHTS,
    TRACKED_METRICS,
    Insight,
    Snapshot,
    TTLCache,
    analyse_all,
    analyse_metric,
    cached_kpis,
    filter_window,
    generate_insights,
    get_cache,
    rank_failure_risk,
    serialise_insight,
    serialise_trend,
    snapshot_from_payload,
    _parse_iso,
    _to_float,
)

NOW = datetime(2026, 7, 25, 12, 0, 0, tzinfo=timezone.utc)


def make_series(metric: str, values, start=NOW, step_days=1):
    """Build a snapshot series with one metric moving through `values`."""
    return [
        Snapshot(
            company_code="ACME",
            captured_at=start + timedelta(days=i * step_days),
            metrics={metric: float(v)},
        )
        for i, v in enumerate(values)
    ]


# ---------------------------------------------------------------------------
# Snapshot construction
# ---------------------------------------------------------------------------

def test_snapshot_from_payload_extracts_tracked_metrics():
    payload = {
        "kpis": {
            "plant_health_pct": 82,
            "machines_down": 3,
            "urgent_open": 2,
            "open_tickets": 9,
            "avg_hours_to_fix": 4.5,
            "total_tickets": 120,
            "total_machines": 17,
        },
        "auto_insights": {"mtbf_hours": 210.5, "mttr_hours": 4.2, "repeat_breakdown_pct": 25},
    }
    snap = snapshot_from_payload("ACME", payload, source="manual", now=NOW)

    assert snap.company_code == "ACME"
    assert snap.source == "manual"
    assert snap.captured_at == NOW
    for name in TRACKED_METRICS + TRACKED_INSIGHTS:
        assert name in snap.metrics, f"{name} should be captured"
    assert snap.metrics["plant_health_pct"] == 82.0
    assert snap.metrics["mtbf_hours"] == 210.5


def test_snapshot_from_payload_ignores_untracked_and_non_numeric():
    payload = {
        "kpis": {"plant_health_pct": 90, "company_name": "Acme Forge", "not_a_metric": 5},
        "auto_insights": {"mttr_hours": "not a number"},
    }
    snap = snapshot_from_payload("ACME", payload, now=NOW)

    assert snap.metrics == {"plant_health_pct": 90.0}
    assert "not_a_metric" not in snap.metrics
    assert "mttr_hours" not in snap.metrics


def test_snapshot_from_payload_handles_empty_payload():
    snap = snapshot_from_payload("ACME", {}, now=NOW)
    assert snap.metrics == {}
    assert snap.company_code == "ACME"


def test_snapshot_row_roundtrip_preserves_metrics():
    original = Snapshot("ACME", NOW, {"plant_health_pct": 88.0, "mttr_hours": 3.5}, "backfill")
    restored = Snapshot.from_row(original.to_row())

    assert restored.company_code == original.company_code
    assert restored.metrics == original.metrics
    assert restored.source == "backfill"
    assert restored.captured_at == original.captured_at


def test_snapshot_from_row_accepts_dict_metrics():
    """Supabase returns jsonb as a dict, not a JSON string."""
    restored = Snapshot.from_row({
        "company_code": "ACME",
        "captured_at": "2026-07-25T12:00:00+00:00",
        "metrics": {"plant_health_pct": 75},
        "source": "scheduled",
    })
    assert restored.metrics == {"plant_health_pct": 75.0}
    assert restored.captured_at == NOW


def test_snapshot_from_row_survives_corrupt_metrics():
    restored = Snapshot.from_row({"company_code": "ACME", "metrics": "{not json"})
    assert restored.metrics == {}


def test_snapshot_is_immutable():
    snap = Snapshot("ACME", NOW, {"plant_health_pct": 90.0})
    with pytest.raises(Exception):
        snap.company_code = "OTHER"  # type: ignore[misc]


# ---------------------------------------------------------------------------
# Trend analysis
# ---------------------------------------------------------------------------

def test_falling_plant_health_is_worsening():
    trend = analyse_metric(make_series("plant_health_pct", [95, 90, 85, 80, 75]), "plant_health_pct")

    assert trend.direction == "worsening"
    assert trend.slope_per_day < 0
    assert trend.change_pct == pytest.approx(-21.1, abs=0.2)
    assert trend.sample_count == 5
    assert trend.confidence == "high"


def test_rising_plant_health_is_improving():
    trend = analyse_metric(make_series("plant_health_pct", [70, 75, 80, 85, 90]), "plant_health_pct")
    assert trend.direction == "improving"
    assert trend.slope_per_day > 0


def test_polarity_is_inverted_for_lower_is_better_metrics():
    """Rising MTTR is bad; rising MTBF is good. Same slope sign, opposite verdict."""
    rising = [4.0, 5.0, 6.0, 7.0, 8.0]
    assert analyse_metric(make_series("mttr_hours", rising), "mttr_hours").direction == "worsening"
    assert analyse_metric(make_series("mtbf_hours", rising), "mtbf_hours").direction == "improving"


def test_flat_series_is_flat():
    trend = analyse_metric(make_series("plant_health_pct", [85, 85, 85, 85, 85]), "plant_health_pct")
    assert trend.direction == "flat"
    assert trend.slope_per_day == 0.0
    assert trend.change_pct == 0.0


def test_small_wobble_is_treated_as_noise_not_a_trend():
    """A metric drifting far below the threshold must not raise a trend alarm."""
    trend = analyse_metric(make_series("plant_health_pct", [85, 85.1, 85, 85.2, 85.1]), "plant_health_pct")
    assert trend.direction == "flat"


def test_single_sample_is_unknown_not_flat():
    trend = analyse_metric(make_series("plant_health_pct", [85]), "plant_health_pct")
    assert trend.direction == "unknown"
    assert trend.confidence == "none"
    assert trend.sample_count == 1
    assert trend.first_value == trend.last_value == 85.0


def test_empty_series_is_unknown():
    trend = analyse_metric([], "plant_health_pct")
    assert trend.direction == "unknown"
    assert trend.sample_count == 0
    assert trend.confidence == "none"


def test_short_series_is_low_confidence():
    """Two points define a line but do not establish a trend."""
    trend = analyse_metric(make_series("plant_health_pct", [90, 60]), "plant_health_pct")
    assert trend.direction == "worsening"
    assert trend.confidence == "low"


def test_missing_metric_in_some_snapshots_is_skipped_not_zero_filled():
    """A gap must shrink the sample, never be read as a zero reading."""
    snapshots = [
        Snapshot("ACME", NOW, {"plant_health_pct": 90.0}),
        Snapshot("ACME", NOW + timedelta(days=1), {"mttr_hours": 4.0}),
        Snapshot("ACME", NOW + timedelta(days=2), {"plant_health_pct": 80.0}),
    ]
    trend = analyse_metric(snapshots, "plant_health_pct")
    assert trend.sample_count == 2
    assert trend.first_value == 90.0
    assert trend.last_value == 80.0


def test_unordered_snapshots_are_sorted_before_analysis():
    ordered = make_series("plant_health_pct", [95, 90, 85, 80, 75])
    shuffled = [ordered[3], ordered[0], ordered[4], ordered[1], ordered[2]]

    assert analyse_metric(shuffled, "plant_health_pct") == analyse_metric(ordered, "plant_health_pct")


def test_change_pct_from_zero_baseline_does_not_divide_by_zero():
    trend = analyse_metric(make_series("machines_down", [0, 1, 2, 3, 4]), "machines_down")
    assert trend.change_pct == 0.0
    assert trend.direction == "worsening"


def test_slope_is_per_day_regardless_of_sampling_interval():
    """Same total movement over the same span must give the same slope."""
    daily = analyse_metric(make_series("plant_health_pct", [90, 80, 70], step_days=1), "plant_health_pct")
    weekly = analyse_metric(make_series("plant_health_pct", [90, 80, 70], step_days=7), "plant_health_pct")

    assert daily.slope_per_day == pytest.approx(weekly.slope_per_day * 7, abs=0.01)


def test_analyse_all_covers_every_tracked_metric():
    trends = analyse_all(make_series("plant_health_pct", [90, 85, 80]))
    for name in TRACKED_METRICS + TRACKED_INSIGHTS:
        assert name in trends
    assert trends["plant_health_pct"].direction == "worsening"
    assert trends["mttr_hours"].direction == "unknown"


def test_analyse_all_accepts_metric_subset():
    trends = analyse_all(make_series("plant_health_pct", [90, 80]), metrics=["plant_health_pct"])
    assert set(trends) == {"plant_health_pct"}


# ---------------------------------------------------------------------------
# Windowing
# ---------------------------------------------------------------------------

def test_filter_window_drops_snapshots_outside_the_window():
    snapshots = [
        Snapshot("ACME", NOW - timedelta(days=40), {"plant_health_pct": 60.0}),
        Snapshot("ACME", NOW - timedelta(days=10), {"plant_health_pct": 70.0}),
        Snapshot("ACME", NOW - timedelta(days=1), {"plant_health_pct": 80.0}),
    ]
    kept = filter_window(snapshots, days=30, now=NOW)

    assert len(kept) == 2
    assert [s.metrics["plant_health_pct"] for s in kept] == [70.0, 80.0]


def test_filter_window_returns_oldest_first():
    snapshots = list(reversed(make_series("plant_health_pct", [90, 85, 80], start=NOW - timedelta(days=3))))
    kept = filter_window(snapshots, days=30, now=NOW)
    assert [s.captured_at for s in kept] == sorted(s.captured_at for s in kept)


def test_filter_window_empty_input():
    assert filter_window([], days=30, now=NOW) == []


# ---------------------------------------------------------------------------
# Insight generation
# ---------------------------------------------------------------------------

def test_critical_plant_health_produces_critical_insight():
    insights = generate_insights({"plant_health_pct": 55.0, "machines_down": 9, "total_machines": 20})
    health = [i for i in insights if i.metric == "plant_health_pct"]

    assert len(health) == 1
    assert health[0].severity == "critical"
    assert health[0].key == "plant_health_critical"
    assert "9" in health[0].detail and "20" in health[0].detail


def test_degraded_plant_health_produces_warning_not_critical():
    insights = generate_insights({"plant_health_pct": 80.0})
    health = [i for i in insights if i.metric == "plant_health_pct"]
    assert health[0].severity == "warning"


def test_healthy_plant_produces_no_health_insight():
    insights = generate_insights({"plant_health_pct": 97.0, "machines_down": 0})
    assert [i for i in insights if i.metric == "plant_health_pct"] == []


def test_urgent_backlog_threshold():
    assert any(i.key == "urgent_backlog" for i in generate_insights({"urgent_open": 6.0}))
    assert not any(i.key == "urgent_backlog" for i in generate_insights({"urgent_open": 2.0}))


def test_repeat_failure_rate_insight():
    insights = generate_insights({"repeat_breakdown_pct": 35.0})
    repeat = [i for i in insights if i.key == "repeat_failures"]
    assert len(repeat) == 1
    assert repeat[0].severity == "warning"
    assert "root cause" in repeat[0].detail


def test_insights_are_ordered_critical_first():
    insights = generate_insights(
        {"plant_health_pct": 50.0, "urgent_open": 8.0, "machines_down": 10, "total_machines": 20},
        trends=analyse_all(make_series("mttr_hours", [2, 3, 4, 5, 6]), metrics=["mttr_hours"]),
    )
    severities = [i.severity for i in insights]
    assert severities == sorted(severities, key=lambda s: {"critical": 0, "warning": 1, "info": 2}[s])
    assert severities[0] == "critical"


def test_worsening_trend_generates_insight():
    trends = analyse_all(make_series("mttr_hours", [2, 3, 4, 5, 6]), metrics=["mttr_hours"])
    insights = generate_insights({}, trends=trends)

    trend_insights = [i for i in insights if i.key == "trend_mttr_hours"]
    assert len(trend_insights) == 1
    assert "MTTR" in trend_insights[0].title
    assert trend_insights[0].evidence["samples"] == 5


def test_low_confidence_trend_does_not_generate_insight():
    """Two readings must not be reported to an operator as a trend."""
    trends = analyse_all(make_series("mttr_hours", [2, 9]), metrics=["mttr_hours"])
    assert [i for i in generate_insights({}, trends=trends) if i.key.startswith("trend_")] == []


def test_improving_trend_does_not_generate_a_warning():
    trends = analyse_all(make_series("mttr_hours", [10, 8, 6, 4, 2]), metrics=["mttr_hours"])
    assert [i for i in generate_insights({}, trends=trends) if i.key.startswith("trend_")] == []


def test_no_metrics_yields_no_insights():
    assert generate_insights({}) == []


# ---------------------------------------------------------------------------
# Failure risk ranking
# ---------------------------------------------------------------------------

def _ticket(machine_id, days_ago):
    return {"machine_id": machine_id, "reported_at": (NOW - timedelta(days=days_ago)).isoformat()}


def test_rank_failure_risk_orders_by_weighted_score():
    tickets = [_ticket("M1", 1), _ticket("M1", 2), _ticket("M1", 3), _ticket("M2", 80)]
    machines = [
        {"machine_id": "M1", "machine_name": "Press A"},
        {"machine_id": "M2", "machine_name": "Pump B"},
    ]
    ranked = rank_failure_risk(tickets, machines, window_days=90, now=NOW)

    assert [r["machine_id"] for r in ranked] == ["M1", "M2"]
    assert ranked[0]["machine_name"] == "Press A"
    assert ranked[0]["failure_count"] == 3
    assert ranked[0]["is_repeat_offender"] is True
    assert ranked[1]["is_repeat_offender"] is False


def test_recent_failures_outrank_older_ones_at_equal_count():
    """The recency weighting is the whole point — equal counts must not tie."""
    tickets = [_ticket("OLD", 85), _ticket("OLD", 80), _ticket("NEW", 1), _ticket("NEW", 2)]
    ranked = rank_failure_risk(tickets, [], window_days=90, now=NOW)

    assert ranked[0]["machine_id"] == "NEW"
    assert ranked[0]["failure_count"] == ranked[1]["failure_count"] == 2
    assert ranked[0]["risk_score"] > ranked[1]["risk_score"]


def test_rank_failure_risk_excludes_tickets_outside_window():
    ranked = rank_failure_risk([_ticket("M1", 200), _ticket("M2", 5)], [], window_days=90, now=NOW)
    assert [r["machine_id"] for r in ranked] == ["M2"]


def test_rank_failure_risk_ignores_tickets_without_machine_or_date():
    tickets = [{"machine_id": "", "reported_at": NOW.isoformat()}, {"machine_id": "M1"}, _ticket("M2", 1)]
    ranked = rank_failure_risk(tickets, [], window_days=90, now=NOW)
    assert [r["machine_id"] for r in ranked] == ["M2"]


def test_rank_failure_risk_falls_back_to_created_at():
    tickets = [{"machine_id": "M1", "created_at": (NOW - timedelta(days=1)).isoformat()}]
    ranked = rank_failure_risk(tickets, [], window_days=90, now=NOW)
    assert len(ranked) == 1


def test_rank_failure_risk_uses_machine_id_when_name_unknown():
    ranked = rank_failure_risk([_ticket("M9", 1)], [], now=NOW)
    assert ranked[0]["machine_name"] == "M9"


def test_rank_failure_risk_empty_input():
    assert rank_failure_risk([], [], now=NOW) == []


# ---------------------------------------------------------------------------
# Caching
# ---------------------------------------------------------------------------

class StubTickets:
    def __init__(self, rows):
        self.rows = rows
        self.calls = 0

    def get_company_tickets(self, company_code):
        self.calls += 1
        return self.rows


class StubMachines:
    def __init__(self, rows):
        self.rows = rows

    def get_company_machines(self, company_code):
        return self.rows


def test_cached_kpis_computes_once_then_serves_from_cache():
    get_cache().invalidate()
    tickets = StubTickets([{"ticket_id": "T1", "status": "Open", "machine_id": "M1", "urgency": "High"}])
    machines = StubMachines([{"machine_id": "M1", "has_open_tickets": True}])

    first = cached_kpis("ACME", "Acme", tickets, machines)
    second = cached_kpis("ACME", "Acme", tickets, machines)

    assert tickets.calls == 1, "second call must not recompute"
    assert first["kpis"] == second["kpis"]


def test_cached_kpis_is_scoped_per_company():
    """A cache that leaked across companies would be a tenant data breach."""
    get_cache().invalidate()
    acme = StubTickets([{"ticket_id": "T1", "status": "Open", "machine_id": "M1", "urgency": "High"}])
    beta = StubTickets([])
    machines = StubMachines([{"machine_id": "M1", "has_open_tickets": True}])

    acme_result = cached_kpis("ACME", "Acme", acme, machines)
    beta_result = cached_kpis("BETA", "Beta", beta, StubMachines([]))

    assert acme_result["kpis"]["open_tickets"] == 1
    assert beta_result["kpis"]["open_tickets"] == 0
    assert beta.calls == 1


def test_cache_invalidate_forces_recompute():
    get_cache().invalidate()
    tickets = StubTickets([])
    machines = StubMachines([])

    cached_kpis("ACME", "Acme", tickets, machines)
    get_cache().invalidate("kpis:ACME")
    cached_kpis("ACME", "Acme", tickets, machines)

    assert tickets.calls == 2


def test_ttl_cache_expires_entries():
    cache = TTLCache(ttl_seconds=0.0)
    cache.set("k", "v")
    assert cache.get("k") is None


def test_ttl_cache_returns_live_entries_and_tracks_stats():
    cache = TTLCache(ttl_seconds=60.0)
    cache.set("k", "v")

    assert cache.get("k") == "v"
    assert cache.get("missing") is None
    assert cache.stats() == {"entries": 1, "hits": 1, "misses": 1}


def test_ttl_cache_evicts_when_full():
    cache = TTLCache(ttl_seconds=60.0, max_entries=2)
    cache.set("a", 1)
    cache.set("b", 2)
    cache.set("c", 3)

    assert cache.stats()["entries"] == 2
    assert cache.get("c") == 3


def test_ttl_cache_invalidate_by_prefix_leaves_others():
    cache = TTLCache(ttl_seconds=60.0)
    cache.set("kpis:ACME", 1)
    cache.set("kpis:BETA", 2)

    assert cache.invalidate("kpis:ACME") == 1
    assert cache.get("kpis:ACME") is None
    assert cache.get("kpis:BETA") == 2


# ---------------------------------------------------------------------------
# Helpers and serialisation
# ---------------------------------------------------------------------------

@pytest.mark.parametrize("value,expected", [
    (5, 5.0), ("5", 5.0), ("1,234", 1234.0), (" 7.5 ", 7.5), (0, 0.0),
    (None, None), ("", None), ("abc", None), ([], None), (True, None), (False, None),
])
def test_to_float_coercion(value, expected):
    assert _to_float(value) == expected


def test_to_float_rejects_bools_so_flags_are_never_charted():
    """bool is an int subclass in Python — a True flag must not become 1.0."""
    assert _to_float(True) is None


@pytest.mark.parametrize("value", [
    "2026-07-25T12:00:00+00:00", "2026-07-25T12:00:00Z", "2026-07-25 12:00:00", NOW,
])
def test_parse_iso_accepts_supported_formats(value):
    assert _parse_iso(value) == NOW


def test_parse_iso_assumes_utc_for_naive_input():
    parsed = _parse_iso(datetime(2026, 7, 25, 12, 0, 0))
    assert parsed is not None and parsed.tzinfo is not None
    assert parsed == NOW


@pytest.mark.parametrize("value", [None, "", "not a date", 12345.678])
def test_parse_iso_rejects_bad_input(value):
    assert _parse_iso(value) is None


def test_serialise_trend_is_json_safe():
    payload = serialise_trend(analyse_metric(make_series("plant_health_pct", [90, 80, 70]), "plant_health_pct"))
    assert payload["metric"] == "plant_health_pct"
    assert payload["direction"] == "worsening"
    assert set(payload) == {
        "metric", "direction", "slope_per_day", "change_pct",
        "first_value", "last_value", "sample_count", "confidence",
    }


def test_serialise_insight_is_json_safe():
    payload = serialise_insight(Insight(key="k", severity="info", title="t", detail="d"))
    assert payload["key"] == "k"
    assert payload["evidence"] == {}
