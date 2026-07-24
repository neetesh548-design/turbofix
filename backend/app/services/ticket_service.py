"""Ticket service — all business logic for creating, processing, and closing tickets.

This is where the heavy lifting from main.py now lives.  The route handler
(webhook_router.py) only parses the HTTP request and calls these methods.
"""

import re
from datetime import datetime, timezone
from typing import Optional

from fastapi import BackgroundTasks

from app import config
from app.infrastructure.logging import get_logger
from app.parser import parse_message
from app.repositories.base import EventRepository, MachineRepository, TicketRepository, new_event_id
from app.services import ai_service, fanout_service
from app.services.machine_data_service import read_machine_data
from app.sessions import Session, SessionStore

log = get_logger("turbofix.ticket")

_PLACEHOLDER_DESCRIPTION = "(no description provided)"

_CLOSE_RE = re.compile(
    r"(?:close|closed|resolve|resolved|done|fixed|complete|completed|band|bंद)\s*(T[\w-]+)",
    re.IGNORECASE,
)

_APPROVE_RE = re.compile(
    r"(?:approve|approved|accept|ok)\s*(T[\w-]+)",
    re.IGNORECASE,
)

_REJECT_RE = re.compile(
    r"(?:reject|rejected|denied|deny)\s*(T[\w-]+)\s*(.*)",
    re.IGNORECASE,
)

_DELEGATE_RE = re.compile(
    r"(?:delegate|assign|transfer)\s*(T[\w-]+)\s+(?:to\s+)?(\+?\d{10,15})",
    re.IGNORECASE,
)

_OUTSOURCE_RE = re.compile(
    r"(?:outsource|outsourced|vendor)\s*(T[\w-]+)\s+(\S+)\s*(.*)",
    re.IGNORECASE,
)

_WAITING_PARTS_RE = re.compile(
    r"(?:waiting[_ ]?parts|parts[_ ]?needed|need[_ ]?parts)\s*(T[\w-]+)",
    re.IGNORECASE,
)

_CONFIRM_AI_RE = re.compile(
    r"(?:confirm|correct|accurate|right)\s*(T[\w-]+)",
    re.IGNORECASE,
)

_OVERRIDE_AI_RE = re.compile(
    r"(?:override|wrong|incorrect|inaccurate)\s*(T[\w-]+)\s*(.*)",
    re.IGNORECASE,
)

_PARTS_REQUEST_RE = re.compile(
    r"(?:parts?|spare|consumable|need)\s+([\w-]+)\s+(.+?)(?:\s+(\d+))?$",
    re.IGNORECASE,
)

_PO_APPROVE_RE = re.compile(
    r"(?:po[_ ]?approve|approve[_ ]?po)\s*(PO[\w-]+)",
    re.IGNORECASE,
)

_PO_REJECT_RE = re.compile(
    r"(?:po[_ ]?reject|reject[_ ]?po)\s*(PO[\w-]+)\s*(.*)",
    re.IGNORECASE,
)

_ISSUE_PART_RE = re.compile(
    r"(?:issue|issued|dispatch)\s*(PR[\w-]+)",
    re.IGNORECASE,
)


def _merge_description(existing: str, transcript: str) -> str:
    if not existing or existing == _PLACEHOLDER_DESCRIPTION:
        return transcript
    return f"{existing} | Voice note: {transcript}"


def _log_event(
    events: EventRepository,
    machine_id: str,
    company_code: str,
    ticket_id: str,
    event_type: str,
    actor_phone: str,
    description: str,
    media_type: str = "",
    media_id: str = "",
    language: str = "",
) -> None:
    """Log an event to the MachineEvents tab."""
    try:
        events.append({
            "event_id": new_event_id(),
            "machine_id": machine_id,
            "company_code": company_code,
            "ticket_id": ticket_id,
            "event_type": event_type,
            "timestamp": datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S"),
            "actor_phone": actor_phone,
            "description": description,
            "media_type": media_type,
            "media_id": media_id,
            "language": language,
        })
    except Exception as exc:
        log.error("event.log_failed", ticket_id=ticket_id, error=str(exc))


