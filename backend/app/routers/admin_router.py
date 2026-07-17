"""Admin router — internal TurboFix platform operations console."""

import secrets

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import HTMLResponse
from pydantic import BaseModel
from typing import Optional

from app import config
from app.admin_page import ADMIN_HTML
from app.auth import create_admin_token, get_current_admin, Role, hash_password, validate_password_strength
from app.dependencies import (
    get_custom_kpis,
    get_documents,
    get_machine_records,
    get_machines,
    get_parts,
    get_settings,
    get_technician_work,
    get_tickets,
    get_users,
)
from app.infrastructure.logging import get_logger
from app.infrastructure.rate_limit import limiter
from app.services.contact_access_service import company_hierarchy, mask_email, mask_phone
from app.repositories.base import (
    CustomKpiRepository,
    DocumentRepository,
    MachineRecordRepository,
    MachineRepository,
    PartsRepository,
    SettingsRepository,
    TechnicianWorkRepository,
    TicketRepository,
    UserRepository,
)
from app.services.dashboard_service import build_custom_kpi_values, compute_kpis

log = get_logger("turbofix.admin")
router = APIRouter(prefix="/admin")


def _company_quota(company: dict) -> int:
    try:
        return int(str(company.get("machine_quota") or 0).strip())
    except (ValueError, TypeError):
        return 0


def _company_approved(company: dict) -> bool:
    return str(company.get("approved") or "").strip().lower() in {"yes", "true", "1"}


def _is_closed(ticket: dict) -> bool:
    return str(ticket.get("status") or "").strip().lower() == "closed"


def _is_critical(ticket: dict) -> bool:
    return str(ticket.get("urgency") or "").strip().lower() in {"critical", "high", "urgent"}


def _latest(*values: str) -> str:
    return max((str(value or "").strip() for value in values), default="")


class AdminLoginRequest(BaseModel):
    password: str


class AdminPasswordResetRequest(BaseModel):
    new_password: str


@router.post("/login")
@limiter.limit("3/minute")
def admin_login(request: Request, body: AdminLoginRequest):
    if not secrets.compare_digest(body.password, config.PLATFORM_ADMIN_PASSWORD):
        raise HTTPException(status_code=401, detail="incorrect admin password")
    return {"access_token": create_admin_token(), "token_type": "bearer"}


@router.get("/companies")
def admin_list_companies(
    _: bool = Depends(get_current_admin),
    users: UserRepository = Depends(get_users),
    machines: MachineRepository = Depends(get_machines),
    tickets: TicketRepository = Depends(get_tickets),
    documents: DocumentRepository = Depends(get_documents),
    records: MachineRecordRepository = Depends(get_machine_records),
):
    out = []
    all_users = users.list_users()
    for c in users.list_companies():
        code = c.get("company_code")
        company_machines = machines.get_company_machines(code) if code else []
        company_tickets = tickets.get_company_tickets(code) if code else []
        company_documents = documents.list(code) if code else []
        company_records = records.list(code) if code else []
        quota = _company_quota(c)
        machines_used = len(company_machines)
        open_tickets = [ticket for ticket in company_tickets if not _is_closed(ticket)]
        critical_tickets = [ticket for ticket in open_tickets if _is_critical(ticket)]
        pending_records = [
            record for record in company_records
            if str(record.get("status") or "").strip().lower() == "needs_review"
        ]
        approved_records = [
            record for record in company_records
            if str(record.get("status") or "").strip().lower() == "approved"
        ]
        capacity_percent = round((machines_used / quota) * 100) if quota else 0
        needs_attention = (
            not _company_approved(c)
            or machines_used > quota
            or (quota > 0 and capacity_percent >= 80)
            or bool(critical_tickets)
            or bool(pending_records)
        )
        out.append({
            "company_code": code,
            "company_name": c.get("company_name"),
            "admin_contact_phone": c.get("admin_contact_phone"),
            "onboarded_date": str(c.get("onboarded_date") or ""),
            "machine_quota": quota,
            "approved": _company_approved(c),
            "machines_used": machines_used,
            "capacity_percent": capacity_percent,
            "user_count": sum(1 for user in all_users if user.get("company_code") == code),
            "open_tickets": len(open_tickets),
            "critical_tickets": len(critical_tickets),
            "document_count": len(company_documents),
            "pending_records": len(pending_records),
            "approved_records": len(approved_records),
            "needs_attention": needs_attention,
            "last_activity": _latest(
                *(ticket.get("reported_at", "") for ticket in company_tickets),
                *(document.get("uploaded_at", "") for document in company_documents),
                *(record.get("updated_at", "") or record.get("created_at", "") for record in company_records),
            ),
        })
    return sorted(
        out,
        key=lambda company: (
            company["approved"],
            not company["needs_attention"],
            company["company_name"] or "",
        ),
    )


