import base64
import asyncio
import json
import zlib

import pytest

from app import auth
from app.infrastructure import file_storage
from app.repositories import supabase_repo


class FakePostgrestClient:
    def __init__(self):
        self.calls = []
        self.rows = []

    def select(self, table, params=None):
        self.calls.append(("select", table, params))
        return self.rows

    def select_one(self, table, params):
        self.calls.append(("select_one", table, params))
        return self.rows[0] if self.rows else None

    def insert(self, table, row):
        self.calls.append(("insert", table, row))
        return row

    def update(self, table, params, patch):
        self.calls.append(("update", table, params, patch))
        return [patch]


def compressed_json(value):
    raw = json.dumps(value).encode()
    return "zlib:" + base64.b64encode(zlib.compress(raw)).decode()


def test_supabase_machine_record_repository_is_tenant_scoped_and_expands_json(monkeypatch):
    client = FakePostgrestClient()
    monkeypatch.setattr(supabase_repo, "_client", client)
    monkeypatch.setattr(supabase_repo, "_company_id_for_code", lambda code: "company-1")
    monkeypatch.setattr(supabase_repo, "_company_code_for_id", lambda value: "ACME")
    repository = supabase_repo.SupabaseMachineRecordRepository()

    repository.add({
        "record_id": "REC-1",
        "company_code": "ACME",
        "machine_id": "machine-1",
        "record_type": "manual",
        "source_kind": "soft_copy",
        "title": "Manual",
        "status": "needs_review",
        "extracted_json": compressed_json({"summary": "verified"}),
        "history_json": compressed_json([]),
        "document_id": "",
        "approved_at": "",
    })
    inserted = client.calls[-1][2]
    assert inserted["company_id"] == "company-1"
    assert inserted["document_id"] is None
    assert inserted["approved_at"] is None
    assert json.loads(inserted["extracted_json"])["summary"] == "verified"

    client.rows = [{
        **inserted,
        "record_id": "REC-1",
        "machine_id": "machine-1",
        "status": "approved",
    }]
    records = repository.list("ACME", machine_id="machine-1", status="approved")
    assert records[0]["company_code"] == "ACME"
    assert client.calls[-1][2]["company_id"] == "eq.company-1"
    assert client.calls[-1][2]["machine_id"] == "eq.machine-1"
    assert client.calls[-1][2]["status"] == "eq.approved"


class FakeResponse:
    def __init__(self, status_code=200, payload=None, content=b""):
        self.status_code = status_code
        self._payload = payload
        self.content = content

    def json(self):
        return self._payload

    def raise_for_status(self):
        if self.status_code >= 400:
            raise RuntimeError(f"HTTP {self.status_code}")


class FakeAuthClient:
    def __init__(self, *args, **kwargs):
        self.requests = []

    def __enter__(self):
        return self

    def __exit__(self, *args):
        return None

    def get(self, url, headers=None, params=None):
        self.requests.append((url, headers, params))
        if url.endswith("/auth/v1/user"):
            return FakeResponse(payload={
                "id": "auth-user",
                "email": "owner@example.com",
                "app_metadata": {"directory_user_id": "directory-user"},
                "user_metadata": {"directory_user_id": "untrusted-user"},
            })
        if url.endswith("/users"):
            assert params["id"] == "eq.directory-user"
            return FakeResponse(payload=[{
                "id": "directory-user",
                "company_id": "company-1",
                "role": "owner",
                "name": "Plant Owner",
                "email": "owner@example.com",
            }])
        if url.endswith("/companies"):
            return FakeResponse(payload=[{"domain": "ACME"}])
        raise AssertionError(url)


def test_supabase_auth_uses_trusted_directory_link_not_user_metadata(monkeypatch):
    monkeypatch.setattr(auth.config, "SUPABASE_URL", "https://project.supabase.co")
    monkeypatch.setattr(auth.config, "SUPABASE_SERVICE_ROLE_KEY", "service-secret")
    monkeypatch.setattr(auth.httpx, "Client", FakeAuthClient)

    payload = auth._resolve_supabase_user("caller-token")

    assert payload == {
        "sub": "directory-user",
        "company_code": "ACME",
        "role": "owner",
        "name": "Plant Owner",
    }


class FakeAsyncClient:
    calls = []

    def __init__(self, *args, **kwargs):
        pass

    async def __aenter__(self):
        return self

    async def __aexit__(self, *args):
        return None

    async def post(self, url, headers=None, content=None):
        self.calls.append(("post", url, headers, content))
        return FakeResponse()

    async def get(self, url, headers=None):
        self.calls.append(("get", url, headers))
        return FakeResponse(content=b"stored-content")

    async def delete(self, url, headers=None):
        self.calls.append(("delete", url, headers))
        return FakeResponse(status_code=204)


def test_supabase_file_storage_uses_private_bucket_and_safe_object_key(monkeypatch):
    FakeAsyncClient.calls = []
    monkeypatch.setattr(file_storage.httpx, "AsyncClient", FakeAsyncClient)
    storage = file_storage.SupabaseFileStorage(
        "https://project.supabase.co", "service-secret", "machine-records"
    )

    path = asyncio.run(
        storage.save("ACME", "machine-1", "document-1", "../manual 1.pdf", b"data")
    )
    assert path == "supabase://machine-records/ACME/machine-1/document-1_manual 1.pdf"
    assert "%20" in FakeAsyncClient.calls[0][1]
    assert asyncio.run(storage.read(path)) == b"stored-content"
    asyncio.run(storage.delete(path))
    assert [call[0] for call in FakeAsyncClient.calls] == ["post", "get", "delete"]

    with pytest.raises(PermissionError):
        asyncio.run(storage.read("supabase://another-bucket/ACME/machine-1/file.pdf"))
