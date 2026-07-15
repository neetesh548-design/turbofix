from app.auth import create_access_token
from app.dependencies import get_tickets
from app.repositories.base import TICKETS_HEADER, new_ticket_id
from tests.conftest import ACME_OWNER, auth_headers, login


def _open_ticket() -> str:
    ticket_id = new_ticket_id()
    row = {key: "" for key in TICKETS_HEADER}
    row.update({
        "ticket_id": ticket_id,
        "machine_id": "TF-ACME3-M001",
        "company_code": "ACME3",
        "machine_name": "CNC Lathe 1",
        "reported_at": "2026-07-15 10:00:00",
        "description": "Spindle vibration",
        "urgency": "High",
        "status": "Open",
    })
    get_tickets().append(row)
    return ticket_id


def test_owner_can_close_ticket_with_actor_name(vault_client):
    ticket_id = _open_ticket()
    token = login(vault_client, *ACME_OWNER)

    response = vault_client.post(
        f"/vault/tickets/{ticket_id}/close",
        headers=auth_headers(token),
    )

    assert response.status_code == 200
    closed = get_tickets().get(ticket_id)
    assert closed["status"] == "Closed"
    assert closed["closed_by"] == "Rakesh Shah"


def test_technician_cannot_perform_final_ticket_closure(vault_client):
    ticket_id = _open_ticket()
    token = create_access_token(
        user_id="U-ACME3-TECH",
        company_code="ACME3",
        role="maintenance_technician",
        name="Demo Technician",
    )

    response = vault_client.post(
        f"/vault/tickets/{ticket_id}/close",
        headers=auth_headers(token),
    )

    assert response.status_code == 403
    assert get_tickets().get(ticket_id)["status"] == "Open"
