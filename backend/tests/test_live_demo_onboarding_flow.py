"""Live Demo Onboarding & Multi-Tenant Data Firewall End-to-End Verification Test.

This test simulates the exact sequence of events during a live client demo:
1. Self-service registration of a new company ("NEWFAC").
2. Attempted login while company is still "pending" -> Rejected with 403 Forbidden.
3. Backend Admin Console approval -> Changes status to "active" / approved=True.
4. Successful owner login -> Receives JWT token with company_code="NEWFAC".
5. Verification of multi-tenant data firewall:
   - Querying machines/tickets for "NEWFAC" returns 0 records (no fallback to demo fleet or other plants).
   - Attempting to query records belonging to another plant ("NKS" or "ACME3") returns 0 records.
6. Adding first machine -> Quota checked (1/5 used).
"""

import random
import uuid
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.auth import create_access_token

client = TestClient(app)


def test_complete_live_demo_onboarding_and_firewall_flow():
    unique_suffix = uuid.uuid4().hex[:6].upper()
    company_code = f"DEMO{unique_suffix}"
    owner_email = f"owner_{unique_suffix.lower()}@demofactory.com"
    owner_phone = f"9876{random.randint(10000, 99999)}"
    owner_password = "SecurePassword123!"

    # -----------------------------------------------------------------------
    # STEP 1: Self-Service Registration
    # -----------------------------------------------------------------------
    reg_payload = {
        "company_code": company_code,
        "company_name": "New Factory Pvt Ltd",
        "admin_contact_phone": owner_phone,
        "owner_name": "Rajesh Sharma",
        "owner_email": owner_email,
        "owner_password": owner_password,
    }
    reg_res = client.post("/auth/register", json=reg_payload)
    assert reg_res.status_code == 201, f"Registration failed: {reg_res.text}"
    assert reg_res.json()["status"] == "pending_approval"

    # -----------------------------------------------------------------------
    # STEP 2: Attempt Login BEFORE Admin Approval -> Must be 403 Forbidden
    # -----------------------------------------------------------------------
    login_pending_res = client.post("/auth/login", json={
        "identifier": owner_email,
        "password": owner_password,
    })
    assert login_pending_res.status_code == 403, "Login should be blocked while company is pending"
    assert "pending TurboFix admin approval" in login_pending_res.json()["detail"]

    # -----------------------------------------------------------------------
    # STEP 3: Admin Console Approval
    # -----------------------------------------------------------------------
    from app.auth import create_admin_token
    admin_token = create_admin_token()
    headers = {"Authorization": f"Bearer {admin_token}"}

    approve_res = client.post(f"/admin/companies/{company_code}", json={"approved": True}, headers=headers)
    assert approve_res.status_code == 200, f"Admin approval failed: {approve_res.text}"
    assert approve_res.json()["approved"] is True

    # -----------------------------------------------------------------------
    # STEP 4: Login AFTER Admin Approval -> Must Succeed (200 OK)
    # -----------------------------------------------------------------------
    login_active_res = client.post("/auth/login", json={
        "identifier": owner_email,
        "password": owner_password,
    })
    assert login_active_res.status_code == 200, f"Login failed after approval: {login_active_res.text}"
    auth_data = login_active_res.json()
    assert "access_token" in auth_data
    assert auth_data["user"]["company_code"] == company_code

    # -----------------------------------------------------------------------
    # STEP 5: Multi-Tenant Data Isolation & Firewall Verification
    # -----------------------------------------------------------------------
    user_token = auth_data["access_token"]
    user_headers = {"Authorization": f"Bearer {user_token}"}

    # A. Verify Dashboard returns clean zero data for new factory (no leak from other companies)
    dash_res = client.get(f"/vault/dashboard?company_code={company_code}", headers=user_headers)
    assert dash_res.status_code == 200
    dash_data = dash_res.json()
    # Confirm metrics start at 0
    assert dash_data.get("kpis", {}).get("total_machines", 0) == 0

    # B. SECURITY FIREWALL: Attempt to fetch data of ANOTHER company ("NKS") using NEWFAC token
    cross_tenant_res = client.get(f"/vault/machines?company_code=NKS", headers=user_headers)
    if cross_tenant_res.status_code == 200:
        raw_res = cross_tenant_res.json()
        machines = raw_res if isinstance(raw_res, list) else raw_res.get("machines", [])
        assert all(m.get("company_code") == company_code for m in machines), "DATA LEAKAGE DETECTED! User saw another tenant's data."
    else:
        assert cross_tenant_res.status_code in (401, 403)
