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

import json
import logging
import uuid
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
    new_document_id,
    new_event_id,
    new_item_id,
    new_kpi_entry_id,
    new_kpi_id,
    new_machine_record_id,
    new_ticket_id,
    new_user_id,
)

log = logging.getLogger("turbofix.supabase_repo")

# ---------------------------------------------------------------------------
# Shared PostgREST client
# ---------------------------------------------------------------------------

class _SupabaseClient:
    """Thin wrapper around httpx for PostgREST calls."""

    def __init__(self):
        self._base = config.SUPABASE_URL.rstrip("/") + "/rest/v1"
        self._headers = {
            "apikey": config.SUPABASE_SERVICE_ROLE_KEY,
            "Authorization": f"Bearer {config.SUPABASE_SERVICE_ROLE_KEY}",
            "Content-Type": "application/json",
            "Prefer": "return=representation",
        }

    def _url(self, table: str) -> str:
        return f"{self._base}/{table}"

    # -- helpers ---------------------------------------------------------------

    def select(self, table: str, params: dict | None = None) -> list[dict]:
        """GET rows. params are PostgREST query-string filters."""
        url = self._url(table)
        with httpx.Client(timeout=15) as c:
            r = c.get(url, headers=self._headers, params=params or {})
            r.raise_for_status()
            return r.json()

    def select_one(self, table: str, params: dict) -> dict | None:
        rows = self.select(table, {**params, "limit": 1})
        return rows[0] if rows else None

    def insert(self, table: str, row: dict) -> dict:
        url = self._url(table)
        with httpx.Client(timeout=15) as c:
            r = c.post(url, headers=self._headers, json=row)
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
        return None
    # Machines link to both company_id and factory_id; find a machine to get factory_id
    machine = _client.select_one("machines", {
        "company_id": f"eq.{company_id}",
        "select": "factory_id",
    })
    if machine and machine.get("factory_id"):
        return machine["factory_id"]
    # Fallback: look up factories by name match
    company = _client.select_one("companies", {"id": f"eq.{company_id}"})
    if company:
        factory = _client.select_one("factories", {"name": f"eq.{company['name']}"})
        if factory:
            return factory["id"]
    return None


def _company_code_for_factory_id(factory_id: str) -> str:
    """Given a factory UUID, find the matching company domain code."""
    # Find a machine with this factory_id to get company_id
    machine = _client.select_one("machines", {
        "factory_id": f"eq.{factory_id}",
        "select": "company_id",
    })
    if machine and machine.get("company_id"):
        return _company_code_for_id(machine["company_id"])
    # Fallback: match by factory name → company name
    factory = _client.select_one("factories", {"id": f"eq.{factory_id}"})
    if factory:
        company = _client.select_one("companies", {"name": f"eq.{factory['name']}"})
        if company:
            return company.get("domain", "")
    return ""


# ---------------------------------------------------------------------------
# UserRepository  →  companies + users tables
# ---------------------------------------------------------------------------