async def _detect_and_store_language(
    ticket_id: str,
    text: str,
    tickets: TicketRepository,
) -> str:
    """Detect language from text and store it on the ticket. Returns the detected language code."""
    if not ai_service.ai_enabled() or not text or text == _PLACEHOLDER_DESCRIPTION:
        return "en"
    try:
        lang = await ai_service.detect_language(text)
        tickets.update_language(ticket_id, lang)
        log.info("language.detected", ticket_id=ticket_id, language=lang)
        return lang
    except Exception as exc:
        log.error("language.detect_failed", ticket_id=ticket_id, error=str(exc))
        return "en"


_role_summaries_cache: dict = {}


async def _summarize_and_store(
    ticket_id: str,
    description: str,
    tickets: TicketRepository,
    new_description: Optional[str] = None,
    machine_id: Optional[str] = None,
) -> None:
    if not ai_service.ai_enabled():
        log.info("ai.skipped", reason="not_configured", ticket_id=ticket_id)
        return
    try:
        ai_input = description
        if machine_id:
            ticket = tickets.get(ticket_id) or {}
            machine_context = read_machine_data({
                "company_code": ticket.get("company_code", ""),
                "machine_id": machine_id,
                "machine_name": ticket.get("machine_name", machine_id),
            })
            if machine_context:
                ai_input = f"Machine knowledge file:\n{machine_context}\n\nReported issue:\n{description}"
        brief = await ai_service.summarize_issue(ai_input)
        tickets.update_ai_fields(
            ticket_id,
            ai_summary=brief.as_ai_summary(),
            urgency=brief.urgency,
            description=new_description,
        )
        _role_summaries_cache[ticket_id] = {
            "owner": brief.owner_summary,
            "supervisor": brief.supervisor_summary,
            "technician": brief.technician_summary,
        }
        log.info("ai.stored", ticket_id=ticket_id, urgency=brief.urgency)
    except Exception as exc:
        log.error("ai.summarize_failed", ticket_id=ticket_id, error=str(exc))


async def _notify_fanout(
    machine_id: str,
    ticket_id: str,
    tickets: TicketRepository,
    machines: MachineRepository,
) -> None:
    machine = machines.get(machine_id)
    ticket = tickets.get(ticket_id)
    if machine is None or ticket is None:
        log.warning("fanout.missing_data", ticket_id=ticket_id, machine_id=machine_id)
        return
    role_data = _role_summaries_cache.pop(ticket_id, {})
    if role_data:
        ticket = dict(ticket)
        ticket["_owner_summary"] = role_data.get("owner", "")
        ticket["_supervisor_summary"] = role_data.get("supervisor", "")
        ticket["_technician_summary"] = role_data.get("technician", "")
    await fanout_service.notify_ticket(machine, ticket)


async def finish_text_ticket(
    phone: str,
    machine_id: str,
    ticket_id: str,
    description: str,
    sessions: SessionStore,
    tickets: TicketRepository,
    machines: MachineRepository,
    events: EventRepository,
) -> None:
    """Background tail for a text-triggered ticket: language detection + AI summary + fan-out + event log."""
    lang = await _detect_and_store_language(ticket_id, description, tickets)
    await _summarize_and_store(ticket_id, description, tickets, machine_id=machine_id)

    ticket = tickets.get(ticket_id)
    machine = machines.get(machine_id)
    company_code = machine["company_code"] if machine else ""

    _log_event(
        events, machine_id, company_code, ticket_id,
        "ticket_created", phone,
        description or _PLACEHOLDER_DESCRIPTION,
        language=lang,
    )

    if ticket and ticket.get("ai_summary"):
        _log_event(
            events, machine_id, company_code, ticket_id,
            "ai_summary", "system",
            ticket["ai_summary"],
        )

    await _notify_fanout(machine_id, ticket_id, tickets, machines)
    sessions.mark_notified(phone)


