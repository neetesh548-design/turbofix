"""Supabase (PostgREST) implementation of all TurboFix repositories.

Connects to the remote Supabase project via its PostgREST HTTP API using
the service-role key (bypasses RLS).  Zero extra dependencies beyond
`httpx` which is already in requirements.txt.

Column-name mapping
-------------------
The abstract base classes use Excel-era column names (company_code, machine_id,
ticket_id …).  Supabase tables use slightly different names (domain, id, …).
Each repository method translates transparently so every consumer — routes,
services, admin — keeps working without changes.
"""

import base64
import json
import logging
import secrets
import uuid
import zlib
from datetime import datetime, timezone
from typing import Dict, List, Optional

import httpx

from app import config
from app.repositories.base import (
    COMPANIES_HEADER,
    CONSUMABLES_HEADER,
    DOCUMENTS_HEADER,
    MACHINE_EVENTS_HEADER,
    MACHINE_RECORDS_HEADER,
    MACHINES_HEADER,
    SETTINGS_HEADER,
    SPARE_PARTS_HEADER,
    TECHNICIAN_WORK_HEADER,
    TICKETS_HEADER,
    USERS_HEADER,
    CustomKpiRepository,
    DocumentRepository,
    EventRepository,
    MachineRecordRepository,
    MachineRepository,
    PartsRepository,
    SettingsRepository,
    TechnicianWorkRepository,
    TicketRepository,
    UserRepository,
    new_event_id,
    new_item_id,
    new_kpi_entry_id,
    new_kpi_id,
    new_machine_record_id,
    new_ticket_id,
    new_user_id,
)

log = logging.getLogger("turbofix.supabase_repo")


class GoTrueError(Exception):
    """A non-2xx response from Supabase Auth (GoTrue) admin API."""

    def __init__(self, status_code: int, body: str):
        self.status_code = status_code
        self.body = body
        super().__init__(f"GoTrue {status_code}: {body}")

# ---------------------------------------------------------------------------
# Shared PostgREST client
# ---------------------------------------------------------------------------

class _SupabaseClient:
    """Thin wrapper around httpx for PostgREST calls."""

    def __init__(self):
        root = config.SUPABASE_URL.rstrip("/")
        self._base = root + "/rest/v1"
        self._auth_base = root + "/auth/v1"
        key = config.SUPABASE_SERVICE_ROLE_KEY or "dummy-key"
        self._headers = {
            "apikey": key,
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json",
            "Prefer": "return=representation",
        }
        # GoTrue endpoints want just apikey + Content-Type — no return=representation.
        self._auth_headers = {
            "apikey": key,
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json",
        }

    def _url(self, table: str) -> str:
        return f"{self._base}/{table}"

    # -- helpers ---------------------------------------------------------------

    def select(self, table: str, params: dict | None = None) -> list[dict]:
        """GET rows. params are PostgREST query-string filters."""
        url = self._url(table)
        with httpx.Client(timeout=15) as c:
            r = c.get(url, headers=self._headers, params=params or {})
            if r.status_code >= 400:
                log.error(
                    "postgrest.select_failed",
                    extra={"table": table, "status": r.status_code, "body": r.text},
                )
            r.raise_for_status()
            return r.json()

    def select_one(self, table: str, params: dict) -> dict | None:
        rows = self.select(table, {**params, "limit": 1})
        return rows[0] if rows else None

    def insert(self, table: str, row: dict) -> dict:
        url = self._url(table)
        with httpx.Client(timeout=15) as c:
            r = c.post(url, headers=self._headers, json=row)
            if r.status_code >= 400:
                log.error(
                    "postgrest.insert_failed",
                    extra={"table": table, "status": r.status_code, "body": r.text},
                )
            r.raise_for_status()
            data = r.json()
            return data[0] if isinstance(data, list) else data

    def update(self, table: str, params: dict, patch: dict) -> list[dict]:
        url = self._url(table)
        with httpx.Client(timeout=15) as c:
            r = c.patch(url, headers=self._headers, params=params, json=patch)
            r.raise_for_status()
            data = r.json()
            return data if isinstance(data, list) else [data]

    def delete(self, table: str, params: dict) -> bool:
        url = self._url(table)
        with httpx.Client(timeout=15) as c:
            r = c.delete(url, headers=self._headers, params=params)
            r.raise_for_status()
            data = r.json()
            return len(data) > 0 if isinstance(data, list) else True

    # -- GoTrue (Supabase Auth) --------------------------------------------
    # Real credential storage/verification lives here, not in our own
    # password_hash column — see SupabaseUserRepository docstring.

    def auth_admin_create_user(self, email: str, password: str, phone: str = "") -> Optional[dict]:
        """Create a real Supabase Auth identity for a new user. Returns the
        auth user object (with its `id`) on success, or None if GoTrue
        already has an identity for this email (e.g. a retried/duplicate
        registration) — the caller should fall back to looking that user up
        rather than treating it as a hard failure.
        """
        url = f"{self._auth_base}/admin/users"
        payload = {"email": email, "password": password, "email_confirm": True}
        if phone:
            payload["phone"] = phone
        with httpx.Client(timeout=15) as c:
            r = c.post(url, headers=self._auth_headers, json=payload)
            if r.status_code in (400, 422) and "already been registered" in r.text.lower():
                return None
            if r.status_code >= 400:
                raise GoTrueError(r.status_code, r.text)
            return r.json()

    def auth_get_user_by_email(self, email: str) -> Optional[dict]:
        """Look up an existing GoTrue identity by email (admin API)."""
        url = f"{self._auth_base}/admin/users"
        with httpx.Client(timeout=15) as c:
            r = c.get(url, headers=self._auth_headers, params={"email": email})
            r.raise_for_status()
            body = r.json()
            users = body.get("users", body) if isinstance(body, dict) else body
            for u in users or []:
                if str(u.get("email", "")).strip().lower() == email.strip().lower():
                    return u
            return None

    def auth_admin_update_password(self, auth_user_id: str, new_password: str) -> bool:
        """Overwrite a GoTrue identity's password via the admin API."""
        url = f"{self._auth_base}/admin/users/{auth_user_id}"
        with httpx.Client(timeout=15) as c:
            r = c.put(url, headers=self._auth_headers, json={"password": new_password})
            return r.status_code == 200

    def auth_verify_password(self, email: str, password: str) -> bool:
        """Verify email+password against GoTrue. True only on a genuine match."""
        url = f"{self._auth_base}/token"
        with httpx.Client(timeout=15) as c:
            r = c.post(
                url,
                headers=self._auth_headers,
                params={"grant_type": "password"},
                json={"email": email, "password": password},
            )
            return r.status_code == 200


_client = _SupabaseClient()


# ---------------------------------------------------------------------------
# Helper to look up company domain ↔ company_id ↔ factory_id
# ---------------------------------------------------------------------------

def _company_id_for_code(code: str) -> str | None:
    """Given a company domain/code, return its companies UUID."""
    row = _client.select_one("companies", {"domain": f"eq.{code}"})
    return row["id"] if row else None


def _company_code_for_id(company_id: str) -> str:
    """Given a company UUID, return its domain code."""
    row = _client.select_one("companies", {"id": f"eq.{company_id}"})
    return row["domain"] if row else ""


