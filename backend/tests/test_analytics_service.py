"""Tests for the Analytics Engine KPI calculations.

Every test injects an explicit `now` where time matters, so the suite is
deterministic and will not start failing at a month boundary.
"""

from datetime import datetime, timedelta, timezone
from pathlib import Path

import pytest

from app.repositories.snapshot_repo import LocalAnalyticsSnapshotRepository
from app.services import analytics_service as svc

NOW = datetime(2026, 7, 25, 12, 0, 0, tzinfo=timezone.utc)


def ticket(**overrides) -> dict:
    base = {
        "ticket_id": "T1",
        "machine_id": "M001",
        "status": "Open",
        "urgency": "Medium",
        "reported_at": "2026-07-20 08:00:00",
        "closed_at": "",
        "hours_to_fix": "",
    }
    base.update(overrides)
    return base


def machine(machine_id: str, **overrides) -> dict:
    base = {"machine_id": machine_id, "machine_name": machine_id, "has_open_tickets": False}
    base.update(overrides)
    return base


# ---------------------------------------------------------------------------
# Migration collision guard — the bug this work started from
# ---------------------------------------------------------------------------

MIGRATIONS_DIR = Path(__file__).resolve().parents[2] / "supabase" / "migrations"


def test_no_duplicate_migration_timestamps():
    """Two migrations sharing a timestamp prefix have undefined apply order.

    This is the regression guard for the collision that blocked the Analytics
    Engine: it fails loudly the moment a duplicate prefix is committed again.
    """
    prefixes = [path.name.split("_")[0] for path in MIGRATIONS_DIR.glob("*.sql")]
    duplicates = {p for p in prefixes if prefixes.count(p) > 1}
    assert not duplicates, f"colliding migration timestamps: {sorted(duplicates)}"


def test_analytics_snapshot_migration_exists_and_sorts_last():
    names = sorted(path.name for path in MIGRATIONS_DIR.glob("*.sql"))
    assert "20260725120000_create_analytics_snapshots.sql" in names
    assert names[-1] == "20260725120000_create_analytics_snapshots.sql"


# ---------------------------------------------------------------------------
# Timestamp parsing
# ---------------------------------------------------------------------------

@pytest.mark.parametrize("raw,expected_year,expected_hour", [
    ("2026-07-25T10:30:00Z", 2026, 10),
    ("2026-07-25T10:30:00+00:00", 2026, 10),
    ("2026-07-25 10:30:00", 2026, 10),
    ("2026-07-25 10:30", 2026, 10),
    ("2026-07-25", 2026, 0),
    ("25/07/2026 10:30", 2026, 10),
])
def test_parse_timestamp_handles_every_backend_format(raw, expected_year, expected_hour):
    parsed = svc.parse_timestamp(raw)
    assert parsed is not None
    assert parsed.year == expected_year
    assert parsed.hour == expected_hour
    assert parsed.tzinfo is not None, "result must be tz-aware to allow comparison"


@pytest.mark.parametrize("raw", [None, "", "   ", "not-a-date", "2026-13-45", []])
def test_parse_timestamp_returns_none_instead_of_raising(raw):
    assert svc.parse_timestamp(raw) is None


def test_parse_timestamp_iso_is_not_dropped():
    """Regression: the old dashboard parser silently dropped ISO-8601, which is
    exactly the format Supabase returns — every Supabase timestamp was ignored."""
    assert svc.parse_timestamp("2026-07-25T10:30:00Z") is not None


def test_safe_float_tolerates_currency_and_separators():
    assert svc.safe_float("1,250.50") == 1250.50
    assert svc.safe_float("Rs 4,000") == 4000.0
    assert svc.safe_float(12) == 12.0
    assert svc.safe_float(None) is None
    assert svc.safe_float("abc") is None
    assert svc.safe_float(True) is None, "a bool is not a measurement"


# ---------------------------------------------------------------------------
# Metric 1 & 2 — plant health / machines down
# ---------------------------------------------------------------------------

def test_machines_down_counts_machines_with_open_tickets():
    machines = [machine("M001"), machine("M002"), machine("M003")]
    tickets = [
        ticket(machine_id="M001", status="Open"),
        ticket(machine_id="M002", status="Closed"),
    ]
    assert svc.count_machines_down(machines, tickets) == 1