async def handle_text_message(
    phone: str,
    text: str,
    background_tasks: BackgroundTasks,
    sessions: SessionStore,
    tickets: TicketRepository,
    machines: MachineRepository,
    events: EventRepository,
    tech_work: "TechnicianWorkRepository" = None,
) -> None:
    """Handle an incoming text message — escalation commands, closure, or new ticket."""
    confirm_match = _CONFIRM_AI_RE.search(text)
    if confirm_match:
        background_tasks.add_task(
            handle_confirm_ai_command, phone, confirm_match.group(1), tickets,
        )
        return

    override_match = _OVERRIDE_AI_RE.search(text)
    if override_match:
        background_tasks.add_task(
            handle_override_ai_command, phone, override_match.group(1),
            override_match.group(2).strip() or "Technician override", tickets,
        )
        return

    approve_match = _APPROVE_RE.search(text)
    if approve_match:
        background_tasks.add_task(
            handle_approve_command, phone, approve_match.group(1), tickets, machines, events,
        )
        return

    reject_match = _REJECT_RE.search(text)
    if reject_match:
        background_tasks.add_task(
            handle_reject_command, phone, reject_match.group(1),
            reject_match.group(2).strip() or "No reason given", tickets, machines, events,
        )
        return

    delegate_match = _DELEGATE_RE.search(text)
    if delegate_match:
        to_phone = delegate_match.group(2)
        if not to_phone.startswith("+"):
            to_phone = "+" + to_phone
        background_tasks.add_task(
            handle_delegate_command, phone, delegate_match.group(1), to_phone,
            tickets, machines, events,
        )
        return

    outsource_match = _OUTSOURCE_RE.search(text)
    if outsource_match:
        background_tasks.add_task(
            handle_outsource_command, phone, outsource_match.group(1),
            outsource_match.group(2), outsource_match.group(3).strip(),
            tickets, machines, events,
        )
        return

    waiting_match = _WAITING_PARTS_RE.search(text)
    if waiting_match:
        background_tasks.add_task(
            handle_waiting_parts_command, phone, waiting_match.group(1),
            tickets, machines, events,
        )
        return

    po_approve_match = _PO_APPROVE_RE.search(text)
    if po_approve_match:
        background_tasks.add_task(
            handle_po_approve_command, phone, po_approve_match.group(1),
        )
        return

    po_reject_match = _PO_REJECT_RE.search(text)
    if po_reject_match:
        background_tasks.add_task(
            handle_po_reject_command, phone, po_reject_match.group(1),
            po_reject_match.group(2).strip() or "No reason",
        )
        return

    issue_match = _ISSUE_PART_RE.search(text)
    if issue_match:
        background_tasks.add_task(
            handle_issue_part_command, phone, issue_match.group(1),
        )
        return

    parts_match = _PARTS_REQUEST_RE.search(text)
    if parts_match:
        background_tasks.add_task(
            handle_parts_request_command, phone, parts_match.group(1),
            parts_match.group(2).strip(),
            int(parts_match.group(3)) if parts_match.group(3) else 1,
            machines,
        )
        return

    close_match = _CLOSE_RE.search(text)
    if close_match:
        ticket_id_prefix = close_match.group(1)
        background_tasks.add_task(
            handle_close_command, phone, ticket_id_prefix, tickets, machines, events,
        )
        return

    parsed = parse_message(text)
    if parsed is None:
        log.info("message.no_machine_id", phone=phone)
        return

    machine = machines.get(parsed.machine_id)
    if machine is None:
        log.warning("message.unknown_machine", machine_id=parsed.machine_id, phone=phone)
        return

    ticket_id = tickets.next_ticket_id()
    tickets.append({
        "ticket_id": ticket_id,
        "machine_id": parsed.machine_id,
        "company_code": machine["company_code"],
        "machine_name": machine["machine_name"],
        "reported_at": datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M"),
        "reporter_phone": phone,
        "description": parsed.description or _PLACEHOLDER_DESCRIPTION,
        "ai_summary": "",
        "urgency": "",
        "status": "Open",
        "closed_at": "",
        "hours_to_fix": "",
        "voice_note_media_id": "",
        "photo_media_id": "",
        "language": "",
        "closed_by": "",
    })
    sessions.open(phone, ticket_id, parsed.machine_id)
    log.info("ticket.created", ticket_id=ticket_id, machine_id=parsed.machine_id, phone=phone)

    # Assign work to technician (I2 Repair Loop - Create & Assign)
    if tech_work and machine:
        technician_phone = machine.get("assigned_technician_phone", "").strip()
        if technician_phone:
            work_record = {
                "ticket_id": ticket_id,
                "machine_id": parsed.machine_id,
                "company_code": machine.get("company_code", ""),
                "assigned_to_phone": technician_phone,
                "status": "open",
                "created_at": datetime.now(timezone.utc).isoformat(),
                "issue_description": parsed.description or _PLACEHOLDER_DESCRIPTION,
            }
            try:
                tech_work.upsert(work_record)
                _log_event(
                    events, parsed.machine_id, machine.get("company_code", ""),
                    ticket_id, "work_assigned", "system",
                    f"Assigned to technician {technician_phone}",
                )
                log.info("work.assigned", ticket_id=ticket_id, technician=technician_phone)

                # Notify technician via WhatsApp
                background_tasks.add_task(
                    fanout_service.notify_work_assigned,
                    technician_phone, ticket_id, machine, parsed.description or _PLACEHOLDER_DESCRIPTION,
                )
            except Exception as exc:
                log.error("work.assignment_failed", ticket_id=ticket_id, error=str(exc))

    try:
        from app.services import escalation_service
        ticket_row = tickets.get(ticket_id)
        factory_id = ticket_row.get("factory_id", "") if ticket_row else ""
        if factory_id:
            escalation_service.initialize_ticket_escalation(ticket_id, factory_id)
    except Exception as exc:
        log.error("escalation.init_failed", ticket_id=ticket_id, error=str(exc))

    try:
        from app.services import intelligence_service
        ticket_row = ticket_row or tickets.get(ticket_id)
        factory_id = ticket_row.get("factory_id", "") if ticket_row else ""
        if factory_id:
            background_tasks.add_task(
                intelligence_service.check_and_flag_on_creation,
                ticket_id, factory_id, parsed.machine_id,
            )
    except Exception as exc:
        log.error("intelligence.repeat_check_failed", ticket_id=ticket_id, error=str(exc))

    if parsed.description:
        background_tasks.add_task(
            finish_text_ticket, phone, parsed.machine_id, ticket_id,
            parsed.description, sessions, tickets, machines, events,
        )


