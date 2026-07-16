"""Vault router — machines, documents, spare parts, and consumables.

Thin HTTP adapter; all business logic lives in services/vault_service.py.
"""

import json
import mimetypes
from datetime import datetime, timezone
from typing import Optional, List
from urllib.parse import quote

from fastapi import APIRouter, Depends, File, Form, HTTPException, Response, UploadFile
from pydantic import BaseModel

from app import config
from app.auth import CurrentUser, get_current_user
from app.dependencies import get_documents, get_machine_records, get_machines, get_parts, get_settings, get_tickets, get_users
from app.infrastructure.file_storage import FileStorage, get_file_storage
from app.repositories.base import DocumentRepository, MachineRecordRepository, MachineRepository, PartsRepository, SettingsRepository, TicketRepository, UserRepository
from app.services import vault_service
from app.services.machine_data_service import build_machine_data, machine_data_path

from app.infrastructure.logging import get_logger

log = get_logger("turbofix.vault_router")
router = APIRouter(prefix="/vault")


# ---------------------------------------------------------------------------
# Machines
# ---------------------------------------------------------------------------

@router.get("/machines")
def list_machines(
    user: CurrentUser = Depends(get_current_user),
    machines: MachineRepository = Depends(get_machines),
):
    from urllib.parse import quote
    all_machines = machines.load()
    out = []
    for machine_id, machine in all_machines.items():
        if machine["company_code"] == user.company_code:
            wa_link = None
            if config.WHATSAPP_DISPLAY_NUMBER:
                text = quote(f"Issue with {machine_id}: ")
                wa_link = f"https://wa.me/{config.WHATSAPP_DISPLAY_NUMBER}?text={text}"
            out.append({"machine_id": machine_id, "wa_link": wa_link, **machine})
    return out


class MachineIn(BaseModel):
    machine_name: str
    location: str = ""
    assigned_technician_phone: str
    informed_phone_1: str = ""
    informed_phone_2: str = ""
    informed_phone_3: str = ""


def _company_quota(company: dict) -> int:
    try:
        return int(str(company.get("machine_quota") or 0).strip())
    except (ValueError, TypeError):
        return 0


def _company_approved(company: dict) -> bool:
    return str(company.get("approved") or "").strip().lower() in {"yes", "true", "1"}


@router.post("/machines", status_code=201)
def create_machine(
    body: MachineIn,
    user: CurrentUser = Depends(get_current_user),
    machines: MachineRepository = Depends(get_machines),
):
    """Self-service machine onboarding — generates TF-{company}-Mnnn ID."""
    from app.dependencies import get_users

    user.assert_can_write()

    users_repo = get_users()
    company = users_repo.get_company(user.company_code)
    if company is None:
        raise HTTPException(status_code=404, detail="company not found")

    if not _company_approved(company):
        raise HTTPException(
            status_code=403,
            detail="Your company is pending TurboFix approval.",
        )

    quota = _company_quota(company)
    used = len(machines.get_company_machines(user.company_code))
    if used >= quota:
        raise HTTPException(
            status_code=402,
            detail=f"You've reached your plan's limit of {quota} machine(s). "
                   "Please upgrade your subscription to onboard more machines.",
        )

    machine_code = machines.next_machine_code(user.company_code)
    machine_id = f"TF-{user.company_code}-{machine_code}"
    row = {"machine_id": machine_id, "company_code": user.company_code, **body.model_dump()}
    machines.create(row)

    wa_link = None
    if config.WHATSAPP_DISPLAY_NUMBER:
        text = quote(f"Issue with {machine_id}: ")
        wa_link = f"https://wa.me/{config.WHATSAPP_DISPLAY_NUMBER}?text={text}"

    return {**row, "wa_link": wa_link, "machine_quota": quota, "machines_used": used + 1}


# ---------------------------------------------------------------------------
# Documents
# ---------------------------------------------------------------------------

@router.get("/documents")
def list_documents(
    machine_id: Optional[str] = None,
    user: CurrentUser = Depends(get_current_user),
    documents: DocumentRepository = Depends(get_documents),
):
    return documents.list(user.company_code, machine_id)


