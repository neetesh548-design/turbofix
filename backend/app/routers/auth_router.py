"""Auth router — login, registration, supervisor management, and password reset."""

from datetime import datetime, timezone
from urllib.parse import quote

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request
from pydantic import BaseModel

from app import config, email_client
from app.infrastructure.rate_limit import limiter
from app.auth import (
    CurrentUser,
    Role,
    create_access_token,
    create_reset_token,
    decode_reset_token,
    get_current_user,
    hash_password,
    reset_token_matches,
    validate_password_strength,
    verify_password,
)
from app.dependencies import get_users
from app.infrastructure.logging import get_logger
from app.repositories.base import UserRepository

log = get_logger("turbofix.auth")
router = APIRouter(prefix="/auth")


def _company_approved(company: dict) -> bool:
    if not company:
        return True
    status = str(company.get("status") or "").strip().lower()
    approved = str(company.get("approved") or "").strip().lower()
    return status == "active" or approved in {"yes", "true", "1"} or company.get("approved") is True


# ---------------------------------------------------------------------------
# Login
# ---------------------------------------------------------------------------

class LoginRequest(BaseModel):
    identifier: str  # phone or email
    password: str


@router.post("/login")
@limiter.limit("5/minute")
def login(request: Request, body: LoginRequest, users: UserRepository = Depends(get_users)):
    user = users.verify_credentials(body.identifier, body.password)
    if user is None:
        raise HTTPException(status_code=401, detail="invalid credentials")

    company = users.get_company(user["company_code"])
    if company and not _company_approved(company):
        raise HTTPException(
            status_code=403,
            detail="Your company registration is pending TurboFix admin approval. Please contact support.",
        )

    token = create_access_token(
        user_id=user["user_id"],
        company_code=user["company_code"],
        role=user["role"],
        name=user.get("name", ""),
    )
    log.info("auth.login", user_id=user["user_id"], company=user["company_code"])
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "user_id": user["user_id"],
            "name": user["name"],
            "role": user["role"],
            "company_code": user["company_code"],
            "must_change_password": bool(user.get("must_change_password", False)),
        },
    }


# ---------------------------------------------------------------------------
# Self-service owner + company registration (pending admin approval)
# ---------------------------------------------------------------------------

class RegisterRequest(BaseModel):
    company_code: str
    company_name: str
    admin_contact_phone: str
    owner_name: str
    owner_email: str
    owner_password: str


@router.post("/register", status_code=201)
@limiter.limit("3/minute")
def register_company(request: Request, body: RegisterRequest, users: UserRepository = Depends(get_users)):
    """Self-service owner registration — creates company (unapproved) + owner account."""
    company_code = body.company_code.strip().upper()
    if len(company_code) < 2:
        raise HTTPException(status_code=400, detail="company code must be at least 2 characters")
    if not body.owner_email.strip():
        raise HTTPException(status_code=400, detail="owner email is required")
    pw_err = validate_password_strength(body.owner_password)
    if pw_err:
        raise HTTPException(status_code=400, detail=pw_err)

    if users.get_company(company_code) is not None:
        raise HTTPException(status_code=409, detail="company code already exists")

    if users.get_by_identifier(body.owner_email.strip()):
        raise HTTPException(status_code=409, detail="an account with this email already exists")
    if body.admin_contact_phone.strip() and users.get_by_identifier(body.admin_contact_phone.strip()):
        raise HTTPException(status_code=409, detail="an account with this phone already exists")

    users.add_company(
        company_code=company_code,
        company_name=body.company_name.strip(),
        admin_contact_phone=body.admin_contact_phone.strip(),
        machine_quota=5,
        approved=False,
    )

    user_id = users.next_user_id(company_code)
    users.add({
        "user_id": user_id,
        "company_code": company_code,
        "name": body.owner_name.strip(),
        "phone": body.admin_contact_phone.strip(),
        "email": body.owner_email.strip(),
        "role": Role.OWNER.value,
        "password_hash": hash_password(body.owner_password),
        "password": body.owner_password,
        "created_at": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
    })

    log.info("auth.register", company_code=company_code, owner_user=user_id)
    return {
        "status": "pending_approval",
        "message": "Your company has been registered. A TurboFix admin will review and approve your account.",
    }


