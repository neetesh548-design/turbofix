"""Unit tests for intelligence_service — technician load, repeat-failure detection.

HISTORY: this file previously imported `detect_language`, `extract_machine_record`,
`maintenance_assistant` and `check_inventory` from this module. None of them
exist here (4 of its 5 imports were unresolvable), so the module failed to import
and aborted collection for the entire backend suite. It has been rewritten
against the functions that actually exist.

These functions reach Supabase through the module-level `_client`, so each test
patches `app.repositories.supabase_repo._client` — no network, no live data.
"""

from datetime import datetime, timedelta, timezone
from unittest.mock import patch

import pytest

from app.services.intelligence_service import (
    check_repeat_failure,
    flag_repeat_failure,
    get_least_loaded_technician,
    get_technician_load,
    is_technician_overloaded,
)


class FakeClient:
    """Minimal stand-in for the Supabase client used by intelligence_service."""

    def __init__(self, tickets=None, machines=None, fail_on_update=False):
        self._tickets = tickets or []
        self._machines = machines or {}
        self._fail_on_update = fail_on_update
        self.updates = []

    def select(self, table, filters):
        if table == "tickets":
            return list(self._tickets)
        return []

    def select_one(self, table, filters):
        if table == "machines":
            machine_id = str(filters.get("id", "")).replace("eq.", "")
            return self._machines.get(machine_id)
        return None

    def update(self, table, filters, values):
        if self._fail_on_update:
            raise RuntimeError("supabase unavailable")
        self.updates.append((table, filters, values))
        return []


def with_client(client):
    return patch("app.repositories.supabase_repo._client", client)


# ---------------------------------------------------------------------------
# Technician load
# ---------------------------------------------------------------------------

def test_technician_load_counts_open_tickets_per_technician():
    client = FakeClient(
        tickets=[{"machine_id": "M1"}, {"machine_id": "M1"}, {"machine_id": "M2"}],
        machines={
            "M1": {"assigned_technician_phone": "+911111111111"},
            "M2": {"assigned_technician_phone": "+922222222222"},
        },
    )
    with with_client(client):
        load = get_technician_load("F1")

    assert {item["phone"]: item["open_tickets"] for item in load} == {
        "+911111111111": 2,
        "+922222222222": 1,
    }


def test_technician_load_is_sorted_least_loaded_first():
    client = FakeClient(
        tickets=[{"machine_id": "M1"}, {"machine_id": "M1"}, {"machine_id": "M2"}],
        machines={
            "M1": {"assigned_technician_phone": "+911111111111"},
            "M2": {"assigned_technician_phone": "+922222222222"},
        },
    )
    with with_client(client):
        load = get_technician_load("F1")

    assert [item["open_tickets"] for item in load] == [1, 2]


def test_technician_load_skips_tickets_without_machine():
    client = FakeClient(tickets=[{"machine_id": ""}, {}], machines={})
    with with_client(client):
        assert get_technician_load("F1") == []


def test_technician_load_skips_machines_without_assigned_technician():
    client = FakeClient(
        tickets=[{"machine_id": "M1"}],
        machines={"M1": {"assigned_technician_phone": ""}},
    )
    with with_client(client):
        assert get_technician_load("F1") == []


def test_technician_load_is_empty_with_no_tickets():
    with with_client(FakeClient()):
        assert get_technician_load("F1") == []


# ---------------------------------------------------------------------------
# Delegation
# ---------------------------------------------------------------------------

def test_least_loaded_technician_picks_the_quietest_candidate():
    client = FakeClient(
        tickets=[{"machine_id": "M1"}, {"machine_id": "M1"}, {"machine_id": "M2"}],
        machines={
            "M1": {"assigned_technician_phone": "+91BUSY"},
            "M2": {"assigned_technician_phone": "+91QUIET"},
        },
    )
    with with_client(client):
        assert get_least_loaded_technician("F1", ["+91BUSY", "+91QUIET"]) == "+91QUIET"


