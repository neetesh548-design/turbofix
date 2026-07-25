"""Unit tests for dashboard_service — the canonical KPI computation.

HISTORY: this file previously imported `get_dashboard_data` and called
`compute_kpis(company_code=...)`. Neither has ever existed (verified against
full git history), so the module failed to import and took the entire backend
suite down with it at collection time. It has been rewritten against the real
API: `compute_kpis(company_code, company_name, tickets_repo, machines_repo)`.

`compute_kpis` is the single source of truth for KPI formulas — analytics_service
snapshots whatever it returns rather than recomputing — so these tests pin the
formulas themselves, not just the response shape.
"""

from datetime import datetime, timedelta, timezone

import pytest

from app.services.dashboard_service import (
    build_custom_kpi_values,
    compute_auto_insights,
    compute_kpis,
)

NOW = datetime.now(timezone.utc)


def ts(days_ago=0, hours_ago=0):
    """Timestamp in the tracker's native '%Y-%m-%d %H:%M:%S' format."""
    return (NOW - timedelta(days=days_ago, hours=hours_ago)).strftime("%Y-%m-%d %H:%M:%S")


class FakeTickets:
    def __init__(self, rows):
        self._rows = rows

    def get_company_tickets(self, company_code):
        return [r for r in self._rows if r.get("company_code", company_code) == company_code]


class FakeMachines:
    def __init__(self, rows):
        self._rows = rows

    def get_company_machines(self, company_code):
        return [r for r in self._rows if r.get("company_code", company_code) == company_code]


def run(tickets=None, machines=None, company="ACME"):
    return compute_kpis(
        company_code=company,
        company_name="Acme Forge",
        tickets_repo=FakeTickets(tickets or []),
        machines_repo=FakeMachines(machines or []),
    )


# ---------------------------------------------------------------------------
# Core KPI formulas
# ---------------------------------------------------------------------------

def test_returns_all_expected_kpi_keys():
    result = run()
    for key in (
        "open_tickets", "machines_down", "closed_today", "total_tickets",
        "avg_hours_to_fix", "plant_health_pct", "total_machines", "urgent_open",
    ):
        assert key in result["kpis"], f"{key} missing"
    for section in ("auto_insights", "recent_activity", "needs_attention", "weekly_trend"):
        assert section in result


def test_open_tickets_counts_only_open_status():
    tickets = [
        {"ticket_id": "T1", "status": "Open"},
        {"ticket_id": "T2", "status": "Open"},
        {"ticket_id": "T3", "status": "Closed"},
    ]
    assert run(tickets)["kpis"]["open_tickets"] == 2
    assert run(tickets)["kpis"]["total_tickets"] == 3


def test_status_matching_is_case_sensitive_capital_open():
    """Documents a real trap: 'open' (lowercase) is NOT counted.

    The JS dashboard uses lowercase 'open' against Supabase while this backend
    requires 'Open'. Against the same data the two disagree. Pinning the
    behaviour here so any reconciliation is a deliberate, visible change.
    """
    assert run([{"ticket_id": "T1", "status": "open"}])["kpis"]["open_tickets"] == 0
    assert run([{"ticket_id": "T1", "status": "Open"}])["kpis"]["open_tickets"] == 1


def test_machines_down_uses_has_open_tickets_flag():
    machines = [
        {"machine_id": "M1", "has_open_tickets": True},
        {"machine_id": "M2", "has_open_tickets": True},
        {"machine_id": "M3", "has_open_tickets": False},
    ]
    result = run(machines=machines)
    assert result["kpis"]["machines_down"] == 2
    assert result["kpis"]["total_machines"] == 3


def test_plant_health_is_percentage_of_machines_up():
    machines = [{"machine_id": f"M{i}", "has_open_tickets": i < 2} for i in range(10)]
    assert run(machines=machines)["kpis"]["plant_health_pct"] == 80


def test_plant_health_is_100_when_no_machines_registered():
    """Avoids a divide-by-zero and reads correctly: nothing broken."""
    assert run()["kpis"]["plant_health_pct"] == 100


def test_plant_health_is_zero_when_every_machine_is_down():
    machines = [{"machine_id": "M1", "has_open_tickets": True}]
    assert run(machines=machines)["kpis"]["plant_health_pct"] == 0


def test_urgent_open_counts_high_urgency_open_tickets_only():
    tickets = [
        {"ticket_id": "T1", "status": "Open", "urgency": "High"},
        {"ticket_id": "T2", "status": "Open", "urgency": "Medium"},
        {"ticket_id": "T3", "status": "Closed", "urgency": "High"},
    ]
    assert run(tickets)["kpis"]["urgent_open"] == 1


def test_avg_hours_to_fix_averages_closed_tickets():
    tickets = [
        {"ticket_id": "T1", "status": "Closed", "hours_to_fix": 4},
        {"ticket_id": "T2", "status": "Closed", "hours_to_fix": 2},
        {"ticket_id": "T3", "status": "Open"},
    ]
    assert run(tickets)["kpis"]["avg_hours_to_fix"] == 3.0


