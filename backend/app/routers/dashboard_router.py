"""Dashboard router — per-company KPI dashboard + root cause analysis endpoints."""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from app.auth import CurrentUser, get_current_user
from app.dependencies import get_custom_kpis, get_events, get_machines, get_tickets, get_users
from app.repositories.base import CustomKpiRepository, EventRepository, MachineRepository, TicketRepository, UserRepository
from app.services import ai_service
from app.services.dashboard_service import build_custom_kpi_values, compute_kpis
from app.services.machine_data_service import read_machine_data
from app.infrastructure.logging import get_logger

router = APIRouter(prefix="/vault")
log = get_logger("turbofix.assistant")
MAX_ASSISTANT_CONTEXT = 45_000


class AssistantQuestion(BaseModel):
    question: str = Field(min_length=3, max_length=1200)
    machine_id: str | None = None


def _ticket_line(ticket: dict) -> str:
    return (
        f"- {ticket.get('ticket_id', 'ticket')} | {ticket.get('status', 'Open')} | "
        f"urgency {ticket.get('urgency') or 'not set'} | {ticket.get('description') or 'no description'}"
    )


def _event_line(event: dict) -> str:
    return (
        f"- {event.get('timestamp') or '?'} | {event.get('event_type') or 'event'} | "
        f"{event.get('description') or 'no description'}"
    )


def _machine_context(machine: dict, tickets: list[dict], events: list[dict]) -> str:
    machine_id = machine["machine_id"]
    machine_tickets = [ticket for ticket in tickets if ticket.get("machine_id") == machine_id]
    machine_events = [event for event in events if event.get("machine_id") == machine_id]
    knowledge = read_machine_data(machine)
    return "\n".join([
        f"Machine: {machine.get('machine_name') or machine_id} ({machine_id})",
        f"Location: {machine.get('location') or 'not recorded'}",
        f"Assigned technician: {machine.get('assigned_technician_phone') or 'not assigned'}",
        "Tickets:",
        *(list(map(_ticket_line, machine_tickets[-20:])) or ["- No tickets recorded"]),
        "Recent events:",
        *(list(map(_event_line, machine_events[-25:])) or ["- No events recorded"]),
        "Canonical MachineData:",
        knowledge[:10_000] if knowledge else "No MachineData file is available.",
    ])


def _plant_context(machines: list[dict], tickets: list[dict], events: list[dict]) -> str:
    sections = [
        f"Plant summary: {len(machines)} machines, "
        f"{sum(str(ticket.get('status') or 'Open').lower() == 'open' for ticket in tickets)} open tickets."
    ]
    for machine in machines:
        section = _machine_context(machine, tickets, events)
        remaining = MAX_ASSISTANT_CONTEXT - len("\n\n".join(sections))
        if remaining <= 400:
            sections.append("Additional machine context omitted because the context limit was reached.")
            break
        sections.append(section[:remaining])
    return "\n\n".join(sections)[:MAX_ASSISTANT_CONTEXT]


def _live_data_answer(machines: list[dict], tickets: list[dict], events: list[dict]) -> str:
    open_tickets = [ticket for ticket in tickets if str(ticket.get("status") or "Open").lower() == "open"]
    if len(machines) == 1:
        machine = machines[0]
        machine_open = [ticket for ticket in open_tickets if ticket.get("machine_id") == machine["machine_id"]]
        if not machine_open:
            return (
                f"{machine.get('machine_name') or machine['machine_id']} has no open maintenance tickets. "
                f"TurboFix found {len(events)} recorded events. Add manuals and service history if you need a deeper recommendation."
            )
        priorities = sorted(machine_open, key=lambda item: {"High": 0, "Medium": 1, "Low": 2}.get(item.get("urgency"), 3))
        top = priorities[0]
        return (
            f"{machine.get('machine_name') or machine['machine_id']} has {len(machine_open)} open ticket(s). "
            f"Start with {top.get('ticket_id')}: {top.get('description') or 'maintenance issue'} "
            f"({top.get('urgency') or 'unrated'} urgency). Confirm isolation and the machine manual before work."
        )
    if not open_tickets:
        return (
            f"All {len(machines)} machines are currently clear with no open maintenance tickets. "
            "Use preventive schedules and complete MachineData files to keep plant-wide recommendations reliable."
        )
    priorities = sorted(open_tickets, key=lambda item: {"High": 0, "Medium": 1, "Low": 2}.get(item.get("urgency"), 3))
    top = priorities[0]
    return (
        f"Plant-wide view: {len(open_tickets)} open ticket(s) across {len(machines)} machines. "
        f"Prioritize {top.get('machine_name') or top.get('machine_id')}: {top.get('description') or 'maintenance issue'} "
        f"({top.get('urgency') or 'unrated'} urgency). Review the remaining open tickets after this risk is controlled."
    )


