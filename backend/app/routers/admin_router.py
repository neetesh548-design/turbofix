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
    get_ai_feedback,
    get_custom_kpis,
    get_documents,
    get_escalation_config,
    get_machine_records,
    get_machines,
    get_parts,
    get_settings,
    get_shift_config,
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
    config.GEMINI_API_KEY = body.gemini_api_key

    # Persist to .env when running locally (silently skip on Render/Docker)
    try:
        env_path = config.BACKEND_DIR / ".env"
        if not env_path.exists():
            env_path = config.BACKEND_DIR.parent / ".env"
        if env_path.exists():
            lines = []
            found = False
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
    except OSError:
        log.info("admin.config.env_write_skipped", reason="read-only filesystem")

    return {"status": "success", "message": "Gemini API key updated successfully."}


# ---------------------------------------------------------------------------
# Escalation config CRUD
# ---------------------------------------------------------------------------

class EscalationThresholdRequest(BaseModel):
    factory_id: str
    chain_type: str = "breakdown"
    level: int
    threshold_min: int
    role_label: str
    notify_phone: str = ""


@router.get("/escalation-config/{factory_id}")
def get_escalation_thresholds(
    factory_id: str,
    chain_type: str = "breakdown",
    _: bool = Depends(get_current_admin),
    esc_config=Depends(get_escalation_config),
):
    return esc_config.get_thresholds(factory_id, chain_type)


@router.post("/escalation-config")
def upsert_escalation_threshold(
    body: EscalationThresholdRequest,
    _: bool = Depends(get_current_admin),
    esc_config=Depends(get_escalation_config),
):
    if body.level < 1 or body.level > 5:
        raise HTTPException(status_code=400, detail="level must be 1-5")
    if body.threshold_min < 1:
        raise HTTPException(status_code=400, detail="threshold_min must be positive")
    if body.chain_type not in ("breakdown", "consumable"):
        raise HTTPException(status_code=400, detail="chain_type must be breakdown or consumable")

    existing = esc_config.get_threshold_for_level(
        body.factory_id, body.chain_type, body.level)
    old_threshold = existing["threshold_min"] if existing else 0

    ok = esc_config.upsert_threshold(
        factory_id=body.factory_id,
        chain_type=body.chain_type,
        level=body.level,
        threshold_min=body.threshold_min,
        role_label=body.role_label,
        notify_phone=body.notify_phone,
    )
    if not ok:
        raise HTTPException(status_code=500, detail="failed to save threshold")

    if old_threshold and old_threshold != body.threshold_min:
        from app.services.predictive_service import record_threshold_change
        record_threshold_change(
            body.factory_id, body.chain_type, body.level,
            old_threshold, body.threshold_min, "admin",
        )

    log.info("admin.escalation_config_saved",
             factory_id=body.factory_id, chain=body.chain_type, level=body.level)
    return {"status": "saved", "level": body.level, "threshold_min": body.threshold_min}


@router.delete("/escalation-config/{factory_id}/{chain_type}/{level}")
def delete_escalation_threshold(
    factory_id: str,
    chain_type: str,
    level: int,
    _: bool = Depends(get_current_admin),
    esc_config=Depends(get_escalation_config),
):
    ok = esc_config.delete_threshold(factory_id, chain_type, level)
    if not ok:
        raise HTTPException(status_code=404, detail="threshold not found")
    return {"status": "deleted"}


# ---------------------------------------------------------------------------
# AI Feedback stats
# ---------------------------------------------------------------------------

@router.get("/ai-stats/{factory_id}")
def get_ai_stats(
    factory_id: str,
    _: bool = Depends(get_current_admin),
    feedback=Depends(get_ai_feedback),
):
    return feedback.get_factory_stats(factory_id)


@router.get("/ai-stats/{factory_id}/{machine_id}")
def get_machine_ai_stats(
    factory_id: str,
    machine_id: str,
    _: bool = Depends(get_current_admin),
    feedback=Depends(get_ai_feedback),
):
    result = feedback.get_accuracy(factory_id, machine_id)
    if not result:
        return {"total_diagnoses": 0, "confirmed": 0, "overridden": 0, "accuracy_pct": 0}
    return result