@router.post("/documents", status_code=201)
async def upload_document(
    machine_id: str = Form(...),
    category: str = Form(...),
    title: str = Form(...),
    file: UploadFile = File(...),
    user: CurrentUser = Depends(get_current_user),
    machines: MachineRepository = Depends(get_machines),
    documents: DocumentRepository = Depends(get_documents),
    parts: PartsRepository = Depends(get_parts),
    records: MachineRecordRepository = Depends(get_machine_records),
):
    content = await file.read()
    storage = get_file_storage()
    row = await vault_service.upload_document(
        user=user, machine_id=machine_id, category=category, title=title,
        filename=file.filename, content=content,
        machines=machines, documents=documents, storage=storage,
    )
    machine = machines.get(machine_id)
    machine = {**machine, "machine_id": machine_id}
    machine_data = await build_machine_data(
        machine=machine, documents=documents, parts=parts, records=records, storage=storage,
    )
    return {**row, "machine_data": machine_data}


@router.get("/machines/{machine_id}/machine-data")
async def get_machine_data(
    machine_id: str,
    user: CurrentUser = Depends(get_current_user),
    machines: MachineRepository = Depends(get_machines),
    documents: DocumentRepository = Depends(get_documents),
    parts: PartsRepository = Depends(get_parts),
    records: MachineRecordRepository = Depends(get_machine_records),
):
    machine = machines.get(machine_id)
    if machine is None or machine.get("company_code") != user.company_code:
        raise HTTPException(status_code=404, detail="machine not found")
    machine = {**machine, "machine_id": machine_id}
    path = machine_data_path(machine)
    data = await build_machine_data(
        machine=machine, documents=documents, parts=parts, records=records, storage=get_file_storage(),
    )
    return {**data, "exists": path.exists(), "approval_required": bool(data["missing_sections"])}


class MachineDataEnrichmentApproval(BaseModel):
    approved: bool


@router.post("/machines/{machine_id}/machine-data/enrich")
async def enrich_machine_data(
    machine_id: str,
    body: MachineDataEnrichmentApproval,
    user: CurrentUser = Depends(get_current_user),
    machines: MachineRepository = Depends(get_machines),
    documents: DocumentRepository = Depends(get_documents),
    parts: PartsRepository = Depends(get_parts),
    records: MachineRecordRepository = Depends(get_machine_records),
):
    if not body.approved:
        raise HTTPException(status_code=400, detail="explicit approval is required before internet enrichment")
    machine = machines.get(machine_id)
    if machine is None or machine.get("company_code") != user.company_code:
        raise HTTPException(status_code=404, detail="machine not found")
    machine = {**machine, "machine_id": machine_id}
    return await build_machine_data(
        machine=machine, documents=documents, parts=parts, records=records,
        storage=get_file_storage(), internet=True,
    )


@router.get("/documents/{document_id}/download")
async def download_document(
    document_id: str,
    user: CurrentUser = Depends(get_current_user),
    documents: DocumentRepository = Depends(get_documents),
):
    storage = get_file_storage()
    content, filename = await vault_service.download_document(
        document_id=document_id, user=user, documents=documents, storage=storage,
    )
    safe_filename = filename.replace('"', "").replace("\\", "_").replace("\r", "").replace("\n", "")
    media_type = mimetypes.guess_type(safe_filename)[0] or "application/octet-stream"
    encoded_filename = quote(safe_filename)
    return Response(
        content=content, media_type=media_type,
        headers={
            "Content-Disposition": f"attachment; filename*=UTF-8''{encoded_filename}",
            "X-Content-Type-Options": "nosniff",
        },
    )


@router.delete("/documents/{document_id}", status_code=204)
async def delete_document(
    document_id: str,
    user: CurrentUser = Depends(get_current_user),
    documents: DocumentRepository = Depends(get_documents),
):
    user.assert_can_write()
    storage = get_file_storage()
    await vault_service.delete_document(
        document_id=document_id, user=user, documents=documents, storage=storage,
    )
    return Response(status_code=204)


