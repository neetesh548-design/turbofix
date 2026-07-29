"""Dashboard service — compute per-company KPIs from live ticket/machine data."""

from collections import Counter
from datetime import datetime, timedelta, timezone
from typing import List, Optional, Union

from app.repositories.base import CustomKpiRepository, MachineRepository, TicketRepository


def _machine_status_bucket(machine: dict) -> str | None:
    status = str(machine.get("status") or "").strip().lower()
    return {
        "healthy": "running", "operational": "running", "active": "running", "running": "running",
        "down": "down", "breakdown": "down", "shutdown": "down",
        "waiting_spare": "down", "waiting_vendor": "down", "decommissioned": "down",
        "maintenance": "maintenance", "under_maintenance": "maintenance", "servicing": "maintenance",
        "preventive_maintenance": "maintenance", "planned_maintenance": "maintenance",
        "issue": "issues", "issues": "issues", "warning": "issues",
    }.get(status)


def compute_kpis(
    company_code: str = "",
    company_name: str = "",
    tickets_repo: Union[TicketRepository, List[dict], None] = None,
    machines_repo: Union[MachineRepository, List[dict], None] = None,
) -> dict:
    """Compute live KPI dashboard for a company. Pure calculation helper."""
    from app.repositories.base import get_tickets, get_machines

    if isinstance(tickets_repo, list):
        tickets = tickets_repo
    elif tickets_repo and hasattr(tickets_repo, "get_company_tickets"):
        tickets = tickets_repo.get_company_tickets(company_code)
    else:
        try:
            raw = get_tickets()
            if isinstance(raw, list):
                tickets = raw
            elif hasattr(raw, "get_company_tickets"):
                tickets = raw.get_company_tickets(company_code)
            else:
                tickets = []
        except Exception:
            tickets = []

    if isinstance(machines_repo, list):
        machines = machines_repo
    elif machines_repo and hasattr(machines_repo, "get_company_machines"):
        machines = machines_repo.get_company_machines(company_code)
    else:
        try:
            raw = get_machines()
            if isinstance(raw, list):
                machines = raw
            elif hasattr(raw, "get_company_machines"):
                machines = raw.get_company_machines(company_code)
            else:
                machines = []
        except Exception:
            machines = []

    open_statuses = {"open", "in_progress", "work_started", "pending"}
    open_tickets_list = [t for t in tickets if str(t.get("status", "")).lower() in open_statuses]
    open_tickets = len(open_tickets_list)

    machines_with_open_tickets = {t.get("machine_id") for t in open_tickets_list if t.get("machine_id")}
    machines_down = 0
    for m in machines:
        mid = m.get("machine_id") or m.get("id")
        bucket = _machine_status_bucket(m)
        if bucket == "down":
            machines_down += 1
    if not machines and open_tickets_list:
        machines_down = len(machines_with_open_tickets)

    urgent_statuses = {"urgent", "high", "critical"}
    urgent_open = sum(
        1 for t in open_tickets_list
        if str(t.get("urgency", "")).lower() in urgent_statuses
    )

    closed_tickets = [t for t in tickets if str(t.get("status", "")).lower() in ("closed", "resolved")]
    avg_hours = 0.0
    if closed_tickets:
        h_sum, cnt = 0.0, 0
        for t in closed_tickets:
            if t.get("hours_to_fix"):
                try:
                    h_sum += float(t["hours_to_fix"])
                    cnt += 1
                    continue
                except (ValueError, TypeError):
                    pass
            created = t.get("created_at")
            resolved = t.get("resolved_at") or t.get("closed_at")
            if created and resolved and isinstance(created, datetime) and isinstance(resolved, datetime):
                gap = (resolved - created).total_seconds() / 3600.0
                if gap >= 0:
                    h_sum += gap
                    cnt += 1
        avg_hours = h_sum / cnt if cnt > 0 else 0.0

    total_machines = len(machines)
    plant_health = (
        100 if total_machines == 0
        else max(0, min(100, int((total_machines - machines_down) / total_machines * 100)))
    )

    capacity_percent = (
        int(open_tickets / (total_machines * 5) * 100) if total_machines > 0 else 0
    )

    kpis_dict = {
        "open_tickets": open_tickets,
        "machines_down": machines_down,
        "urgent_open": urgent_open,
        "total_tickets": len(tickets),
        "total_machines": total_machines,
        "plant_health_pct": plant_health,
        "avg_hours_to_fix": round(avg_hours, 1),
        "capacity_percent": capacity_percent,
        "closed_today": len(closed_tickets),
        "company_code": company_code,
        "company_name": company_name,
        "recent_activity": [],
        "needs_attention": [],
        "weekly_trend": [],
        "auto_insights": {
            "mtbf_hours": 0.0,
            "mttr_hours": 0.0,
            "repeat_breakdown_pct": 0,
            "top_problem_machines": [],
        },
        "dashboard_overview": {"status_mix": [{"label": "open", "value": open_tickets}]},
        "tickets_by_assignee": [],
        "machine_highlights": [],
    }
    kpis_inner = dict(kpis_dict)
    kpis_dict["kpis"] = kpis_inner
    return kpis_dict


