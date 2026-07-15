"""Persistent technician work queue, evidence, submission, and approval workflow."""

import json
import mimetypes
from datetime import datetime, timezone
from pathlib import Path
from typing import Literal
from urllib.parse import quote

from fastapi import APIRouter, Depends, File, Form, HTTPException, Response, UploadFile
from pydantic import BaseModel, Field

from app.auth import CurrentUser, Role, get_current_user
from app.dependencies import get_machines, get_technician_work, get_tickets, get_users
from app.infrastructure.file_storage import FileStorage, get_file_storage
from app.repositories.base import (
    MachineRepository,
    TechnicianWorkRepository,
    TicketRepository,
    UserRepository,
    new_document_id,
)

router = APIRouter(prefix="/vault/technician", tags=["technician"])

CHECKLIST_SIZE = 4
EVIDENCE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".pdf", ".mp3", ".wav", ".m4a", ".aac", ".ogg"}
MAX_EVIDENCE_BYTES = 15 * 1024 * 1024


class WorkUpdate(BaseModel):
    status: Literal["assigned", "in_progress"] = "assigned"
    checklist: list[int] = Field(default_factory=list)
    notes: str = ""
    parts_used: str = ""


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _json_list(value) -> list:
    if isinstance(value, list):
        return value
    try:
        parsed = json.loads(value or "[]")
        return parsed if isinstance(parsed, list) else []
    except (TypeError, ValueError):
        return []


def _record_payload(record: dict | None) -> dict:
    if record is None:
        return {
            "status": "assigned", "checklist": [], "notes": "", "parts_used": "",
            "evidence": [], "started_at": "", "submitted_at": "", "reviewed_at": "",
            "reviewed_by": "",
        }
    return {
        "status": record.get("status") or "assigned",
        "checklist": _json_list(record.get("checklist_json")),
        "notes": record.get("notes") or "",
        "parts_used": record.get("parts_used") or "",
        "evidence": [
            {key: item.get(key, "") for key in ("evidence_id", "kind", "file_name", "uploaded_at", "uploaded_by")}
            for item in _json_list(record.get("evidence_json"))
        ],
        "started_at": record.get("started_at") or "",
        "submitted_at": record.get("submitted_at") or "",
        "reviewed_at": record.get("reviewed_at") or "",
        "reviewed_by": record.get("reviewed_by") or "",
    }


def _assert_ticket_access(
    ticket_id: str,
    user: CurrentUser,
    tickets: TicketRepository,
    machines: MachineRepository,
    users: UserRepository,
) -> dict:
    ticket = tickets.get(ticket_id)
    if ticket is None or ticket.get("company_code") != user.company_code:
        raise HTTPException(status_code=404, detail="ticket not found")
    if user.role != Role.MAINTENANCE_TECHNICIAN.value:
        return ticket
    profile = users.get_by_id(user.user_id)
    machine = machines.get(str(ticket.get("machine_id") or "").upper())
    assigned_phone = str((machine or {}).get("assigned_technician_phone") or "").strip()
    user_phone = str((profile or {}).get("phone") or "").strip()
    if not assigned_phone or assigned_phone != user_phone:
        raise HTTPException(status_code=403, detail="ticket is not assigned to this technician")
    return ticket


def _save_record(
    repository: TechnicianWorkRepository,
    ticket: dict,
    user: CurrentUser,
    payload: dict,
    existing: dict | None = None,
) -> dict:
    current = existing or {}
    row = {
        "ticket_id": ticket["ticket_id"],
        "company_code": user.company_code,
        "machine_id": ticket.get("machine_id", ""),
        "technician_user_id": current.get("technician_user_id") or user.user_id,
        "status": payload.get("status", current.get("status") or "assigned"),
        "checklist_json": json.dumps(payload.get("checklist", _json_list(current.get("checklist_json")))),
        "notes": payload.get("notes", current.get("notes") or ""),
        "parts_used": payload.get("parts_used", current.get("parts_used") or ""),
        "evidence_json": json.dumps(payload.get("evidence", _json_list(current.get("evidence_json")))),
        "started_at": payload.get("started_at", current.get("started_at") or ""),
        "submitted_at": payload.get("submitted_at", current.get("submitted_at") or ""),
        "reviewed_at": payload.get("reviewed_at", current.get("reviewed_at") or ""),
        "reviewed_by": payload.get("reviewed_by", current.get("reviewed_by") or ""),
        "updated_at": _now(),
    }
    repository.upsert(row)
    return row


@router.get("/work")
def list_work(
    user: CurrentUser = Depends(get_current_user),
    tickets: TicketRepository = Depends(get_tickets),
    machines: MachineRepository = Depends(get_machines),
    users: UserRepository = Depends(get_users),
    work: TechnicianWorkRepository = Depends(get_technician_work),
):
    queue = []
    for ticket in tickets.get_company_tickets(user.company_code):
        if str(ticket.get("status") or "Open").lower() != "open":
            continue
        try:
            _assert_ticket_access(ticket["ticket_id"], user, tickets, machines, users)
        except HTTPException as exc:
            if exc.status_code == 403:
                continue
            raise
        machine = machines.get(str(ticket.get("machine_id") or "").upper()) or {}
        queue.append({
            **ticket,
            "machine_location": machine.get("location") or "",
            "work": _record_payload(work.get(ticket["ticket_id"])),
        })
    return queue


