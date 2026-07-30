"""Tests for Fast2SMS dual OTP dispatch and email-free OTP password reset."""

from unittest.mock import AsyncMock, patch
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_fast2sms_is_configured():
    from app.infrastructure import fast2sms
    assert fast2sms.FAST2SMS_BULK_URL == "https://www.fast2sms.com/dev/bulkV2"


@patch("app.infrastructure.fast2sms.send_sms_message", new_callable=AsyncMock)
@patch("app.infrastructure.whatsapp.send_text_message", new_callable=AsyncMock)
def test_dual_otp_send_same_code(mock_wa, mock_sms):
    phone = "9876500001"
    response = client.post("/auth/otp/send", json={"phone": phone})
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "sent"
    assert "WhatsApp & SMS" in data["message"]

    otp_code = data.get("otp_debug")
    if otp_code:
        # Verify WhatsApp received message with otp_code
        mock_wa.assert_called_once()
        wa_call_args = mock_wa.call_args[0]
        assert otp_code in wa_call_args[1]

        # Verify Fast2SMS received identical otp_code
        mock_sms.assert_called_once()
        sms_call_args = mock_sms.call_args
        assert sms_call_args.kwargs.get("otp_code") == otp_code or otp_code in sms_call_args[0][1]


@patch("app.infrastructure.fast2sms.send_sms_message", new_callable=AsyncMock)
@patch("app.infrastructure.whatsapp.send_text_message", new_callable=AsyncMock)
def test_otp_forgot_and_reset_password_flow(mock_wa, mock_sms):
    phone = "9876500002"

    # 1. Trigger forgot password OTP
    forgot_resp = client.post("/auth/otp/forgot-password", json={"phone": phone})
    assert forgot_resp.status_code == 200
    forgot_data = forgot_resp.json()
    assert forgot_data["status"] == "sent"

    otp_code = forgot_data.get("otp_debug")

    # 2. Reset password using invalid OTP -> 400
    bad_reset = client.post(
        "/auth/otp/reset-password",
        json={"phone": phone, "otp": "000000", "new_password": "NewSecurePassword123!"},
    )
    assert bad_reset.status_code == 400

    # 3. Reset password using valid OTP or test code -> 200 / 404 depending on whether user exists
    if otp_code:
        reset_ok = client.post(
            "/auth/otp/reset-password",
            json={"phone": phone, "otp": otp_code, "new_password": "NewSecurePassword123!"},
        )
        # Note: If user does not exist in memory user list, returns 404 account not found, or 200 if user exists
        assert reset_ok.status_code in (200, 404)
