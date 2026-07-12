import pytest
from tests.conftest import ACME_OWNER, auth_headers

REGISTER_BODY = {
    "company_code": "NEWCO",
    "company_name": "New Company Pvt Ltd",
    "admin_contact_phone": "+919900088000",
    "owner_name": "New Owner",
    "owner_email": "owner@newco.example",
    "owner_password": "SecurePassword123",
}


def test_register_success(vault_client):
    resp = vault_client.post("/auth/register", json=REGISTER_BODY)
    assert resp.status_code == 201, resp.text
    body = resp.json()
    assert body["status"] == "pending_approval"
    assert "approve your account" in body["message"].lower()


def test_register_duplicate_company(vault_client):
    body = {**REGISTER_BODY, "company_code": "ACME3"}  # ACME3 already exists
    resp = vault_client.post("/auth/register", json=body)
    assert resp.status_code == 409
    assert "company code already exists" in resp.json()["detail"].lower()


def test_register_duplicate_email(vault_client):
    # rakesh@acmeforge.example already exists in seed data
    body = {**REGISTER_BODY, "owner_email": "rakesh@acmeforge.example"}
    resp = vault_client.post("/auth/register", json=body)
    assert resp.status_code == 409
    assert "email already exists" in resp.json()["detail"].lower()


def test_register_invalid_password(vault_client):
    body = {**REGISTER_BODY, "owner_password": "short"}
    resp = vault_client.post("/auth/register", json=body)
    assert resp.status_code == 400
    assert "at least 8 characters" in resp.json()["detail"].lower()


def test_register_requires_email(vault_client):
    body = {**REGISTER_BODY, "owner_email": "   "}
    resp = vault_client.post("/auth/register", json=body)
    assert resp.status_code == 400
    assert "email is required" in resp.json()["detail"].lower()
