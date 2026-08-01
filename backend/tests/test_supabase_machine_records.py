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


def test_supabase_parts_get_item_resolves_real_company_code(monkeypatch):
    # Regression test: get_item() used to hardcode company_code="" for every
    # item, which made vault_router's user.assert_same_company(item[
    # "company_code"]) reject every caller unconditionally — including the
    # item's own owning company. It must resolve the real company via the
    # row's factory_id, not leave it blank.
    client = FakePostgrestClient()
    monkeypatch.setattr(supabase_repo, "_client", client)
    monkeypatch.setattr(
        supabase_repo, "_company_code_for_factory_id",
        lambda factory_id: "ACME" if factory_id == "factory-1" else "",
    )
    repository = supabase_repo.SupabasePartsRepository()

    client.rows = [{
        "id": "part-1",
        "factory_id": "factory-1",
        "machine_id": "machine-1",
        "part_name": "Bearing",
        "part_number": "BR-100",
        "stock_qty": 5,
        "unit": "pcs",
        "reorder_level": 2,
        "supplier": "Acme Supplies",
    }]

    item = repository.get_item("spare_parts", "part-1")
    assert item["company_code"] == "ACME"
    assert item["part_id"] == "part-1"
    assert item["machine_id"] == "machine-1"

    client.rows = [{
        "id": "consumable-1",
        "factory_id": "factory-1",
        "machine_id": "machine-1",
        "name": "Coolant",
        "stock_qty": 10,
        "unit": "L",
        "reorder_level": 3,
    }]
    consumable = repository.get_item("consumables", "consumable-1")
    assert consumable["company_code"] == "ACME"
    assert consumable["consumable_id"] == "consumable-1"


def test_supabase_parts_add_and_update_item_coerce_quantities_to_int(monkeypatch):
    # Regression test: reorder_level/quantity_on_hand are typed float at the
    # request layer (SparePartIn/ConsumableIn), but parts.reorder_level and
    # parts.stock_qty are integer columns in Postgres — PostgREST rejects a
    # JSON float like 2.0 for an integer column (22P02 invalid input syntax).
    client = FakePostgrestClient()
    monkeypatch.setattr(supabase_repo, "_client", client)
    monkeypatch.setattr(supabase_repo, "_factory_id_for_code", lambda code: "factory-1")
    monkeypatch.setattr(supabase_repo, "_company_id_for_code", lambda code: "company-1")
    repository = supabase_repo.SupabasePartsRepository()

    repository.add_item("spare_parts", {
        "part_id": "SP-legacy-id",
        "company_code": "ACME",
        "machine_id": "machine-1",
        "part_name": "Bearing",
        "quantity_on_hand": 5.0,
        "reorder_level": 2.0,
    })
    inserted = client.calls[-1][2]
    assert inserted["stock_qty"] == 5 and isinstance(inserted["stock_qty"], int)
    assert inserted["reorder_level"] == 2 and isinstance(inserted["reorder_level"], int)
    # Also covers the sibling uuid-id bug (d8fd5d1): the legacy "SP-..." id
    # must never be reused as the Supabase row's id.
    assert inserted["id"] != "SP-legacy-id"

    repository.update_item("spare_parts", "part-1", {"quantity_on_hand": 3.0, "reorder_level": 1.0})
    patch = client.calls[-1][3]
    assert patch["stock_qty"] == 3 and isinstance(patch["stock_qty"], int)
    assert patch["reorder_level"] == 1 and isinstance(patch["reorder_level"], int)


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