# ---------------------------------------------------------------------------
# Spare parts
# ---------------------------------------------------------------------------

class SparePartIn(BaseModel):
    machine_id: str
    part_name: str
    part_number: str = ""
    quantity_on_hand: float = 0
    unit: str = ""
    reorder_level: float = 0
    supplier: str = ""
    notes: str = ""


class SparePartUpdate(BaseModel):
    part_name: Optional[str] = None
    part_number: Optional[str] = None
    quantity_on_hand: Optional[float] = None
    unit: Optional[str] = None
    reorder_level: Optional[float] = None
    supplier: Optional[str] = None
    notes: Optional[str] = None


@router.get("/spare-parts")
def list_spare_parts(
    machine_id: Optional[str] = None,
    user: CurrentUser = Depends(get_current_user),
    parts: PartsRepository = Depends(get_parts),
):
    return parts.list_items("spare_parts", user.company_code, machine_id)


@router.post("/spare-parts", status_code=201)
async def create_spare_part(
    body: SparePartIn,
    user: CurrentUser = Depends(get_current_user),
    machines: MachineRepository = Depends(get_machines),
    parts: PartsRepository = Depends(get_parts),
    documents: DocumentRepository = Depends(get_documents),
    records: MachineRecordRepository = Depends(get_machine_records),
):
    user.assert_can_write()
    machine = machines.get(body.machine_id)
    if machine is None or machine["company_code"] != user.company_code:
        raise HTTPException(status_code=404, detail="machine not found")
    machine = {**machine, "machine_id": body.machine_id}
    part_id = parts.next_item_id("spare_parts")
    row = {"part_id": part_id, "company_code": user.company_code, **body.model_dump()}
    parts.add_item("spare_parts", row)
    machine_data = await build_machine_data(
        machine=machine, documents=documents, parts=parts, records=records, storage=get_file_storage(),
    )
    return {**row, "machine_data": machine_data}


@router.patch("/spare-parts/{part_id}")
def update_spare_part(
    part_id: str,
    body: SparePartUpdate,
    user: CurrentUser = Depends(get_current_user),
    parts: PartsRepository = Depends(get_parts),
):
    item = parts.get_item("spare_parts", part_id)
    if item is None:
        raise HTTPException(status_code=404, detail="not found")
    user.assert_same_company(item["company_code"])
    user.assert_can_write()
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    parts.update_item("spare_parts", part_id, updates)
    return parts.get_item("spare_parts", part_id)


@router.delete("/spare-parts/{part_id}", status_code=204)
def delete_spare_part(
    part_id: str,
    user: CurrentUser = Depends(get_current_user),
    parts: PartsRepository = Depends(get_parts),
):
    user.assert_can_write()
    item = parts.get_item("spare_parts", part_id)
    if item is None:
        raise HTTPException(status_code=404, detail="not found")
    user.assert_same_company(item["company_code"])
    parts.delete_item("spare_parts", part_id)
    return Response(status_code=204)


# ---------------------------------------------------------------------------
# Consumables
# ---------------------------------------------------------------------------

class ConsumableIn(BaseModel):
    machine_id: str
    name: str
    quantity_on_hand: float = 0
    unit: str = ""
    reorder_level: float = 0
    notes: str = ""


class ConsumableUpdate(BaseModel):
    name: Optional[str] = None
    quantity_on_hand: Optional[float] = None
    unit: Optional[str] = None
    reorder_level: Optional[float] = None
    notes: Optional[str] = None


@router.get("/consumables")
def list_consumables(
    machine_id: Optional[str] = None,
    user: CurrentUser = Depends(get_current_user),
    parts: PartsRepository = Depends(get_parts),
):
    return parts.list_items("consumables", user.company_code, machine_id)