def test_machines_down_counts_each_machine_once_despite_many_tickets():
    machines = [machine("M001"), machine("M002")]
    tickets = [ticket(machine_id="M001", status="Open") for _ in range(5)]
    assert svc.count_machines_down(machines, tickets) == 1


def test_machines_down_ignores_stale_has_open_tickets_flag():
    """The denormalised flag drifts when a ticket is closed by a path that
    forgets to clear it. Live ticket rows must win over the stale flag."""
    machines = [machine("M001", has_open_tickets=True)]
    tickets = [ticket(machine_id="M001", status="Closed")]
    assert svc.count_machines_down(machines, tickets) == 0


def test_machines_down_falls_back_to_flag_when_no_tickets_loaded():
    machines = [machine("M001", has_open_tickets=True)]
    assert svc.count_machines_down(machines, []) == 1


def test_plant_health_is_percentage_of_healthy_machines():
    machines = [machine(f"M00{i}") for i in range(1, 5)]
    tickets = [ticket(machine_id="M001", status="Open")]
    assert svc.calculate_plant_health(machines, tickets) == 75.0


def test_plant_health_is_100_when_nothing_is_down():
    machines = [machine("M001"), machine("M002")]
    tickets = [ticket(machine_id="M001", status="Closed")]
    assert svc.calculate_plant_health(machines, tickets) == 100.0


def test_plant_health_is_zero_when_everything_is_down():
    machines = [machine("M001"), machine("M002")]
    tickets = [
        ticket(machine_id="M001", status="Open"),
        ticket(machine_id="M002", status="Open"),
    ]
    assert svc.calculate_plant_health(machines, tickets) == 0.0


def test_plant_health_is_none_not_100_for_a_plant_with_no_machines():
    """An empty tenant must not rank as the healthiest plant in the fleet."""
    assert svc.calculate_plant_health([], []) is None


def test_unknown_status_counts_as_open():
    """An unrecognised status is safer treated as unfinished than as resolved."""
    assert svc.is_open(ticket(status="awaiting_parts")) is True
    assert svc.is_open(ticket(status="")) is True


def test_status_matching_is_case_insensitive_across_backends():
    assert svc.is_closed(ticket(status="closed")) is True
    assert svc.is_closed(ticket(status="CLOSED")) is True
    assert svc.is_closed(ticket(status="Closed")) is True
    assert svc.is_closed(ticket(status="resolved")) is True


# ---------------------------------------------------------------------------
# Metric 3 — urgent tickets
# ---------------------------------------------------------------------------

def test_urgent_tickets_counts_only_open_high_urgency():
    tickets = [
        ticket(status="Open", urgency="High"),
        ticket(status="Open", urgency="Low"),
        ticket(status="Closed", urgency="High"),
        ticket(status="Open", urgency="Critical"),
    ]
    assert svc.count_urgent_tickets(tickets) == 2


def test_urgent_tickets_excludes_closed_high_urgency():
    tickets = [ticket(status="Closed", urgency="High") for _ in range(3)]
    assert svc.count_urgent_tickets(tickets) == 0


def test_urgent_tickets_zero_on_empty_input():
    assert svc.count_urgent_tickets([]) == 0


# ---------------------------------------------------------------------------
# Metric 4 — average repair hours
# ---------------------------------------------------------------------------

def test_avg_repair_hours_averages_recorded_durations():
    tickets = [
        ticket(status="Closed", hours_to_fix="2"),
        ticket(status="Closed", hours_to_fix="4"),
    ]
    assert svc.calculate_avg_repair_hours(tickets) == 3.0


def test_avg_repair_hours_ignores_open_tickets():
    tickets = [
        ticket(status="Closed", hours_to_fix="10"),
        ticket(status="Open", hours_to_fix="1000"),
    ]
    assert svc.calculate_avg_repair_hours(tickets) == 10.0


