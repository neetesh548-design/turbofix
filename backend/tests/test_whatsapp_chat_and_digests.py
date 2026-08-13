"""Unit & integration tests for Role-based WhatsApp Assistant & Digest Engine."""

import anyio
from unittest.mock import MagicMock, patch

from app.services import whatsapp_chat_service, digest_service


def test_normalize_phone():
  assert whatsapp_chat_service.normalize_phone("+919876543210") == "9876543210"
  assert whatsapp_chat_service.normalize_phone("919876543210") == "9876543210"
  assert whatsapp_chat_service.normalize_phone("09876543210") == "9876543210"
  assert whatsapp_chat_service.normalize_phone("9876543210") == "9876543210"


def test_unregistered_whatsapp_number_access_denied():
  async def run():
    with patch("app.services.whatsapp_chat_service.resolve_registered_user", return_value=None):
      reply = await whatsapp_chat_service.handle_registered_whatsapp_message("+910000000000", "Hello status")
      assert "403 ACCESS DENIED" in reply
      assert "Team Settings" in reply

  anyio.run(run)


def test_registered_owner_whatsapp_query():
  async def run():
    mock_owner = {
      "id": "USR-101",
      "name": "Nitesh Owner",
      "role": "owner",
      "company_id": "CMP-1",
      "company_code": "TFDEMO",
      "phone": "9876543210"
    }
    with patch("app.services.whatsapp_chat_service.resolve_registered_user", return_value=mock_owner):
      reply = await whatsapp_chat_service.handle_registered_whatsapp_message("9876543210", "aaj kitna loss hua?")
      assert ("Financial Overview" in reply or "TurboFix" in reply or "Downtime Cost" in reply)

  anyio.run(run)


def test_build_role_context_calls_real_repository_methods():
  """Regression test: _fetch_company_snapshot used to call get_open_by_company()/
  list(), neither of which exists on TicketRepository/MachineRepository — every
  call silently raised AttributeError with no logging and left every count at 0.
  Verify it now calls the real get_company_tickets/get_company_machines methods."""
  user = {"name": "Test Owner", "role": "owner", "company_code": "ACME"}

  mock_tickets_repo = MagicMock()
  mock_tickets_repo.get_company_tickets.return_value = [
    {"status": "open", "urgency": "high", "machine_name": "CNC-04"},
    {"status": "closed", "urgency": "low"},
  ]
  mock_machines_repo = MagicMock()
  mock_machines_repo.get_company_machines.return_value = [{"id": "M1"}, {"id": "M2"}]

  with patch("app.dependencies.get_tickets", return_value=mock_tickets_repo), \
       patch("app.dependencies.get_machines", return_value=mock_machines_repo):
    snapshot = whatsapp_chat_service._fetch_company_snapshot(user)

  mock_tickets_repo.get_company_tickets.assert_called_once_with("ACME")
  mock_machines_repo.get_company_machines.assert_called_once_with("ACME")
  assert snapshot["fetch_ok"] is True
  assert snapshot["total_machines"] == 2
  assert snapshot["active_breakdowns"] == 1  # only the "open" ticket, not "closed"
  assert snapshot["urgent_count"] == 1
  assert snapshot["top_urgent_ticket"]["machine_name"] == "CNC-04"


def test_fallback_response_uses_real_snapshot_not_fabricated_numbers():
  """Regression test: _fallback_role_response used to always return hardcoded
  fake figures (₹12,500, 95.8%, named technicians that don't exist for this
  company) regardless of the real snapshot. Verify it now reflects the real
  counts and never emits the old fabricated literals."""
  user = {"name": "Test Owner", "role": "owner"}
  snapshot = {
    "fetch_ok": True,
    "company_code": "ACME",
    "open_tickets": [],
    "machines": [],
    "total_machines": 7,
    "active_breakdowns": 3,
    "urgent_count": 1,
    "top_urgent_ticket": {"machine_name": "Press-02"},
  }

  reply = whatsapp_chat_service._fallback_role_response(user, "what's our downtime cost today", snapshot)

  assert "7 machines" in reply
  assert "3" in reply  # active breakdowns
  assert "₹12,500" not in reply
  assert "95.8%" not in reply

  status_reply = whatsapp_chat_service._fallback_role_response(user, "breakdown status", snapshot)
  assert "Press-02" in status_reply
  assert "CNC Milling Machine #4" not in status_reply
  assert "Ramesh K." not in status_reply


def test_fallback_response_reports_unavailable_when_fetch_failed():
  """When the live snapshot fetch itself failed, the fallback must say so
  rather than silently showing zeros or fabricated numbers as if they were real."""
  user = {"name": "Test Owner", "role": "owner"}
  snapshot = {"fetch_ok": False, "company_code": "ACME"}

  reply = whatsapp_chat_service._fallback_role_response(user, "status", snapshot)

  assert "unavailable" in reply.lower() or "couldn't reach" in reply.lower()


def test_generate_daily_digest_payload():
  payload = digest_service.generate_daily_digest_payload("TFDEMO")
  assert "company_code" in payload
  assert payload["company_code"] == "TFDEMO"
  assert "est_downtime_cost" in payload
  
  msg = digest_service.format_daily_digest_message(payload)
  assert "Daily Maintenance Briefing" in msg
  assert "TFDEMO" in msg


def test_generate_weekly_digest_payload():
  payload = digest_service.generate_weekly_digest_payload("TFDEMO")
  assert "fleet_availability" in payload
  assert "cost_saved" in payload
  
  msg = digest_service.format_weekly_digest_message(payload)
  assert "Weekly Executive Report" in msg
  assert "Fleet Availability Rate" in msg


def test_dispatch_daily_digest_with_mocked_executives():
  async def run():
    with patch("app.services.digest_service.get_company_executive_phones", return_value=["9876543210"]), \
         patch("app.services.digest_service.send_message") as mock_send:
      sent_count = await digest_service.dispatch_daily_digest("TFDEMO")
      assert sent_count == 1
      mock_send.assert_called_once()

  anyio.run(run)