def _factory_id_for_code(code: str) -> str | None:
    """Given a company domain/code, return the corresponding factories UUID."""
    company_id = _company_id_for_code(code)
    if not company_id:
        if str(code or "").strip().upper() == "TFDEMO":
            return "f1000000-0000-0000-0000-000000000099"
        return None

    # machines.factory_id's real FK target is "organizations", NOT
    # "factories" — an earlier migration renamed the original factories
    # table to "organizations" (supabase/migrations/20260721120000_
    # enterprise_schema_phase1.sql), and a later one then recreated a
    # table literally named "factories" from scratch, disconnected from
    # the FK and from any company (20260722173000_tfdemo_annual_
    # breakdown_seed.sql) — it has no company_id column and isn't what
    # machines actually reference. A factory can only be found via an
    # existing machine's factory_id, or by matching the company's name in
    # "organizations" — never by a direct company_id filter (neither
    # table has one linking back to companies).

    # 1. Machines link to both company_id and factory_id; find a machine to get factory_id
    machine = _client.select_one("machines", {
        "company_id": f"eq.{company_id}",
        "select": "factory_id",
    })
    if machine and machine.get("factory_id"):
        return machine["factory_id"]

    # 2. Fallback: look up organizations by name match (add_company() creates
    # an organizations row with the same name for every new company)
    company = _client.select_one("companies", {"id": f"eq.{company_id}"})
    if company:
        factory = _client.select_one("organizations", {"name": f"eq.{company['name']}"})
        if factory and factory.get("id"):
            return factory["id"]

        # 3. Self-heal: companies created before this linkage existed (or
        # where add_company()'s organizations insert failed) have no
        # matching row anywhere above — create one now rather than leaving
        # every future machine/ticket/part insert for this company broken.
        try:
            created = _client.insert("organizations", {"name": company["name"]})
            if created and created.get("id"):
                return created["id"]
        except Exception as exc:
            log.error(
                "supabase._factory_id_for_code self-heal insert failed",
                extra={"company_code": code, "error": str(exc)},
            )

    if str(code or "").strip().upper() == "TFDEMO":
        return "f1000000-0000-0000-0000-000000000099"
    return None


def _company_code_for_factory_id(factory_id: str) -> str:
    """Given a factory UUID, find the matching company domain code."""
    if not factory_id:
        return ""

    # 1. Query organizations table directly for company_id
    factory = _client.select_one("organizations", {"id": f"eq.{factory_id}"})
    if factory and factory.get("company_id"):
        code = _company_code_for_id(factory["company_id"])
        if code:
            return code

    # 2. Find a machine with this factory_id to get company_id
    machine = _client.select_one("machines", {
        "factory_id": f"eq.{factory_id}",
        "select": "company_id",
    })
    if machine and machine.get("company_id"):
        code = _company_code_for_id(machine["company_id"])
        if code:
            return code

    # 3. Fallback: match by factory name -> company name
    if factory and factory.get("name"):
        company = _client.select_one("companies", {"name": f"eq.{factory['name']}"})
        if company and company.get("domain"):
            return company["domain"]

    # Check if seed TFDEMO company still exists in companies table
    if str(factory_id or "").strip() == "f1000000-0000-0000-0000-000000000099":
        demo_co = _client.select_one("companies", {"domain": "eq.TFDEMO"})
        if demo_co:
            return "TFDEMO"

    return ""


def _build_factory_to_code_map() -> dict:
    """Build a mapping of factory_id -> company_code in bulk with minimal queries."""
    f_map = {}
    try:
        companies = _client.select("companies")
        id_to_code = {c["id"]: (c.get("domain") or c.get("company_code") or "") for c in companies if c.get("id")}
        name_to_code = {c["name"]: (c.get("domain") or c.get("company_code") or "") for c in companies if c.get("name")}

        # 1. Bulk mapping from organizations table directly (the real FK
        # target for machines.factory_id — see _factory_id_for_code)
        factories = _client.select("organizations")
        for f in factories:
            fid = f.get("id")
            fcid = f.get("company_id")
            fname = f.get("name")
            if fid:
                if fcid and fcid in id_to_code:
                    f_map[fid] = id_to_code[fcid]
                elif fname and fname in name_to_code:
                    f_map[fid] = name_to_code[fname]

        # 2. Bulk mapping from machines table
        machines = _client.select("machines", {"select": "factory_id,company_id"})
        for m in machines:
            fid = m.get("factory_id")
            cid = m.get("company_id")
            if fid and fid not in f_map and cid and cid in id_to_code:
                f_map[fid] = id_to_code[cid]
    except Exception as exc:
        log.error("supabase._build_factory_to_code_map failed", extra={"error": str(exc)})
    return f_map


# ---------------------------------------------------------------------------
# UserRepository  →  companies + users tables
# ---------------------------------------------------------------------------