@router.get("/dashboard")
def get_dashboard(
    user: CurrentUser = Depends(get_current_user),
    tickets: TicketRepository = Depends(get_tickets),
    machines: MachineRepository = Depends(get_machines),
    users: UserRepository = Depends(get_users),
    kpi_repo: CustomKpiRepository = Depends(get_custom_kpis),
):
    """Return live KPI dashboard for the authenticated user's company."""
    company = users.get_company(user.company_code)
    if not company:
        raise HTTPException(status_code=404, detail="company not found")

    result = compute_kpis(
        company_code=user.company_code,
        company_name=company.get("company_name", ""),
        tickets_repo=tickets,
        machines_repo=machines,
    )

    kpi_configs = kpi_repo.list_kpis(user.company_code)
    if kpi_configs:
        kpi_data = kpi_repo.list_data(user.company_code)
        result["custom_kpis"] = build_custom_kpi_values(
            user.company_code, kpi_configs, kpi_data,
            result.get("auto_insights", {}), result.get("kpis", {}),
        )
    else:
        result["custom_kpis"] = []

    try:
        result["machine_quota"] = int(str(company.get("machine_quota") or 0).strip())
    except (TypeError, ValueError):
        result["machine_quota"] = 0
    result["machines_used"] = result.get("kpis", {}).get("total_machines", 0)

    return result


@router.post("/assistant")
async def ask_maintenance_assistant(
    body: AssistantQuestion,
    user: CurrentUser = Depends(get_current_user),
    machines: MachineRepository = Depends(get_machines),
    tickets: TicketRepository = Depends(get_tickets),
    events: EventRepository = Depends(get_events),
):
    """Answer a maintenance question for one machine or the entire plant."""
    question = body.question.strip()
    if len(question) < 3:
        raise HTTPException(status_code=422, detail="question must contain at least 3 characters")
    company_tickets = tickets.get_company_tickets(user.company_code)
    company_events = events.get_company_events(user.company_code)

    normalized_machine_id = (body.machine_id or "").strip().upper() or None
    if normalized_machine_id:
        machine = machines.get(normalized_machine_id)
        if machine is None or machine.get("company_code") != user.company_code:
            raise HTTPException(status_code=404, detail="machine not found")
        scoped_machines = [{**machine, "machine_id": normalized_machine_id}]
        scoped_tickets = [
            ticket for ticket in company_tickets
            if ticket.get("machine_id") == normalized_machine_id
        ]
        scoped_events = [
            event for event in company_events
            if event.get("machine_id") == normalized_machine_id
        ]
        scope_label = f"{machine.get('machine_name') or normalized_machine_id} ({normalized_machine_id})"
        context = _machine_context(scoped_machines[0], company_tickets, company_events)
        scope = "machine"
    else:
        scoped_machines = machines.get_company_machines(user.company_code)
        scoped_tickets = company_tickets
        scoped_events = company_events
        scope_label = f"all machines in plant {user.company_code}"
        context = _plant_context(scoped_machines, company_tickets, company_events)
        scope = "all"

    answer = _live_data_answer(scoped_machines, scoped_tickets, scoped_events)
    source = "live_data"
    if ai_service.ai_enabled():
        try:
            answer = await ai_service.maintenance_assistant(question, scope_label, context)
            source = "ai"
        except Exception as exc:
            log.warning(
                "assistant.ai_failed",
                company_code=user.company_code,
                machine_id=normalized_machine_id,
                error=str(exc),
            )

    return {
        "answer": answer,
        "scope": scope,
        "machine_id": normalized_machine_id,
        "source": source,
    }


@router.get("/machines/{machine_id}/events")
def get_machine_events(
    machine_id: str,
    user: CurrentUser = Depends(get_current_user),
    machines: MachineRepository = Depends(get_machines),
    events: EventRepository = Depends(get_events),
):
    """Return the full event history for a machine (scoped to user's company)."""
    machine = machines.get(machine_id.upper())
    if machine is None or machine.get("company_code") != user.company_code:
        raise HTTPException(status_code=404, detail="machine not found")
    return {"machine_id": machine_id.upper(), "events": events.get_machine_events(machine_id.upper())}


@router.get("/machines/{machine_id}/root-cause")
async def get_root_cause_analysis(
    machine_id: str,
    user: CurrentUser = Depends(get_current_user),
    machines: MachineRepository = Depends(get_machines),
    events: EventRepository = Depends(get_events),
):
    """Run AI root cause analysis on a machine's full event history."""
    machine = machines.get(machine_id.upper())
    if machine is None or machine.get("company_code") != user.company_code:
        raise HTTPException(status_code=404, detail="machine not found")
    machine = {**machine, "machine_id": machine_id.upper()}

    if not ai_service.ai_enabled():
        raise HTTPException(status_code=503, detail="AI service not configured")

    machine_events = events.get_machine_events(machine_id.upper())
    machine_data = read_machine_data(machine)
    if machine_data:
        machine_events = [
            *machine_events,
            {"timestamp": "machine-data", "event_type": "canonical_machine_context", "description": machine_data},
        ]
    if not machine_events:
        return {"machine_id": machine_id.upper(), "analysis": "No events recorded yet for this machine."}

    analysis = await ai_service.root_cause_analysis(
        machine.get("machine_name", machine_id),
        machine_events,
    )
    return {"machine_id": machine_id.upper(), "analysis": analysis}
