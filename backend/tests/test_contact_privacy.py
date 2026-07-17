from tests.conftest import (
    ACME_MAINTENANCE_HEAD,
    ACME_OWNER,
    ACME_SUPERVISOR,
    auth_headers,
    login,
)


def _team(client, token):
    response = client.get("/vault/team", headers=auth_headers(token))
    assert response.status_code == 200, response.text
    return response.json()


def _add_member(client, owner_token, **overrides):
    payload = {
        "name": "New Staff Member",
        "phone": "+919900000001",
        "email": "new.staff@acmeforge.example",
        "password": "NewStaff@2026",
        "role": "maintenance_technician",
        "manager_user_id": "",
        "department": "Maintenance",
        "plant_location": "Shop Floor A",
        "shift": "General",
        "portal_access": True,
    }
    payload.update(overrides)
    response = client.post(
        "/auth/supervisors",
        json=payload,
        headers=auth_headers(owner_token),
    )
    assert response.status_code == 201, response.text
    return response.json()


def test_team_directory_masks_contacts_and_owner_can_reveal(vault_client):
    owner_token = login(vault_client, *ACME_OWNER)
    team = _team(vault_client, owner_token)
    supervisor = next(member for member in team if member["role"] == "supervisor")

    assert "phone" not in supervisor
    assert "email" not in supervisor
    assert supervisor["phone_masked"] != "+919812340011"
    assert supervisor["can_reveal_contact"] is True

    response = vault_client.get(
        f"/vault/team/{supervisor['user_id']}/contact",
        headers=auth_headers(owner_token),
    )
    assert response.status_code == 200, response.text
    assert response.json()["phone"] == "+919812340011"


def test_supervisor_and_technician_contact_access_follows_hierarchy(vault_client):
    owner_token = login(vault_client, *ACME_OWNER)
    seeded_team = _team(vault_client, owner_token)
    head = next(member for member in seeded_team if member["role"] == "maintenance_head")
    supervisor = next(member for member in seeded_team if member["role"] == "supervisor")

    engineer = _add_member(
        vault_client,
        owner_token,
        name="Hierarchy Engineer",
        phone="+919900000011",
        email="hierarchy.engineer@acmeforge.example",
        role="maintenance_engineer",
        manager_user_id=head["user_id"],
    )
    technician_a = _add_member(
        vault_client,
        owner_token,
        name="Supervisor Technician",
        phone="+919900000012",
        email="supervisor.tech@acmeforge.example",
        manager_user_id=supervisor["user_id"],
    )
    technician_b = _add_member(
        vault_client,
        owner_token,
        name="Engineer Technician",
        phone="+919900000013",
        email="engineer.tech@acmeforge.example",
        manager_user_id=engineer["user_id"],
    )

    supervisor_token = login(vault_client, *ACME_SUPERVISOR)
    allowed = vault_client.get(
        f"/vault/team/{technician_a['user_id']}/contact",
        headers=auth_headers(supervisor_token),
    )
    denied = vault_client.get(
        f"/vault/team/{technician_b['user_id']}/contact",
        headers=auth_headers(supervisor_token),
    )
    assert allowed.status_code == 200, allowed.text
    assert denied.status_code == 403, denied.text

    technician_token = login(
        vault_client,
        "supervisor.tech@acmeforge.example",
        "NewStaff@2026",
    )
    manager_contact = vault_client.get(
        f"/vault/team/{supervisor['user_id']}/contact",
        headers=auth_headers(technician_token),
    )
    peer_contact = vault_client.get(
        f"/vault/team/{technician_b['user_id']}/contact",
        headers=auth_headers(technician_token),
    )
    assert manager_contact.status_code == 200, manager_contact.text
    assert peer_contact.status_code == 403, peer_contact.text


def test_offline_staff_can_be_added_without_contact_details(vault_client):
    owner_token = login(vault_client, *ACME_OWNER)
    supervisor = next(
        member for member in _team(vault_client, owner_token)
        if member["role"] == "supervisor"
    )
    offline = _add_member(
        vault_client,
        owner_token,
        name="Offline Technician",
        phone="",
        email="",
        password="",
        manager_user_id=supervisor["user_id"],
        portal_access=False,
    )
    saved = next(
        member for member in _team(vault_client, owner_token)
        if member["user_id"] == offline["user_id"]
    )
    assert saved["phone_masked"] == "Mobile number not available"
    assert saved["email_masked"] == "Email not available"
    assert saved["portal_access"] is False
    assert saved["can_receive_alerts"] is False


def test_machine_assignments_use_staff_ids_and_never_list_raw_contacts(vault_client):
    owner_token = login(vault_client, *ACME_OWNER)
    supervisor = next(
        member for member in _team(vault_client, owner_token)
        if member["role"] == "supervisor"
    )
    technician = _add_member(
        vault_client,
        owner_token,
        name="Machine Technician",
        phone="+919900000021",
        email="machine.tech@acmeforge.example",
        manager_user_id=supervisor["user_id"],
    )
    response = vault_client.post(
        "/vault/machines",
        json={
            "machine_name": "Privacy Test Machine",
            "location": "Bay P",
            "assigned_technician_user_id": technician["user_id"],
            "supervisor_user_id": supervisor["user_id"],
        },
        headers=auth_headers(owner_token),
    )
    assert response.status_code == 201, response.text

    listed = vault_client.get(
        "/vault/machines", headers=auth_headers(owner_token)
    ).json()
    machine = next(item for item in listed if item["machine_name"] == "Privacy Test Machine")
    assert "assigned_technician_phone" not in machine
    assert "informed_phone_1" not in machine
    assert machine["assignments"]["technician"]["user_id"] == technician["user_id"]
    assert machine["assignments"]["technician"]["phone_masked"] != "+919900000021"


def test_legacy_machine_contacts_are_labeled_by_actual_staff_role(vault_client):
    owner_token = login(vault_client, *ACME_OWNER)
    machines = vault_client.get(
        "/vault/machines", headers=auth_headers(owner_token)
    ).json()
    machine = next(item for item in machines if item["machine_id"] == "TF-ACME3-M001")
    assert machine["assignments"]["supervisor"]["name"] == "Sunil Pawar"
    assert machine["assignments"]["maintenance_head"]["name"] == "Vikram Naik"
    assert machine["assignments"]["engineer"] is None


def test_maintenance_head_can_reveal_all_company_contacts(vault_client):
    head_token = login(vault_client, *ACME_MAINTENANCE_HEAD)
    team = _team(vault_client, head_token)
    assert all(member["can_reveal_contact"] for member in team)