# ---------------------------------------------------------------------------
# Shift config CRUD
# ---------------------------------------------------------------------------

class ShiftConfigRequest(BaseModel):
    factory_id: str
    shift_name: str
    start_time: str
    end_time: str
    timezone: str = "Asia/Kolkata"


@router.get("/shift-config/{factory_id}")
def get_shifts(
    factory_id: str,
    _: bool = Depends(get_current_admin),
    shifts=Depends(get_shift_config),
):
    return shifts.get_shifts(factory_id)


@router.post("/shift-config")
def upsert_shift(
    body: ShiftConfigRequest,
    _: bool = Depends(get_current_admin),
    shifts=Depends(get_shift_config),
):
    ok = shifts.upsert_shift(
        factory_id=body.factory_id,
        shift_name=body.shift_name,
        start_time=body.start_time,
        end_time=body.end_time,
        tz=body.timezone,
    )
    if not ok:
        raise HTTPException(status_code=500, detail="failed to save shift config")
    return {"status": "saved", "shift_name": body.shift_name}


@router.delete("/shift-config/{factory_id}/{shift_name}")
def delete_shift(
    factory_id: str,
    shift_name: str,
    _: bool = Depends(get_current_admin),
    shifts=Depends(get_shift_config),
):
    ok = shifts.delete_shift(factory_id, shift_name)
    if not ok:
        raise HTTPException(status_code=404, detail="shift not found")
    return {"status": "deleted"}


# ---------------------------------------------------------------------------
# Technician workload (load-aware delegation)
# ---------------------------------------------------------------------------

@router.get("/workload/{factory_id}")
def get_technician_workload(
    factory_id: str,
    _: bool = Depends(get_current_admin),
):
    from app.services.intelligence_service import get_technician_load
    return get_technician_load(factory_id)


# ---------------------------------------------------------------------------
# Predictive maintenance
# ---------------------------------------------------------------------------

@router.get("/predictions/{factory_id}")
def get_predictions(
    factory_id: str,
    _: bool = Depends(get_current_admin),
):
    from app.services.predictive_service import get_predictions as _get_preds
    return _get_preds(factory_id)


@router.post("/predictions/{prediction_id}/acknowledge")
def acknowledge_prediction(
    prediction_id: str,
    _: bool = Depends(get_current_admin),
):
    from app.services.predictive_service import acknowledge_prediction as _ack
    ok = _ack(prediction_id, "admin")
    if not ok:
        raise HTTPException(status_code=404, detail="prediction not found")
    return {"status": "acknowledged"}


# ---------------------------------------------------------------------------
# Downtime cost
# ---------------------------------------------------------------------------

@router.get("/downtime/{factory_id}")
def get_downtime_summary(
    factory_id: str,
    days: int = 30,
    _: bool = Depends(get_current_admin),
):
    from app.services.predictive_service import get_factory_downtime_summary
    return get_factory_downtime_summary(factory_id, days)


@router.get("/downtime/ticket/{ticket_id}")
def get_ticket_downtime(
    ticket_id: str,
    _: bool = Depends(get_current_admin),
):
    from app.services.predictive_service import calculate_ticket_downtime_cost
    result = calculate_ticket_downtime_cost(ticket_id)
    if not result:
        raise HTTPException(status_code=404, detail="ticket not found")
    return result


# ---------------------------------------------------------------------------
# Threshold drift
# ---------------------------------------------------------------------------

@router.get("/threshold-drift/{factory_id}")
def get_threshold_drift(
    factory_id: str,
    _: bool = Depends(get_current_admin),
):
    from app.services.predictive_service import check_threshold_drift
    return check_threshold_drift(factory_id)


# ---------------------------------------------------------------------------
# Daily digest config
# ---------------------------------------------------------------------------

class DigestConfigRequest(BaseModel):
    factory_id: str
    send_time: str = "08:00"
    timezone: str = "Asia/Kolkata"
    recipient_phones: list = []
    enabled: bool = True