async def finish_audio_ticket(
    phone: str,
    session: Session,
    media_id: str,
    sessions: SessionStore,
    tickets: TicketRepository,
    machines: MachineRepository,
    events: EventRepository,
) -> None:
    """Background tail for a voice-note-triggered ticket: transcribe + summarize + fan-out + event log."""
    from app.infrastructure import whatsapp

    machine = machines.get(session.machine_id)
    company_code = machine["company_code"] if machine else ""
    transcript = ""

    if ai_service.ai_enabled():
        try:
            local_path = await whatsapp.download_media(media_id)
            transcript = await ai_service.transcribe_audio(local_path)
            existing = tickets.get(session.ticket_id)
            existing_desc = existing["description"] if existing else ""
            merged = _merge_description(existing_desc, transcript)
            await _summarize_and_store(session.ticket_id, merged, tickets, new_description=merged, machine_id=session.machine_id)
        except Exception as exc:
            log.error("transcription.failed", ticket_id=session.ticket_id, error=str(exc))
    else:
        log.info("transcription.skipped", reason="ai_disabled", ticket_id=session.ticket_id)

    lang = await _detect_and_store_language(
        session.ticket_id, transcript or "(voice note)", tickets,
    )

    _log_event(
        events, session.machine_id, company_code, session.ticket_id,
        "voice_note", phone,
        transcript or "(voice note — transcription unavailable)",
        media_type="audio", media_id=media_id, language=lang,
    )

    ticket = tickets.get(session.ticket_id)
    if ticket and ticket.get("ai_summary"):
        _log_event(
            events, session.machine_id, company_code, session.ticket_id,
            "ai_summary", "system",
            ticket["ai_summary"],
        )

    if not session.notified:
        await _notify_fanout(session.machine_id, session.ticket_id, tickets, machines)
        sessions.mark_notified(phone)


