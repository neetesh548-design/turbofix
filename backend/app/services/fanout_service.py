"""Fan-out service — notifies technicians and informed users about tickets.

Each recipient send is independent — one failure never blocks the rest.
Handles both new-ticket notifications and closure notifications.
Role-tailored alerts: owner gets cost/urgency summary, supervisor gets production
impact, maintenance technician gets technical details + suggested action.
"""

from app import config
from app.infrastructure.logging import get_logger

log = get_logger("turbofix.fanout")


def _recipients(machine: dict) -> list:
    recipients = []
    if machine.get("assigned_technician_phone"):
        phones = [p.strip() for p in machine["assigned_technician_phone"].split(",") if p.strip()]
        recipients.extend(phones)
    recipients.extend(machine.get("informed_phones", []))
    return recipients


def _all_recipients(machine: dict, ticket: dict) -> list:
    """All stakeholders + the original worker who reported the issue."""
    recipients = _recipients(machine)
    reporter = ticket.get("reporter_phone")
    if reporter and reporter not in recipients:
        recipients.append(reporter)
    return recipients


def _assignee(machine: dict) -> str:
    assignment = machine.get("assignments") or {}
    technician = assignment.get("technician") or {}
    return (
        machine.get("assigned_technician_name")
        or technician.get("name")
        or machine.get("assigned_technician_phone")
        or "Unassigned"
    )


def _template_params(ticket: dict, machine: dict) -> list:
    brief = ticket.get("ai_summary") or ticket.get("description") or "(no description)"
    return [
        ticket.get("ticket_id", ""),
        ticket.get("machine_name") or machine.get("machine_name", ""),
        ticket.get("location") or machine.get("location") or "Location not recorded",
        brief,
        ticket.get("urgency") or "Medium",
        _assignee(machine),
    ]


def _role_tailored_brief(ticket: dict, phone: str, machine: dict) -> str:
    """Return a role-appropriate summary based on who's receiving it."""
    technician_phone = machine.get("assigned_technician_phone", "")
    is_technician = phone == technician_phone

    tech_summary = ticket.get("_technician_summary", "")
    owner_summary = ticket.get("_owner_summary", "")
    supervisor_summary = ticket.get("_supervisor_summary", "")
    default = ticket.get("ai_summary") or ticket.get("description") or "(no description)"

    if is_technician and tech_summary:
        return tech_summary
    if owner_summary and not is_technician:
        return owner_summary if phone != technician_phone else default
    if supervisor_summary:
        return supervisor_summary
    return default


def _closure_params(ticket: dict, closed_by_phone: str) -> list:
    duration = ticket.get("hours_to_fix") or ticket.get("duration")
    if duration:
        duration = str(duration)
        if duration.replace(".", "", 1).isdigit():
            duration = f"{duration} hours"
    else:
        duration = "Not recorded"
    return [
        ticket.get("ticket_id", ""),
        ticket.get("machine_name", ""),
        ticket.get("resolution") or ticket.get("closure_notes")
        or ticket.get("ai_summary") or "Maintenance work completed",
        ticket.get("closed_by") or closed_by_phone or "TurboFix technician",
        duration,
    ]


async def notify_ticket(machine: dict, ticket: dict) -> None:
    """Fan out a finished ticket with role-tailored messages.

    - Assigned technician gets technical details + suggested action
    - Informed users (owner/supervisor) get their role-appropriate summaries
    - Falls back to the generic AI summary if role-specific ones aren't available
    """
    from app.infrastructure import whatsapp

    ticket_id = ticket.get("ticket_id")
    recipients = _recipients(machine)

    if not recipients:
        log.warning("fanout.no_recipients", ticket_id=ticket_id)
        return

    if not config.WHATSAPP_ACCESS_TOKEN or not config.WHATSAPP_PHONE_NUMBER_ID:
        log.info("fanout.skipped", reason="no_whatsapp_credentials", ticket_id=ticket_id)
        return

    for phone in recipients:
        brief = _role_tailored_brief(ticket, phone, machine)
        params = _template_params({**ticket, "ai_summary": brief}, machine)
        try:
            await whatsapp.send_template_message(phone, params)
            log.info("fanout.sent", ticket_id=ticket_id, recipient=phone, role_tailored=True)
        except Exception as exc:
            log.error("fanout.failed", ticket_id=ticket_id, recipient=phone, error=str(exc))


async def notify_closure(
    machine: dict,
    ticket: dict,
    closed_by_phone: str,
    translated_message: str | None = None,
    worker_language: str | None = None,
) -> None:
    """Notify all stakeholders + the worker that a ticket has been closed.

    If a translated_message is provided and worker_language differs from 'en',
    the worker gets the translated version while stakeholders get English.
    """
    from app.infrastructure import whatsapp

    ticket_id = ticket.get("ticket_id")
    all_phones = _all_recipients(machine, ticket)
    reporter_phone = ticket.get("reporter_phone")

    if not all_phones:
        log.warning("closure.no_recipients", ticket_id=ticket_id)
        return

    if not config.WHATSAPP_ACCESS_TOKEN or not config.WHATSAPP_PHONE_NUMBER_ID:
        log.info("closure.skipped", reason="no_whatsapp_credentials", ticket_id=ticket_id)
        return

    params = _closure_params(ticket, closed_by_phone)
    machine_name = ticket.get("machine_name", "")

    for phone in all_phones:
        try:
            if phone == reporter_phone and translated_message and worker_language and worker_language != "en":
                await whatsapp.send_text_message(phone, translated_message)
            else:
                await whatsapp.send_closure_template(phone, params)
            log.info("closure.sent", ticket_id=ticket_id, recipient=phone)
        except Exception as exc:
            log.error("closure.failed", ticket_id=ticket_id, recipient=phone, error=str(exc))


async def notify_work_assigned(
    technician_phone: str,
    ticket_id: str,
    machine: dict,
    issue_description: str,
) -> None:
    """Notify technician that work has been assigned to them (I2 Repair Loop).
    
    Called automatically when a new ticket is created and assigned.
    """
    from app.infrastructure import whatsapp
    from app.infrastructure.logging import get_logger

    log = get_logger("turbofix.fanout")

    if not config.WHATSAPP_ACCESS_TOKEN or not config.WHATSAPP_PHONE_NUMBER_ID:
        log.info("work_assigned.skipped", reason="no_whatsapp_credentials", ticket_id=ticket_id)
        return

    machine_name = machine.get("machine_name", "Unknown Machine")
    issue_short = (issue_description or "Unreported issue")[:100]

    message = f"🔧 New work assigned to you:\n\n*{machine_name}*\n{issue_short}\n\nTicket: {ticket_id}\n\nTap to view details in the Technician app."

    try:
        await whatsapp.send_text_message(technician_phone, message)
        log.info("work_assigned.notified", ticket_id=ticket_id, technician=technician_phone)
    except Exception as exc:
        log.error("work_assigned.notification_failed", ticket_id=ticket_id, technician=technician_phone, error=str(exc))