@router.get("/digest-config/{factory_id}")
def get_digest_config(
    factory_id: str,
    _: bool = Depends(get_current_admin),
):
    from app.repositories.supabase_repo import _client
    row = _client.select_one("digest_config", {"factory_id": f"eq.{factory_id}"})
    if not row:
        return {"factory_id": factory_id, "enabled": False, "recipient_phones": []}
    return {
        "factory_id": row.get("factory_id", ""),
        "send_time": str(row.get("send_time", "08:00")),
        "timezone": row.get("timezone", "Asia/Kolkata"),
        "recipient_phones": row.get("recipient_phones") or [],
        "enabled": row.get("enabled", True),
        "last_sent_at": str(row.get("last_sent_at") or ""),
    }


@router.post("/digest-config")
def upsert_digest_config(
    body: DigestConfigRequest,
    _: bool = Depends(get_current_admin),
):
    from app.repositories.supabase_repo import _client
    existing = _client.select_one("digest_config", {
        "factory_id": f"eq.{body.factory_id}",
    })
    data = {
        "factory_id": body.factory_id,
        "send_time": body.send_time,
        "timezone": body.timezone,
        "recipient_phones": body.recipient_phones,
        "enabled": body.enabled,
    }
    try:
        if existing:
            _client.update("digest_config", {
                "factory_id": f"eq.{body.factory_id}",
            }, data)
        else:
            _client.insert("digest_config", data)
        return {"status": "saved"}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


# ---------------------------------------------------------------------------
# WaCRM management (contacts, conversations, broadcasts, account)
# ---------------------------------------------------------------------------

@router.get("/wacrm/status")
async def wacrm_status(_: bool = Depends(get_current_admin)):
    """Check WaCRM connection status and account info."""
    from app.infrastructure.wacrm_client import is_configured, get_account_info
    if not is_configured():
        return {"connected": False, "reason": "WACRM_API_URL or WACRM_API_KEY not set"}
    try:
        info = await get_account_info()
        if not info:
            return {"connected": False, "reason": "API key invalid or WaCRM unreachable"}
        return {"connected": True, "account": info}
    except Exception as exc:
        return {"connected": False, "reason": str(exc)}


@router.get("/wacrm/contacts")
async def wacrm_list_contacts(
    search: str = "",
    tag: str = "",
    limit: int = 50,
    cursor: str = "",
    _: bool = Depends(get_current_admin),
):
    from app.infrastructure import wacrm_client
    if not wacrm_client.is_configured():
        raise HTTPException(status_code=503, detail="WaCRM not configured")
    return await wacrm_client.list_contacts(search=search, tag=tag, limit=limit, cursor=cursor)


class WaCRMContactCreate(BaseModel):
    phone: str
    name: str = ""
    company: str = ""
    tags: list = []


@router.post("/wacrm/contacts")
async def wacrm_create_contact(
    body: WaCRMContactCreate,
    _: bool = Depends(get_current_admin),
):
    from app.infrastructure import wacrm_client
    if not wacrm_client.is_configured():
        raise HTTPException(status_code=503, detail="WaCRM not configured")
    result = await wacrm_client.get_or_create_contact(
        phone=body.phone, name=body.name, company=body.company, tags=body.tags,
    )
    if not result:
        raise HTTPException(status_code=500, detail="Failed to create contact in WaCRM")
    return result


class WaCRMContactUpdate(BaseModel):
    name: str = ""
    company: str = ""
    tags: Optional[list] = None


@router.patch("/wacrm/contacts/{contact_id}")
async def wacrm_update_contact(
    contact_id: str,
    body: WaCRMContactUpdate,
    _: bool = Depends(get_current_admin),
):
    from app.infrastructure import wacrm_client
    if not wacrm_client.is_configured():
        raise HTTPException(status_code=503, detail="WaCRM not configured")
    result = await wacrm_client.update_contact(
        contact_id=contact_id, name=body.name, company=body.company, tags=body.tags,
    )
    if not result:
        raise HTTPException(status_code=404, detail="Contact not found or update failed")
    return result


