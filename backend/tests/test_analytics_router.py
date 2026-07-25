"""End-to-end tests for the Analytics Engine HTTP surface.

Covers the auth boundary, tenant isolation, input validation, snapshot
round-tripping, and the additive Dashboard API integration.
"""

import pytest

from tests.conftest import (
    ACME_OWNER,
    ACME_SUPERVISOR,
    BETA_OWNER,
    auth_headers,
    login,
)

KPI_KEYS = {
    "plant_health_pct", "machines_down", "urgent_tickets",
    "avg_repair_hours", "cost_total", "pm_compliance_pct",
}


@pytest.fixture
def owner_headers(vault_client):
    return auth_headers(login(vault_client, *ACME_OWNER))


# ---------------------------------------------------------------------------
# Auth boundary
# ---------------------------------------------------------------------------

@pytest.mark.parametrize("method,path", [
    ("get", "/analytics/kpis"),
    ("get", "/analytics/trend"),
    ("post", "/analytics/snapshot"),
])
def test_analytics_endpoints_reject_anonymous_callers(vault_client, method, path):
    call = getattr(vault_client, method)
    resp = call(path, json={}) if method == "post" else call(path)
    assert resp.status_code in (401, 403), resp.text


def test_snapshot_capture_is_denied_to_read_only_roles(vault_client):
    headers = auth_headers(login(vault_client, *ACME_SUPERVISOR))
    resp = vault_client.post("/analytics/snapshot", json={}, headers=headers)
    assert resp.status_code == 403, resp.text


# ---------------------------------------------------------------------------
# GET /analytics/kpis
# ---------------------------------------------------------------------------

def test_kpis_returns_all_six_metrics(vault_client, owner_headers):
    resp = vault_client.get("/analytics/kpis", headers=owner_headers)
    assert resp.status_code == 200, resp.text

    body = resp.json()
    assert set(body["kpis"]) == KPI_KEYS
    assert "cost_by_month" in body
    assert "coverage" in body
    assert "context" in body


def test_kpis_are_scoped_to_the_callers_company(vault_client):
    """Each caller sees only their own company's figures.

    Asserted via company_code rather than differing counts: the two seed
    tenants can legitimately hold the same number of machines, so a count
    comparison would be a coincidence test, not an isolation test.
    """
    acme = vault_client.get(
        "/analytics/kpis", headers=auth_headers(login(vault_client, *ACME_OWNER))
    ).json()
    beta = vault_client.get(
        "/analytics/kpis", headers=auth_headers(login(vault_client, *BETA_OWNER))
    ).json()

    assert acme["company_code"] != beta["company_code"]
    # Each payload must be labelled with the caller's own tenant, and the
    # machine counts must match that tenant's own dashboard.
    for body, creds in ((acme, ACME_OWNER), (beta, BETA_OWNER)):
        headers = auth_headers(login(vault_client, *creds))
        dashboard = vault_client.get("/vault/dashboard", headers=headers).json()
        assert body["company_code"] == dashboard["company_code"]
        assert body["context"]["total_machines"] == dashboard["kpis"]["total_machines"]


def test_kpis_cost_series_length_follows_months_parameter(vault_client, owner_headers):
    resp = vault_client.get("/analytics/kpis?months=3", headers=owner_headers)
    assert resp.status_code == 200
    assert len(resp.json()["cost_by_month"]) == 3


@pytest.mark.parametrize("query", [
    "months=0", "months=25", "months=abc",
    "pm_window_days=0", "pm_window_days=400",
])
def test_kpis_rejects_out_of_range_parameters(vault_client, owner_headers, query):
    resp = vault_client.get(f"/analytics/kpis?{query}", headers=owner_headers)
    assert resp.status_code == 422, resp.text


def test_kpi_values_are_internally_consistent(vault_client, owner_headers):
    body = vault_client.get("/analytics/kpis", headers=owner_headers).json()
    kpis, context = body["kpis"], body["context"]

    assert kpis["machines_down"] <= context["total_machines"]
    assert kpis["urgent_tickets"] <= context["open_tickets"]
    if kpis["plant_health_pct"] is not None:
        assert 0 <= kpis["plant_health_pct"] <= 100
    if kpis["pm_compliance_pct"] is not None:
        assert 0 <= kpis["pm_compliance_pct"] <= 100


def test_cost_total_equals_the_sum_of_the_monthly_series(vault_client, owner_headers):
    body = vault_client.get("/analytics/kpis", headers=owner_headers).json()
    expected = round(sum(bucket["cost"] for bucket in body["cost_by_month"]), 2)
    assert body["kpis"]["cost_total"] == expected


# ---------------------------------------------------------------------------
# POST /analytics/snapshot  +  GET /analytics/trend
# ---------------------------------------------------------------------------

def test_snapshot_capture_persists_and_is_readable_from_trend(vault_client, owner_headers):
    captured = vault_client.post("/analytics/snapshot", json={}, headers=owner_headers)
    assert captured.status_code == 200, captured.text
    assert set(captured.json()["analytics"]["kpis"]) == KPI_KEYS

    trend = vault_client.get("/analytics/trend", headers=owner_headers)
    assert trend.status_code == 200
    assert trend.json()["count"] == 1


def test_repeated_capture_for_the_same_day_overwrites(vault_client, owner_headers):
    """A cron that fires twice must not double-count the day."""
    for _ in range(3):
        assert vault_client.post(
            "/analytics/snapshot", json={}, headers=owner_headers
        ).status_code == 200

    assert vault_client.get("/analytics/trend", headers=owner_headers).json()["count"] == 1