def test_avg_repair_hours_falls_back_to_elapsed_time():
    tickets = [ticket(
        status="Closed",
        hours_to_fix="",
        reported_at="2026-07-20 08:00:00",
        closed_at="2026-07-20 14:00:00",
    )]
    assert svc.calculate_avg_repair_hours(tickets) == 6.0


def test_avg_repair_hours_is_none_when_no_usable_data():
    """None, not 0.0 — a fabricated zero would read as instant repairs."""
    assert svc.calculate_avg_repair_hours([]) is None
    assert svc.calculate_avg_repair_hours([ticket(status="Open")]) is None
    assert svc.calculate_avg_repair_hours(
        [ticket(status="Closed", hours_to_fix="", closed_at="", reported_at="")]
    ) is None


def test_avg_repair_hours_discards_negative_elapsed_time():
    """A closed_at before reported_at is corrupt; it must not drag the mean down."""
    tickets = [
        ticket(status="Closed", hours_to_fix="", reported_at="2026-07-20 14:00:00",
               closed_at="2026-07-20 08:00:00"),
        ticket(status="Closed", hours_to_fix="5"),
    ]
    assert svc.calculate_avg_repair_hours(tickets) == 5.0


# ---------------------------------------------------------------------------
# Metric 5 — cost by month
# ---------------------------------------------------------------------------

def test_cost_by_month_buckets_and_sums_by_calendar_month():
    parts = [
        {"created_at": "2026-07-05T00:00:00Z", "total_cost": 100},
        {"created_at": "2026-07-20T00:00:00Z", "total_cost": 50},
        {"created_at": "2026-06-10T00:00:00Z", "total_cost": 200},
    ]
    series = svc.calculate_cost_by_month(parts, months=3, now=NOW)
    assert series == [
        {"month": "2026-05", "cost": 0.0},
        {"month": "2026-06", "cost": 200.0},
        {"month": "2026-07", "cost": 150.0},
    ]


def test_cost_by_month_zero_fills_quiet_months():
    """A quiet month must show as a 0 bar, not vanish from the x-axis."""
    series = svc.calculate_cost_by_month([], months=6, now=NOW)
    assert len(series) == 6
    assert all(bucket["cost"] == 0.0 for bucket in series)
    assert series[-1]["month"] == "2026-07"


def test_cost_by_month_crosses_the_year_boundary():
    series = svc.calculate_cost_by_month(
        [], months=3, now=datetime(2026, 2, 15, tzinfo=timezone.utc)
    )
    assert [b["month"] for b in series] == ["2025-12", "2026-01", "2026-02"]


def test_cost_by_month_derives_total_from_quantity_and_unit_price():
    parts = [{"created_at": "2026-07-05T00:00:00Z", "quantity": 3, "unit_price": 25}]
    series = svc.calculate_cost_by_month(parts, months=1, now=NOW)
    assert series[-1]["cost"] == 75.0


def test_cost_by_month_skips_rows_with_no_usable_cost_or_date():
    parts = [
        {"created_at": "2026-07-05T00:00:00Z"},          # no cost at all
        {"total_cost": 100},                              # no date
        {"created_at": "garbage", "total_cost": 100},     # unparseable date
        {"created_at": "2026-07-05T00:00:00Z", "total_cost": 40},
    ]
    series = svc.calculate_cost_by_month(parts, months=1, now=NOW)
    assert series[-1]["cost"] == 40.0


# ---------------------------------------------------------------------------
# Metric 6 — PM compliance
# ---------------------------------------------------------------------------

def _log(days_ago: int, on_time=True, schedule_id="S1", due_offset_hours=0):
    completed = NOW - timedelta(days=days_ago)
    return {
        "pm_schedule_id": schedule_id,
        "completed_at": completed.isoformat(),
        "due_at": (completed + timedelta(hours=due_offset_hours)).isoformat(),
        "on_time": on_time,
    }


def test_pm_compliance_is_share_of_on_time_completions():
    logs = [_log(1, True), _log(2, True), _log(3, False), _log(4, True)]
    assert svc.calculate_pm_compliance([], logs, now=NOW) == 75.0