class SupabaseUserRepository(UserRepository):

    _USER_PASSWORD_VERSIONS: Dict[str, str] = {}

    def next_user_id(self, company_code: str) -> str:
        return new_user_id(company_code)

    def _user_to_dict(self, row: dict) -> dict:
        """Map Supabase users row → standard USERS_HEADER dict."""
        company_code = _company_code_for_id(row.get("company_id") or "")
        user_id = row.get("id", "")
        # Real credentials live in GoTrue, but password reset links require a
        # fingerprintable token seed that updates whenever the user's password
        # changes so that reset links self-invalidate upon password reset.
        password_fingerprint_seed = (
            self._USER_PASSWORD_VERSIONS.get(user_id)
            or row.get("password_hash")
            or row.get("password_updated_at")
            or row.get("updated_at")
            or row.get("created_at")
            or user_id
        )
        return {
            "user_id": user_id,
            "company_code": company_code,
            "name": row.get("name", ""),
            "phone": row.get("phone", ""),
            "email": row.get("email", ""),
            "role": row.get("role", ""),
            "password_hash": str(password_fingerprint_seed),
            "created_at": str(row.get("created_at", "")),
            "manager_user_id": "",
            "department": "",
            "plant_location": "",
            "shift": "",
            "portal_access": "yes",
            "opt_out_whatsapp": row.get("opt_out_whatsapp", False),
        }

    def get_by_identifier(self, identifier: str) -> Optional[dict]:
        identifier = identifier.strip().lower()
        # Try email first
        row = _client.select_one("users", {"email": f"eq.{identifier}"})
        if not row:
            # Try phone
            row = _client.select_one("users", {"phone": f"eq.{identifier}"})
        if not row:
            return None
        return self._user_to_dict(row)

    def get_by_id(self, user_id: str) -> Optional[dict]:
        row = _client.select_one("users", {"id": f"eq.{user_id}"})
        if not row:
            return None
        return self._user_to_dict(row)

    def list_users(self) -> List[dict]:
        rows = _client.select("users")
        return [self._user_to_dict(r) for r in rows]

    def add(self, row: dict) -> None:
        company_id = _company_id_for_code(row.get("company_code", ""))
        email = (row.get("email") or "").strip()
        password = row.get("password") or ""
        user_id = row.get("user_id") or str(uuid.uuid4())

        # A raw password means this account needs to be able to log in —
        # create (or reuse) a real GoTrue identity and use ITS id as the
        # public.users.id, matching the schema's auth.users(id) linkage.
        # Without a password (offline/no-portal-access staff), keep the
        # existing behaviour: a directory-only row with no auth identity.
        if email and password:
            try:
                auth_user = _client.auth_admin_create_user(email, password, row.get("phone", ""))
                if auth_user is None:
                    # GoTrue already has this email (e.g. a retried registration
                    # after a previous partial failure) — reuse that identity
                    # instead of silently creating a passwordless orphan row.
                    auth_user = _client.auth_get_user_by_email(email)
            except GoTrueError as exc:
                log.error(
                    "supabase.add_user gotrue call failed",
                    extra={"email": email, "status": exc.status_code, "body": exc.body},
                )
                raise
            if auth_user and auth_user.get("id"):
                user_id = auth_user["id"]
            else:
                log.warning(
                    "supabase.add_user could not create or find a GoTrue identity; "
                    "this account will not be able to log in",
                    extra={"email": email},
                )

        # public.users has no updated_at column (see
        # supabase/migrations/20260711131850_init_schema.sql) — created_at
        # has a DB default, so it's fine to omit too, but setting it
        # explicitly keeps this repo's timestamp in sync with GoTrue's.
        _client.insert("users", {
            "id": user_id,
            "company_id": company_id,
            "name": row.get("name", ""),
            "phone": row.get("phone", ""),
            "email": email,
            "role": row.get("role", ""),
            "created_at": row.get("created_at") or datetime.now(timezone.utc).isoformat(),
        })

    def verify_credentials(self, identifier: str, password: str) -> Optional[dict]:
        user = self.get_by_identifier(identifier)
        if not user or not user.get("email"):
            return None
        if _client.auth_verify_password(user["email"], password):
            return user
        return None

    def update_password(self, user_id: str, new_password_hash: str, new_password: str = "") -> bool:
        # public.users.id == auth.users.id for any account created with a
        # password (see add() above), so user_id doubles as the GoTrue id.
        if not new_password:
            log.warning(
                "SupabaseUserRepository.update_password called without a raw "
                "new_password — nothing was changed. Pass new_password, not "
                "just new_password_hash; GoTrue owns the real credential.",
                extra={"user_id": user_id},
            )
            return False
        try:
            success = _client.auth_admin_update_password(user_id, new_password)
            if success:
                now_str = datetime.now(timezone.utc).isoformat()
                self._USER_PASSWORD_VERSIONS[user_id] = now_str
                try:
                    _client.update("users", {"id": f"eq.{user_id}"}, {"updated_at": now_str})
                except Exception as e:
                    log.debug("supabase.update_password could not update public.users updated_at: %s", e)
            return success
        except httpx.HTTPStatusError as exc:
            log.warning(
                "supabase.update_password failed",
                extra={"user_id": user_id, "error": str(exc)},
            )
            return False

    # -- Company CRUD ----------------------------------------------------------

    _COMPANY_QUOTA_OVERRIDES: Dict[str, int] = {}
    _COMPANY_PHONE_OVERRIDES: Dict[str, str] = {}

    def _company_to_dict(self, row: dict) -> dict:
        """Map Supabase companies row → standard COMPANIES_HEADER dict."""
        code = row.get("domain", "")
        phone = self._COMPANY_PHONE_OVERRIDES.get(code) or row.get("admin_contact_phone", "")
        if not phone:
            try:
                # Look up owner phone as admin_contact_phone
                owner = _client.select_one("users", {
                    "company_id": f"eq.{row['id']}",
                    "role": "eq.owner",
                })
                phone = owner.get("phone", "") if owner else ""
            except Exception:
                phone = ""

        if code in self._COMPANY_QUOTA_OVERRIDES:
            machine_quota = self._COMPANY_QUOTA_OVERRIDES[code]
        else:
            machine_quota = row.get("machine_quota")
            if machine_quota is None:
                try:
                    # Count machines for quota display
                    machines = _client.select("machines", {
                        "company_id": f"eq.{row['id']}",
                        "select": "id",
                    })
                    machine_quota = len(machines) + 5
                except Exception:
                    machine_quota = 5

        return {
            "company_code": code,
            "company_name": row.get("name", ""),
            "admin_contact_phone": phone,
            "onboarded_date": str(row.get("created_at", ""))[:10],
            "machine_quota": int(machine_quota),
            "approved": "yes" if row.get("status") == "active" else "no",
        }

    def get_company(self, company_code: str) -> Optional[dict]:
        row = _client.select_one("companies", {"domain": f"eq.{company_code}"})
        if not row:
            return None
        return self._company_to_dict(row)

    def list_companies(self) -> List[dict]:
        rows = _client.select("companies")
        return [self._company_to_dict(r) for r in rows]

    def update_company(self, company_code: str, fields: dict) -> bool:
        patch = {}
        if "company_name" in fields:
            patch["name"] = fields["company_name"]
        if "approved" in fields:
            val = fields["approved"]
            patch["status"] = "active" if str(val).lower() in ("yes", "true", "1") else "pending"
        if "machine_quota" in fields:
            try:
                q_val = int(fields["machine_quota"])
                patch["machine_quota"] = q_val
            except (ValueError, TypeError):
                pass
        if "admin_contact_phone" in fields:
            phone_val = str(fields["admin_contact_phone"] or "").strip()
            patch["admin_contact_phone"] = phone_val

        if not patch:
            return True
        try:
            _client.update("companies", {"domain": f"eq.{company_code}"}, patch)
            if "machine_quota" in fields:
                self._COMPANY_QUOTA_OVERRIDES[company_code] = int(fields["machine_quota"])
            if "admin_contact_phone" in fields:
                self._COMPANY_PHONE_OVERRIDES[company_code] = str(fields["admin_contact_phone"] or "").strip()
            return True
        except Exception as exc:
            log.warning("supabase.update_company primary patch failed, retrying core fields", extra={"error": str(exc)})
            # Retry without optional extra columns in case PostgREST schema cache is missing machine_quota or admin_contact_phone
            core_patch = {k: v for k, v in patch.items() if k in {"name", "status"}}
            if core_patch:
                try:
                    _client.update("companies", {"domain": f"eq.{company_code}"}, core_patch)
                    return True
                except Exception as inner_exc:
                    log.error("supabase.update_company core patch failed", extra={"error": str(inner_exc)})
                    return False
            # Never report success for an update that was not persisted.
            return False

    def add_company(self, company_code: str, company_name: str, admin_contact_phone: str,
                    machine_quota: int, approved: bool) -> None:
        self._COMPANY_QUOTA_OVERRIDES[company_code] = machine_quota
        self._COMPANY_PHONE_OVERRIDES[company_code] = admin_contact_phone
        data = {
            "id": str(uuid.uuid4()),
            "domain": company_code,
            "name": company_name,
            "admin_contact_phone": admin_contact_phone,
            "machine_quota": machine_quota,
            "status": "active" if approved else "pending",
        }
        try:
            _client.insert("companies", data)
        except Exception:
            # Fallback for legacy DB schema missing extra columns
            data.pop("machine_quota", None)
            data.pop("admin_contact_phone", None)
            _client.insert("companies", data)

        # machines.factory_id has a real FK to organizations(id) — not to
        # "factories", which is a same-named but unrelated table left over
        # from a later migration (see _factory_id_for_code) — and neither
        # table has a company_id column linking back to this company, so
        # every company needs a same-named organizations row for the
        # name-match lookup to find, otherwise the first machine a new
        # company adds fails the FK.
        try:
            _client.insert("organizations", {"name": company_name})
        except Exception as exc:
            log.error("supabase.add_company organizations row failed", extra={"error": str(exc)})

    def delete_company(self, company_code: str) -> bool:
        self._COMPANY_QUOTA_OVERRIDES.pop(company_code, None)
        self._COMPANY_PHONE_OVERRIDES.pop(company_code, None)
        try:
            return _client.delete("companies", {"domain": f"eq.{company_code}"})
        except Exception as exc:
            log.error("supabase.delete_company failed", extra={"error": str(exc)})
            return False



