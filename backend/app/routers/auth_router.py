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
    return str(company.get("approved") or "").strip().lower() in {"yes", "true", "1"}


# ---------------------------------------------------------------------------
# Login
# ---------------------------------------------------------------------------

class LoginRequest(BaseModel):
    identifier: str  # phone or email
    password: str


@router.post("/login")
@limiter.limit("5/minute")
def login(request: Request, body: LoginRequest, users: UserRepository = Depends(get_users)):
    user = users.get_by_identifier(body.identifier)
    if user is None or not verify_password(body.password, user.get("password_hash", "")):
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
    password: str
    role: str = "supervisor"


@router.post("/supervisors", status_code=201)
def add_supervisor(
    body: AddSupervisorRequest,
    user: CurrentUser = Depends(get_current_user),
    users: UserRepository = Depends(get_users),
):
    """Owner creates a team user account under their own company."""
    user.assert_owner()

    if not body.phone and not body.email:
        raise HTTPException(status_code=400, detail="phone or email is required")
    if body.phone:
        import re
        if not re.match(r"^\+[1-9]\d{1,14}$", body.phone):
            raise HTTPException(
                status_code=400,
                detail="phone number must be in E.164 format (e.g., +919876543210)",
            )
    pw_err = validate_password_strength(body.password)
    if pw_err:
        raise HTTPException(status_code=400, detail=pw_err)

    if (body.phone and users.get_by_identifier(body.phone)) or (
        body.email and users.get_by_identifier(body.email)
    ):
        raise HTTPException(status_code=409, detail="an account with this phone or email already exists")

    user_id = users.next_user_id(user.company_code)
    users.add({
        "user_id": user_id,
        "company_code": user.company_code,
        "name": body.name,
        "phone": body.phone,
        "email": body.email,
        "role": body.role,
        "password_hash": hash_password(body.password),
        "created_at": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
    })

    log.info("auth.add_supervisor", user_id=user_id, company=user.company_code, added_by=user.user_id)
    return {
        "user_id": user_id,
        "name": body.name,
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

    users.update_password(user["user_id"], hash_password(body.new_password))
    log.info("auth.password_reset", user_id=user["user_id"])
    return {"message": "Your password has been reset. You can now sign in with it."}
