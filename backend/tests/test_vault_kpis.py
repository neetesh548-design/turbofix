"""Unit tests for Custom KPI endpoints in app.routers.kpi_router."""

import pytest
from fastapi.testclient import TestClient
from unittest.mock import MagicMock, patch

from app.main import app
from app.auth import create_access_token

client = TestClient(app)


@pytest.fixture
def owner_headers():
    token = create_access_token(user_id="owner@company.example", company_code="TFDEMO", role="owner")
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def mock_kpi_repo():
    with patch("app.routers.kpi_router.get_custom_kpis") as mock:
        repo = MagicMock()
        mock.return_value = repo
        yield repo


def test_list_custom_kpis_empty(owner_headers, mock_kpi_repo):
    mock_kpi_repo.list_kpis.return_value = []
    mock_kpi_repo.list_data.return_value = []
    response = client.get("/vault/kpis", headers=owner_headers)
    assert response.status_code == 200
    assert "configs" in response.json()


def test_create_custom_kpi_success(owner_headers, mock_kpi_repo):
    mock_kpi_repo.list_kpis.return_value = []
    mock_kpi_repo.create_kpi.return_value = {
        "id": "kpi-1",
        "company_code": "TFDEMO",
        "kpi_name": "MTBF Goal",
        "unit": "hrs",
        "target_value": "100.0",
    }
    response = client.post(
        "/vault/kpis",
        json={"kpi_name": "MTBF Goal", "unit": "hrs", "target_value": "100.0"},
        headers=owner_headers,
    )
    assert response.status_code == 200


def test_delete_custom_kpi_not_found(owner_headers, mock_kpi_repo):
    mock_kpi_repo.delete_kpi.return_value = False
    response = client.delete("/vault/kpis/nonexistent-id", headers=owner_headers)
    assert response.status_code == 404
