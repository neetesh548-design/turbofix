from app.routers import dashboard_router
from app.services import ai_service
from tests.conftest import ACME_OWNER, auth_headers, login


def test_plant_wide_assistant_has_live_data_fallback(vault_client, monkeypatch):
    token = login(vault_client, *ACME_OWNER)
    monkeypatch.setattr(ai_service, "ai_enabled", lambda: False)

    response = vault_client.post(
        "/vault/assistant",
        json={"question": "Which machines need attention today?", "machine_id": None},
        headers=auth_headers(token),
    )

    assert response.status_code == 200
    result = response.json()
    assert result["scope"] == "all"
    assert result["machine_id"] is None
    assert result["source"] == "live_data"
    assert result["answer"]


def test_machine_assistant_uses_exact_question_and_machine_data(vault_client, monkeypatch):
    token = login(vault_client, *ACME_OWNER)
    captured = {}

    async def fake_assistant(question, scope_label, context):
        captured.update(question=question, scope_label=scope_label, context=context)
        return "Inspect the spindle lubrication first."

    monkeypatch.setattr(ai_service, "ai_enabled", lambda: True)
    monkeypatch.setattr(ai_service, "maintenance_assistant", fake_assistant)
    monkeypatch.setattr(dashboard_router, "read_machine_data", lambda machine: "# CNC LATHE CANONICAL DATA")

    response = vault_client.post(
        "/vault/assistant",
        json={
            "question": "Why is the spindle overheating?",
            "machine_id": "tf-acme3-m001",
        },
        headers=auth_headers(token),
    )

    assert response.status_code == 200
    result = response.json()
    assert result == {
        "answer": "Inspect the spindle lubrication first.",
        "scope": "machine",
        "machine_id": "TF-ACME3-M001",
        "source": "ai",
    }
    assert captured["question"] == "Why is the spindle overheating?"
    assert "CNC Lathe 1" in captured["scope_label"]
    assert "# CNC LATHE CANONICAL DATA" in captured["context"]


def test_plant_wide_ai_context_contains_every_company_machine(vault_client, monkeypatch):
    token = login(vault_client, *ACME_OWNER)
    captured = {}

    async def fake_assistant(question, scope_label, context):
        captured.update(scope_label=scope_label, context=context)
        return "Plant-wide answer"

    monkeypatch.setattr(ai_service, "ai_enabled", lambda: True)
    monkeypatch.setattr(ai_service, "maintenance_assistant", fake_assistant)
    monkeypatch.setattr(dashboard_router, "read_machine_data", lambda machine: "")

    response = vault_client.post(
        "/vault/assistant",
        json={"question": "What should we service this weekend?"},
        headers=auth_headers(token),
    )

    assert response.status_code == 200
    assert response.json()["source"] == "ai"
    assert captured["scope_label"] == "all machines in plant ACME3"
    assert "TF-ACME3-M001" in captured["context"]
    assert "TF-ACME3-M002" in captured["context"]
    assert "TF-BETA1" not in captured["context"]


def test_assistant_rejects_machine_from_another_company(vault_client):
    token = login(vault_client, *ACME_OWNER)

    response = vault_client.post(
        "/vault/assistant",
        json={"question": "What is wrong?", "machine_id": "TF-BETA1-M001"},
        headers=auth_headers(token),
    )

    assert response.status_code == 404