# ---------------------------------------------------------------------------
# MachineRepository  →  machines table
# ---------------------------------------------------------------------------

class SupabaseMachineRepository(MachineRepository):

    def __init__(self, cache_ttl: int = 60):
        self._cache: Dict[str, dict] | None = None
        self._cache_time: float = 0
        self._ttl = cache_ttl

    def _row_to_dict(self, row: dict) -> dict:
        company_code = (
            row.get("company_code")
            or _company_code_for_id(row.get("company_id") or "")
            or _company_code_for_factory_id(row.get("factory_id") or "")
        )
        if not company_code:
            mid = str(row.get("id") or "")
            if mid.startswith("bb100000-0000-0000-0000-00000000000"):
                company_code = "TFDEMO"
            else:
                company_code = ""
        return {
            "machine_id": row.get("id", ""),
            "company_code": company_code,
            "machine_name": row.get("name", ""),
            "location": row.get("location", ""),
            "assigned_technician_phone": row.get("assigned_technician_phone", ""),
            "informed_phone_1": row.get("informed_phone_1", ""),
            "informed_phone_2": "",
            "informed_phone_3": "",
            "has_open_tickets": "",
        }

    def load(self) -> Dict[str, dict]:
        import time
        now = time.time()
        if self._cache and (now - self._cache_time) < self._ttl:
            return self._cache
        rows = _client.select("machines")
        result = {}
        for r in rows:
            d = self._row_to_dict(r)
            result[d["machine_id"]] = d
        self._cache = result
        self._cache_time = now
        return result

    def get(self, machine_id: str) -> Optional[dict]:
        row = _client.select_one("machines", {"id": f"eq.{machine_id}"})
        if not row:
            return None
        return self._row_to_dict(row)

    def create(self, row: dict) -> None:
        company_id = _company_id_for_code(row.get("company_code", ""))
        factory_id = _factory_id_for_code(row.get("company_code", ""))
        # machines.id is a native uuid primary key, but callers pass the
        # legacy human-readable "TF-{code}-Mnnn" id (used by the file/sheets
        # backends) as row["machine_id"] — that string isn't valid uuid
        # syntax, so it can't be reused as the Supabase row's id.
        _client.insert("machines", {
            "id": str(uuid.uuid4()),
            "company_id": company_id,
            "factory_id": factory_id,
            "name": row.get("machine_name", ""),
            "location": row.get("location", ""),
            "assigned_technician_phone": row.get("assigned_technician_phone", ""),
            "informed_phone_1": row.get("informed_phone_1", ""),
            "status": "active",
        })
        self.invalidate_cache()

    def invalidate_cache(self) -> None:
        self._cache = None

    def next_machine_code(self, company_code: str) -> str:
        machines = self.get_company_machines(company_code)
        max_num = 0
        for m in machines:
            name = m.get("machine_name", "")
            if name.startswith("M") and name[1:].isdigit():
                max_num = max(max_num, int(name[1:]))
        return f"M{max_num + 1:03d}"

    def get_company_machines(self, company_code: str) -> List[dict]:
        all_machines = list(self.load().values())
        return [m for m in all_machines if m.get("company_code") == company_code]


# ---------------------------------------------------------------------------
# TicketRepository  →  tickets table
# ---------------------------------------------------------------------------