@router.get("/companies/{company_code}/dashboard")
def admin_company_dashboard(
    company_code: str,
    _: bool = Depends(get_current_admin),
    users: UserRepository = Depends(get_users),
    tickets: TicketRepository = Depends(get_tickets),
    machines: MachineRepository = Depends(get_machines),
    kpi_repo: CustomKpiRepository = Depends(get_custom_kpis),
):
    company = users.get_company(company_code)
    if company is None:
        raise HTTPException(status_code=404, detail="company not found")

    result = compute_kpis(
        company_code=company_code,
        company_name=company.get("company_name", ""),
        tickets_repo=tickets,
        machines_repo=machines,
    )
    kpi_configs = kpi_repo.list_kpis(company_code)
    result["custom_kpis"] = build_custom_kpi_values(
        company_code,
        kpi_configs,
        kpi_repo.list_data(company_code),
        result.get("auto_insights", {}),
        result.get("kpis", {}),
    ) if kpi_configs else []
    return result


@router.get("/companies/{company_code}/users")
def admin_company_users(
    company_code: str,
    _: bool = Depends(get_current_admin),
    users: UserRepository = Depends(get_users),
):
    if users.get_company(company_code) is None:
        raise HTTPException(status_code=404, detail="company not found")
    company_users = [
        {
            "user_id": user.get("user_id"),
            "name": user.get("name"),
            "phone": user.get("phone"),
            "email": user.get("email"),
            "role": user.get("role"),
            "created_at": str(user.get("created_at") or ""),
        }
        for user in users.list_users()
        if user.get("company_code") == company_code
    ]
    return {"company_code": company_code, "users": company_users}