# ---------------------------------------------------------------------------
# Owner-only: add supervisor to own company
# ---------------------------------------------------------------------------

class AddSupervisorRequest(BaseModel):
    name: str
    phone: str = ""
    email: str = ""
    password: str = ""
    role: str = "supervisor"
    manager_user_id: str = ""
    department: str = "Maintenance"
    plant_location: str = ""
    shift: str = ""
    portal_access: bool = True


@router.post("/supervisors", status_code=201)
def add_supervisor(
    body: AddSupervisorRequest,
    user: CurrentUser = Depends(get_current_user),
    users: UserRepository = Depends(get_users),
):
    """Owner creates a team user account under their own company."""
    user.assert_owner()

    name = body.name.strip()
    phone = body.phone.strip()
    email = body.email.strip().lower()
    if not name:
        raise HTTPException(status_code=400, detail="team member name is required")

    if body.role == "owner":
        raise HTTPException(status_code=400, detail="owner accounts cannot be created from the team workspace")

    if body.portal_access and not phone and not email:
        raise HTTPException(
            status_code=400,
            detail="phone or email is required when portal access is enabled",
        )
    if phone:
        import re
        if not re.match(r"^\+[1-9]\d{1,14}$", phone):
            raise HTTPException(
                status_code=400,
                detail="phone number must be in E.164 format (e.g., +919876543210)",
            )
    if body.portal_access:
        pw_err = validate_password_strength(body.password)
        if pw_err:
            raise HTTPException(status_code=400, detail=pw_err)

    if (phone and users.get_by_identifier(phone)) or (
        email and users.get_by_identifier(email)
    ):
        raise HTTPException(status_code=409, detail="an account with this phone or email already exists")

    company_users = [
        candidate
        for candidate in users.list_users()
        if candidate.get("company_code") == user.company_code
    ]
    allowed_manager_roles = (
        {"owner"}
        if body.role == "maintenance_head"
        else {"owner", "maintenance_head"}
        if body.role in {"maintenance_engineer", "supervisor"}
        else {"owner", "maintenance_head", "maintenance_engineer", "supervisor"}
    )
    manager_user_id = body.manager_user_id.strip()
    if not manager_user_id:
        manager_user_id = next(
            (
                str(candidate.get("user_id") or "")
                for candidate in company_users
                if candidate.get("role") in allowed_manager_roles
            ),
            "",
        )
    if manager_user_id:
        manager = users.get_by_id(manager_user_id)
        if manager is None or manager.get("company_code") != user.company_code:
            raise HTTPException(status_code=400, detail="reporting manager is not part of this company")
        if manager.get("role") not in allowed_manager_roles:
            raise HTTPException(status_code=400, detail="selected reporting manager does not match the team hierarchy")

    user_id = users.next_user_id(user.company_code)
    users.add({
        "user_id": user_id,
        "company_code": user.company_code,
        "name": name,
        "phone": phone,
        "email": email,
        "role": body.role,
        "password_hash": hash_password(body.password) if body.portal_access else "",
        "password": body.password if body.portal_access else "",
        "created_at": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
        "manager_user_id": manager_user_id,
        "department": body.department.strip(),
        "plant_location": body.plant_location.strip(),
        "shift": body.shift.strip(),
        "portal_access": "yes" if body.portal_access else "no",
    })

    log.info("auth.add_supervisor", user_id=user_id, company=user.company_code, added_by=user.user_id)
    return {
        "user_id": user_id,
        "name": name,
        "role": body.role,
        "company_code": user.company_code,
    }


# ---------------------------------------------------------------------------
# Password reset
# ---------------------------------------------------------------------------

class ForgotPasswordRequest(BaseModel):
    email: str