def test_avg_hours_to_fix_ignores_unparseable_values():
    tickets = [
        {"ticket_id": "T1", "status": "Closed", "hours_to_fix": 6},
        {"ticket_id": "T2", "status": "Closed", "hours_to_fix": "n/a"},
    ]
    assert run(tickets)["kpis"]["avg_hours_to_fix"] == 6.0


def test_avg_hours_to_fix_is_zero_with_no_closed_tickets():
    assert run([{"ticket_id": "T1", "status": "Open"}])["kpis"]["avg_hours_to_fix"] == 0.0


def test_closed_today_counts_only_todays_closures():
    tickets = [
        {"ticket_id": "T1", "status": "Closed", "closed_at": NOW.isoformat()},
        {"ticket_id": "T2", "status": "Closed", "closed_at": (NOW - timedelta(days=3)).isoformat()},
    ]
    assert run(tickets)["kpis"]["closed_today"] == 1


def test_empty_company_produces_all_zero_kpis():
    kpis = run()["kpis"]
    assert kpis["open_tickets"] == 0
    assert kpis["machines_down"] == 0
    assert kpis["total_tickets"] == 0
    assert kpis["avg_hours_to_fix"] == 0.0


def test_company_scoping_excludes_other_tenants():
    tickets = [
        {"ticket_id": "T1", "status": "Open", "company_code": "ACME"},
        {"ticket_id": "T2", "status": "Open", "company_code": "BETA"},
    ]
    assert run(tickets, company="ACME")["kpis"]["open_tickets"] == 1


# ---------------------------------------------------------------------------
# Ordering / presentation sections
# ---------------------------------------------------------------------------

def test_needs_attention_sorts_high_urgency_first():
    tickets = [
        {"ticket_id": "T1", "status": "Open", "urgency": "Low", "reported_at": ts(1)},
        {"ticket_id": "T2", "status": "Open", "urgency": "High", "reported_at": ts(0)},
        {"ticket_id": "T3", "status": "Open", "urgency": "Medium", "reported_at": ts(2)},
    ]
    assert [t["urgency"] for t in run(tickets)["needs_attention"]] == ["High", "Medium", "Low"]


def test_needs_attention_puts_oldest_first_within_same_urgency():
    tickets = [
        {"ticket_id": "NEW", "status": "Open", "urgency": "High", "reported_at": ts(1)},
        {"ticket_id": "OLD", "status": "Open", "urgency": "High", "reported_at": ts(9)},
    ]
    assert run(tickets)["needs_attention"][0]["reported_at"] == ts(9)


def test_needs_attention_excludes_closed_tickets():
    tickets = [{"ticket_id": "T1", "status": "Closed", "urgency": "High"}]
    assert run(tickets)["needs_attention"] == []


def test_recent_activity_is_capped_at_five_newest_first():
    tickets = [
        {"ticket_id": f"T{i}", "status": "Open", "reported_at": ts(days_ago=i)}
        for i in range(10)
    ]
    recent = run(tickets)["recent_activity"]
    assert len(recent) == 5
    assert recent[0]["ticket_id"] == "T0"


def test_weekly_trend_always_returns_six_zero_filled_weeks():
    trend = run([{"ticket_id": "T1", "status": "Open", "reported_at": ts(0)}])["weekly_trend"]
    assert len(trend) == 6
    assert sum(w["count"] for w in trend) == 1
    assert trend[-1]["count"] == 1, "current week is last"


def test_weekly_trend_ignores_tickets_older_than_the_window():
    trend = run([{"ticket_id": "T1", "status": "Open", "reported_at": ts(days_ago=200)}])["weekly_trend"]
    assert sum(w["count"] for w in trend) == 0


# ---------------------------------------------------------------------------
# Auto insights (MTBF / MTTR / repeat rate) — analytics_service snapshots these
# ---------------------------------------------------------------------------

def test_mttr_averages_hours_to_fix_on_closed_tickets():
    tickets = [
        {"status": "Closed", "hours_to_fix": 6},
        {"status": "Closed", "hours_to_fix": 2},
    ]
    assert compute_auto_insights(tickets, [])["mttr_hours"] == 4.0


def test_mttr_excludes_zero_and_invalid_hours():
    tickets = [
        {"status": "Closed", "hours_to_fix": 5},
        {"status": "Closed", "hours_to_fix": 0},
        {"status": "Closed", "hours_to_fix": "bad"},
    ]
    assert compute_auto_insights(tickets, [])["mttr_hours"] == 5.0


def test_mtbf_measures_gap_between_consecutive_failures_per_machine():
    tickets = [
        {"machine_id": "M1", "reported_at": ts(days_ago=2)},
        {"machine_id": "M1", "reported_at": ts(days_ago=1)},
    ]
    assert compute_auto_insights(tickets, [])["mtbf_hours"] == pytest.approx(24.0, abs=0.1)