@router.get("/companies/{company_code}/workspace-preview")
def admin_company_workspace_preview(
    company_code: str,
    _: bool = Depends(get_current_admin),
    users: UserRepository = Depends(get_users),
    machines: MachineRepository = Depends(get_machines),
    tickets: TicketRepository = Depends(get_tickets),
    documents: DocumentRepository = Depends(get_documents),
    records: MachineRecordRepository = Depends(get_machine_records),
    parts: PartsRepository = Depends(get_parts),
    settings: SettingsRepository = Depends(get_settings),
    technician_work: TechnicianWorkRepository = Depends(get_technician_work),
):
    """Return a safe, read-only representation of the customer's workspace."""
    company = users.get_company(company_code)
    if company is None:
        raise HTTPException(status_code=404, detail="company not found")

    raw_company_machines = machines.get_company_machines(company_code)
    company_tickets = tickets.get_company_tickets(company_code)
    company_documents = documents.list(company_code)
    company_records = records.list(company_code)
    raw_company_users = company_hierarchy([
        user
        for user in users.list_users()
        if user.get("company_code") == company_code
    ])
    users_by_id = {str(user.get("user_id") or ""): user for user in raw_company_users}
    users_by_phone = {
        str(user.get("phone") or "").strip(): user
        for user in raw_company_users
        if str(user.get("phone") or "").strip()
    }

    def masked_assignment(phone: str | None) -> dict | None:
        value = str(phone or "").strip()
        if not value:
            return None
        assigned_user = users_by_phone.get(value)
        return {
            "name": assigned_user.get("name", "Assigned contact") if assigned_user else "Assigned contact",
            "role": assigned_user.get("role", "") if assigned_user else "",
            "phone_masked": mask_phone(value),
        }

    def masked_assignments(machine: dict) -> dict:
        assignments = {
            "technician": masked_assignment(machine.get("assigned_technician_phone")),
            "supervisor": None,
            "engineer": None,
            "maintenance_head": None,
        }
        role_keys = {
            "supervisor": "supervisor",
            "maintenance_engineer": "engineer",
            "maintenance_head": "maintenance_head",
        }
        for fallback_key, phone in zip(
            ["supervisor", "engineer", "maintenance_head"],
            [machine.get("informed_phone_1"), machine.get("informed_phone_2"), machine.get("informed_phone_3")],
        ):
            entry = masked_assignment(phone)
            if entry is None:
                continue
            actual_key = role_keys.get(entry.get("role"))
            destination = actual_key if actual_key and assignments[actual_key] is None else fallback_key
            if assignments[destination] is None:
                assignments[destination] = entry
        return assignments

    company_machines = [
        {
            "machine_id": machine.get("machine_id", ""),
            "company_code": machine.get("company_code", ""),
            "machine_name": machine.get("machine_name", ""),
            "location": machine.get("location", ""),
            "has_open_tickets": machine.get("has_open_tickets", False),
            "assignments": masked_assignments(machine),
        }
        for machine in raw_company_machines
    ]
    company_users = [
        {
            "user_id": user.get("user_id"),
            "name": user.get("name"),
            "phone_masked": mask_phone(user.get("phone")),
            "email_masked": mask_email(user.get("email")),
            "role": user.get("role"),
            "manager_name": (users_by_id.get(str(user.get("manager_user_id") or "")) or {}).get("name", ""),
            "department": user.get("department", ""),
            "plant_location": user.get("plant_location", ""),
            "shift": user.get("shift", ""),
            "created_at": str(user.get("created_at") or ""),
        }
        for user in raw_company_users
    ]
    work_by_ticket = {
        item.get("ticket_id"): {
            "status": item.get("status"),
            "notes": item.get("notes"),
            "parts_used": item.get("parts_used"),
            "updated_at": item.get("updated_at"),
            "submitted_at": item.get("submitted_at"),
            "reviewed_at": item.get("reviewed_at"),
        }
        for item in technician_work.list_company(company_code)
    }

    return {
        "company": {
            "company_code": company_code,
            "company_name": company.get("company_name") or company_code,
            "approved": _company_approved(company),
            "machine_quota": _company_quota(company),
        },
        "machines": company_machines,
        "tickets": company_tickets,
        "documents": company_documents,
        "records": company_records,
        "spare_parts": parts.list_items("spare_parts", company_code),
        "consumables": parts.list_items("consumables", company_code),
        "team": company_users,
        "technician_work": work_by_ticket,
        "settings": settings.get(company_code) or {},
    }


@router.post("/users/{user_id}/password")
def admin_reset_user_password(
    user_id: str,
    body: AdminPasswordResetRequest,
    _: bool = Depends(get_current_admin),
    users: UserRepository = Depends(get_users),
):
    user = users.get_by_id(user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="user not found")
    password_error = validate_password_strength(body.new_password)
    if password_error:
        raise HTTPException(status_code=400, detail=password_error)
    users.update_password(user_id, hash_password(body.new_password))
    log.info(
        "admin.user_password_reset",
        user_id=user_id,
        company_code=user.get("company_code"),
    )
    return {"status": "password_reset", "user_id": user_id}


class CompanyUpdate(BaseModel):
    machine_quota: Optional[int] = None
    approved: Optional[bool] = None


@router.post("/companies/{company_code}")
def admin_update_company(
    company_code: str,
    body: CompanyUpdate,
    _: bool = Depends(get_current_admin),
    users: UserRepository = Depends(get_users),
    machines: MachineRepository = Depends(get_machines),
):
    if users.get_company(company_code) is None:
        raise HTTPException(status_code=404, detail="company not found")

    fields = {}
    if body.machine_quota is not None:
        if body.machine_quota < 0:
            raise HTTPException(status_code=400, detail="machine_quota cannot be negative")
        fields["machine_quota"] = body.machine_quota
    if body.approved is not None:
        fields["approved"] = "yes" if body.approved else "no"
    if not fields:
        raise HTTPException(status_code=400, detail="nothing to update")

    users.update_company(company_code, fields)
    company = users.get_company(company_code)
    log.info("admin.company_updated", company_code=company_code, fields=list(fields.keys()))
    return {
        "company_code": company_code,
        "machine_quota": _company_quota(company),
        "approved": _company_approved(company),
        "machines_used": len(machines.get_company_machines(company_code)),
    }


