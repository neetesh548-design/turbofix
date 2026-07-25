"""Integration tests for the analytics endpoints.

These run against the real FastAPI app and the local xlsx tracker (via the
`vault_client` fixture), so they exercise auth, DI wiring and serialisation —
not just the pure functions covered in test_analytics_service.py.
"""

import pytest

from tests.conftest import ACME_OWNER, BETA_OWNER, auth_headers, login


@pytest.fixture
def owner_headers(vault_client):
    return auth_headers(login(vault_client, *ACME_OWNER))


@pytest.fixture(autouse=True)
def clean_state():
    """Snapshots and the KPI cache are process-global; isolate every test."""
    from app.dependencies import get_snapshots
    from app.services.analytics_service import get_cache

    get_snapshots.cache_clear()
    get_cache().invalidate()
    yield
    get_snapshots.cache_clear()
    get_cache().invalidate()


# ---------------------------------------------------------------------------
# Auth
# ---------------------------------------------------------------------------

@pytest.mark.parametrize("method,path", [
    ("get", "/vault/analytics/trends"),
    ("get", "/vault/analytics/insights"),
    ("get", "/vault/analytics/failure-risk"),
    ("post", "/vault/analytics/snapshot"),
])
def test_endpoints_reject_unauthenticated_requests(vault_client, method, path):
    resp = getattr(vault_client, method)(path)
    assert resp.status_code in (401, 403), resp.text


# ---------------------------------------------------------------------------
# Trends
# ---------------------------------------------------------------------------

def test_trends_returns_empty_series_without_error(vault_client, owner_headers):
    """No snapshots yet is a normal state, not a 500."""
    resp = vault_client.get("/vault/analytics/trends", headers=owner_headers)
    assert resp.status_code == 200, resp.text

    body = resp.json()
    assert body["snapshot_count"] == 0
    assert body["window_days"] == 30
    assert body["trends"]["plant_health_pct"]["direction"] == "unknown"


def test_trends_reflect_captured_snapshots(vault_client, owner_headers):
    vault_client.post("/vault/analytics/snapshot", headers=owner_headers)

    body = vault_client.get("/vault/analytics/trends", headers=owner_headers).json()
    assert body["snapshot_count"] == 1
    assert body["trends"]["plant_health_pct"]["sample_count"] == 1


def test_trends_rejects_out_of_range_window(vault_client, owner_headers):
    assert vault_client.get(
        "/vault/analytics/trends?days=0", headers=owner_headers
    ).status_code == 422
    assert vault_client.get(
        "/vault/analytics/trends?days=9999", headers=owner_headers
    ).status_code == 422


def test_trends_accepts_custom_window(vault_client, owner_headers):
    body = vault_client.get("/vault/analytics/trends?days=7", headers=owner_headers).json()
    assert body["window_days"] == 7


# ---------------------------------------------------------------------------
# Snapshots
# ---------------------------------------------------------------------------

def test_snapshot_captures_tracked_metrics(vault_client, owner_headers):
    resp = vault_client.post("/vault/analytics/snapshot", headers=owner_headers)
    assert resp.status_code == 200, resp.text

    body = resp.json()
    assert body["source"] == "manual"
    assert "captured_at" in body
    assert "plant_health_pct" in body["metrics"]
    assert all(isinstance(v, (int, float)) for v in body["metrics"].values())


def test_snapshots_isolated_between_companies(vault_client):
    """A tenant must never see another tenant's recorded series."""
    acme = auth_headers(login(vault_client, *ACME_OWNER))
    beta = auth_headers(login(vault_client, *BETA_OWNER))

    vault_client.post("/vault/analytics/snapshot", headers=acme)

    assert vault_client.get("/vault/analytics/trends", headers=acme).json()["snapshot_count"] == 1
    assert vault_client.get("/vault/analytics/trends", headers=beta).json()["snapshot_count"] == 0


# ---------------------------------------------------------------------------
# Insights
# ---------------------------------------------------------------------------

def test_insights_returns_ranked_list(vault_client, owner_headers):
    resp = vault_client.get("/vault/analytics/insights", headers=owner_headers)
    assert resp.status_code == 200, resp.text

    body = resp.json()
    assert body["count"] == len(body["insights"])
    order = {"critical": 0, "warning": 1, "info": 2}
    severities = [order[i["severity"]] for i in body["insights"]]
    assert severities == sorted(severities), "insights must be ranked by severity"


def test_insight_entries_carry_evidence(vault_client, owner_headers):
    insights = vault_client.get("/vault/analytics/insights", headers=owner_headers).json()["insights"]
    for insight in insights:
        assert {"key", "severity", "title", "detail", "evidence"} <= set(insight)


# ---------------------------------------------------------------------------
# Failure risk
# ---------------------------------------------------------------------------

def test_failure_risk_returns_ranked_machines(vault_client, owner_headers):
    resp = vault_client.get("/vault/analytics/failure-risk", headers=owner_headers)
    assert resp.status_code == 200, resp.text

    body = resp.json()
    scores = [m["risk_score"] for m in body["machines"]]
    assert scores == sorted(scores, reverse=True), "must be ranked by descending risk"


def test_failure_risk_respects_limit(vault_client, owner_headers):
    body = vault_client.get("/vault/analytics/failure-risk?limit=1", headers=owner_headers).json()
    assert len(body["machines"]) <= 1
    assert body["total_ranked"] >= len(body["machines"])


def test_failure_risk_rejects_invalid_limit(vault_client, owner_headers):
    assert vault_client.get(
        "/vault/analytics/failure-risk?limit=0", headers=owner_headers
    ).status_code == 422


# ---------------------------------------------------------------------------
# Caching
# ---------------------------------------------------------------------------

def test_cache_stats_show_hits_after_repeated_insight_calls(vault_client, owner_headers):
    vault_client.get("/vault/analytics/insights", headers=owner_headers)
    vault_client.get("/vault/analytics/insights", headers=owner_headers)

    stats = vault_client.get("/vault/analytics/cache-stats", headers=owner_headers).json()
    assert stats["hits"] >= 1, "second insights call should hit the KPI cache"
