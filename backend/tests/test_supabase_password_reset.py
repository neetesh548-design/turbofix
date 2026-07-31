"""Regression tests for SupabaseUserRepository password reset token self-invalidation.

Verifies that password reset tokens issued for Supabase-backed users are bound
to a dynamic fingerprint seed and self-invalidate immediately once the user's password
has been updated, preventing reset link reuse."""

import re
from urllib.parse import unquote
import pytest
from fastapi.testclient import TestClient

from app import config, auth
from app.main import app
from app.repositories import supabase_repo
from app.auth import create_reset_token, decode_reset_token, reset_token_matches, hash_password


class FakeSupabaseClient:
    def __init__(self):
        self.users_db = []
        self.auth_users = {}

    def select(self, table: str, params: dict = None) -> list:
        if table == "users":
            return self.users_db
        return []

    def select_one(self, table: str, params: dict) -> dict:
        if table == "users":
            for field, val in params.items():
                if field == "email" and val.startswith("eq."):
                    target_email = val[3:]
                    for user in self.users_db:
                        if user.get("email", "").lower() == target_email.lower():
                            return user
                elif field == "id" and val.startswith("eq."):
                    target_id = val[3:]
                    for user in self.users_db:
                        if user.get("id") == target_id:
                            return user
        return None

    def insert(self, table: str, row: dict) -> dict:
        if table == "users":
            self.users_db.append(row)
        return row

    def update(self, table: str, params: dict, patch: dict) -> list:
        if table == "users":
            for field, val in params.items():
                if field == "id" and val.startswith("eq."):
                    target_id = val[3:]
                    for user in self.users_db:
                        if user.get("id") == target_id:
                            user.update(patch)
        return [patch]

    def auth_admin_create_user(self, email: str, password: str, phone: str = "") -> dict:
        user_id = f"sb-usr-{len(self.auth_users) + 1}"
        self.auth_users[user_id] = {"id": user_id, "email": email, "password": password}
        return {"id": user_id, "email": email}

    def auth_get_user_by_email(self, email: str) -> dict:
        for u_id, u_data in self.auth_users.items():
            if u_data.get("email") == email:
                return u_data
        return None

    def auth_admin_update_password(self, auth_user_id: str, new_password: str) -> bool:
        if auth_user_id in self.auth_users:
            self.auth_users[auth_user_id]["password"] = new_password
            return True
        return False

    def auth_verify_password(self, email: str, password: str) -> bool:
        for u in self.auth_users.values():
            if u.get("email") == email and u.get("password") == password:
                return True
        return False


@pytest.fixture
def fake_supabase(monkeypatch):
    client = FakeSupabaseClient()
    monkeypatch.setattr(supabase_repo, "_client", client)
    monkeypatch.setattr(supabase_repo, "_company_id_for_code", lambda code: "c-123")
    monkeypatch.setattr(supabase_repo, "_company_code_for_id", lambda val: "ACME")
    return client


def test_supabase_user_password_hash_returns_fingerprint_seed(fake_supabase):
    repo = supabase_repo.SupabaseUserRepository()
    repo.add({
        "user_id": "usr-1",
        "company_code": "ACME",
        "name": "Alice Supabase",
        "email": "alice@example.com",
        "password": "InitialPassword123!",
        "role": "owner",
    })

    user = repo.get_by_identifier("alice@example.com")
    assert user is not None
    assert user.get("password_hash") != ""
    assert len(user.get("password_hash")) > 0


def test_supabase_reset_token_invalidated_after_password_update(fake_supabase):
    repo = supabase_repo.SupabaseUserRepository()
    repo.add({
        "user_id": "usr-2",
        "company_code": "ACME",
        "name": "Bob Supabase",
        "email": "bob@example.com",
        "password": "OldPassword123!",
        "role": "supervisor",
    })

    user_before = repo.get_by_identifier("bob@example.com")
    token = create_reset_token(user_id=user_before["user_id"], password_hash=user_before["password_hash"])
    
    payload = decode_reset_token(token)
    assert payload is not None
    assert reset_token_matches(payload, user_before["password_hash"]) is True

    # Perform password update
    updated = repo.update_password(user_before["user_id"], hash_password("NewPassword123!"), "NewPassword123!")
    assert updated is True

    # User record fetched after update has a new fingerprint seed
    user_after = repo.get_by_id(user_before["user_id"])
    assert user_after["password_hash"] != user_before["password_hash"]

    # Old reset token must no longer match the user's current state
    assert reset_token_matches(payload, user_after["password_hash"]) is False


def test_supabase_password_reset_http_flow_prevents_token_reuse(fake_supabase, monkeypatch):
    repo = supabase_repo.SupabaseUserRepository()
    repo.add({
        "user_id": "usr-3",
        "company_code": "ACME",
        "name": "Charlie Supabase",
        "email": "charlie@example.com",
        "password": "CharliePassword1!",
        "role": "owner",
    })

    from app.dependencies import get_users
    app.dependency_overrides[get_users] = lambda: repo

    try:
        client = TestClient(app)

        # 1. Request forgot password
        forgot_resp = client.post("/auth/forgot-password", json={"email": "charlie@example.com"})
        assert forgot_resp.status_code == 200

        user = repo.get_by_identifier("charlie@example.com")
        token = create_reset_token(user_id=user["user_id"], password_hash=user["password_hash"])

        # 2. Reset password using token - first attempt succeeds
        reset1 = client.post("/auth/reset-password", json={"token": token, "new_password": "NewCharliePassword2!"})
        assert reset1.status_code == 200

        # 3. Attempting to reuse the exact same reset token must be rejected with 400
        reset2 = client.post("/auth/reset-password", json={"token": token, "new_password": "NewCharliePassword3!"})
        assert reset2.status_code == 400
        assert "invalid or has expired" in reset2.json()["detail"].lower()
    finally:
        app.dependency_overrides.clear()


def test_supabase_login_token_cannot_be_used_as_reset_token(fake_supabase):
    repo = supabase_repo.SupabaseUserRepository()
    repo.add({
        "user_id": "usr-4",
        "company_code": "ACME",
        "name": "David Supabase",
        "email": "david@example.com",
        "password": "DavidPassword1!",
        "role": "owner",
    })

    # Generate normal access token (purpose is "access", not "pwreset")
    user = repo.get_by_identifier("david@example.com")
    access_token = auth.create_access_token(user_id=user["user_id"], company_code="ACME", role="owner", name="David Supabase")

    client = TestClient(app)
    resp = client.post("/auth/reset-password", json={"token": access_token, "new_password": "NewDavidPassword1!"})
    assert resp.status_code == 400
    assert "invalid or has expired" in resp.json()["detail"].lower()
