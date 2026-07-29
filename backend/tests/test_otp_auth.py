"""Tests for WhatsApp OTP Authentication flow."""

from unittest.mock import AsyncMock, patch
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_send_otp_invalid_phone():
    response = client.post("/auth/otp/send", json={"phone": "123"})
    assert response.status_code == 400
    assert "10-digit" in response.json()["detail"]


@patch("app.infrastructure.whatsapp.send_text_message", new_callable=AsyncMock)
def test_send_and_verify_otp_success(mock_send):
    # 1. Request OTP
    send_resp = client.post("/auth/otp/send", json={"phone": "9876543210"})
    assert send_resp.status_code == 200
    data = send_resp.json()
    assert data["status"] == "sent"
    otp_code = data.get("otp_debug")

    # 2. Verify with wrong OTP -> 400
    verify_bad = client.post("/auth/otp/verify", json={"phone": "9876543210", "otp": "000000"})
    assert verify_bad.status_code == 400

    # 3. Verify with correct OTP -> 200
    if otp_code:
        verify_ok = client.post("/auth/otp/verify", json={"phone": "9876543210", "otp": otp_code})
        assert verify_ok.status_code == 200
        assert verify_ok.json()["verified"] is True
