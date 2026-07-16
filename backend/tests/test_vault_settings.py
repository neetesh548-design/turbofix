from tests.conftest import ACME_MAINTENANCE_HEAD, ACME_OWNER, BETA_OWNER, auth_headers, login


def test_escalation_settings_are_isolated_by_company(vault_client):
    acme_token = login(vault_client, *ACME_OWNER)
    beta_token = login(vault_client, *BETA_OWNER)
    acme_path = [
        {"role": "maintenance_head", "label": "ACME Maintenance Head", "threshold_hours": 1},
        {"role": "owner", "label": "ACME Owner", "threshold_hours": None},
    ]

    response = vault_client.post(
        "/vault/escalation",
        headers=auth_headers(acme_token),
        json=acme_path,
    )

    assert response.status_code == 200
    assert vault_client.get("/vault/escalation", headers=auth_headers(acme_token)).json() == acme_path
    beta_path = vault_client.get("/vault/escalation", headers=auth_headers(beta_token)).json()
    assert beta_path != acme_path
    assert beta_path[-1]["role"] == "owner"


def test_maintenance_head_can_manage_escalation(vault_client):
    maintenance_head_token = login(vault_client, *ACME_MAINTENANCE_HEAD)
    response = vault_client.post(
        "/vault/escalation",
        headers=auth_headers(maintenance_head_token),
        json=[
            {"role": "maintenance_technician", "label": "Maintenance Technician", "threshold_hours": 2},
            {"role": "maintenance_head", "label": "Maintenance Head", "threshold_hours": None},
        ],
    )
    assert response.status_code == 200, response.text


def test_custom_roles_are_isolated_by_company(vault_client):
    acme_token = login(vault_client, *ACME_OWNER)
    beta_token = login(vault_client, *BETA_OWNER)

    response = vault_client.post(
        "/vault/custom-roles",
        headers=auth_headers(acme_token),
        json={"role_name": "reliability_lead", "role_label": "Reliability Lead"},
    )

    assert response.status_code == 200
    assert response.json() == [{"role_name": "reliability_lead", "role_label": "Reliability Lead"}]
    assert vault_client.get("/vault/custom-roles", headers=auth_headers(beta_token)).json() == []


def test_dashboard_returns_company_machine_quota(vault_client):
    token = login(vault_client, *ACME_OWNER)
    response = vault_client.get("/vault/dashboard", headers=auth_headers(token))

    assert response.status_code == 200, response.text
    body = response.json()
    assert body["machine_quota"] == 5
    assert body["machines_used"] == body["kpis"]["total_machines"] == 2