async def handle_audio_message(
    phone: str,
    media_id: str,
    background_tasks: BackgroundTasks,
    sessions: SessionStore,
    tickets: TicketRepository,
    machines: MachineRepository,
    events: EventRepository,
) -> None:
    """Attach a voice note to the active session's ticket and kick off background work."""
    session = sessions.get(phone)
    if session is None:
        log.warning("audio.no_session", phone=phone, media_id=media_id)
        return

    tickets.attach_voice_note(session.ticket_id, media_id)
    log.info("audio.attached", ticket_id=session.ticket_id, media_id=media_id)

    background_tasks.add_task(
        finish_audio_ticket, phone, session, media_id, sessions, tickets, machines, events,
    )


async def finish_image_ticket(
    phone: str,
    session: Session,
    media_id: str,
    tickets: TicketRepository,
    machines: MachineRepository,
    events: EventRepository,
) -> None:
    """Background tail for an image message: download, analyze, store description, log event."""
    from app.infrastructure import whatsapp

    machine = machines.get(session.machine_id)
    company_code = machine["company_code"] if machine else ""

    tickets.attach_photo(session.ticket_id, media_id)
    image_description = ""

    if ai_service.ai_enabled():
        try:
            local_path = await whatsapp.download_media(media_id)
            image_description = await ai_service.analyze_image(local_path)

            existing = tickets.get(session.ticket_id)
            existing_desc = existing["description"] if existing else ""
            merged = _merge_description(existing_desc, f"[Photo analysis] {image_description}")
            await _summarize_and_store(session.ticket_id, merged, tickets, new_description=merged, machine_id=session.machine_id)
        except Exception as exc:
            log.error("image.analysis_failed", ticket_id=session.ticket_id, error=str(exc))

    _log_event(
        events, session.machine_id, company_code, session.ticket_id,
        "photo", phone,
        image_description or "(photo — analysis unavailable)",
        media_type="image", media_id=media_id,
    )


async def handle_image_message(
    phone: str,
    media_id: str,
    background_tasks: BackgroundTasks,
    sessions: SessionStore,
    tickets: TicketRepository,
    machines: MachineRepository,
    events: EventRepository,
) -> None:
    """Attach a photo to the active session's ticket and kick off image analysis."""
    session = sessions.get(phone)
    if session is None:
        log.warning("image.no_session", phone=phone, media_id=media_id)
        return

    log.info("image.attached", ticket_id=session.ticket_id, media_id=media_id)

    background_tasks.add_task(
        finish_image_ticket, phone, session, media_id, tickets, machines, events,
    )


def _phone_authorized_for_ticket(phone: str, ticket: dict, machine: dict | None) -> bool:
    """Check that the sender is the reporter or a company contact listed on the machine."""
    if ticket.get("reporter_phone") == phone:
        return True
    if machine is None:
        return False
    assigned = machine.get("assigned_technician_phone", "")
    if assigned and phone in [p.strip() for p in assigned.split(",") if p.strip()]:
        return True
    for key in ("informed_phone_1", "informed_phone_2", "informed_phone_3"):
        if machine.get(key) == phone:
            return True
    return False