@router.post("/consumables", status_code=201)
async def create_consumable(
    body: ConsumableIn,
    user: CurrentUser = Depends(get_current_user),
    machines: MachineRepository = Depends(get_machines),
    parts: PartsRepository = Depends(get_parts),
    documents: DocumentRepository = Depends(get_documents),
    records: MachineRecordRepository = Depends(get_machine_records),
):
    user.assert_can_write()
    machine = machines.get(body.machine_id)
    if machine is None or machine["company_code"] != user.company_code:
        raise HTTPException(status_code=404, detail="machine not found")
    machine = {**machine, "machine_id": body.machine_id}
    consumable_id = parts.next_item_id("consumables")
    row = {"consumable_id": consumable_id, "company_code": user.company_code, **body.model_dump()}
    parts.add_item("consumables", row)
    machine_data = await build_machine_data(
        machine=machine, documents=documents, parts=parts, records=records, storage=get_file_storage(),
    )
    return {**row, "machine_data": machine_data}


@router.patch("/consumables/{consumable_id}")
def update_consumable(
    consumable_id: str,
    body: ConsumableUpdate,
    user: CurrentUser = Depends(get_current_user),
    parts: PartsRepository = Depends(get_parts),
):
    item = parts.get_item("consumables", consumable_id)
    if item is None:
        raise HTTPException(status_code=404, detail="not found")
    user.assert_same_company(item["company_code"])
    user.assert_can_write()
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    parts.update_item("consumables", consumable_id, updates)
    return parts.get_item("consumables", consumable_id)


@router.delete("/consumables/{consumable_id}", status_code=204)
def delete_consumable(
    consumable_id: str,
    user: CurrentUser = Depends(get_current_user),
    parts: PartsRepository = Depends(get_parts),
):
    user.assert_can_write()
    item = parts.get_item("consumables", consumable_id)
    if item is None:
        raise HTTPException(status_code=404, detail="not found")
    user.assert_same_company(item["company_code"])
    parts.delete_item("consumables", consumable_id)
    return Response(status_code=204)


# ---------------------------------------------------------------------------
# Tickets & Team
# ---------------------------------------------------------------------------

@router.get("/tickets")
def list_tickets(
    user: CurrentUser = Depends(get_current_user),
    tickets: TicketRepository = Depends(get_tickets),
):
    all_tickets = tickets.get_company_tickets(user.company_code)
    return sorted(all_tickets, key=lambda t: t.get("reported_at") or "", reverse=True)


@router.post("/tickets/{ticket_id}/close")
def close_ticket_endpoint(
    ticket_id: str,
    user: CurrentUser = Depends(get_current_user),
    tickets: TicketRepository = Depends(get_tickets),
):
    user.assert_can_close_ticket()
    ticket = tickets.get(ticket_id)
    if ticket is None or ticket.get("company_code") != user.company_code:
        raise HTTPException(status_code=404, detail="ticket not found")

    if ticket.get("status") == "Closed":
        return {"status": "already_closed", "ticket_id": ticket_id}

    closed_by = user.name.strip() if user.name else user.user_id
    if not tickets.close_ticket(ticket_id, closed_by):
        raise HTTPException(status_code=409, detail="ticket could not be closed")
    return {"status": "closed", "ticket_id": ticket_id}


@router.get("/team")
def list_team(
    user: CurrentUser = Depends(get_current_user),
    users_repo: UserRepository = Depends(get_users),
):
    all_users = users_repo.list_users()
    return [
        {
            "user_id": u["user_id"],
            "name": u["name"],
            "phone": u.get("phone", ""),
            "email": u.get("email", ""),
            "role": u["role"],
            "created_at": u.get("created_at", "")
        }
        for u in all_users if u.get("company_code") == user.company_code
    ]


# ---------------------------------------------------------------------------
# Company-scoped roles and escalation configuration
# ---------------------------------------------------------------------------

DEFAULT_ESCALATION_PATH = [
    {"role": "maintenance_technician", "label": "Maintenance Technician", "threshold_hours": 2},
    {"role": "supervisor", "label": "Maintenance Supervisor", "threshold_hours": 2},
    {"role": "maintenance_engineer", "label": "Maintenance Engineer", "threshold_hours": 2},
    {"role": "maintenance_head", "label": "Maintenance Head", "threshold_hours": 2},
    {"role": "owner", "label": "Owner / Plant Director", "threshold_hours": None},
]