@router.post("/forgot-password")
@limiter.limit("3/hour")
def forgot_password(
    request: Request,
    body: ForgotPasswordRequest,
    background: BackgroundTasks,
    users: UserRepository = Depends(get_users),
):
    """Send a one-time reset link. Always returns the same generic response."""
    user = users.get_by_identifier(body.email)
    if user and user.get("email"):
        token = create_reset_token(user_id=user["user_id"], password_hash=user.get("password_hash", ""))
        link = f"{config.RESET_LINK_BASE}?token={quote(token)}"
        mins = config.PASSWORD_RESET_EXPIRE_MINUTES
        text = (
            f"Hi {user.get('name') or 'there'},\n\n"
            f"Someone asked to reset the password for your TurboFix account.\n"
            f"If it was you, open this link within {mins} minutes to choose a new password:\n\n"
            f"{link}\n\n"
            f"If it wasn't you, ignore this email - your password stays unchanged.\n"
        )
        background.add_task(email_client.send_email, user["email"], "Reset your TurboFix password", text)
    return {"message": "If an account with that email exists, a reset link has been sent."}


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str


@router.post("/reset-password")
@limiter.limit("5/minute")
def reset_password(request: Request, body: ResetPasswordRequest, users: UserRepository = Depends(get_users)):
    pw_err = validate_password_strength(body.new_password)
    if pw_err:
        raise HTTPException(status_code=400, detail=pw_err)

    payload = decode_reset_token(body.token)
    if payload is None:
        raise HTTPException(status_code=400, detail="this reset link is invalid or has expired")

    user = users.get_by_id(payload["sub"])
    if user is None or not reset_token_matches(payload, user.get("password_hash", "")):
        raise HTTPException(status_code=400, detail="this reset link is invalid or has expired")

    users.update_password(user["user_id"], hash_password(body.new_password), body.new_password)
    log.info("auth.password_reset", user_id=user["user_id"])
    return {"message": "Your password has been reset. You can now sign in with it."}


# ---------------------------------------------------------------------------
# WhatsApp & Fast2SMS Dual OTP Authentication & Email-Free Password Reset
# ---------------------------------------------------------------------------

import random
import secrets

_OTP_STORE = {}
_OTP_RESEND_SECONDS = 30
_OTP_MAX_ATTEMPTS = 5


class SendOTPRequest(BaseModel):
    phone: str


class VerifyOTPRequest(BaseModel):
    phone: str
    otp: str


class OTPForgotPasswordRequest(BaseModel):
    phone: str


class OTPResetPasswordRequest(BaseModel):
    phone: str
    otp: str
    new_password: str


def _extract_10_digit_phone(phone_raw: str) -> str:
    phone = phone_raw.strip()
    if phone.startswith("+91"):
        phone = phone[3:]
    elif phone.startswith("+"):
        phone = phone[1:]
    digits = "".join(c for c in phone if c.isdigit())
    if len(digits) != 10:
        raise HTTPException(status_code=400, detail="Please enter a valid 10-digit mobile number.")
    return digits



def _find_user_by_phone(users: UserRepository, phone_clean: str):
    return (
        users.get_by_identifier(phone_clean)
        or users.get_by_identifier(f"+91{phone_clean}")
        or next((u for u in users.list_users() if "".join(c for c in u.get("phone", "") if c.isdigit()).endswith(phone_clean)), None)
    )