async def handle_close_command(
    phone: str,
    ticket_id_input: str,
    tickets: TicketRepository,
    machines: MachineRepository,
    events: EventRepository,
) -> None:
    """Close a ticket and notify all stakeholders + the worker."""
    ticket = tickets.find_by_id_prefix(ticket_id_input)
    if ticket is None:
        log.warning("close.ticket_not_found", input=ticket_id_input, phone=phone)
        return

    ticket_id = ticket["ticket_id"]
    if ticket.get("status") == "Closed":
        log.info("close.already_closed", ticket_id=ticket_id, phone=phone)
        return

    machine_id = ticket.get("machine_id", "")
    machine = machines.get(machine_id)
    if not _phone_authorized_for_ticket(phone, ticket, machine):
        log.warning("close.unauthorized", ticket_id=ticket_id, phone=phone)
        return

    tickets.close_ticket(ticket_id, phone)
    log.info("ticket.closed", ticket_id=ticket_id, closed_by=phone)

    company_code = ticket.get("company_code", "")

    _log_event(
        events, machine_id, company_code, ticket_id,
        "ticket_closed", phone,
        f"Ticket closed by {phone}",
    )

    if machine is None:
        log.warning("close.machine_not_found", machine_id=machine_id)
        return

    refreshed_ticket = tickets.get(ticket_id)
    if refreshed_ticket is None:
        return

    worker_lang = refreshed_ticket.get("language") or "en"
    translated = None
    if worker_lang != "en" and ai_service.ai_enabled():
        try:
            machine_name = refreshed_ticket.get("machine_name", "")
            msg = (
                f"Your reported issue for {machine_name} (ticket {ticket_id}) "
                f"has been resolved and closed. Thank you for reporting!"
            )
            translated = await ai_service.translate_message(msg, worker_lang)
        except Exception as exc:
            log.error("close.translate_failed", ticket_id=ticket_id, error=str(exc))

    await fanout_service.notify_closure(
        machine, refreshed_ticket, phone,
        translated_message=translated,
        worker_language=worker_lang,
    )


async def handle_approve_command(
    phone: str,
    ticket_id_input: str,
    tickets: TicketRepository,
    machines: MachineRepository,
    events: EventRepository,
) -> None:
    """Maintenance Head approves closure evidence."""
    from app.services import escalation_service

    ticket = tickets.find_by_id_prefix(ticket_id_input)
    if not ticket:
        log.warning("approve.ticket_not_found", input=ticket_id_input)
        return

    ticket_id = ticket["ticket_id"]
    if ticket.get("status") != "pending_approval":
        log.info("approve.not_pending", ticket_id=ticket_id)
        return

    ok = await escalation_service.approve_ticket_closure(ticket_id, phone)
    if ok:
        _log_event(
            events, ticket.get("machine_id", ""), ticket.get("company_code", ""),
            ticket_id, "closure_approved", phone, f"Closure approved by {phone}",
        )
        machine = machines.get(ticket.get("machine_id", ""))
        refreshed = tickets.get(ticket_id)
        if machine and refreshed:
            await fanout_service.notify_closure(machine, refreshed, phone)


async def handle_reject_command(
    phone: str,
    ticket_id_input: str,
    reason: str,
    tickets: TicketRepository,
    machines: MachineRepository,
    events: EventRepository,
) -> None:
    """Maintenance Head rejects closure evidence."""
    from app.services import escalation_service

    ticket = tickets.find_by_id_prefix(ticket_id_input)
    if not ticket:
        log.warning("reject.ticket_not_found", input=ticket_id_input)
        return

    ticket_id = ticket["ticket_id"]
    if ticket.get("status") != "pending_approval":
        log.info("reject.not_pending", ticket_id=ticket_id)
        return

    technician_phone = ""
    machine = machines.get(ticket.get("machine_id", ""))
    if machine:
        technician_phone = machine.get("assigned_technician_phone", "")

    ok = await escalation_service.reject_ticket_closure(
        ticket_id, reason, technician_phone,
    )
    if ok:
        _log_event(
            events, ticket.get("machine_id", ""), ticket.get("company_code", ""),
            ticket_id, "closure_rejected", phone,
            f"Closure rejected: {reason}",
        )


