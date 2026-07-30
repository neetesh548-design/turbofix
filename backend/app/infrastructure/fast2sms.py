"""Fast2SMS SMS Client — https://docs.fast2sms.com/reference/authorization"""

from app import config
from app.infrastructure.http_client import resilient_post
from app.infrastructure.logging import get_logger

log = get_logger("turbofix.fast2sms")
FAST2SMS_BULK_URL = "https://www.fast2sms.com/dev/bulkV2"


def is_configured() -> bool:
    return bool(getattr(config, "FAST2SMS_API_KEY", "").strip())


async def send_sms_message(phone: str, message: str, otp_code: str = "") -> dict:
    phone_clean = "".join(c for c in phone if c.isdigit())[-10:]
    api_key = getattr(config, "FAST2SMS_API_KEY", "").strip()
    if not api_key:
        log.info("fast2sms.not_configured", phone=phone_clean, otp=otp_code)
        return {"status": "simulated", "detail": "FAST2SMS_API_KEY not configured"}

    route = getattr(config, "FAST2SMS_ROUTE", "otp").strip().lower()
    payload = (
        {"route": "otp", "variables_values": otp_code, "numbers": phone_clean}
        if route == "otp" and otp_code
        else {"route": "q", "message": message, "language": "english", "flash": 0, "numbers": phone_clean}
    )

    try:
        resp = await resilient_post(
            FAST2SMS_BULK_URL,
            json=payload,
            headers={"authorization": api_key, "Content-Type": "application/json"},
        )
        res_data = resp.json()
        log.info("fast2sms.sent", phone=phone_clean, route=route, result=res_data)
        return {"status": "sent", "response": res_data}
    except Exception as exc:
        log.error("fast2sms.error", phone=phone_clean, error=str(exc))
        raise