def _read_company_settings(settings: SettingsRepository, company_code: str) -> dict:
    row = settings.get(company_code)
    if row is None:
        return {"escalation_path": DEFAULT_ESCALATION_PATH, "custom_roles": []}
    try:
        escalation_path = json.loads(row.get("escalation_path_json") or "[]")
        custom_roles = json.loads(row.get("custom_roles_json") or "[]")
    except (TypeError, ValueError):
        log.warning("settings.invalid_json", company_code=company_code)
        return {"escalation_path": DEFAULT_ESCALATION_PATH, "custom_roles": []}
    return {
        "escalation_path": escalation_path or DEFAULT_ESCALATION_PATH,
        "custom_roles": custom_roles if isinstance(custom_roles, list) else [],
    }


def _write_company_settings(
    settings: SettingsRepository,
    company_code: str,
    payload: dict,
) -> None:
    settings.upsert({
        "company_code": company_code,
        "escalation_path_json": json.dumps(payload["escalation_path"]),
        "custom_roles_json": json.dumps(payload["custom_roles"]),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    })


@router.get("/escalation")
def get_escalation_path(
    user: CurrentUser = Depends(get_current_user),
    settings: SettingsRepository = Depends(get_settings),
):
    cfg = _read_company_settings(settings, user.company_code)
    return cfg.get("escalation_path", [])


class EscalationStep(BaseModel):
    role: str
    label: str
    threshold_hours: Optional[float] = None


@router.post("/escalation")
def update_escalation_path(
    body: List[EscalationStep],
    user: CurrentUser = Depends(get_current_user),
    settings: SettingsRepository = Depends(get_settings),
):
    user.assert_can_manage_escalation()
    cfg = _read_company_settings(settings, user.company_code)
    cfg["escalation_path"] = [step.model_dump() for step in body]
    _write_company_settings(settings, user.company_code, cfg)
    return {"status": "success", "escalation_path": cfg["escalation_path"]}


@router.get("/custom-roles")
def get_custom_roles(
    user: CurrentUser = Depends(get_current_user),
    settings: SettingsRepository = Depends(get_settings),
):
    cfg = _read_company_settings(settings, user.company_code)
    return cfg.get("custom_roles", [])


@router.post("/custom-roles")
def add_custom_role(
    body: dict,
    user: CurrentUser = Depends(get_current_user),
    settings: SettingsRepository = Depends(get_settings),
):
    user.assert_owner()
    cfg = _read_company_settings(settings, user.company_code)
    role_name = body.get("role_name", "").strip().lower().replace(" ", "_")
    role_label = body.get("role_label", "").strip()
    if not role_name or not role_label:
        raise HTTPException(status_code=400, detail="role_name and role_label are required")
    
    # Check duplicate
    if any(r["role_name"] == role_name for r in cfg.get("custom_roles", [])):
        raise HTTPException(status_code=409, detail="Role already exists")
        
    cfg.setdefault("custom_roles", []).append({
        "role_name": role_name,
        "role_label": role_label
    })
    _write_company_settings(settings, user.company_code, cfg)
    return cfg["custom_roles"]


@router.delete("/custom-roles/{role_name}")
def delete_custom_role(
    role_name: str,
    user: CurrentUser = Depends(get_current_user),
    settings: SettingsRepository = Depends(get_settings),
):
    user.assert_owner()
    cfg = _read_company_settings(settings, user.company_code)
    roles = cfg.get("custom_roles", [])
    new_roles = [r for r in roles if r["role_name"] != role_name]
    if len(roles) == len(new_roles):
        raise HTTPException(status_code=404, detail="Role not found")
    cfg["custom_roles"] = new_roles
    _write_company_settings(settings, user.company_code, cfg)
    return {"status": "success"}