async def handle_delegate_command(
    phone: str,
    ticket_id_input: str,
    to_phone: str,
    tickets: TicketRepository,
    machines: MachineRepository,
    events: EventRepository,
) -> None:
    """Delegate a ticket to a colleague."""
    from app.services import escalation_service

    ticket = tickets.find_by_id_prefix(ticket_id_input)
    if not ticket:
        log.warning("delegate.ticket_not_found", input=ticket_id_input)
        return

    ticket_id = ticket["ticket_id"]
    machine = machines.get(ticket.get("machine_id", ""))
    if not _phone_authorized_for_ticket(phone, ticket, machine):
        log.warning("delegate.unauthorized", ticket_id=ticket_id, phone=phone)
        return

    from app.services import intelligence_service

    factory_id = ticket.get("factory_id", "")
    if factory_id and intelligence_service.is_technician_overloaded(to_phone, factory_id):
        log.warning("delegate.target_overloaded", ticket_id=ticket_id,
                    to_phone=to_phone)

    ok = escalation_service.delegate_to_colleague(ticket_id, phone, to_phone)
    if ok:
        _log_event(
            events, ticket.get("machine_id", ""), ticket.get("company_code", ""),
            ticket_id, "delegated", phone,
            f"Delegated from {phone} to {to_phone}",
        )
        if machine:
            await fanout_service.notify_ticket(machine, tickets.get(ticket_id) or ticket)


async def handle_outsource_command(
    phone: str,
    ticket_id_input: str,
    vendor: str,
    reason: str,
    tickets: TicketRepository,
    machines: MachineRepository,
    events: EventRepository,
) -> None:
    """Manager marks ticket as outsourced to a third-party vendor."""
    from app.services import escalation_service

    ticket = tickets.find_by_id_prefix(ticket_id_input)
    if not ticket:
        log.warning("outsource.ticket_not_found", input=ticket_id_input)
        return

    ticket_id = ticket["ticket_id"]
    machine = machines.get(ticket.get("machine_id", ""))
    if not _phone_authorized_for_ticket(phone, ticket, machine):
        log.warning("outsource.unauthorized", ticket_id=ticket_id, phone=phone)
        return

    ok = escalation_service.mark_outsourced(
        ticket_id, vendor, reason or "Outsourced", "",
    )
    if ok:
        _log_event(
            events, ticket.get("machine_id", ""), ticket.get("company_code", ""),
            ticket_id, "outsourced", phone,
            f"Outsourced to {vendor}: {reason}",
        )


async def handle_waiting_parts_command(
    phone: str,
    ticket_id_input: str,
    tickets: TicketRepository,
    machines: MachineRepository,
    events: EventRepository,
) -> None:
    """Technician marks ticket as waiting for parts — pauses escalation."""
    ticket = tickets.find_by_id_prefix(ticket_id_input)
    if not ticket:
        log.warning("waiting_parts.ticket_not_found", input=ticket_id_input)
        return

    ticket_id = ticket["ticket_id"]
    machine = machines.get(ticket.get("machine_id", ""))
    if not _phone_authorized_for_ticket(phone, ticket, machine):
        log.warning("waiting_parts.unauthorized", ticket_id=ticket_id, phone=phone)
        return

    tickets.set_status(ticket_id, "waiting_parts")
    tickets.pause_escalation(ticket_id)
    _log_event(
        events, ticket.get("machine_id", ""), ticket.get("company_code", ""),
        ticket_id, "waiting_parts", phone,
        f"Waiting for parts — escalation paused by {phone}",
    )
    log.info("ticket.waiting_parts", ticket_id=ticket_id, phone=phone)


async def handle_closure_evidence(
    phone: str,
    ticket_id: str,
    media_id: str,
    tickets: TicketRepository,
    machines: MachineRepository,
) -> None:
    """Technician sends evidence photo for closure — forward to Maintenance Head."""
    from app.infrastructure import whatsapp
    from app.services import escalation_service

    try:
        local_path = await whatsapp.download_media(media_id)
    except Exception as exc:
        log.error("closure_evidence.download_failed", ticket_id=ticket_id, error=str(exc))
        return

    ticket = tickets.get(ticket_id)
    if not ticket:
        return

    machine = machines.get(ticket.get("machine_id", ""))
    maintenance_head_phone = ""
    if machine:
        for key in ("informed_phone_1", "informed_phone_2", "informed_phone_3"):
            p = machine.get(key, "")
            if p:
                maintenance_head_phone = p
                break

    await escalation_service.submit_closure(
        ticket_id, local_path, maintenance_head_phone,
    )
    log.info("closure_evidence.submitted", ticket_id=ticket_id, phone=phone)