def test_pm_compliance_counts_missed_schedules_against_the_plant():
    """Only counting logged work would let a plant hit 100% by doing nothing."""
    logs = [_log(1, True, schedule_id="S1")]
    schedules = [
        {"id": "S1", "active": True, "next_due_at": (NOW - timedelta(days=1)).isoformat()},
        {"id": "S2", "active": True, "next_due_at": (NOW - timedelta(days=2)).isoformat()},
    ]
    # S1 was completed on time; S2 fell due in the window and was never logged.
    assert svc.calculate_pm_compliance(schedules, logs, now=NOW) == 50.0


def test_pm_compliance_ignores_inactive_schedules():
    logs = [_log(1, True, schedule_id="S1")]
    schedules = [
        {"id": "S1", "active": True, "next_due_at": (NOW - timedelta(days=1)).isoformat()},
        {"id": "S2", "active": False, "next_due_at": (NOW - timedelta(days=2)).isoformat()},
    ]
    assert svc.calculate_pm_compliance(schedules, logs, now=NOW) == 100.0


def test_pm_compliance_ignores_schedules_not_yet_due():
    logs = [_log(1, True, schedule_id="S1")]
    schedules = [
        {"id": "S1", "active": True, "next_due_at": (NOW - timedelta(days=1)).isoformat()},
        {"id": "S2", "active": True, "next_due_at": (NOW + timedelta(days=30)).isoformat()},
    ]
    assert svc.calculate_pm_compliance(schedules, logs, now=NOW) == 100.0


def test_pm_compliance_recomputes_when_on_time_flag_is_missing():
    late = {
        "pm_schedule_id": "S1",
        "completed_at": (NOW - timedelta(days=1)).isoformat(),
        "due_at": (NOW - timedelta(days=5)).isoformat(),
    }
    early = {
        "pm_schedule_id": "S2",
        "completed_at": (NOW - timedelta(days=5)).isoformat(),
        "due_at": (NOW - timedelta(days=1)).isoformat(),
    }
    assert svc.calculate_pm_compliance([], [late], now=NOW) == 0.0
    assert svc.calculate_pm_compliance([], [early], now=NOW) == 100.0


def test_pm_compliance_excludes_logs_outside_the_window():
    logs = [_log(200, True)]
    assert svc.calculate_pm_compliance([], logs, window_days=90, now=NOW) is None


def test_pm_compliance_is_none_not_zero_when_nothing_was_due():
    """0% would accuse a plant with no PM programme of total non-compliance."""
    assert svc.calculate_pm_compliance([], [], now=NOW) is None


# ---------------------------------------------------------------------------
# Orchestrator
# ---------------------------------------------------------------------------

def test_compute_analytics_returns_all_six_kpis():
    result = svc.compute_analytics(
        company_code="ACME",
        machines=[machine("M001"), machine("M002")],
        tickets=[
            ticket(machine_id="M001", status="Open", urgency="High"),
            ticket(machine_id="M002", status="Closed", hours_to_fix="4"),
        ],
        work_order_parts=[{"created_at": "2026-07-05T00:00:00Z", "total_cost": 500}],
        pm_schedules=[],
        pm_logs=[_log(1, True)],
        now=NOW,
    )

    kpis = result["kpis"]
    assert set(kpis) == {
        "plant_health_pct", "machines_down", "urgent_tickets",
        "avg_repair_hours", "cost_total", "pm_compliance_pct",
    }
    assert kpis["plant_health_pct"] == 50.0
    assert kpis["machines_down"] == 1
    assert kpis["urgent_tickets"] == 1
    assert kpis["avg_repair_hours"] == 4.0
    assert kpis["cost_total"] == 500.0
    assert kpis["pm_compliance_pct"] == 100.0


def test_compute_analytics_handles_completely_empty_input():
    result = svc.compute_analytics(company_code="EMPTY", now=NOW)
    assert result["kpis"]["machines_down"] == 0
    assert result["kpis"]["urgent_tickets"] == 0
    assert result["kpis"]["plant_health_pct"] is None
    assert result["kpis"]["avg_repair_hours"] is None
    assert result["kpis"]["pm_compliance_pct"] is None
    assert result["kpis"]["cost_total"] == 0


