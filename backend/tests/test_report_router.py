"""Unit tests for Report Router endpoints in app.routers.report_router."""

import pytest
from fastapi.testclient import TestClient
from unittest.mock import MagicMock, patch

from app.main import app
from app.auth import create_access_token
from app.dependencies import get_users

client = TestClient(app)

MOCK_REPORT = {
    "period": "daily",
    "period_label": "Daily",
    "company_name": "TF Demo Inc",
    "start": "2026-07-28",
    "end": "2026-07-28",
    "summary": "Plant operating normal",
    "metrics": {
        "total_tickets": 2,
        "tickets_closed": 1,
        "tickets_opened": 1,
        "avg_resolution_hours": 2.0,
        "plant_health_pct": 90.0,
        "urgency_distribution": {"High": 1, "Medium": 0, "Low": 0},
        "top_failing_machines": [],
    },
}


@pytest.fixture
def owner_headers():
    token = create_access_token(user_id="owner@company.example", company_code="TFDEMO", role="owner")
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture(autouse=True)
def override_users_repo():
    repo = MagicMock()
    repo.get_company.return_value = {"company_code": "TFDEMO", "company_name": "TF Demo Inc"}
    app.dependency_overrides[get_users] = lambda: repo
    yield
    app.dependency_overrides.clear()


def test_get_report_valid_period(owner_headers):
    with patch("app.routers.report_router.generate_report") as mock_gen:
        mock_gen.return_value = MOCK_REPORT.copy()
        response = client.get("/vault/reports/daily", headers=owner_headers)
        assert response.status_code == 200
        assert response.json()["period"] == "daily"


def test_get_report_invalid_period(owner_headers):
    response = client.get("/vault/reports/invalid_period", headers=owner_headers)
    assert response.status_code == 400
    assert "Invalid period" in response.json()["detail"]


def test_send_report_success(owner_headers):
    with patch("app.routers.report_router.generate_report") as mock_gen:
        mock_gen.return_value = MOCK_REPORT.copy()
        response = client.post("/vault/reports/weekly/send", json={}, headers=owner_headers)
        assert response.status_code == 200