@router.post("/otp/send")
@limiter.limit("5/minute")
async def send_otp(request: Request, body: SendOTPRequest):
    """Generate 6-digit OTP code and send via both WhatsApp & Fast2SMS channels (same OTP)."""
    phone_clean = _extract_10_digit_phone(body.phone)

    now_ts = datetime.now(timezone.utc).timestamp()
    existing = _OTP_STORE.get(phone_clean)
    if existing and now_ts < existing.get("resend_at", 0):
        retry_after = max(1, int(existing["resend_at"] - now_ts))
        raise HTTPException(
            status_code=429,
            detail=f"Please wait {retry_after} seconds before requesting another OTP.",
            headers={"Retry-After": str(retry_after)},
        )

    phone_formatted = f"+91{phone_clean}"

    otp_code = f"{random.randint(100000, 999999)}"
    _OTP_STORE[phone_clean] = {
        "otp": otp_code,
        "expires_at": now_ts + 300,
        "resend_at": now_ts + _OTP_RESEND_SECONDS,
        "attempts": 0,
    }

    message = (
        f"🔐 *TURBOFIX VERIFICATION CODE*\n\n"
        f"Your 6-digit OTP is: *{otp_code}*\n\n"
        f"Valid for 5 minutes. Do not share this code with anyone."
    )

    # 1. Dispatch via WhatsApp
    try:
        from app.infrastructure import whatsapp
        await whatsapp.send_text_message(phone_formatted, message)
        log.info("auth.otp_sent_whatsapp", phone=phone_clean)
    except Exception as exc:
        log.warning("auth.whatsapp_otp_send_failed", phone=phone_clean, error=str(exc))

    # 2. Dispatch via Fast2SMS SMS (exact same OTP code)
    try:
        from app.infrastructure import fast2sms
        await fast2sms.send_sms_message(phone_clean, message, otp_code=otp_code)
        log.info("auth.otp_sent_fast2sms", phone=phone_clean)
    except Exception as exc:
        log.warning("auth.fast2sms_otp_send_failed", phone=phone_clean, error=str(exc))

    has_wa = bool(getattr(config, "WHATSAPP_ACCESS_TOKEN", "") or getattr(config, "WHATSAPP_BRIDGE_URL", ""))
    has_sms = bool(getattr(config, "FAST2SMS_API_KEY", ""))
    return {
        "status": "sent",
        "message": f"OTP sent to {phone_formatted} via WhatsApp & SMS.",
        "otp_debug": otp_code if getattr(config, "TESTING", False) or (not has_wa and not has_sms) else None,
    }


@router.post("/otp/verify")
@limiter.limit("10/minute")
def verify_otp(request: Request, body: VerifyOTPRequest):
    """Verify 6-digit WhatsApp/SMS OTP code."""
    phone_clean = _extract_10_digit_phone(body.phone)
    otp_input = body.otp.strip()

    if getattr(config, "TESTING", False) and otp_input == "123456":
        return {"verified": True, "phone": phone_clean}

    record = _OTP_STORE.get(phone_clean)
    now_ts = datetime.now(timezone.utc).timestamp()

    if not record:
        raise HTTPException(status_code=400, detail="No active OTP found. Please request a new OTP code.")

    if now_ts > record["expires_at"]:
        _OTP_STORE.pop(phone_clean, None)
        raise HTTPException(status_code=400, detail="OTP code has expired. Please request a new code.")

    if not secrets.compare_digest(record["otp"], otp_input):
        record["attempts"] += 1
        if record["attempts"] >= _OTP_MAX_ATTEMPTS:
            _OTP_STORE.pop(phone_clean, None)
            raise HTTPException(status_code=400, detail="Too many incorrect OTP attempts. Please request a new code.")
        raise HTTPException(status_code=400, detail="Incorrect OTP code. Please check your WhatsApp/SMS and try again.")

    record["verified"] = True
    record["verified_at"] = now_ts
    log.info("auth.otp_verified", phone=phone_clean)
    return {"verified": True, "phone": phone_clean}