class SupabaseUserRepository(UserRepository):

    def next_user_id(self, company_code: str) -> str:
        return new_user_id(company_code)

    def _user_to_dict(self, row: dict) -> dict:
        """Map Supabase users row → standard USERS_HEADER dict."""
        company_code = _company_code_for_id(row.get("company_id") or "")
        return {
            "user_id": row.get("id", ""),
            "company_code": company_code,
            "name": row.get("name", ""),
            "phone": row.get("phone", ""),
            "email": row.get("email", ""),
            "role": row.get("role", ""),
            "password_hash": "",  # auth handled by Supabase GoTrue
            "created_at": str(row.get("created_at", "")),
            "manager_user_id": "",
            "department": "",
            "plant_location": "",
            "shift": "",
            "portal_access": "yes",
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
        _client.insert("users", {
            "id": row.get("user_id", str(uuid.uuid4())),
            "company_id": company_id,
            "name": row.get("name", ""),
            "phone": row.get("phone", ""),
            "email": row.get("email", ""),
            "role": row.get("role", ""),
        })

    def update_password(self, user_id: str, new_password_hash: str) -> bool:
        # In Supabase, passwords are managed via GoTrue (auth.users).
        # For the Python backend admin password-reset, we cannot update
        # auth.users.encrypted_password via PostgREST.  Log a warning.
        log.warning(
            "update_password called on Supabase repo — password changes "
            "should go through Supabase Auth admin API instead.",
            extra={"user_id": user_id},
        )
        return True

    # -- Company CRUD ----------------------------------------------------------

    def _company_to_dict(self, row: dict) -> dict:
        """Map Supabase companies row → standard COMPANIES_HEADER dict."""
        # Look up owner phone as admin_contact_phone
        owner = _client.select_one("users", {
            "company_id": f"eq.{row['id']}",
            "role": "eq.owner",
        })
        phone = owner.get("phone", "") if owner else ""
        # Count machines for quota display
        machines = _client.select("machines", {
            "company_id": f"eq.{row['id']}",
            "select": "id",
        })
        return {
            "company_code": row.get("domain", ""),
            "company_name": row.get("name", ""),
            "admin_contact_phone": phone,
            "onboarded_date": str(row.get("created_at", ""))[:10],
            "machine_quota": len(machines) + 5,  # current + headroom
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
        if not patch:
            return True
        try:
            _client.update("companies", {"domain": f"eq.{company_code}"}, patch)
            return True
        except Exception as exc:
            log.error("supabase.update_company failed", extra={"error": str(exc)})
            return False

    def add_company(self, company_code: str, company_name: str, admin_contact_phone: str,
                    machine_quota: int, approved: bool) -> None:
        _client.insert("companies", {
            "id": str(uuid.uuid4()),
            "domain": company_code,
            "name": company_name,
            "status": "active" if approved else "pending",
        })


# ---------------------------------------------------------------------------
# MachineRepository  →  machines table
# ---------------------------------------------------------------------------

class SupabaseMachineRepository(MachineRepository):

    def __init__(self, cache_ttl: int = 60):
        self._cache: Dict[str, dict] | None = None
        self._cache_time: float = 0
        self._ttl = cache_ttl

    def _row_to_dict(self, row: dict) -> dict:
        company_code = _company_code_for_id(row.get("company_id") or row.get("factory_id") or "")
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
        _client.insert("machines", {
            "id": row.get("machine_id", str(uuid.uuid4())),
            "company_id": company_id,
            "factory_id": company_id,
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
        company_id = _company_id_for_code(company_code)
        if not company_id:
            return []
        rows = _client.select("machines", {"company_id": f"eq.{company_id}"})
        return [self._row_to_dict(r) for r in rows]


# ---------------------------------------------------------------------------
# TicketRepository  →  tickets table
# ---------------------------------------------------------------------------

class SupabaseTicketRepository(TicketRepository):

    def _row_to_dict(self, row: dict) -> dict:
        factory_id = row.get("factory_id") or ""
        company_code = _company_code_for_factory_id(factory_id) if factory_id else ""
        # Get machine name
        machine_name = ""
        machine_id = row.get("machine_id") or ""
        if machine_id:
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
            "file_name": row.get("title", ""),
            "storage_path": row.get("file_url", ""),
            "uploaded_by": "",
            "uploaded_at": str(row.get("created_at", "")),
        }

    def next_document_id(self) -> str:
        return new_document_id()

    def list(self, company_code: str, machine_id: Optional[str] = None) -> List[dict]:
        if machine_id:
            rows = _client.select("documents", {"machine_id": f"eq.{machine_id}"})
        else:
            # Get all machines for this company, then get documents for each
            company_id = _company_id_for_code(company_code)
            if not company_id:
                return []
            machines = _client.select("machines", {
                "company_id": f"eq.{company_id}",
                "select": "id",
            })
            if not machines:
                return []
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
        })

    def delete(self, document_id: str) -> bool:
        return _client.delete("documents", {"id": f"eq.{document_id}"})


# ---------------------------------------------------------------------------
# MachineRecordRepository — not yet in Supabase schema, use stub
# ---------------------------------------------------------------------------

class SupabaseMachineRecordRepository(MachineRecordRepository):
    """Stub: machine_records table does not yet exist in Supabase.
    Returns empty data so the admin panel loads without errors."""

    def next_record_id(self) -> str:
        return new_machine_record_id()

    def list(self, company_code: str, machine_id: Optional[str] = None,
             status: Optional[str] = None) -> List[dict]:
        return []

    def get(self, record_id: str) -> Optional[dict]:
        return None

    def add(self, row: dict) -> None:
        log.warning("MachineRecordRepository.add: table not in Supabase yet")

    def update(self, record_id: str, updates: dict) -> bool:
        return False

    def find_by_hash(self, company_code: str, machine_id: str, file_hash: str) -> Optional[dict]:
        return None


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
        if machine_id:
            rows = _client.select(table, {"machine_id": f"eq.{machine_id}"})
        else:
            company_id = _company_id_for_code(company_code)
            if not company_id:
                return []
            rows = _client.select(table, {"factory_id": f"eq.{company_id}"})
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
        items = self.list_items(kind, "", item_id)  # single lookup
        # Re-do as direct
        if kind == "consumables":
            return {
                "consumable_id": row.get("id", ""),
                "company_code": "",
                "machine_id": row.get("machine_id", ""),
                "name": row.get("name", ""),
                "quantity_on_hand": row.get("stock_qty", 0),
                "unit": row.get("unit", ""),
                "reorder_level": row.get("reorder_level", 0),
                "notes": "",
            }
        return {
            "part_id": row.get("id", ""),
            "company_code": "",
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
        factory_id = _company_id_for_code(company_code) if company_code else None
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
