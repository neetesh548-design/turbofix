"""Phase 5 - Document Vault authentication.

A small, real (not stubbed) JWT auth layer so the webhook backend can also serve a
handful of authenticated endpoints for owner/supervisor/maintenance_head users to
manage machine documents, spare parts (BOM), and consumables. WhatsApp users (the
worker reporting a fault) never authenticate - this is only for the small group of
staff who need to log in and manage documentation.
"""

import hashlib
import httpx
import re
import time
from enum import Enum
from typing import Optional

import bcrypt
import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app import config


_COMMON_PASSWORDS = frozenset({
    "password", "12345678", "123456789", "1234567890", "qwerty123",
    "password1", "iloveyou", "abcdefgh", "abc12345", "admin123",
    "letmein12", "welcome1", "turbofix", "changeme",
})


def validate_password_strength(password: str) -> str | None:
    """Return an error message if the password is too weak, else None."""
    if len(password) < 8:
        return "password must be at least 8 characters"
    if password.lower() in _COMMON_PASSWORDS:
        return "this password is too common — choose a stronger one"
    if not re.search(r"[A-Z]", password):
        return "password must contain at least one uppercase letter"
    if not re.search(r"\d", password):
        return "password must contain at least one digit"
    return None


class Role(str, Enum):
    OWNER = "owner"
    SUPERVISOR = "supervisor"
    MAINTENANCE_HEAD = "maintenance_head"
    MAINTENANCE_ENGINEER = "maintenance_engineer"
    MAINTENANCE_TECHNICIAN = "maintenance_technician"


# Roles allowed to create/modify/delete documents, spare parts, and consumables.
# Supervisors can view everything but not change it - matches how they're described
# elsewhere in the product as "informed users" rather than machine owners.
WRITE_ROLES = {Role.OWNER, Role.MAINTENANCE_HEAD}
CLOSE_TICKET_ROLES = {Role.OWNER, Role.SUPERVISOR, Role.MAINTENANCE_HEAD}


def hash_password(plain_password: str) -> str:
    return bcrypt.hashpw(plain_password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain_password: str, password_hash: str) -> bool:
    if not password_hash:
        return False
    try:
        return bcrypt.checkpw(plain_password.encode("utf-8"), password_hash.encode("utf-8"))
    except ValueError:
        # malformed hash (e.g. blank/placeholder row in the tracker) - never a match
        return False


def create_access_token(*, user_id: str, company_code: str, role: str, name: str = "") -> str:
    now = int(time.time())
    payload = {
        "sub": user_id,
        "company_code": company_code,
        "role": role,
        "name": name,
        "iat": now,
        "exp": now + config.JWT_EXPIRE_MINUTES * 60,
    }
    return jwt.encode(payload, config.JWT_SECRET_KEY, algorithm=config.JWT_ALGORITHM)


def decode_access_token(token: str) -> Optional[dict]:
    try:
        return jwt.decode(token, config.JWT_SECRET_KEY, algorithms=[config.JWT_ALGORITHM])
    except jwt.PyJWTError:
        return None


# --- Password reset -------------------------------------------------------
# The reset link carries a short-lived JWT instead of a random token stored in a
# table. It's bound to a fingerprint of the user's *current* password hash, which
# makes it self-invalidating with no server-side state: the moment the password
# changes, the fingerprint no longer matches, so the used link (and any other
# outstanding reset link for that user) stops working. "purpose" keeps a reset token
# from ever being accepted as an access token, and vice versa.
_RESET_PURPOSE = "pwreset"


def _password_fingerprint(password_hash: str) -> str:
    return hashlib.sha256((password_hash or "").encode("utf-8")).hexdigest()[:16]


def create_reset_token(*, user_id: str, password_hash: str) -> str:
    now = int(time.time())
    payload = {
        "sub": user_id,
        "purpose": _RESET_PURPOSE,
        "pwh": _password_fingerprint(password_hash),
        "iat": now,
        "exp": now + config.PASSWORD_RESET_EXPIRE_MINUTES * 60,
    }
    return jwt.encode(payload, config.JWT_SECRET_KEY, algorithm=config.JWT_ALGORITHM)


def decode_reset_token(token: str) -> Optional[dict]:
    """Returns the payload only if the token is a valid, unexpired reset token.
    Callers must still check `pwh` against the user's current password hash via
    reset_token_matches() - that's what enforces single use."""
    try:
        payload = jwt.decode(token, config.JWT_SECRET_KEY, algorithms=[config.JWT_ALGORITHM])
    except jwt.PyJWTError:
        return None
    if payload.get("purpose") != _RESET_PURPOSE:
        return None
    return payload


def reset_token_matches(payload: dict, current_password_hash: str) -> bool:
    return payload.get("pwh") == _password_fingerprint(current_password_hash)


_bearer_scheme = HTTPBearer(auto_error=False)