@router.post("/otp/forgot-password")
@limiter.limit("5/minute")
async def otp_forgot_password(
    request: Request,
    body: OTPForgotPasswordRequest,
    users: UserRepository = Depends(get_users),
):
    """Send password reset OTP via WhatsApp & Fast2SMS (email not required)."""
    phone_clean = _extract_10_digit_phone(body.phone)
    user = _find_user_by_phone(users, phone_clean)

    if not user:
        return {
            "status": "sent",
            "message": "If an account with that phone number exists, an OTP code has been sent via WhatsApp & SMS.",
        }

    now_ts = datetime.now(timezone.utc).timestamp()
    existing = _OTP_STORE.get(phone_clean)
    if existing and now_ts < existing.get("resend_at", 0):
        retry_after = max(1, int(existing["resend_at"] - now_ts))
        raise HTTPException(
            status_code=429,
            detail=f"Please wait {retry_after} seconds before requesting another OTP.",
            headers={"Retry-After": str(retry_after)},
        )

    otp_code = f"{random.randint(100000, 999999)}"
    _OTP_STORE[phone_clean] = {
        "otp": otp_code,
        "expires_at": now_ts + 300,
        "resend_at": now_ts + _OTP_RESEND_SECONDS,
        "attempts": 0,
        "user_id": user["user_id"],
    }

    message = (
        f"🔐 *TURBOFIX PASSWORD RESET*\n\n"
        f"Your 6-digit password reset OTP code is: *{otp_code}*\n\n"
        f"Valid for 5 minutes. Do not share this code with anyone."
    )

    phone_formatted = f"+91{phone_clean}"
    try:
        from app.infrastructure import whatsapp
        await whatsapp.send_text_message(phone_formatted, message)
    except Exception as exc:
        log.warning("auth.password_reset_wa_failed", phone=phone_clean, error=str(exc))

    try:
        from app.infrastructure import fast2sms
        await fast2sms.send_sms_message(phone_clean, message, otp_code=otp_code)
    except Exception as exc:
        log.warning("auth.password_reset_sms_failed", phone=phone_clean, error=str(exc))

    has_wa = bool(getattr(config, "WHATSAPP_ACCESS_TOKEN", "") or getattr(config, "WHATSAPP_BRIDGE_URL", ""))
    has_sms = bool(getattr(config, "FAST2SMS_API_KEY", ""))
    return {
        "status": "sent",
        "message": "If an account with that phone number exists, an OTP code has been sent via WhatsApp & SMS.",
        "otp_debug": otp_code if getattr(config, "TESTING", False) or (not has_wa and not has_sms) else None,
    }


@router.post("/otp/reset-password")
@limiter.limit("5/minute")
def otp_reset_password(
    request: Request,
    body: OTPResetPasswordRequest,
    users: UserRepository = Depends(get_users),
):
    """Reset user password using 6-digit mobile OTP (no email required)."""
    pw_err = validate_password_strength(body.new_password)
    if pw_err:
        raise HTTPException(status_code=400, detail=pw_err)

    phone_clean = _extract_10_digit_phone(body.phone)
    otp_input = body.otp.strip()

    is_test_override = getattr(config, "TESTING", False) and otp_input == "123456"

    record = _OTP_STORE.get(phone_clean)
    now_ts = datetime.now(timezone.utc).timestamp()

    if not is_test_override:
        if not record:
            raise HTTPException(status_code=400, detail="No active password reset OTP found. Please request a new OTP code.")

        if now_ts > record["expires_at"]:
            _OTP_STORE.pop(phone_clean, None)
            raise HTTPException(status_code=400, detail="OTP code has expired. Please request a new code.")

        if not record.get("verified") and not secrets.compare_digest(record["otp"], otp_input):
            record["attempts"] += 1
            if record["attempts"] >= _OTP_MAX_ATTEMPTS:
                _OTP_STORE.pop(phone_clean, None)
                raise HTTPException(status_code=400, detail="Too many incorrect OTP attempts. Please request a new code.")
            raise HTTPException(status_code=400, detail="Incorrect OTP code. Please check your WhatsApp/SMS and try again.")

    user_id = record.get("user_id") if record else None
    user = users.get_by_id(user_id) if user_id else _find_user_by_phone(users, phone_clean)

    if not user:
        raise HTTPException(status_code=404, detail="User account not found for this mobile number.")

    users.update_password(user["user_id"], hash_password(body.new_password), body.new_password)
    _OTP_STORE.pop(phone_clean, None)
    log.info("auth.otp_password_reset_success", user_id=user["user_id"], phone=phone_clean)
    return {"message": "Your password has been reset successfully. You can now sign in with your new password."}

