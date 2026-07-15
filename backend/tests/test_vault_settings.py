from tests.conftest import ACME_OWNER, BETA_OWNER, auth_headers, login


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
