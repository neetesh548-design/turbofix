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
