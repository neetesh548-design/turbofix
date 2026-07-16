"""Machine-onboarding quota + the internal TurboFix-team admin console.

Seeded state (build_tracker.py): ACME3 has quota=5, approved=yes, and 2 machines
already on the Machines tab, so an owner can onboard 3 more before hitting the wall.
"""

import pytest

from app import config
from tests.conftest import ACME_OWNER, ACME_SUPERVISOR, auth_headers, login

ADMIN_PW = "test-admin-pw"


@pytest.fixture(autouse=True)
def _fixed_admin_password(monkeypatch):
    monkeypatch.setattr(config, "PLATFORM_ADMIN_PASSWORD", ADMIN_PW)


def _machine(n):
    return {"machine_name": f"Test Machine {n}", "assigned_technician_phone": "+919812349999"}


def admin_token(client):
    resp = client.post("/admin/login", json={"password": ADMIN_PW})
    assert resp.status_code == 200, resp.text
    return resp.json()["access_token"]


# --- Quota enforcement on onboarding --------------------------------------

def test_owner_can_onboard_up_to_quota_then_is_blocked(vault_client):
    token = login(vault_client, *ACME_OWNER)
    h = auth_headers(token)
    # Starts at 2 used / 5 quota -> three more succeed and land at the limit.
    for n in range(3):
        resp = vault_client.post("/vault/machines", json=_machine(n), headers=h)
        assert resp.status_code == 201, resp.text
    body = resp.json()
    assert body["machine_quota"] == 5 and body["machines_used"] == 5

    # The next one is over plan: 402 Payment Required with an upgrade message.
    over = vault_client.post("/vault/machines", json=_machine(99), headers=h)
    assert over.status_code == 402
    assert "upgrade your subscription" in over.json()["detail"].lower()


def test_onboarding_blocked_until_company_is_approved(vault_client):
    # 1. Login first while company is approved to get token
    token = login(vault_client, *ACME_OWNER)

    # 2. Unapprove ACME3 via the admin console
    at = admin_token(vault_client)
    vault_client.post("/admin/companies/ACME3", json={"approved": False}, headers=auth_headers(at))

    # 3. Request should now be blocked with 403
    resp = vault_client.post("/vault/machines", json=_machine(1), headers=auth_headers(token))
    assert resp.status_code == 403
    assert "pending turbofix approval" in resp.json()["detail"].lower()


def test_raising_quota_lets_owner_onboard_again(vault_client):
    token = login(vault_client, *ACME_OWNER)
    h = auth_headers(token)
    for n in range(3):  # fill to the 5-machine limit
        vault_client.post("/vault/machines", json=_machine(n), headers=h)
    assert vault_client.post("/vault/machines", json=_machine(90), headers=h).status_code == 402

    # TurboFix bumps the plan to 8; onboarding works again.
    at = admin_token(vault_client)
    vault_client.post("/admin/companies/ACME3", json={"machine_quota": 8}, headers=auth_headers(at))
    assert vault_client.post("/vault/machines", json=_machine(91), headers=h).status_code == 201


# --- Admin auth -----------------------------------------------------------

def test_admin_login_wrong_password_rejected(vault_client):
    assert vault_client.post("/admin/login", json={"password": "nope"}).status_code == 401


def test_admin_endpoints_require_admin_token(vault_client):
    assert vault_client.get("/admin/companies").status_code == 401
    # A normal company-user token must not be accepted as an admin token.
    user_token = login(vault_client, *ACME_OWNER)
    assert vault_client.get("/admin/companies", headers=auth_headers(user_token)).status_code == 401


def test_admin_token_cannot_be_used_as_a_company_user(vault_client):
    at = admin_token(vault_client)
    # An admin token has no company_code, so per-company endpoints reject it.
    assert vault_client.get("/vault/documents", headers=auth_headers(at)).status_code == 401


# --- Admin company management ---------------------------------------------

def test_admin_lists_companies_with_usage(vault_client):
    at = admin_token(vault_client)
    companies = vault_client.get("/admin/companies", headers=auth_headers(at)).json()
    acme = next(c for c in companies if c["company_code"] == "ACME3")
    assert acme["approved"] is True
    assert acme["machine_quota"] == 5
    assert acme["machines_used"] == 2
    assert acme["capacity_percent"] == 40
    assert acme["user_count"] >= 1
    assert acme["open_tickets"] >= 0
    assert acme["document_count"] >= 0
    assert acme["pending_records"] >= 0


def test_admin_can_view_company_dashboard(vault_client):
    at = admin_token(vault_client)
    response = vault_client.get("/admin/companies/ACME3/dashboard", headers=auth_headers(at))
    assert response.status_code == 200, response.text
    dashboard = response.json()
    assert dashboard["company_code"] == "ACME3"
    assert "plant_health_pct" in dashboard["kpis"]
    assert "recent_activity" in dashboard


def test_admin_can_list_users_and_reset_password(vault_client):
    at = admin_token(vault_client)
    response = vault_client.get("/admin/companies/ACME3/users", headers=auth_headers(at))
    assert response.status_code == 200, response.text
    owner = next(user for user in response.json()["users"] if user["email"] == ACME_OWNER[0])
    assert "password_hash" not in owner

    reset = vault_client.post(
        f"/admin/users/{owner['user_id']}/password",
        json={"new_password": "RecoveredOwner@2026"},
        headers=auth_headers(at),
    )
    assert reset.status_code == 200, reset.text
    assert login(vault_client, ACME_OWNER[0], "RecoveredOwner@2026")


def test_admin_update_unknown_company_404(vault_client):
    at = admin_token(vault_client)
    resp = vault_client.post("/admin/companies/NOPE9", json={"machine_quota": 3}, headers=auth_headers(at))
    assert resp.status_code == 404


def test_admin_page_served_as_html(vault_client):
    resp = vault_client.get("/admin")
    assert resp.status_code == 200
    assert "text/html" in resp.headers["content-type"]
    assert "Platform sign in" in resp.text
    assert "Priority attention" in resp.text