def test_mtbf_is_zero_for_a_machine_that_failed_once():
    """One failure gives no interval to measure."""
    assert compute_auto_insights([{"machine_id": "M1", "reported_at": ts(1)}], [])["mtbf_hours"] == 0


def test_mtbf_does_not_mix_intervals_across_machines():
    tickets = [
        {"machine_id": "M1", "reported_at": ts(days_ago=10)},
        {"machine_id": "M2", "reported_at": ts(days_ago=1)},
    ]
    assert compute_auto_insights(tickets, [])["mtbf_hours"] == 0


def test_repeat_breakdown_pct_needs_three_failures_in_30_days():
    tickets = (
        [{"machine_id": "M1", "reported_at": ts(days_ago=d)} for d in (1, 2, 3)]
        + [{"machine_id": "M2", "reported_at": ts(days_ago=1)}]
    )
    assert compute_auto_insights(tickets, [])["repeat_breakdown_pct"] == 50


def test_repeat_breakdown_ignores_failures_outside_30_days():
    tickets = [{"machine_id": "M1", "reported_at": ts(days_ago=d)} for d in (40, 50, 60)]
    assert compute_auto_insights(tickets, [])["repeat_breakdown_pct"] == 0


def test_top_problem_machines_ranked_and_capped_at_three():
    tickets = (
        [{"machine_id": "M1", "reported_at": ts(1)}] * 5
        + [{"machine_id": "M2", "reported_at": ts(1)}] * 3
        + [{"machine_id": "M3", "reported_at": ts(1)}] * 2
        + [{"machine_id": "M4", "reported_at": ts(1)}]
    )
    machines = [{"machine_id": "M1", "machine_name": "Press A"}]
    top = compute_auto_insights(tickets, machines)["top_problem_machines"]

    assert len(top) == 3
    assert top[0]["machine_id"] == "M1"
    assert top[0]["machine_name"] == "Press A"
    assert top[0]["ticket_count"] == 5


def test_auto_insights_on_empty_data_are_all_zero():
    insights = compute_auto_insights([], [])
    assert insights["mtbf_hours"] == 0
    assert insights["mttr_hours"] == 0
    assert insights["repeat_breakdown_pct"] == 0
    assert insights["top_problem_machines"] == []


# ---------------------------------------------------------------------------
# Custom KPI tiles
# ---------------------------------------------------------------------------

def test_auto_kpi_reads_mtbf_from_insights():
    values = build_custom_kpi_values(
        "ACME",
        [{"kpi_id": "K1", "kpi_name": "MTBF", "kpi_type": "auto"}],
        [],
        {"mtbf_hours": 210.5},
        {},
    )
    assert values[0]["value"] == "210.5 hrs"


def test_auto_kpi_reads_repeat_rate_from_insights():
    values = build_custom_kpi_values(
        "ACME",
        [{"kpi_id": "K1", "kpi_name": "Repeat rate", "kpi_type": "auto"}],
        [],
        {"repeat_breakdown_pct": 25},
        {},
    )
    assert values[0]["value"] == "25%"


def test_manual_kpi_uses_latest_entry_with_unit():
    values = build_custom_kpi_values(
        "ACME",
        [{"kpi_id": "K1", "kpi_name": "PM Compliance", "kpi_type": "manual", "unit": "%"}],
        [{"kpi_id": "K1", "value": "92"}],
        {},
        {},
    )
    assert values[0]["value"] == "92 %"


def test_manual_kpi_shows_placeholder_when_no_data_logged():
    values = build_custom_kpi_values(
        "ACME",
        [{"kpi_id": "K1", "kpi_name": "PM Compliance", "kpi_type": "manual"}],
        [],
        {},
        {},
    )
    assert values[0]["value"] == "—"


def test_downtime_cost_kpi_multiplies_rate_by_hours_lost():
    values = build_custom_kpi_values(
        "ACME",
        [{"kpi_id": "K1", "kpi_name": "Downtime cost", "kpi_type": "calc", "cost_per_hour": "1000"}],
        [],
        {},
        {"avg_hours_to_fix": 4, "open_tickets": 3},
    )
    assert values[0]["value"] == "Rs 12,000"


def test_kpi_status_escalates_past_critical_threshold():
    config = {
        "kpi_id": "K1", "kpi_name": "Backlog", "kpi_type": "manual",
        "warning_threshold": "10", "critical_threshold": "20",
    }
    def status_for(value):
        return build_custom_kpi_values("ACME", [config], [{"kpi_id": "K1", "value": value}], {}, {})[0]["status"]

    assert status_for("25") == "critical"
    assert status_for("15") == "warning"
    assert status_for("5") == "normal"


def test_no_configured_kpis_yields_no_tiles():
    assert build_custom_kpi_values("ACME", [], [], {}, {}) == []