def test_snapshot_kinds_are_stored_independently(vault_client, owner_headers):
    for kind in ("daily", "weekly", "monthly"):
        resp = vault_client.post(
            "/analytics/snapshot", json={"period_kind": kind}, headers=owner_headers
        )
        assert resp.status_code == 200, resp.text

    for kind in ("daily", "weekly", "monthly"):
        trend = vault_client.get(f"/analytics/trend?period_kind={kind}", headers=owner_headers)
        assert trend.json()["count"] == 1, kind


def test_snapshot_rejects_an_unknown_period_kind(vault_client, owner_headers):
    resp = vault_client.post(
        "/analytics/snapshot", json={"period_kind": "hourly"}, headers=owner_headers
    )
    assert resp.status_code == 422, resp.text


def test_snapshot_body_cannot_override_the_tenant(vault_client, owner_headers):
    """The tenant comes from the JWT; a spoofed factory_id must be ignored."""
    resp = vault_client.post(
        "/analytics/snapshot",
        json={"factory_id": "attacker-factory", "company_code": "BETA"},
        headers=owner_headers,
    )
    assert resp.status_code == 200, resp.text
    assert resp.json()["snapshot"]["factory_id"] != "attacker-factory"


def test_trend_does_not_leak_another_tenants_snapshots(vault_client):
    acme = auth_headers(login(vault_client, *ACME_OWNER))
    beta = auth_headers(login(vault_client, *BETA_OWNER))

    assert vault_client.post("/analytics/snapshot", json={}, headers=acme).status_code == 200

    assert vault_client.get("/analytics/trend", headers=beta).json()["count"] == 0
    assert vault_client.get("/analytics/trend", headers=acme).json()["count"] == 1


def test_trend_is_empty_before_any_capture(vault_client, owner_headers):
    body = vault_client.get("/analytics/trend", headers=owner_headers).json()
    assert body["count"] == 0
    assert body["snapshots"] == []


@pytest.mark.parametrize("query", ["limit=0", "limit=500", "period_kind=yearly"])
def test_trend_rejects_out_of_range_parameters(vault_client, owner_headers, query):
    resp = vault_client.get(f"/analytics/trend?{query}", headers=owner_headers)
    assert resp.status_code == 422, resp.text


# ---------------------------------------------------------------------------
# Dashboard API integration
# ---------------------------------------------------------------------------

def test_dashboard_exposes_the_analytics_block(vault_client, owner_headers):
    resp = vault_client.get("/vault/dashboard", headers=owner_headers)
    assert resp.status_code == 200, resp.text

    analytics = resp.json()["analytics"]
    assert analytics is not None
    assert set(analytics["kpis"]) == KPI_KEYS


def test_dashboard_integration_is_additive(vault_client, owner_headers):
    """The Analytics Engine must not disturb the existing dashboard contract."""
    body = vault_client.get("/vault/dashboard", headers=owner_headers).json()
    for key in ("kpis", "auto_insights", "recent_activity", "needs_attention", "weekly_trend"):
        assert key in body, f"pre-existing dashboard key '{key}' disappeared"


def test_dashboard_and_analytics_endpoint_agree(vault_client, owner_headers):
    """One engine feeds both surfaces, so the tile and the chart cannot diverge."""
    dashboard = vault_client.get("/vault/dashboard", headers=owner_headers).json()
    direct = vault_client.get("/analytics/kpis", headers=owner_headers).json()

    for metric in ("plant_health_pct", "machines_down", "urgent_tickets", "avg_repair_hours"):
        assert dashboard["analytics"]["kpis"][metric] == direct["kpis"][metric], metric


def test_dashboard_machines_down_matches_legacy_kpi_block(vault_client, owner_headers):
    """Cross-check the new engine against the long-standing dashboard number."""
    body = vault_client.get("/vault/dashboard", headers=owner_headers).json()
    assert body["analytics"]["kpis"]["machines_down"] == body["kpis"]["machines_down"]


# ---------------------------------------------------------------------------
# Failure handling
# ---------------------------------------------------------------------------

def test_snapshot_returns_503_when_storage_is_unavailable(vault_client, owner_headers):
    """A storage outage must surface as 503, not a 500 stack trace."""
    from app import main
    from app.dependencies import get_analytics_snapshots
    from app.repositories.base import AnalyticsSnapshotRepository

    class BrokenRepo(AnalyticsSnapshotRepository):
        def upsert(self, row):
            raise RuntimeError("database unreachable")

        def list_snapshots(self, factory_id, period_kind="daily", limit=30):
            return []

        def latest(self, factory_id, period_kind="daily"):
            return None

    main.app.dependency_overrides[get_analytics_snapshots] = BrokenRepo
    try:
        resp = vault_client.post("/analytics/snapshot", json={}, headers=owner_headers)
        assert resp.status_code == 503, resp.text
        assert "stack" not in resp.text.lower()
    finally:
        main.app.dependency_overrides.pop(get_analytics_snapshots, None)


def test_dashboard_survives_an_analytics_failure(vault_client, owner_headers, monkeypatch):
    """The analytics block is additive — if it breaks, the dashboard still loads."""
    from app.routers import dashboard_router

    def boom(*args, **kwargs):
        raise RuntimeError("analytics exploded")

    monkeypatch.setattr(dashboard_router.analytics_service, "compute_analytics", boom)

    resp = vault_client.get("/vault/dashboard", headers=owner_headers)
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["analytics"] is None
    assert body["kpis"]["total_machines"] >= 0, "core dashboard must still be intact"