def test_coverage_distinguishes_absent_data_from_a_real_zero():
    absent = svc.compute_analytics(company_code="EMPTY", now=NOW)
    assert absent["coverage"] == {
        "plant_health": False,
        "avg_repair_hours": False,
        "cost": False,
        "pm_compliance": False,
    }

    present = svc.compute_analytics(
        company_code="ACME",
        machines=[machine("M001")],
        tickets=[ticket(status="Closed", hours_to_fix="2")],
        work_order_parts=[{"created_at": "2026-07-05T00:00:00Z", "total_cost": 0}],
        pm_logs=[_log(1, True)],
        now=NOW,
    )
    assert present["coverage"]["plant_health"] is True
    assert present["coverage"]["avg_repair_hours"] is True
    assert present["coverage"]["cost"] is True
    assert present["coverage"]["pm_compliance"] is True


def test_compute_analytics_context_counts_tickets_by_state():
    result = svc.compute_analytics(
        company_code="ACME",
        machines=[machine("M001")],
        tickets=[
            ticket(status="Open"), ticket(status="Open"), ticket(status="Closed"),
        ],
        now=NOW,
    )
    assert result["context"]["total_tickets"] == 3
    assert result["context"]["open_tickets"] == 2
    assert result["context"]["closed_tickets"] == 1


def test_compute_analytics_never_mutates_caller_input():
    machines = [machine("M001")]
    tickets = [ticket(status="Open")]
    snapshot_machines = [dict(m) for m in machines]
    snapshot_tickets = [dict(t) for t in tickets]

    svc.compute_analytics(company_code="ACME", machines=machines, tickets=tickets, now=NOW)

    assert machines == snapshot_machines
    assert tickets == snapshot_tickets


# ---------------------------------------------------------------------------
# Snapshot row mapping + metrics storage
# ---------------------------------------------------------------------------

def test_to_snapshot_row_flattens_kpis_into_columns():
    analytics = svc.compute_analytics(
        company_code="ACME",
        machines=[machine("M001"), machine("M002")],
        tickets=[ticket(machine_id="M001", status="Open", urgency="High")],
        now=NOW,
    )
    row = svc.to_snapshot_row(analytics, factory_id="F1", captured_by="U1")

    assert row["factory_id"] == "F1"
    assert row["period_kind"] == "daily"
    assert row["period_start"] == "2026-07-25"
    assert row["period_end"] == "2026-07-25"
    assert row["plant_health_pct"] == 50.0
    assert row["machines_down"] == 1
    assert row["urgent_tickets"] == 1
    assert row["captured_by"] == "U1"
    assert row["payload"]["company_code"] == "ACME"


def test_to_snapshot_row_stores_none_metrics_as_zero_but_keeps_coverage():
    """The table's numeric columns are NOT NULL, so None becomes 0 — coverage
    inside the payload is what preserves 'we had no data' for the reader."""
    analytics = svc.compute_analytics(company_code="EMPTY", now=NOW)
    row = svc.to_snapshot_row(analytics, factory_id="F1")

    assert row["plant_health_pct"] == 0
    assert row["pm_compliance_pct"] == 0
    assert row["payload"]["coverage"]["plant_health"] is False
    assert row["payload"]["coverage"]["pm_compliance"] is False


def test_snapshot_repo_upsert_then_read_back():
    repo = LocalAnalyticsSnapshotRepository()
    analytics = svc.compute_analytics(company_code="ACME", machines=[machine("M1")], now=NOW)
    repo.upsert(svc.to_snapshot_row(analytics, factory_id="F1"))

    rows = repo.list_snapshots("F1")
    assert len(rows) == 1
    assert rows[0]["factory_id"] == "F1"
    assert rows[0]["captured_at"], "captured_at must be stamped on write"


def test_snapshot_repo_upsert_overwrites_same_period_instead_of_duplicating():
    """Re-running the capture job for today must not create a second row."""
    repo = LocalAnalyticsSnapshotRepository()
    base = {"factory_id": "F1", "period_kind": "daily", "period_start": "2026-07-25",
            "period_end": "2026-07-25", "machines_down": 1}

    repo.upsert(dict(base))
    repo.upsert({**base, "machines_down": 7})

    rows = repo.list_snapshots("F1")
    assert len(rows) == 1
    assert rows[0]["machines_down"] == 7