class CompanyOnboardRequest(BaseModel):
    company_code: str
    company_name: str
    admin_contact_phone: str
    owner_name: str
    owner_email: str
    owner_password: str
    machine_quota: int = 5


@router.post("/companies", status_code=201)
def admin_onboard_company(
    body: CompanyOnboardRequest,
    _: bool = Depends(get_current_admin),
    users: UserRepository = Depends(get_users),
):
    # 1. Validate inputs
    company_code = body.company_code.strip().upper()
    if len(company_code) < 2:
        raise HTTPException(status_code=400, detail="invalid company code")
    pw_err = validate_password_strength(body.owner_password)
    if pw_err:
        raise HTTPException(status_code=400, detail=pw_err)
    
    # 2. Check duplicate
    try:
        existing_company = users.get_company(company_code)
    except Exception as exc:
        log.error("admin.onboard_company.check_duplicate_failed", error=str(exc))
        raise HTTPException(status_code=500, detail="Internal error while checking company.")

    if existing_company is not None:
        raise HTTPException(status_code=409, detail="company code already exists")
        
    # 3. Create Company Record
    try:
        users.add_company(
            company_code=company_code,
            company_name=body.company_name.strip(),
            admin_contact_phone=body.admin_contact_phone.strip(),
            machine_quota=body.machine_quota,
            approved=True
        )
    except Exception as exc:
        log.error("admin.onboard_company.add_company_failed", error=str(exc))
        raise HTTPException(status_code=500, detail="Internal error while creating company.")
    
    # 4. Seed Owner Account
    from datetime import datetime, timezone
    try:
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
    except Exception as exc:
        log.error("admin.onboard_company.add_user_failed", error=str(exc))
        raise HTTPException(status_code=500, detail="Internal error while creating owner account.")
    
    log.info("admin.company_onboarded", company_code=company_code, owner_user=user_id)
    return {"status": "created", "company_code": company_code, "owner_user_id": user_id}


class GeminiConfigUpdate(BaseModel):
    gemini_api_key: str


@router.get("/config/gemini")
def get_gemini_config(_: bool = Depends(get_current_admin)):
    return {"gemini_api_key": config.GEMINI_API_KEY}


@router.post("/config/gemini")
def update_gemini_config(body: GeminiConfigUpdate, _: bool = Depends(get_current_admin)):
    import os
    import subprocess
    
    # 1. Update the in-memory config
    config.GEMINI_API_KEY = body.gemini_api_key
    
    # 2. Persist to .env file
    env_path = config.BACKEND_DIR / ".env"
    if not env_path.exists():
        env_path = config.BACKEND_DIR.parent / ".env"
        
    lines = []
    found = False
    if env_path.exists():
        with open(env_path, "r") as f:
            for line in f:
                if line.strip().startswith("GEMINI_API_KEY="):
                    lines.append(f"GEMINI_API_KEY={body.gemini_api_key}\n")
                    found = True
                else:
                    lines.append(line)
    if not found:
        lines.append(f"\nGEMINI_API_KEY={body.gemini_api_key}\n")
        
    with open(env_path, "w") as f:
        f.writelines(lines)
        
    # 3. Synchronize with Supabase Secrets (async in background to not block)
    try:
        subprocess.Popen(
            ["npx", "supabase", "secrets", "set", f"GEMINI_API_KEY={body.gemini_api_key}"],
            cwd=str(config.BACKEND_DIR.parent),
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL
        )
    except Exception as e:
        log.error("admin.config.sync_error", error=str(e))
        
    return {"status": "success", "message": "Gemini API key updated successfully."}


@router.get("", response_class=HTMLResponse)
def admin_console():
    """Serve the self-contained admin HTML page."""
    return HTMLResponse(ADMIN_HTML)
