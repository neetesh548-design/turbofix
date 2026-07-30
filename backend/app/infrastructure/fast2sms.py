"""Fast2SMS SMS Client — https://docs.fast2sms.com/reference/authorization

Sends SMS messages using Fast2SMS authorization API key.
"""

from app import config
from app.infrastructure.http_client import resilient_post
from app.infrastructure.logging import get_logger

log = get_logger("turbofix.fast2sms")

FAST2SMS_BULK_URL = "https://www.fast2sms.com/dev/bulkV2"


def is_configured() -> bool:
    """Return True if FAST2SMS_API_KEY is present in config."""
    return bool(getattr(config, "FAST2SMS_API_KEY", "").strip())


async def send_sms_message(phone: str, message: str, otp_code: str = "") -> dict:
    """Send SMS via Fast2SMS API using authorization header.

    Fast2SMS Auth spec:
    Header: authorization: <FAST2SMS_API_KEY>

    Payload options:
    - Route 'otp': {"route": "otp", "variables_values": otp_code, "numbers": phone_10digit}
    - Route 'q' (Quick SMS): {"route": "q", "message": message, "language": "english", "flash": 0, "numbers": phone_10digit}
    """
    phone_clean = "".join(c for c in phone if c.isdigit())
    if len(phone_clean) > 10 and phone_clean.startswith("91"):
        phone_clean = phone_clean[2:]
    if len(phone_clean) != 10:
        log.warning("fast2sms.invalid_phone", phone=phone)
        return {"status": "failed", "detail": "Invalid phone number"}

    api_key = getattr(config, "FAST2SMS_API_KEY", "").strip()
    if not api_key:
        log.info("fast2sms.not_configured", phone=phone_clean, otp=otp_code)
        return {"status": "simulated", "detail": "FAST2SMS_API_KEY not configured"}

    headers = {
        "authorization": api_key,
        "Content-Type": "application/json",
    }

    route = getattr(config, "FAST2SMS_ROUTE", "otp").strip().lower()

    if route == "otp" and otp_code:
        payload = {
            "route": "otp",
            "variables_values": otp_code,
            "numbers": phone_clean,
        }
    else:
        payload = {
            "route": "q",
            "message": message,
            "language": "english",
            "flash": 0,
            "numbers": phone_clean,
        }

    try:
        resp = await resilient_post(FAST2SMS_BULK_URL, json=payload, headers=headers)
        res_data = resp.json()
        log.info("fast2sms.sent", phone=phone_clean, route=route, result=res_data)
        return {"status": "sent", "response": res_data}
    except Exception as exc:
        log.error("fast2sms.error", phone=phone_clean, error=str(exc))
        raise
