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
    get_tickets,
    get_users,
)
from app.infrastructure.logging import get_logger
from app.infrastructure.rate_limit import limiter
from app.repositories.base import (
    CustomKpiRepository,
    DocumentRepository,
    MachineRecordRepository,
    MachineRepository,
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


@router.get("", response_class=HTMLResponse)
def admin_console():
    """Serve the self-contained admin HTML page."""
    return HTMLResponse(ADMIN_HTML)