class CurrentUser:
    """The authenticated caller's identity, parsed straight from the JWT - no extra
    lookup against the Users tab needed for every request."""

    def __init__(self, user_id: str, company_code: str, role: str, name: str = ""):
        self.user_id = user_id
        self.company_code = company_code
        self.role = role
        self.name = name

    def can_write(self) -> bool:
        return self.role in {r.value for r in WRITE_ROLES}

    def assert_same_company(self, other_company_code: str) -> None:
        """Enforces the same multi-tenant isolation used for tickets/machines
        elsewhere in the product: a user must never read or write another
        company's documents, spare parts, or consumables."""
        if self.company_code != other_company_code:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="not found")

    def assert_can_write(self) -> None:
        if not self.can_write():
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="only an owner or maintenance head can do this",
            )

    def assert_can_upload_machine_records(self) -> None:
        if self.role not in {role.value for role in Role}:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="your role cannot upload machine records",
            )

    def assert_maintenance_head(self) -> None:
        if self.role != Role.MAINTENANCE_HEAD.value:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="only the maintenance head can approve or reject extracted records",
            )

    def assert_owner(self) -> None:
        if self.role != Role.OWNER.value:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="only the owner can delete",
            )

    def assert_can_manage_escalation(self) -> None:
        if self.role not in {Role.OWNER.value, Role.MAINTENANCE_HEAD.value}:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="only the owner or maintenance head can manage breakdown alerts",
            )

    def assert_can_close_ticket(self) -> None:
        if self.role not in {role.value for role in CLOSE_TICKET_ROLES}:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="final ticket closure requires a supervisor, maintenance head, or owner",
            )


def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(_bearer_scheme),
) -> CurrentUser:
    if credentials is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="missing bearer token")

    token = credentials.credentials
    payload = decode_access_token(token)
    # A per-company user must never be one of the special-purpose tokens (reset, admin).
    if payload is None or "company_code" not in payload:
        payload = _resolve_supabase_user(token)
    if payload is None or "company_code" not in payload:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="invalid or expired token")

    return CurrentUser(
        user_id=payload["sub"],
        company_code=payload["company_code"],
        role=payload["role"],
        name=payload.get("name", ""),
    )


def _resolve_supabase_user(token: str) -> Optional[dict]:
    """Validate a Supabase access token and resolve authorization from public.users.

    Supabase ``user_metadata`` is intentionally ignored for roles and tenancy because
    end users can edit it. The trusted directory row is loaded with the server-only
    service key after GoTrue confirms the caller token.
    """
    if not config.SUPABASE_URL or not config.SUPABASE_SERVICE_ROLE_KEY:
        return None
    headers = {
        "apikey": config.SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {token}",
    }
    try:
        with httpx.Client(timeout=10) as client:
            auth_response = client.get(
                f"{config.SUPABASE_URL.rstrip('/')}/auth/v1/user", headers=headers
            )
            if auth_response.status_code != 200:
                return None
            auth_user = auth_response.json()
            auth_id = str(auth_user.get("id") or "")
            email = str(auth_user.get("email") or "").strip()

            admin_headers = {
                "apikey": config.SUPABASE_SERVICE_ROLE_KEY,
                "Authorization": f"Bearer {config.SUPABASE_SERVICE_ROLE_KEY}",
            }
            rest_base = f"{config.SUPABASE_URL.rstrip('/')}/rest/v1"
            user_params = {"select": "id,company_id,role,name,email", "limit": 1}
            directory_id = str(
                (auth_user.get("app_metadata") or {}).get("directory_user_id")
                or ""
            )
            if directory_id:
                user_params["id"] = f"eq.{directory_id}"
            else:
                user_params["id"] = f"eq.{auth_id}"
            profile_response = client.get(
                f"{rest_base}/users", headers=admin_headers, params=user_params
            )
            profile_response.raise_for_status()
            profiles = profile_response.json()
            if not profiles and email:
                profile_response = client.get(
                    f"{rest_base}/users",
                    headers=admin_headers,
                    params={
                        "select": "id,company_id,role,name,email",
                        "email": f"ilike.{email}",
                        "limit": 1,
                    },
                )
                profile_response.raise_for_status()
                profiles = profile_response.json()
            if not profiles:
                return None
            profile = profiles[0]
            company_response = client.get(
                f"{rest_base}/companies",
                headers=admin_headers,
                params={"select": "domain", "id": f"eq.{profile['company_id']}", "limit": 1},
            )
            company_response.raise_for_status()
            companies = company_response.json()
            if not companies or not companies[0].get("domain"):
                return None
            return {
                "sub": str(profile["id"]),
                "company_code": str(companies[0]["domain"]),
                "role": str(profile.get("role") or ""),
                "name": str(profile.get("name") or ""),
            }
    except (httpx.HTTPError, KeyError, TypeError, ValueError):
        return None


# --- Platform admin (TurboFix team) --------------------------------------
# A platform operator, not a per-company user: no company_code, not in the Users tab.
# Authenticated by a single shared password from the environment, carried as a JWT
# with purpose="admin" so it's never accepted by get_current_user and vice versa.
_ADMIN_PURPOSE = "admin"


def create_admin_token() -> str:
    now = int(time.time())
    payload = {
        "sub": "turbofix-admin",
        "purpose": _ADMIN_PURPOSE,
        "iat": now,
        "exp": now + config.ADMIN_TOKEN_EXPIRE_MINUTES * 60,
    }
    return jwt.encode(payload, config.JWT_SECRET_KEY, algorithm=config.JWT_ALGORITHM)


def get_current_admin(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(_bearer_scheme),
) -> bool:
    if credentials is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="missing bearer token")
    try:
        payload = jwt.decode(credentials.credentials, config.JWT_SECRET_KEY, algorithms=[config.JWT_ALGORITHM])
    except jwt.PyJWTError:
        payload = None
    if payload is None or payload.get("purpose") != _ADMIN_PURPOSE:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="admin authentication required")
    return True
