"""Worst-Case & Robustness Verification Test Suite for TurboFix Backend."""

import pytest
from unittest.mock import patch, AsyncMock
from fastapi.testclient import TestClient
from app.main import app
from app import config

client = TestClient(app)


def test_register_malicious_sql_and_xss_inputs():
    """Verify backend handles SQL injection and XSS payloads cleanly during registration."""
    payload = {
        "company_code": "' OR '1'='1",
        "company_name": "<script>alert('XSS')</script> Heavy Industries",
        "admin_contact_phone": "9999999999",
        "owner_name": "Attacker'--; DROP TABLE users;",
        "owner_email": "attacker+sql@example.com",
        "owner_password": "SecurePassword123!",
    }
    response = client.post("/auth/register", json=payload)
    # Should either register safely as encoded strings or fail with validation error, but NEVER crash 500
    assert response.status_code in (201, 400, 409)
    assert response.status_code != 500


def test_register_extreme_large_payload_stress():
    """Verify backend handles 50,000 character string payload without buffer overflow / server crash."""
    large_string = "A" * 50000
    payload = {
        "company_code": "STRESS1",
        "company_name": large_string,
        "admin_contact_phone": "9876543210",
        "owner_name": "Stress Test Owner",
        "owner_email": "stress_large@example.com",
        "owner_password": "SecurePassword123!",
    }
    response = client.post("/auth/register", json=payload)
    assert response.status_code in (201, 400, 409, 413)
    assert response.status_code != 500


def test_otp_send_malformed_phone_numbers():
    """Verify phone extractor and OTP sender handle malformed, empty, or international phone inputs cleanly."""
    malformed_phones = [
        "",
        "   ",
        "not-a-phone",
        "123",
        "0000000000",
        "+1-800-123-4567",
        "' OR '1'='1",
    ]
    for phone in malformed_phones:
        response = client.post("/auth/otp/send", json={"phone": phone})
        assert response.status_code in (200, 400, 422)
        assert response.status_code != 500


def test_otp_verify_brute_force_string_fuzzing():
    """Verify OTP verification endpoint handles non-numeric and SQL injection OTP strings without crashing."""
    fuzz_otps = [
        "abc123",
        "<script>alert(1)</script>",
        "' OR '1'='1",
        "123456789000",
        " ",
        "NONE",
    ]
    for bad_otp in fuzz_otps:
        response = client.post("/auth/otp/verify", json={"phone": "9876543210", "otp": bad_otp})
        assert response.status_code in (400, 422)
        assert response.status_code != 500


@pytest.mark.anyio
@patch("app.infrastructure.fast2sms.send_sms_message", new_callable=AsyncMock)
@patch("app.infrastructure.whatsapp.send_text_message", new_callable=AsyncMock)
async def test_fast2sms_and_whatsapp_simultaneous_network_outage(mock_wa, mock_sms):
    """Verify that when BOTH Fast2SMS and WhatsApp gateways fail/raise exceptions, API catches exceptions gracefully."""
    mock_wa.side_effect = Exception("WhatsApp Gateway Down (Connection Refused)")
    mock_sms.side_effect = Exception("Fast2SMS API Down (HTTP 500)")

    # Send OTP request
    response = client.post("/auth/otp/send", json={"phone": "9876543210"})
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "sent"


def test_unauthenticated_admin_endpoint_lockdown():
    """Verify unauthorized users cannot access admin management routes."""
    admin_routes = [
        ("GET", "/admin/companies"),
        ("POST", "/admin/companies/NKS"),
        ("GET", "/admin/companies/NKS/users"),
    ]
    for method, route in admin_routes:
        if method == "GET":
            response = client.get(route)
        else:
            response = client.post(route, json={"machine_quota": 100})
        
        assert response.status_code in (401, 403)