def test_snapshot_repo_keeps_distinct_periods_and_kinds_separate():
    repo = LocalAnalyticsSnapshotRepository()
    repo.upsert({"factory_id": "F1", "period_kind": "daily", "period_start": "2026-07-24"})
    repo.upsert({"factory_id": "F1", "period_kind": "daily", "period_start": "2026-07-25"})
    repo.upsert({"factory_id": "F1", "period_kind": "monthly", "period_start": "2026-07-01"})

    assert len(repo.list_snapshots("F1", "daily")) == 2
    assert len(repo.list_snapshots("F1", "monthly")) == 1


def test_snapshot_repo_isolates_tenants():
    repo = LocalAnalyticsSnapshotRepository()
    repo.upsert({"factory_id": "F1", "period_start": "2026-07-25"})
    repo.upsert({"factory_id": "F2", "period_start": "2026-07-25"})

    assert len(repo.list_snapshots("F1")) == 1
    assert repo.list_snapshots("F1")[0]["factory_id"] == "F1"


def test_snapshot_repo_returns_newest_first():
    repo = LocalAnalyticsSnapshotRepository()
    for day in ("2026-07-23", "2026-07-25", "2026-07-24"):
        repo.upsert({"factory_id": "F1", "period_start": day})

    rows = repo.list_snapshots("F1")
    assert [r["period_start"] for r in rows] == ["2026-07-25", "2026-07-24", "2026-07-23"]
    assert repo.latest("F1")["period_start"] == "2026-07-25"


def test_snapshot_repo_latest_is_none_when_empty():
    assert LocalAnalyticsSnapshotRepository().latest("F1") is None


def test_snapshot_repo_rejects_rows_missing_the_conflict_key():
    repo = LocalAnalyticsSnapshotRepository()
    with pytest.raises(ValueError):
        repo.upsert({"period_start": "2026-07-25"})
    with pytest.raises(ValueError):
        repo.upsert({"factory_id": "F1"})


def test_snapshot_repo_returns_copies_not_internal_state():
    """A caller mutating a returned row must not corrupt the store."""
    repo = LocalAnalyticsSnapshotRepository()
    repo.upsert({"factory_id": "F1", "period_start": "2026-07-25", "machines_down": 1})

    rows = repo.list_snapshots("F1")
    rows[0]["machines_down"] = 999

    assert repo.list_snapshots("F1")[0]["machines_down"] == 1


# ---------------------------------------------------------------------------
# Supabase-backed storage — exercised against a fake PostgREST client so the
# insert-vs-update branch (the thing that would duplicate rows in production)
# is verified without a live database.
# ---------------------------------------------------------------------------

class FakePostgrestClient:
    """Minimal stand-in for _SupabaseClient, recording calls for assertions."""

    def __init__(self, existing=None):
        self.existing = existing
        self.inserted: list[dict] = []
        self.updated: list[tuple[dict, dict]] = []
        self.selects: list[tuple[str, dict]] = []

    def select_one(self, table, params):
        return self.existing

    def select(self, table, params):
        self.selects.append((table, params))
        return [{"factory_id": "F1", "period_start": "2026-07-25"}]

    def insert(self, table, row):
        self.inserted.append(row)
        return row

    def update(self, table, params, patch):
        self.updated.append((params, patch))
        return [patch]


def _supabase_repo(client):
    from app.repositories.snapshot_repo import SupabaseAnalyticsSnapshotRepository
    return SupabaseAnalyticsSnapshotRepository(client=client)


def test_supabase_upsert_inserts_when_no_row_exists():
    client = FakePostgrestClient(existing=None)
    repo = _supabase_repo(client)

    repo.upsert({"factory_id": "F1", "period_start": "2026-07-25", "machines_down": 2})

    assert len(client.inserted) == 1
    assert not client.updated
    assert client.inserted[0]["machines_down"] == 2