@router.put("/work/{ticket_id}")
def update_work(
    ticket_id: str,
    body: WorkUpdate,
    user: CurrentUser = Depends(get_current_user),
    tickets: TicketRepository = Depends(get_tickets),
    machines: MachineRepository = Depends(get_machines),
    users: UserRepository = Depends(get_users),
    work: TechnicianWorkRepository = Depends(get_technician_work),
):
    ticket = _assert_ticket_access(ticket_id, user, tickets, machines, users)
    existing = work.get(ticket_id)
    if existing and existing.get("status") in {"submitted", "closed"}:
        raise HTTPException(status_code=409, detail="submitted work cannot be edited")
    checklist = sorted(set(index for index in body.checklist if 0 <= index < CHECKLIST_SIZE))
    started_at = (existing or {}).get("started_at") or (_now() if body.status == "in_progress" else "")
    saved = _save_record(work, ticket, user, {
        "status": body.status,
        "checklist": checklist,
        "notes": body.notes.strip(),
        "parts_used": body.parts_used.strip(),
        "started_at": started_at,
    }, existing)
    return _record_payload(saved)


@router.post("/work/{ticket_id}/submit")
def submit_work(
    ticket_id: str,
    user: CurrentUser = Depends(get_current_user),
    tickets: TicketRepository = Depends(get_tickets),
    machines: MachineRepository = Depends(get_machines),
    users: UserRepository = Depends(get_users),
    work: TechnicianWorkRepository = Depends(get_technician_work),
):
    ticket = _assert_ticket_access(ticket_id, user, tickets, machines, users)
    existing = work.get(ticket_id)
    if existing is None:
        raise HTTPException(status_code=409, detail="start the work before submitting it")
    checklist = sorted(set(_json_list(existing.get("checklist_json"))))
    if checklist != list(range(CHECKLIST_SIZE)) or not str(existing.get("notes") or "").strip():
        raise HTTPException(status_code=422, detail="complete all safety checks and add repair notes")
    saved = _save_record(work, ticket, user, {
        "status": "submitted",
        "submitted_at": _now(),
    }, existing)
    return _record_payload(saved)


@router.post("/work/{ticket_id}/approve")
def approve_work(
    ticket_id: str,
    user: CurrentUser = Depends(get_current_user),
    tickets: TicketRepository = Depends(get_tickets),
    machines: MachineRepository = Depends(get_machines),
    users: UserRepository = Depends(get_users),
    work: TechnicianWorkRepository = Depends(get_technician_work),
):
    user.assert_can_close_ticket()
    ticket = _assert_ticket_access(ticket_id, user, tickets, machines, users)
    existing = work.get(ticket_id)
    if existing is None or existing.get("status") != "submitted":
        raise HTTPException(status_code=409, detail="technician work must be submitted before approval")
    reviewed_by = user.name.strip() if user.name else user.user_id
    if not tickets.close_ticket(ticket_id, reviewed_by):
        raise HTTPException(status_code=409, detail="ticket could not be closed")
    saved = _save_record(work, ticket, user, {
        "status": "closed",
        "reviewed_at": _now(),
        "reviewed_by": reviewed_by,
    }, existing)
    return _record_payload(saved)


@router.post("/work/{ticket_id}/evidence")
async def upload_evidence(
    ticket_id: str,
    kind: Literal["photo", "voice", "document"] = Form(...),
    file: UploadFile = File(...),
    user: CurrentUser = Depends(get_current_user),
    tickets: TicketRepository = Depends(get_tickets),
    machines: MachineRepository = Depends(get_machines),
    users: UserRepository = Depends(get_users),
    work: TechnicianWorkRepository = Depends(get_technician_work),
    storage: FileStorage = Depends(get_file_storage),
):
    ticket = _assert_ticket_access(ticket_id, user, tickets, machines, users)
    content = await file.read(MAX_EVIDENCE_BYTES + 1)
    extension = Path(file.filename or "").suffix.lower()
    if extension not in EVIDENCE_EXTENSIONS:
        raise HTTPException(status_code=415, detail="unsupported evidence file type")
    if len(content) > MAX_EVIDENCE_BYTES:
        raise HTTPException(status_code=413, detail="evidence file exceeds 15 MB")
    evidence_id = new_document_id()
    storage_path = await storage.save(
        user.company_code,
        str(ticket.get("machine_id") or "unknown"),
        evidence_id,
        file.filename or f"evidence{extension}",
        content,
    )
    existing = work.get(ticket_id)
    evidence = _json_list((existing or {}).get("evidence_json"))
    evidence.append({
        "evidence_id": evidence_id,
        "kind": kind,
        "file_name": file.filename or f"evidence{extension}",
        "storage_path": storage_path,
        "uploaded_at": _now(),
        "uploaded_by": user.name or user.user_id,
    })
    saved = _save_record(work, ticket, user, {"evidence": evidence}, existing)
    return _record_payload(saved)


@router.get("/work/{ticket_id}/evidence/{evidence_id}")
async def download_evidence(
    ticket_id: str,
    evidence_id: str,
    user: CurrentUser = Depends(get_current_user),
    tickets: TicketRepository = Depends(get_tickets),
    machines: MachineRepository = Depends(get_machines),
    users: UserRepository = Depends(get_users),
    work: TechnicianWorkRepository = Depends(get_technician_work),
    storage: FileStorage = Depends(get_file_storage),
):
    _assert_ticket_access(ticket_id, user, tickets, machines, users)
    existing = work.get(ticket_id)
    item = next(
        (entry for entry in _json_list((existing or {}).get("evidence_json")) if entry.get("evidence_id") == evidence_id),
        None,
    )
    if item is None:
        raise HTTPException(status_code=404, detail="evidence not found")
    content = await storage.read(item["storage_path"])
    filename = item.get("file_name") or "evidence"
    media_type = mimetypes.guess_type(filename)[0] or "application/octet-stream"
    return Response(
        content=content,
        media_type=media_type,
        headers={"Content-Disposition": f"attachment; filename*=UTF-8''{quote(filename)}"},
    )