def test_least_loaded_technician_prefers_a_candidate_with_no_tickets_at_all():
    """A technician absent from the load map has zero open tickets."""
    client = FakeClient(
        tickets=[{"machine_id": "M1"}],
        machines={"M1": {"assigned_technician_phone": "+91BUSY"}},
    )
    with with_client(client):
        assert get_least_loaded_technician("F1", ["+91BUSY", "+91IDLE"]) == "+91IDLE"


def test_least_loaded_technician_returns_none_without_candidates():
    with with_client(FakeClient()):
        assert get_least_loaded_technician("F1", []) is None


def test_least_loaded_technician_keeps_first_candidate_on_a_tie():
    """Stable choice so repeated assignment is predictable."""
    client = FakeClient(
        tickets=[{"machine_id": "M1"}, {"machine_id": "M2"}],
        machines={
            "M1": {"assigned_technician_phone": "+91A"},
            "M2": {"assigned_technician_phone": "+91B"},
        },
    )
    with with_client(client):
        assert get_least_loaded_technician("F1", ["+91A", "+91B"]) == "+91A"


@pytest.mark.parametrize("ticket_count,threshold,expected", [
    (3, 3, True), (4, 3, True), (2, 3, False),
])
def test_is_technician_overloaded_at_threshold(ticket_count, threshold, expected):
    client = FakeClient(
        tickets=[{"machine_id": "M1"}] * ticket_count,
        machines={"M1": {"assigned_technician_phone": "+91A"}},
    )
    with with_client(client):
        assert is_technician_overloaded("+91A", "F1", threshold=threshold) is expected


def test_unknown_technician_is_not_overloaded():
    with with_client(FakeClient()):
        assert is_technician_overloaded("+91GHOST", "F1") is False


# ---------------------------------------------------------------------------
# Repeat failure detection
# ---------------------------------------------------------------------------

def test_repeat_failure_triggers_above_threshold():
    with with_client(FakeClient(tickets=[{"id": "T1"}, {"id": "T2"}, {"id": "T3"}])):
        result = check_repeat_failure("F1", "M1", days=30, threshold=2)

    assert result["is_repeat_failure"] is True
    assert result["ticket_count_in_period"] == 3
    assert result["period_days"] == 30
    assert result["threshold"] == 2


def test_repeat_failure_is_strictly_greater_than_threshold():
    """Exactly `threshold` tickets is not yet a repeat failure."""
    with with_client(FakeClient(tickets=[{"id": "T1"}, {"id": "T2"}])):
        assert check_repeat_failure("F1", "M1", threshold=2)["is_repeat_failure"] is False


def test_repeat_failure_false_with_no_tickets():
    with with_client(FakeClient()):
        result = check_repeat_failure("F1", "M1")

    assert result["is_repeat_failure"] is False
    assert result["ticket_count_in_period"] == 0


def test_repeat_failure_queries_the_requested_window():
    """The cutoff must reflect the `days` argument, not a hardcoded 30."""
    captured = {}

    class CapturingClient(FakeClient):
        def select(self, table, filters):
            captured.update(filters)
            return []

    with with_client(CapturingClient()):
        check_repeat_failure("F1", "M1", days=7)

    cutoff = datetime.fromisoformat(captured["created_at"].replace("gte.", ""))
    expected = datetime.now(timezone.utc) - timedelta(days=7)
    assert abs((cutoff - expected).total_seconds()) < 60
    assert captured["machine_id"] == "eq.M1"
    assert captured["factory_id"] == "eq.F1"


def test_flag_repeat_failure_writes_flag_and_count():
    client = FakeClient()
    with with_client(client):
        assert flag_repeat_failure("T1", 4) is True

    table, filters, values = client.updates[0]
    assert table == "tickets"
    assert filters == {"id": "eq.T1"}
    assert values == {"repeat_failure_flag": True, "repeat_failure_count": 4}


def test_flag_repeat_failure_returns_false_when_the_write_fails():
    """A storage outage must not raise into the ticket-creation path."""
    with with_client(FakeClient(fail_on_update=True)):
        assert flag_repeat_failure("T1", 4) is False