class SupabaseTicketRepository(TicketRepository):

    def _row_to_dict(self, row: dict, machine_map: dict | None = None, company_code: str | None = None) -> dict:
        factory_id = row.get("factory_id") or ""
        if not company_code:
            company_code = _company_code_for_factory_id(factory_id) if factory_id else ""

        # Get machine name
        machine_name = ""
        machine_id = row.get("machine_id") or ""
        if machine_id:
            if machine_map is not None:
                machine_name = machine_map.get(machine_id, "")
            else:
                machine = _client.select_one("machines", {"id": f"eq.{machine_id}", "select": "name"})
                machine_name = machine.get("name", "") if machine else ""

        ai_summary = row.get("ai_summary")
        summary_text = ""
        if isinstance(ai_summary, dict):
            summary_text = ai_summary.get("summary", "")
        elif isinstance(ai_summary, str):
            summary_text = ai_summary

        return {
            "ticket_id": row.get("id", ""),
            "machine_id": machine_id,
            "company_code": company_code,
            "machine_name": machine_name,
            "reported_at": str(row.get("created_at", "")),
            "reporter_phone": row.get("reporter_phone", ""),
            "description": row.get("issue_text", ""),
            "ai_summary": summary_text,
            "urgency": row.get("urgency", "medium"),
            "status": row.get("status", "Open"),
            "closed_at": str(row.get("resolved_at") or ""),
            "hours_to_fix": "",
            "voice_note_media_id": "",
            "photo_media_id": row.get("proof_image_url", ""),
            "language": "",
            "closed_by": "",
            "factory_id": factory_id,
            "current_escalation_level": row.get("current_escalation_level", 1),
            "next_escalation_at": str(row.get("next_escalation_at") or ""),
            "escalation_paused": row.get("escalation_paused", False),
            "delegated_from": row.get("delegated_from", ""),
            "delegation_count": row.get("delegation_count", 0),
            "outsource_vendor": row.get("outsource_vendor", ""),
            "outsource_reason": row.get("outsource_reason", ""),
            "outsource_evidence_url": row.get("outsource_evidence_url", ""),
            "closure_evidence_url": row.get("closure_evidence_url", ""),
            "closure_approved_by": row.get("closure_approved_by", ""),
            "rejection_count": row.get("rejection_count", 0),
            "rejection_reason": row.get("rejection_reason", ""),
        }

    def next_ticket_id(self) -> str:
        return new_ticket_id()

    def append(self, row: dict) -> None:
        company_code = row.get("company_code", "")
        factory_id = _factory_id_for_code(company_code)
        _client.insert("tickets", {
            "id": row.get("ticket_id", str(uuid.uuid4())),
            "machine_id": row.get("machine_id") or None,
            "factory_id": factory_id,
            "reporter_phone": row.get("reporter_phone", ""),
            "issue_text": row.get("description", ""),
            "ai_summary": {"summary": row.get("ai_summary", "")},
            "urgency": row.get("urgency", "medium"),
            "status": row.get("status", "Open"),
        })

    def get(self, ticket_id: str) -> Optional[dict]:
        row = _client.select_one("tickets", {"id": f"eq.{ticket_id}"})
        if not row:
            return None
        return self._row_to_dict(row)

    def attach_voice_note(self, ticket_id: str, media_id: str) -> bool:
        # Supabase tickets table doesn't have voice_note_media_id column.
        # Store in proof_image_url or ignore gracefully.
        log.info("attach_voice_note: no dedicated column in Supabase", extra={"ticket_id": ticket_id})
        return True

    def update_ai_fields(self, ticket_id: str, ai_summary: str, urgency: str,
                         description: Optional[str] = None) -> bool:
        patch: dict = {
            "ai_summary": {"summary": ai_summary},
            "urgency": urgency,
        }
        if description:
            patch["issue_text"] = description
        try:
            _client.update("tickets", {"id": f"eq.{ticket_id}"}, patch)
            return True
        except Exception:
            return False

    def get_company_tickets(self, company_code: str) -> List[dict]:
        factory_id = _factory_id_for_code(company_code)
        if not factory_id:
            return []
        rows = _client.select("tickets", {"factory_id": f"eq.{factory_id}"})
        return [self._row_to_dict(r) for r in rows]

    def attach_photo(self, ticket_id: str, media_id: str) -> bool:
        try:
            _client.update("tickets", {"id": f"eq.{ticket_id}"}, {"proof_image_url": media_id})
            return True
        except Exception:
            return False

    def update_language(self, ticket_id: str, language: str) -> bool:
        # No language column in Supabase; silently succeed
        return True

    def close_ticket(self, ticket_id: str, closed_by: str) -> bool:
        try:
            _client.update("tickets", {"id": f"eq.{ticket_id}"}, {
                "status": "resolved",
                "resolved_at": datetime.now(timezone.utc).isoformat(),
            })
            return True
        except Exception:
            return False

    def find_by_id_prefix(self, prefix: str) -> Optional[dict]:
        # PostgREST ilike filter
        rows = _client.select("tickets", {"id": f"ilike.{prefix}*", "limit": 1})
        if not rows:
            return None
        return self._row_to_dict(rows[0])

    # -- Escalation methods ---------------------------------------------------

    def update_escalation_level(self, ticket_id: str, level: int,
                                next_at: str) -> bool:
        try:
            _client.update("tickets", {"id": f"eq.{ticket_id}"}, {
                "current_escalation_level": level,
                "next_escalation_at": next_at,
            })
            return True
        except Exception:
            return False

    def pause_escalation(self, ticket_id: str) -> bool:
        try:
            _client.update("tickets", {"id": f"eq.{ticket_id}"}, {
                "escalation_paused": True,
                "next_escalation_at": None,
            })
            return True
        except Exception:
            return False

    def resume_escalation(self, ticket_id: str, next_at: str) -> bool:
        try:
            _client.update("tickets", {"id": f"eq.{ticket_id}"}, {
                "escalation_paused": False,
                "next_escalation_at": next_at,
            })
            return True
        except Exception:
            return False

    def submit_closure_evidence(self, ticket_id: str,
                                evidence_url: str) -> bool:
        try:
            _client.update("tickets", {"id": f"eq.{ticket_id}"}, {
                "closure_evidence_url": evidence_url,
                "status": "pending_approval",
            })
            return True
        except Exception:
            return False

    def approve_closure(self, ticket_id: str, approved_by: str) -> bool:
        try:
            _client.update("tickets", {"id": f"eq.{ticket_id}"}, {
                "status": "resolved",
                "closure_approved_by": approved_by,
                "resolved_at": datetime.now(timezone.utc).isoformat(),
                "escalation_paused": True,
                "next_escalation_at": None,
            })
            return True
        except Exception:
            return False

    def reject_closure(self, ticket_id: str, reason: str) -> bool:
        try:
            row = _client.select_one("tickets", {"id": f"eq.{ticket_id}",
                                                  "select": "rejection_count"})
            count = (row.get("rejection_count", 0) if row else 0) + 1
            _client.update("tickets", {"id": f"eq.{ticket_id}"}, {
                "status": "Open",
                "rejection_count": count,
                "rejection_reason": reason,
                "closure_evidence_url": None,
            })
            return True
        except Exception:
            return False

    def delegate_ticket(self, ticket_id: str, from_phone: str,
                        to_phone: str) -> bool:
        try:
            row = _client.select_one("tickets", {"id": f"eq.{ticket_id}",
                                                  "select": "delegation_count"})
            count = (row.get("delegation_count", 0) if row else 0) + 1
            _client.update("tickets", {"id": f"eq.{ticket_id}"}, {
                "delegated_from": from_phone,
                "delegation_count": count,
            })
            return True
        except Exception:
            return False

    def mark_outsourced(self, ticket_id: str, vendor: str, reason: str,
                        evidence_url: str) -> bool:
        try:
            _client.update("tickets", {"id": f"eq.{ticket_id}"}, {
                "status": "outsourced",
                "outsource_vendor": vendor,
                "outsource_reason": reason,
                "outsource_evidence_url": evidence_url,
                "escalation_paused": True,
                "next_escalation_at": None,
            })
            return True
        except Exception:
            return False

    def get_open_escalatable(self) -> List[dict]:
        rows = _client.select("tickets", {
            "status": "in.Open,in_progress",
            "escalation_paused": "eq.false",
            "next_escalation_at": "not.is.null",
        })
        return [self._row_to_dict(r) for r in rows]

    def set_status(self, ticket_id: str, status: str) -> bool:
        try:
            _client.update("tickets", {"id": f"eq.{ticket_id}"}, {
                "status": status,
            })
            return True
        except Exception:
            return False


# ---------------------------------------------------------------------------
# EscalationConfigRepository — reads company thresholds
# ---------------------------------------------------------------------------