def test_supabase_upsert_updates_when_the_period_already_exists():
    """Must PATCH, not POST — a second POST would violate the unique index."""
    client = FakePostgrestClient(existing={"id": "existing-row"})
    repo = _supabase_repo(client)

    repo.upsert({"factory_id": "F1", "period_start": "2026-07-25", "machines_down": 9})

    assert not client.inserted
    assert len(client.updated) == 1
    params, patch = client.updated[0]
    assert params == {
        "factory_id": "eq.F1",
        "period_kind": "eq.daily",
        "period_start": "eq.2026-07-25",
    }
    assert patch["machines_down"] == 9


def test_supabase_upsert_stamps_captured_at():
    client = FakePostgrestClient(existing=None)
    _supabase_repo(client).upsert({"factory_id": "F1", "period_start": "2026-07-25"})
    assert client.inserted[0]["captured_at"]


def test_supabase_upsert_sends_payload_as_json_not_a_string():
    """A pre-serialised payload would land in jsonb as a quoted string literal."""
    client = FakePostgrestClient(existing=None)
    _supabase_repo(client).upsert({
        "factory_id": "F1",
        "period_start": "2026-07-25",
        "payload": '{"coverage": {"cost": true}}',
    })
    assert client.inserted[0]["payload"] == {"coverage": {"cost": True}}


def test_supabase_upsert_recovers_from_an_unparseable_payload_string():
    client = FakePostgrestClient(existing=None)
    _supabase_repo(client).upsert({
        "factory_id": "F1", "period_start": "2026-07-25", "payload": "not json",
    })
    assert client.inserted[0]["payload"] == {}


def test_supabase_upsert_rejects_rows_missing_the_conflict_key():
    repo = _supabase_repo(FakePostgrestClient())
    with pytest.raises(ValueError):
        repo.upsert({"period_start": "2026-07-25"})
    with pytest.raises(ValueError):
        repo.upsert({"factory_id": "F1"})


def test_supabase_list_orders_newest_first_and_scopes_by_factory():
    client = FakePostgrestClient()
    _supabase_repo(client).list_snapshots("F1", period_kind="monthly", limit=12)

    table, params = client.selects[0]
    assert table == "analytics_snapshots"
    assert params["factory_id"] == "eq.F1"
    assert params["period_kind"] == "eq.monthly"
    assert params["order"] == "period_start.desc"
    assert params["limit"] == 12


def test_supabase_latest_requests_a_single_row():
    client = FakePostgrestClient()
    assert _supabase_repo(client).latest("F1") is not None
    assert client.selects[0][1]["limit"] == 1


# ---------------------------------------------------------------------------
# Period bounds — what makes a same-period re-run overwrite rather than duplicate
# ---------------------------------------------------------------------------

def test_period_bounds_cover_the_right_calendar_span():
    from datetime import date

    from app.routers.analytics_router import _period_bounds

    saturday = date(2026, 7, 25)
    assert _period_bounds("daily", saturday) == (saturday, saturday)
    # ISO week: Monday 2026-07-20 .. Sunday 2026-07-26
    assert _period_bounds("weekly", saturday) == (date(2026, 7, 20), date(2026, 7, 26))
    assert _period_bounds("monthly", saturday) == (date(2026, 7, 1), date(2026, 7, 31))


def test_period_bounds_handle_the_december_rollover():
    from datetime import date

    from app.routers.analytics_router import _period_bounds

    assert _period_bounds("monthly", date(2026, 12, 10)) == (date(2026, 12, 1), date(2026, 12, 31))


def test_period_bounds_handle_a_leap_february():
    from datetime import date

    from app.routers.analytics_router import _period_bounds

    assert _period_bounds("monthly", date(2028, 2, 10)) == (date(2028, 2, 1), date(2028, 2, 29))


def test_cost_and_pm_fetch_degrades_to_empty_outside_supabase_mode():
    """Local/Sheets stores have no PM or work-order-parts tables. The analytics
    read must still succeed with those metrics simply marked uncovered."""
    from app.routers.analytics_router import _load_cost_and_pm

    assert _load_cost_and_pm("ACME") == ([], [], [])


def test_factory_lookup_returns_none_outside_supabase_mode():
    from app.routers.analytics_router import _resolve_factory_id

    assert _resolve_factory_id("ACME") is None