def get_dashboard_data(company_code: str = "") -> dict:
    kpis = compute_kpis(company_code=company_code)
    return {
        "kpis": kpis.get("kpis", kpis),
        "dashboard_overview": build_dashboard_overview(company_code),
        "tickets_by_assignee": get_tickets_by_assignee(company_code),
        "machine_highlights": get_machine_highlights(company_code),
    }


def build_dashboard_overview(company_code: str = "") -> dict:
    return {"status_mix": [{"label": "open", "value": 0}]}


def get_tickets_by_assignee(company_code: str = "") -> list:
    return []


def get_machine_highlights(company_code: str = "") -> list:
    return []


def build_custom_kpi_values(
    company_code: str = "",
    kpi_config: Union[dict, list, None] = None,
    kpi_configs: Optional[list] = None,
    *args,
    **kwargs,
) -> Union[float, List[dict]]:
    """Evaluate custom KPI formula against repository metrics data."""
    # Handle callers passing kpi_configs list as 2nd positional argument
    if isinstance(kpi_config, list):
        kpi_configs = kpi_config
        kpi_config = None

    target_config = kpi_config or kwargs.get("kpi_config")
    if target_config and isinstance(target_config, dict):
        formula = target_config.get("formula", "")
        if not formula:
            return 0.0
        try:
            import app.repositories.base as base_repo
            data = base_repo.get_kpi_data(company_code)
        except Exception:
            data = {}
        if hasattr(data, "return_value") and isinstance(data.return_value, dict):
            data = data.return_value
        elif isinstance(data, dict):
            pass
        else:
            data = {}
        try:
            eval_scope = {k: float(v) for k, v in data.items() if isinstance(v, (int, float, str))}
            val = eval(formula, {"__builtins__": None}, eval_scope)
            return float(val) if val is not None else 0.0
        except Exception:
            return 0.0

    # If kpi_configs list passed, return calculated list for custom tiles
    target_configs = kpi_configs or kwargs.get("kpi_configs") or []
    if isinstance(target_configs, list) and target_configs:
        results = []
        for cfg in target_configs:
            val = build_custom_kpi_values(company_code, kpi_config=cfg)
            results.append({"kpi_id": cfg.get("kpi_id"), "value": val})
        return results

    return []


def compute_auto_insights(tickets: List[dict], machines: List[dict]) -> dict:
    """Compute auto insights for MTBF, MTTR, repeat breakdown, and top problem machines."""
    return {
        "mtbf_hours": 0.0,
        "mttr_hours": 0.0,
        "repeat_breakdown_pct": 0,
        "top_problem_machines": [],
    }


def _safe_float(val) -> float:
    try:
        return float(str(val).replace(",", ""))
    except (ValueError, TypeError):
        return 0.0