@router.get("/wacrm/conversations")
async def wacrm_list_conversations(
    status: str = "",
    contact_id: str = "",
    limit: int = 50,
    cursor: str = "",
    _: bool = Depends(get_current_admin),
):
    from app.infrastructure import wacrm_client
    if not wacrm_client.is_configured():
        raise HTTPException(status_code=503, detail="WaCRM not configured")
    return await wacrm_client.list_conversations(
        status=status, contact_id=contact_id, limit=limit, cursor=cursor,
    )


@router.get("/wacrm/conversations/{conversation_id}")
async def wacrm_get_conversation(
    conversation_id: str,
    _: bool = Depends(get_current_admin),
):
    from app.infrastructure import wacrm_client
    if not wacrm_client.is_configured():
        raise HTTPException(status_code=503, detail="WaCRM not configured")
    result = await wacrm_client.get_conversation(conversation_id)
    if not result:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return result


@router.get("/wacrm/conversations/{conversation_id}/messages")
async def wacrm_conversation_messages(
    conversation_id: str,
    limit: int = 50,
    cursor: str = "",
    _: bool = Depends(get_current_admin),
):
    from app.infrastructure import wacrm_client
    if not wacrm_client.is_configured():
        raise HTTPException(status_code=503, detail="WaCRM not configured")
    return await wacrm_client.get_conversation_messages(
        conversation_id=conversation_id, limit=limit, cursor=cursor,
    )


class WaCRMSendMessage(BaseModel):
    to: str
    text: str


@router.post("/wacrm/messages/send")
async def wacrm_send_message(
    body: WaCRMSendMessage,
    _: bool = Depends(get_current_admin),
):
    from app.infrastructure.whatsapp import send_text_message
    await send_text_message(body.to, body.text)
    return {"status": "sent", "to": body.to}


class WaCRMBroadcastRequest(BaseModel):
    name: str
    template_name: str
    template_language: str = "en_US"
    recipients: list = []


@router.post("/wacrm/broadcasts")
async def wacrm_launch_broadcast(
    body: WaCRMBroadcastRequest,
    _: bool = Depends(get_current_admin),
):
    if not body.recipients:
        raise HTTPException(status_code=400, detail="recipients list is empty")
    from app.infrastructure.whatsapp import send_broadcast
    result = await send_broadcast(
        name=body.name,
        template_name=body.template_name,
        language=body.template_language,
        recipients=body.recipients,
    )
    return result


@router.get("/wacrm/broadcasts/{broadcast_id}")
async def wacrm_broadcast_status(
    broadcast_id: str,
    _: bool = Depends(get_current_admin),
):
    from app.infrastructure import wacrm_client
    if not wacrm_client.is_configured():
        raise HTTPException(status_code=503, detail="WaCRM not configured")
    result = await wacrm_client.get_broadcast_status(broadcast_id)
    if not result:
        raise HTTPException(status_code=404, detail="Broadcast not found")
    return result


@router.get("/wacrm/webhooks")
async def wacrm_list_webhooks(_: bool = Depends(get_current_admin)):
    from app.infrastructure import wacrm_client
    if not wacrm_client.is_configured():
        raise HTTPException(status_code=503, detail="WaCRM not configured")
    return await wacrm_client.list_webhooks()


class WaCRMWebhookRegister(BaseModel):
    url: str
    events: list = ["message.received"]


@router.post("/wacrm/webhooks")
async def wacrm_register_webhook(
    body: WaCRMWebhookRegister,
    _: bool = Depends(get_current_admin),
):
    from app.infrastructure import wacrm_client
    if not wacrm_client.is_configured():
        raise HTTPException(status_code=503, detail="WaCRM not configured")
    result = await wacrm_client.register_webhook(url=body.url, events=body.events)
    if not result:
        raise HTTPException(status_code=500, detail="Failed to register webhook")
    return result


@router.get("", response_class=HTMLResponse)
def admin_console():
    """Serve the self-contained admin HTML page."""
    return HTMLResponse(ADMIN_HTML)
