from app.auth import create_access_token
from app.dependencies import get_technician_work, get_tickets, get_users
from app.repositories.base import TICKETS_HEADER, USERS_HEADER, new_ticket_id
from tests.conftest import ACME_OWNER, auth_headers, login


def _open_ticket(machine_id: str = "TF-ACME3-M001") -> str:
    ticket_id = new_ticket_id()
    row = {key: "" for key in TICKETS_HEADER}
    row.update({
        "ticket_id": ticket_id,
        "machine_id": machine_id,
        "company_code": "ACME3",
        "machine_name": "CNC Lathe 1",
        "reported_at": "2026-07-15 10:00:00",
        "description": "Spindle vibration",
        "urgency": "High",
        "status": "Open",
    })
    get_tickets().append(row)
    return ticket_id


def _technician_token(phone: str = "+919812340001") -> str:
    user_id = "U-ACME3-TECH-TEST"
    row = {key: "" for key in USERS_HEADER}
    row.update({
        "user_id": user_id,
        "company_code": "ACME3",
        "name": "Demo Technician",
        "phone": phone,
        "email": "demo.technician@acmeforge.example",
        "role": "maintenance_technician",
    })
    get_users().add(row)
    return create_access_token(
        user_id=user_id,
        company_code="ACME3",
        role="maintenance_technician",
        name="Demo Technician",
    )


def test_technician_can_submit_work_for_supervisor_approval(vault_client):
    ticket_id = _open_ticket()
    technician_token = _technician_token()

    queue_response = vault_client.get(
        "/vault/technician/work",
        headers=auth_headers(technician_token),
    )
    assert queue_response.status_code == 200
    queued = next(item for item in queue_response.json() if item["ticket_id"] == ticket_id)
    assert queued["machine_location"] == "Shop Floor A"

    update_response = vault_client.put(
        f"/vault/technician/work/{ticket_id}",
        headers=auth_headers(technician_token),
        json={
            "status": "in_progress",
            "checklist": [0, 1, 2, 3],
            "notes": "Replaced the spindle bearing and completed a test run.",
            "parts_used": "Bearing BRG-6205, quantity 1",
        },
    )
    assert update_response.status_code == 200

    submit_response = vault_client.post(
        f"/vault/technician/work/{ticket_id}/submit",
        headers=auth_headers(technician_token),
    )
    assert submit_response.status_code == 200
    assert submit_response.json()["status"] == "submitted"
    assert get_tickets().get(ticket_id)["status"] == "Open"

    owner_token = login(vault_client, *ACME_OWNER)
    approval_response = vault_client.post(
        f"/vault/technician/work/{ticket_id}/approve",
        headers=auth_headers(owner_token),
    )
    assert approval_response.status_code == 200
    assert approval_response.json()["status"] == "closed"
    assert approval_response.json()["reviewed_by"] == "Rakesh Shah"
    assert get_tickets().get(ticket_id)["status"] == "Closed"


def test_submission_requires_complete_checklist_and_notes(vault_client):
    ticket_id = _open_ticket()
    owner_token = login(vault_client, *ACME_OWNER)
    vault_client.put(
        f"/vault/technician/work/{ticket_id}",
        headers=auth_headers(owner_token),
        json={"status": "in_progress", "checklist": [0, 1], "notes": "Checked machine"},
    )

    response = vault_client.post(
        f"/vault/technician/work/{ticket_id}/submit",
        headers=auth_headers(owner_token),
    )

    assert response.status_code == 422
    assert get_technician_work().get(ticket_id)["status"] == "in_progress"


def test_unassigned_technician_cannot_access_ticket(vault_client):
    ticket_id = _open_ticket()
    technician_token = _technician_token(phone="+919899999999")

    response = vault_client.put(
        f"/vault/technician/work/{ticket_id}",
        headers=auth_headers(technician_token),
        json={"status": "in_progress"},
    )

    assert response.status_code == 403


def test_evidence_upload_is_persisted_and_downloadable(vault_client):
    ticket_id = _open_ticket()
    owner_token = login(vault_client, *ACME_OWNER)

    upload_response = vault_client.post(
        f"/vault/technician/work/{ticket_id}/evidence",
        headers=auth_headers(owner_token),
        data={"kind": "photo"},
        files={"file": ("bearing.png", b"\x89PNG\r\n\x1a\nrepair-photo", "image/png")},
    )

    assert upload_response.status_code == 200
    evidence = upload_response.json()["evidence"]
    assert len(evidence) == 1
    assert evidence[0]["file_name"] == "bearing.png"

    download_response = vault_client.get(
        f"/vault/technician/work/{ticket_id}/evidence/{evidence[0]['evidence_id']}",
        headers=auth_headers(owner_token),
    )
    assert download_response.status_code == 200
    assert download_response.content == b"\x89PNG\r\n\x1a\nrepair-photo"
