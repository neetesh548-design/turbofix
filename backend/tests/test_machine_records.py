import io
import zipfile

from app.auth import create_access_token
from tests.conftest import (
    ACME_MAINTENANCE_HEAD,
    ACME_OWNER,
    ACME_SUPERVISOR,
    BETA_OWNER,
    auth_headers,
    login,
)

MACHINE_ID = "TF-ACME3-M001"


def upload_record(client, token, *, content=b"Service date: 2026-07-10\nIssue: spindle vibration"):
    return client.post(
        "/vault/records",
        headers=auth_headers(token),
        data={
            "machine_id": MACHINE_ID,
            "record_type": "service_history",
            "source_kind": "handwritten",
            "title": "Lathe service register",
        },
        files={"file": ("service-register.txt", content, "text/plain")},
    )


def test_supervisor_can_upload_and_company_isolation_is_enforced(vault_client):
    supervisor = login(vault_client, *ACME_SUPERVISOR)
    response = upload_record(vault_client, supervisor)
    assert response.status_code == 201, response.text
    record = response.json()
    assert record["status"] == "needs_review"
    assert record["source_kind"] == "handwritten"
    assert record["file_name"] == "service-register.txt"
    assert "extracted_data" in record

    acme_records = vault_client.get("/vault/records", headers=auth_headers(supervisor))
    assert acme_records.status_code == 200
    assert [item["record_id"] for item in acme_records.json()] == [record["record_id"]]

    beta_owner = login(vault_client, *BETA_OWNER)
    beta_records = vault_client.get("/vault/records", headers=auth_headers(beta_owner))
    assert beta_records.status_code == 200
    assert beta_records.json() == []
    hidden = vault_client.get(
        f"/vault/records/{record['record_id']}", headers=auth_headers(beta_owner)
    )
    assert hidden.status_code == 404


def test_duplicate_source_is_rejected(vault_client):
    token = login(vault_client, *ACME_SUPERVISOR)
    assert upload_record(vault_client, token).status_code == 201
    duplicate = upload_record(vault_client, token)
    assert duplicate.status_code == 409
    assert "already" in duplicate.json()["detail"].lower()


def test_only_maintenance_head_can_approve_and_approved_data_reaches_machine_context(vault_client):
    owner = login(vault_client, *ACME_OWNER)
    head = login(vault_client, *ACME_MAINTENANCE_HEAD)
    record = upload_record(vault_client, owner).json()

    structured = record["extracted_data"]
    structured["summary"] = "Verified spindle bearing service history."
    structured["service_history"] = [{
        "date": "2026-07-10",
        "issue": "Spindle vibration",
        "work_performed": "Bearing inspected and lubrication renewed",
        "technician": "A. Patil",
        "hours": "2",
        "parts_used": "ISO VG 68 oil",
        "confidence": 96,
        "source": "Service register page 12",
    }]
    saved = vault_client.patch(
        f"/vault/records/{record['record_id']}",
        headers=auth_headers(owner),
        json={"extracted_data": structured, "review_notes": "Checked against register."},
    )
    assert saved.status_code == 200, saved.text

    before = vault_client.get(
        f"/vault/machines/{MACHINE_ID}/machine-data", headers=auth_headers(owner)
    )
    assert before.status_code == 200
    path = before.json()["path"]
    assert "Verified spindle bearing service history" not in open(path, encoding="utf-8").read()

    owner_approval = vault_client.post(
        f"/vault/records/{record['record_id']}/approve",
        headers=auth_headers(owner),
        json={"review_notes": "Owner attempted approval."},
    )
    assert owner_approval.status_code == 403
    assert "maintenance head" in owner_approval.json()["detail"].lower()

    approved = vault_client.post(
        f"/vault/records/{record['record_id']}/approve",
        headers=auth_headers(head),
        json={"review_notes": "Verified against the signed paper register."},
    )
    assert approved.status_code == 200, approved.text
    assert approved.json()["status"] == "approved"
    assert approved.json()["approved_by"]

    machine_data = open(approved.json()["machine_data"]["path"], encoding="utf-8").read()
    assert "Maintenance Head Approved Records" in machine_data
    assert "Verified spindle bearing service history" in machine_data
    assert "Spindle vibration" in machine_data
    assert "Service register page 12" in machine_data

    locked = vault_client.patch(
        f"/vault/records/{record['record_id']}",
        headers=auth_headers(owner),
        json={"extracted_data": structured, "review_notes": "Change approved record."},
    )
    assert locked.status_code == 409


def test_non_owner_operational_role_can_create_review_draft(vault_client):
    technician_token = create_access_token(
        user_id="U-ACME3-DEMO-TECH",
        company_code="ACME3",
        role="maintenance_technician",
        name="Demo Technician",
    )
    response = upload_record(vault_client, technician_token, content=b"PM check complete")
    assert response.status_code == 201, response.text
    assert response.json()["created_by"] == "U-ACME3-DEMO-TECH"


def test_backup_contains_originals_structured_data_csv_and_machine_data(vault_client):
    head = login(vault_client, *ACME_MAINTENANCE_HEAD)
    record = upload_record(vault_client, head).json()
    approve = vault_client.post(
        f"/vault/records/{record['record_id']}/approve",
        headers=auth_headers(head),
        json={"review_notes": "Approved for backup test."},
    )
    assert approve.status_code == 200

    response = vault_client.get(
        f"/vault/records/export?machine_id={MACHINE_ID}",
        headers=auth_headers(head),
    )
    assert response.status_code == 200, response.text
    assert response.headers["content-type"] == "application/zip"
    archive = zipfile.ZipFile(io.BytesIO(response.content))
    names = archive.namelist()
    assert "manifest.json" in names
    assert any("/originals/" in name for name in names)
    assert any(name.endswith(f"{record['record_id']}.json") for name in names)
    assert "structured/service_history.csv" in names
    assert any(name.endswith("MachineData.md") for name in names)


def test_restore_requires_maintenance_head(vault_client):
    owner = login(vault_client, *ACME_OWNER)
    payload = io.BytesIO()
    with zipfile.ZipFile(payload, "w") as archive:
        archive.writestr("manifest.json", '{"format":"turbofix-machine-records-v1"}')
    response = vault_client.post(
        "/vault/records/import",
        headers=auth_headers(owner),
        files={"file": ("backup.zip", payload.getvalue(), "application/zip")},
    )
    assert response.status_code == 403