async def handle_parts_request_command(
    phone: str,
    machine_id: str,
    part_name: str,
    qty: int,
    machines: MachineRepository,
) -> None:
    """Handle a WhatsApp part request message."""
    from app.services import consumables_service

    machine = machines.get(machine_id)
    if not machine:
        log.warning("parts_request.machine_not_found", machine_id=machine_id, phone=phone)
        return

    factory_id = ""
    company_code = machine.get("company_code", "")
    if company_code:
        from app.repositories.supabase_repo import _factory_id_for_code
        factory_id = _factory_id_for_code(company_code) or ""

    if not factory_id:
        log.warning("parts_request.no_factory", machine_id=machine_id)
        return

    consumables_service.create_part_request(
        factory_id=factory_id,
        machine_id=machine_id,
        requested_by_phone=phone,
        part_name=part_name,
        qty=qty,
    )
    log.info("parts_request.created", machine_id=machine_id, part=part_name,
             qty=qty, phone=phone)


async def handle_po_approve_command(phone: str, po_code: str) -> None:
    """Store Manager/VP approves a purchase order via WhatsApp."""
    from app.services import consumables_service

    ok = await consumables_service.approve_purchase_order(po_code, phone)
    if ok:
        log.info("po.approved", po_code=po_code, approved_by=phone)
    else:
        log.warning("po.approve_failed", po_code=po_code, phone=phone)


async def handle_po_reject_command(phone: str, po_code: str,
                                   reason: str) -> None:
    """Store Manager/VP rejects a purchase order via WhatsApp."""
    from app.services import consumables_service

    ok = await consumables_service.reject_purchase_order(po_code, phone, reason)
    if ok:
        log.info("po.rejected", po_code=po_code, rejected_by=phone)
    else:
        log.warning("po.reject_failed", po_code=po_code, phone=phone)


async def handle_issue_part_command(phone: str, request_code: str) -> None:
    """Store Incharge issues a requested part."""
    from app.services import consumables_service

    ok = await consumables_service.issue_part(request_code, issued_by=phone)
    if ok:
        log.info("issue.done", request_code=request_code, issued_by=phone)
    else:
        log.warning("issue.failed", request_code=request_code, phone=phone)


async def handle_confirm_ai_command(
    phone: str,
    ticket_id_input: str,
    tickets: TicketRepository,
) -> None:
    """Technician confirms AI diagnosis was correct."""
    from app.services import intelligence_service

    ticket = tickets.find_by_id_prefix(ticket_id_input)
    if not ticket:
        log.warning("confirm_ai.ticket_not_found", input=ticket_id_input)
        return

    await intelligence_service.confirm_ai_diagnosis(ticket["ticket_id"], phone)
    log.info("confirm_ai.done", ticket_id=ticket["ticket_id"], phone=phone)


async def handle_override_ai_command(
    phone: str,
    ticket_id_input: str,
    reason: str,
    tickets: TicketRepository,
) -> None:
    """Technician overrides AI diagnosis with their own assessment."""
    from app.services import intelligence_service

    ticket = tickets.find_by_id_prefix(ticket_id_input)
    if not ticket:
        log.warning("override_ai.ticket_not_found", input=ticket_id_input)
        return

    await intelligence_service.override_ai_diagnosis(
        ticket["ticket_id"], phone, reason,
    )
    log.info("override_ai.done", ticket_id=ticket["ticket_id"], phone=phone)


async def sweep_expired_unnotified(
    sessions: SessionStore,
    tickets: TicketRepository,
    machines: MachineRepository,
) -> None:
    """Fire a fallback fan-out for any session that expired without being notified."""
    for phone, session in sessions.sweep_expired_unnotified():
        log.info(
            "sweep.fallback_fanout",
            ticket_id=session.ticket_id,
            machine_id=session.machine_id,
        )
        await _notify_fanout(session.machine_id, session.ticket_id, tickets, machines)