class SupabaseEscalationConfigRepository:

    def get_thresholds(self, factory_id: str,
                       chain_type: str = "breakdown") -> List[dict]:
        rows = _client.select("escalation_config", {
            "factory_id": f"eq.{factory_id}",
            "chain_type": f"eq.{chain_type}",
            "order": "level.asc",
        })
        return [
            {
                "level": r["level"],
                "threshold_min": r["threshold_min"],
                "role_label": r["role_label"],
                "notify_phone": r.get("notify_phone", ""),
            }
            for r in rows
        ]

    def get_threshold_for_level(self, factory_id: str, chain_type: str,
                                level: int) -> Optional[dict]:
        try:
            row = _client.select_one("escalation_config", {
                "factory_id": f"eq.{factory_id}",
                "chain_type": f"eq.{chain_type}",
                "level": f"eq.{level}",
            })
        except Exception:
            row = None
        if not row:
            return None
        return {
            "level": row["level"],
            "threshold_min": row["threshold_min"],
            "role_label": row["role_label"],
            "notify_phone": row.get("notify_phone", ""),
        }

    def upsert_threshold(self, factory_id: str, chain_type: str, level: int,
                         threshold_min: int, role_label: str,
                         notify_phone: str = "") -> bool:
        existing = _client.select_one("escalation_config", {
            "factory_id": f"eq.{factory_id}",
            "chain_type": f"eq.{chain_type}",
            "level": f"eq.{level}",
        })
        data = {
            "factory_id": factory_id,
            "chain_type": chain_type,
            "level": level,
            "threshold_min": threshold_min,
            "role_label": role_label,
            "notify_phone": notify_phone,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
        try:
            if existing:
                _client.update("escalation_config", {
                    "factory_id": f"eq.{factory_id}",
                    "chain_type": f"eq.{chain_type}",
                    "level": f"eq.{level}",
                }, data)
            else:
                _client.insert("escalation_config", data)
            return True
        except Exception:
            return False

    def delete_threshold(self, factory_id: str, chain_type: str,
                         level: int) -> bool:
        return _client.delete("escalation_config", {
            "factory_id": f"eq.{factory_id}",
            "chain_type": f"eq.{chain_type}",
            "level": f"eq.{level}",
        })


# ---------------------------------------------------------------------------
# PartRequestRepository — consumables/spares chain
# ---------------------------------------------------------------------------

class SupabasePartRequestRepository:

    def _row_to_dict(self, row: dict) -> dict:
        return {
            "id": row.get("id", ""),
            "request_code": row.get("request_code", ""),
            "factory_id": row.get("factory_id", ""),
            "machine_id": row.get("machine_id", ""),
            "requested_by_phone": row.get("requested_by_phone", ""),
            "part_name": row.get("part_name", ""),
            "part_number": row.get("part_number", ""),
            "qty": row.get("qty", 1),
            "status": row.get("status", "open"),
            "stock_status": row.get("stock_status", ""),
            "issued_by": row.get("issued_by", ""),
            "issue_evidence_url": row.get("issue_evidence_url", ""),
            "po_vendor": row.get("po_vendor", ""),
            "po_amount": row.get("po_amount"),
            "po_approved_by": row.get("po_approved_by", ""),
            "linked_ticket_id": row.get("linked_ticket_id", ""),
            "current_escalation_level": row.get("current_escalation_level", 1),
            "next_escalation_at": str(row.get("next_escalation_at") or ""),
            "created_at": str(row.get("created_at", "")),
        }

    def create(self, data: dict) -> dict:
        code = f"PR{datetime.now(timezone.utc):%Y%m%d%H%M%S}-{secrets.token_hex(2)}"
        row = {
            "request_code": code,
            "factory_id": data.get("factory_id"),
            "machine_id": data.get("machine_id"),
            "requested_by_phone": data.get("requested_by_phone", ""),
            "part_name": data["part_name"],
            "part_number": data.get("part_number", ""),
            "qty": data.get("qty", 1),
            "linked_ticket_id": data.get("linked_ticket_id", ""),
        }
        _client.insert("part_requests", row)
        return {**row, "status": "open", "current_escalation_level": 1}

    def get(self, request_id: str) -> Optional[dict]:
        row = _client.select_one("part_requests", {"id": f"eq.{request_id}"})
        if not row:
            row = _client.select_one("part_requests",
                                     {"request_code": f"eq.{request_id}"})
        return self._row_to_dict(row) if row else None

    def list_by_factory(self, factory_id: str) -> List[dict]:
        rows = _client.select("part_requests", {
            "factory_id": f"eq.{factory_id}",
            "order": "created_at.desc",
        })
        return [self._row_to_dict(r) for r in rows]

    def update_status(self, request_id: str, status: str,
                      extras: Optional[dict] = None) -> bool:
        patch = {"status": status,
                 "updated_at": datetime.now(timezone.utc).isoformat()}
        if extras:
            patch.update(extras)
        try:
            _client.update("part_requests",
                           {"id": f"eq.{request_id}"}, patch)
            return True
        except Exception:
            return False

    def update_escalation(self, request_id: str, level: int,
                          next_at: str) -> bool:
        try:
            _client.update("part_requests", {"id": f"eq.{request_id}"}, {
                "current_escalation_level": level,
                "next_escalation_at": next_at,
            })
            return True
        except Exception:
            return False

    def get_open_escalatable(self) -> List[dict]:
        rows = _client.select("part_requests", {
            "status": "in.open,escalated,po_pending",
            "next_escalation_at": "not.is.null",
        })
        return [self._row_to_dict(r) for r in rows]


# ---------------------------------------------------------------------------
# EventRepository  →  events table
# ---------------------------------------------------------------------------

class SupabaseEventRepository(EventRepository):

    def _row_to_dict(self, row: dict) -> dict:
        return {
            "event_id": row.get("id", ""),
            "machine_id": "",
            "company_code": "",
            "ticket_id": row.get("ticket_id", ""),
            "event_type": row.get("event_type", ""),
            "timestamp": str(row.get("created_at", "")),
            "actor_phone": "",
            "description": row.get("message", ""),
            "media_type": "",
            "media_id": "",
            "language": "",
        }

    def append(self, row: dict) -> None:
        _client.insert("events", {
            "id": row.get("event_id", str(uuid.uuid4())),
            "ticket_id": row.get("ticket_id") or None,
            "event_type": row.get("event_type", ""),
            "message": row.get("description", ""),
        })

    def get_machine_events(self, machine_id: str) -> List[dict]:
        # Events in Supabase are linked to tickets, not machines directly.
        # Find tickets for the machine, then get events.
        tickets = _client.select("tickets", {"machine_id": f"eq.{machine_id}", "select": "id"})
        if not tickets:
            return []
        all_events = []
        for t in tickets:
            rows = _client.select("events", {
                "ticket_id": f"eq.{t['id']}",
                "order": "created_at.asc",
            })
            all_events.extend([self._row_to_dict(r) for r in rows])
        return all_events

    def get_company_events(self, company_code: str) -> List[dict]:
        factory_id = _factory_id_for_code(company_code)
        if not factory_id:
            return []
        tickets = _client.select("tickets", {
            "factory_id": f"eq.{factory_id}",
            "select": "id",
        })
        if not tickets:
            return []
        all_events = []
        for t in tickets:
            rows = _client.select("events", {"ticket_id": f"eq.{t['id']}"})
            all_events.extend([self._row_to_dict(r) for r in rows])
        return all_events


# ---------------------------------------------------------------------------
# DocumentRepository  →  documents table
# ---------------------------------------------------------------------------

class SupabaseDocumentRepository(DocumentRepository):

    def _row_to_dict(self, row: dict) -> dict:
        machine_id = row.get("machine_id") or ""
        company_code = ""
        if machine_id:
            machine = _client.select_one("machines", {"id": f"eq.{machine_id}", "select": "company_id"})
            if machine:
                company_code = _company_code_for_id(machine.get("company_id", ""))
        return {
            "document_id": row.get("id", ""),
            "company_code": company_code,
            "machine_id": machine_id,
            "category": row.get("category", ""),
            "title": row.get("title", ""),
            "file_name": row.get("file_name") or row.get("title", ""),
            "storage_path": row.get("storage_path") or row.get("file_url", ""),
            "uploaded_by": row.get("uploaded_by") or "",
            "uploaded_at": str(row.get("created_at", "")),
        }

    def next_document_id(self) -> str:
        return str(uuid.uuid4())

    def list(self, company_code: str, machine_id: Optional[str] = None) -> List[dict]:
        # Get all machines for this company first, then scope documents to
        # that set — a bare {"machine_id": ...} filter with no company check
        # let any caller pass another company's machine_id and read their
        # document metadata (titles, storage paths).
        company_id = _company_id_for_code(company_code)
        if not company_id:
            return []
        machines = _client.select("machines", {
            "company_id": f"eq.{company_id}",
            "select": "id",
        })
        if not machines:
            return []
        machine_ids = {m["id"] for m in machines}
        if machine_id:
            if machine_id not in machine_ids:
                return []
            rows = _client.select("documents", {"machine_id": f"eq.{machine_id}"})
        else:
            rows = []
            for m in machines:
                rows.extend(_client.select("documents", {"machine_id": f"eq.{m['id']}"}))
        return [self._row_to_dict(r) for r in rows]

    def get(self, document_id: str) -> Optional[dict]:
        row = _client.select_one("documents", {"id": f"eq.{document_id}"})
        return self._row_to_dict(row) if row else None

    def add(self, row: dict) -> None:
        _client.insert("documents", {
            "id": row.get("document_id", str(uuid.uuid4())),
            "machine_id": row.get("machine_id") or None,
            "title": row.get("title", row.get("file_name", "")),
            "category": row.get("category", "other"),
            "file_url": row.get("storage_path", ""),
            "file_name": row.get("file_name", ""),
            "storage_path": row.get("storage_path", ""),
            "uploaded_by": row.get("uploaded_by") or None,
        })

    def delete(self, document_id: str) -> bool:
        return _client.delete("documents", {"id": f"eq.{document_id}"})


# ---------------------------------------------------------------------------
# MachineRecordRepository → machine_records table
# ---------------------------------------------------------------------------

def _expand_encoded_json(value: str) -> str:
    """Supabase TEXT has no Excel cell limit, so persist readable JSON."""
    raw = str(value or "")
    if not raw.startswith("zlib:"):
        return raw
    try:
        return zlib.decompress(base64.b64decode(raw[5:])).decode("utf-8")
    except (ValueError, zlib.error):
        return raw

class SupabaseMachineRecordRepository(MachineRecordRepository):
    """Durable, tenant-scoped AI machine records stored in Supabase."""

    @staticmethod
    def _row_to_dict(row: dict) -> dict:
        company_code = _company_code_for_id(row.get("company_id") or "")
        return {
            key: row.get(key, "")
            for key in MACHINE_RECORDS_HEADER
            if key != "company_code"
        } | {"company_code": company_code}

    @staticmethod
    def _db_row(row: dict) -> dict:
        payload = {
            key: row.get(key)
            for key in MACHINE_RECORDS_HEADER
            if key != "company_code" and key in row
        }
        payload["company_id"] = _company_id_for_code(row.get("company_code", ""))
        if not payload.get("document_id"):
            payload["document_id"] = None
        if not payload.get("approved_at"):
            payload["approved_at"] = None
        if "extracted_json" in payload:
            payload["extracted_json"] = _expand_encoded_json(payload["extracted_json"])
        if "history_json" in payload:
            payload["history_json"] = _expand_encoded_json(payload["history_json"])
        return payload

    def next_record_id(self) -> str:
        return new_machine_record_id()

    def list(self, company_code: str, machine_id: Optional[str] = None,
             status: Optional[str] = None) -> List[dict]:
        company_id = _company_id_for_code(company_code)
        if not company_id:
            return []
        params = {"company_id": f"eq.{company_id}", "order": "updated_at.desc"}
        if machine_id:
            params["machine_id"] = f"eq.{machine_id}"
        if status:
            params["status"] = f"eq.{status}"
        return [self._row_to_dict(row) for row in _client.select("machine_records", params)]

    def get(self, record_id: str) -> Optional[dict]:
        row = _client.select_one("machine_records", {"record_id": f"eq.{record_id}"})
        return self._row_to_dict(row) if row else None

    def add(self, row: dict) -> None:
        _client.insert("machine_records", self._db_row(row))

    def update(self, record_id: str, updates: dict) -> bool:
        payload = {
            key: value for key, value in updates.items()
            if key in MACHINE_RECORDS_HEADER and key not in {"record_id", "company_code"}
        }
        if "extracted_json" in payload:
            payload["extracted_json"] = _expand_encoded_json(payload["extracted_json"])
        if "history_json" in payload:
            payload["history_json"] = _expand_encoded_json(payload["history_json"])
        if "approved_at" in payload and not payload["approved_at"]:
            payload["approved_at"] = None
        return bool(_client.update("machine_records", {"record_id": f"eq.{record_id}"}, payload))

    def find_by_hash(self, company_code: str, machine_id: str, file_hash: str) -> Optional[dict]:
        company_id = _company_id_for_code(company_code)
        if not company_id:
            return None
        row = _client.select_one("machine_records", {
            "company_id": f"eq.{company_id}",
            "machine_id": f"eq.{machine_id}",
            "file_hash": f"eq.{file_hash}",
        })
        return self._row_to_dict(row) if row else None


# ---------------------------------------------------------------------------
# PartsRepository  →  parts + consumables tables
# ---------------------------------------------------------------------------

class SupabasePartsRepository(PartsRepository):

    def _table(self, kind: str) -> str:
        return "consumables" if kind == "consumables" else "parts"

    def next_item_id(self, kind: str) -> str:
        return new_item_id(kind)

    def list_items(self, kind: str, company_code: str, machine_id: Optional[str] = None) -> List[dict]:
        table = self._table(kind)
        factory_id = _factory_id_for_code(company_code) or _company_id_for_code(company_code)
        if not factory_id:
            return []
        # machine_id must narrow the tenant-scoped query, never replace it — a
        # bare {"machine_id": ...} filter with no factory_id predicate let any
        # caller pass another company's machine_id and read their inventory.
        params = {"factory_id": f"eq.{factory_id}"}
        if machine_id:
            params["machine_id"] = f"eq.{machine_id}"
        rows = _client.select(table, params)
        result = []
        for r in rows:
            if kind == "consumables":
                result.append({
                    "consumable_id": r.get("id", ""),
                    "company_code": company_code,
                    "machine_id": r.get("machine_id", ""),
                    "name": r.get("name", ""),
                    "quantity_on_hand": r.get("stock_qty", 0),
                    "unit": r.get("unit", ""),
                    "reorder_level": r.get("reorder_level", 0),
                    "notes": "",
                })
            else:
                result.append({
                    "part_id": r.get("id", ""),
                    "company_code": company_code,
                    "machine_id": r.get("machine_id", ""),
                    "part_name": r.get("part_name", ""),
                    "part_number": r.get("part_number", ""),
                    "quantity_on_hand": r.get("stock_qty", 0),
                    "unit": r.get("unit", ""),
                    "reorder_level": r.get("reorder_level", 0),
                    "supplier": r.get("supplier", ""),
                    "notes": "",
                })
        return result

    def get_item(self, kind: str, item_id: str) -> Optional[dict]:
        row = _client.select_one(self._table(kind), {"id": f"eq.{item_id}"})
        if not row:
            return None
        # company_code must be the item's REAL owning company — callers
        # (see vault_router.py's update/delete spare-part & consumable
        # endpoints) gate access with user.assert_same_company(item[
        # "company_code"]), which only rejects cross-tenant access if this
        # is populated correctly. Leaving it "" made that check reject
        # everyone unconditionally (a functional break, not a leak, since
        # it fails closed) rather than actually enforcing the boundary.
        company_code = _company_code_for_factory_id(row.get("factory_id", ""))
        if kind == "consumables":
            return {
                "consumable_id": row.get("id", ""),
                "company_code": company_code,
                "machine_id": row.get("machine_id", ""),
                "name": row.get("name", ""),
                "quantity_on_hand": row.get("stock_qty", 0),
                "unit": row.get("unit", ""),
                "reorder_level": row.get("reorder_level", 0),
                "notes": "",
            }
        return {
            "part_id": row.get("id", ""),
            "company_code": company_code,
            "machine_id": row.get("machine_id", ""),
            "part_name": row.get("part_name", ""),
            "part_number": row.get("part_number", ""),
            "quantity_on_hand": row.get("stock_qty", 0),
            "unit": row.get("unit", ""),
            "reorder_level": row.get("reorder_level", 0),
            "supplier": row.get("supplier", ""),
            "notes": "",
        }

    def add_item(self, kind: str, row: dict) -> None:
        table = self._table(kind)
        company_code = row.get("company_code", "")
        factory_id = (_factory_id_for_code(company_code) or _company_id_for_code(company_code)) if company_code else None
        if kind == "consumables":
            _client.insert(table, {
                "id": row.get("consumable_id", str(uuid.uuid4())),
                "machine_id": row.get("machine_id") or None,
                "factory_id": factory_id,
                "name": row.get("name", ""),
                "unit": row.get("unit", "pcs"),
                "reorder_level": row.get("reorder_level", 0),
                "stock_qty": row.get("quantity_on_hand", 0),
            })
        else:
            _client.insert(table, {
                "id": row.get("part_id", str(uuid.uuid4())),
                "machine_id": row.get("machine_id") or None,
                "factory_id": factory_id,
                "part_name": row.get("part_name", ""),
                "part_number": row.get("part_number", ""),
                "unit": row.get("unit", "pcs"),
                "reorder_level": row.get("reorder_level", 0),
                "supplier": row.get("supplier", ""),
                "stock_qty": row.get("quantity_on_hand", 0),
            })

    def update_item(self, kind: str, item_id: str, updates: dict) -> bool:
        table = self._table(kind)
        patch = {}
        if kind == "consumables":
            for key in ("name", "unit", "reorder_level"):
                if key in updates:
                    patch[key] = updates[key]
            if "quantity_on_hand" in updates:
                patch["stock_qty"] = updates["quantity_on_hand"]
        else:
            for key in ("part_name", "part_number", "unit", "reorder_level", "supplier"):
                if key in updates:
                    patch[key] = updates[key]
            if "quantity_on_hand" in updates:
                patch["stock_qty"] = updates["quantity_on_hand"]
        if not patch:
            return True
        try:
            _client.update(table, {"id": f"eq.{item_id}"}, patch)
            return True
        except Exception:
            return False

    def delete_item(self, kind: str, item_id: str) -> bool:
        return _client.delete(self._table(kind), {"id": f"eq.{item_id}"})


# ---------------------------------------------------------------------------
# CustomKpiRepository — stub (no table in Supabase yet)
# ---------------------------------------------------------------------------

class SupabaseCustomKpiRepository(CustomKpiRepository):

    def list_kpis(self, company_code: str) -> List[dict]:
        return []

    def get_kpi(self, kpi_id: str) -> Optional[dict]:
        return None

    def add_kpi(self, row: dict) -> None:
        log.warning("CustomKpiRepository.add_kpi: table not in Supabase yet")

    def update_kpi(self, kpi_id: str, updates: dict) -> bool:
        return False

    def delete_kpi(self, kpi_id: str) -> bool:
        return False

    def list_data(self, company_code: str, kpi_id: Optional[str] = None, limit: int = 30) -> List[dict]:
        return []

    def add_data(self, row: dict) -> None:
        log.warning("CustomKpiRepository.add_data: table not in Supabase yet")


# ---------------------------------------------------------------------------
# SettingsRepository — stub (no table in Supabase yet)
# ---------------------------------------------------------------------------

class SupabaseSettingsRepository(SettingsRepository):

    def get(self, company_code: str) -> Optional[dict]:
        return None

    def upsert(self, row: dict) -> None:
        log.warning("SettingsRepository.upsert: table not in Supabase yet")


# ---------------------------------------------------------------------------
# TechnicianWorkRepository — stub (no table in Supabase yet)
# ---------------------------------------------------------------------------

class SupabaseTechnicianWorkRepository(TechnicianWorkRepository):

    def get(self, ticket_id: str) -> Optional[dict]:
        return None

    def list_company(self, company_code: str) -> List[dict]:
        return []

    def upsert(self, row: dict) -> None:
        log.warning("TechnicianWorkRepository.upsert: table not in Supabase yet")


# ---------------------------------------------------------------------------
# AIFeedbackRepository — tracks diagnosis accuracy per machine
# ---------------------------------------------------------------------------

class SupabaseAIFeedbackRepository:

    def record_feedback(self, factory_id: str, machine_id: str,
                        confirmed: bool) -> None:
        existing = _client.select_one("ai_feedback_stats", {
            "factory_id": f"eq.{factory_id}",
            "machine_id": f"eq.{machine_id}",
        })
        if existing:
            total = existing.get("total_diagnoses", 0) + 1
            conf = existing.get("confirmed", 0) + (1 if confirmed else 0)
            overr = existing.get("overridden", 0) + (0 if confirmed else 1)
            accuracy = round((conf / total) * 100, 2) if total > 0 else 0
            _client.update("ai_feedback_stats", {
                "factory_id": f"eq.{factory_id}",
                "machine_id": f"eq.{machine_id}",
            }, {
                "total_diagnoses": total,
                "confirmed": conf,
                "overridden": overr,
                "accuracy_pct": accuracy,
                "last_updated": datetime.now(timezone.utc).isoformat(),
            })
        else:
            conf = 1 if confirmed else 0
            overr = 0 if confirmed else 1
            _client.insert("ai_feedback_stats", {
                "factory_id": factory_id,
                "machine_id": machine_id,
                "total_diagnoses": 1,
                "confirmed": conf,
                "overridden": overr,
                "accuracy_pct": 100.0 if confirmed else 0.0,
                "last_updated": datetime.now(timezone.utc).isoformat(),
            })

    def get_accuracy(self, factory_id: str, machine_id: str) -> Optional[dict]:
        row = _client.select_one("ai_feedback_stats", {
            "factory_id": f"eq.{factory_id}",
            "machine_id": f"eq.{machine_id}",
        })
        if not row:
            return None
        return {
            "total_diagnoses": row.get("total_diagnoses", 0),
            "confirmed": row.get("confirmed", 0),
            "overridden": row.get("overridden", 0),
            "accuracy_pct": float(row.get("accuracy_pct", 0)),
        }

    def get_factory_stats(self, factory_id: str) -> List[dict]:
        rows = _client.select("ai_feedback_stats", {
            "factory_id": f"eq.{factory_id}",
            "order": "accuracy_pct.asc",
        })
        return [
            {
                "machine_id": r.get("machine_id", ""),
                "total_diagnoses": r.get("total_diagnoses", 0),
                "confirmed": r.get("confirmed", 0),
                "overridden": r.get("overridden", 0),
                "accuracy_pct": float(r.get("accuracy_pct", 0)),
            }
            for r in rows
        ]

    def confirm_diagnosis(self, ticket_id: str) -> bool:
        try:
            _client.update("tickets", {"id": f"eq.{ticket_id}"}, {
                "ai_diagnosis_confirmed": True,
            })
            return True
        except Exception:
            return False

    def override_diagnosis(self, ticket_id: str, reason: str) -> bool:
        try:
            _client.update("tickets", {"id": f"eq.{ticket_id}"}, {
                "ai_diagnosis_confirmed": False,
                "technician_override_reason": reason,
            })
            return True
        except Exception:
            return False


# ---------------------------------------------------------------------------
# ShiftConfigRepository — factory shift schedules
# ---------------------------------------------------------------------------

class SupabaseShiftConfigRepository:

    def get_shifts(self, factory_id: str) -> List[dict]:
        rows = _client.select("shift_config", {
            "factory_id": f"eq.{factory_id}",
            "order": "start_time.asc",
        })
        return [
            {
                "id": r.get("id", ""),
                "shift_name": r.get("shift_name", ""),
                "start_time": str(r.get("start_time", "")),
                "end_time": str(r.get("end_time", "")),
                "timezone": r.get("timezone", "Asia/Kolkata"),
            }
            for r in rows
        ]

    def upsert_shift(self, factory_id: str, shift_name: str,
                     start_time: str, end_time: str,
                     tz: str = "Asia/Kolkata") -> bool:
        existing = _client.select_one("shift_config", {
            "factory_id": f"eq.{factory_id}",
            "shift_name": f"eq.{shift_name}",
        })
        data = {
            "factory_id": factory_id,
            "shift_name": shift_name,
            "start_time": start_time,
            "end_time": end_time,
            "timezone": tz,
        }
        try:
            if existing:
                _client.update("shift_config", {
                    "factory_id": f"eq.{factory_id}",
                    "shift_name": f"eq.{shift_name}",
                }, data)
            else:
                _client.insert("shift_config", data)
            return True
        except Exception:
            return False

    def delete_shift(self, factory_id: str, shift_name: str) -> bool:
        return _client.delete("shift_config", {
            "factory_id": f"eq.{factory_id}",
            "shift_name": f"eq.{shift_name}",
        })
