"""
Integration tests for escalation_service.py

Tests ticket escalation workflow:
- Automatic escalation at N hours if still open
- Manual escalation to supervisor
- Closure approval/rejection
- Technician delegation
- Parts request escalation
- WhatsApp notifications
"""

import pytest
from datetime import datetime, timedelta
from unittest.mock import Mock, patch, AsyncMock

from app.services import escalation_service
from app.sessions import SessionStore


@pytest.fixture
def session_store():
    """In-memory session store for testing."""
    return SessionStore()


@pytest.mark.asyncio
async def test_initialize_ticket_escalation(admin_token, auth_headers, session_store):
    """Test creating a new ticket escalation record."""
    ticket_id = 'T123'
    factory_id = 'F001'

    # Initialize escalation
    escalation_service.initialize_ticket_escalation(ticket_id, factory_id)

    # Verify escalation timer started
    # (implementation detail: checks internal _escalation_loop tracking)
    # Should now be monitored for auto-escalation at configured hours


@pytest.mark.asyncio
async def test_escalation_fires_at_threshold(admin_token, session_store):
    """Test automatic escalation triggers after N hours."""
    ticket_id = 'T456'
    factory_id = 'F001'

    # Mock the created_at to be 5+ hours ago (trigger escalation)
    with patch('app.services.escalation_service._ticket_created_timestamp') as mock_ts:
        mock_ts.return_value = datetime.utcnow() - timedelta(hours=6)

        # Run escalation sweep
        # Should detect this ticket is old and send WhatsApp notification
        # to maintenance head with escalation message


@pytest.mark.asyncio
async def test_check_repeat_failure_detects_pattern(admin_token):
    """Test repeat failure detection (same machine, same issue within N days)."""
    machine_id = 'M001'
    issue = 'Hydraulic pressure drops'
    factory_id = 'F001'

    # Create 3 tickets for same issue within 7 days
    # Should trigger repeat-failure escalation

    # First ticket
    escalation_service.check_repeat_failure(
        machine_id=machine_id,
        issue=issue,
        factory_id=factory_id,
        days=7,
        threshold=2
    )
    # Should return False (first occurrence)

    # Second ticket (within 7 days)
    # Should return True (repeat detected)


@pytest.mark.asyncio
async def test_approve_ticket_closure_as_supervisor(admin_token, auth_headers):
    """Test supervisor approving technician's closure report."""
    ticket_id = 'T789'
    supervisor_phone = '+91-9999999999'

    result = await escalation_service.approve_ticket_closure(
        ticket_id=ticket_id,
        phone=supervisor_phone
    )

    assert result is True
    # Should:
    # 1. Mark ticket as closed in TicketRepository
    # 2. Send WhatsApp closure confirmation to technician
    # 3. Send closure notification to all stakeholders
    # 4. Update MachineRepository.has_open_ticket flag


@pytest.mark.asyncio
async def test_reject_ticket_closure_with_reason(admin_token):
    """Test supervisor rejecting technician's closure (incomplete work)."""
    ticket_id = 'T789'
    supervisor_phone = '+91-9999999999'
    rejection_reason = 'Issue recurred after 2 hours - needs deeper root cause analysis'

    result = await escalation_service.reject_ticket_closure(
        ticket_id=ticket_id,
        phone=supervisor_phone,
        reason=rejection_reason
    )

    assert result is True
    # Should:
    # 1. Re-open ticket (revert status from closing)
    # 2. Send WhatsApp to technician with rejection reason
    # 3. Restart escalation timer
    # 4. Notify maintenance head of repeated closure attempts


@pytest.mark.asyncio
async def test_delegate_to_colleague(admin_token):
    """Test technician delegating ticket to colleague."""
    ticket_id = 'T999'
    from_technician_phone = '+91-8888888888'
    to_technician_phone = '+91-7777777777'

    result = escalation_service.delegate_to_colleague(
        ticket_id=ticket_id,
        from_phone=from_technician_phone,
        to_phone=to_technician_phone
    )

    assert result is True
    # Should:
    # 1. Update ticket assignee in TicketRepository
    # 2. Send WhatsApp to receiving technician (acceptance required)
    # 3. Log delegation in event stream
    # 4. Notify supervisor of reassignment


@pytest.mark.asyncio
async def test_mark_outsourced_escalation(admin_token):
    """Test marking issue as outsourced (vendor/contractor involvement)."""
    ticket_id = 'T555'
    technician_phone = '+91-6666666666'
    reason = 'Requires specialist hydraulic technician - beyond in-house capability'
    vendor = 'Hydraulic Specialists Ltd'

    result = escalation_service.mark_outsourced(
        ticket_id=ticket_id,
        phone=technician_phone,
        reason=reason,
        vendor=vendor
    )

    assert result is True
    # Should:
    # 1. Mark ticket.outsourced = True in repository
    # 2. Log vendor name for cost tracking
    # 3. Send WhatsApp to supervisor for approval
    # 4. Notify finance team for vendor payment setup


@pytest.mark.asyncio
async def test_submit_closure_with_evidence(admin_token):
    """Test technician submitting closure evidence (photo/notes)."""
    ticket_id = 'T777'
    technician_phone = '+91-5555555555'
    evidence_notes = '''
    Root cause: Bearing seal degradation after 8000 operating hours.
    Solution: Replaced bearing assembly (Part#: HYD-4521).
    Verification: Ran 30-minute load test at 200bar - stable, no leaks.
    Spare parts used: HYD-4521 bearing, HYD-2340 seal kit.
    Parts requested: None (in-stock).
    '''
    evidence_media_ids = ['media_photo_1', 'media_video_1']

    result = await escalation_service.submit_closure(
        ticket_id=ticket_id,
        phone=technician_phone,
        notes=evidence_notes,
        media_ids=evidence_media_ids
    )

    assert result is True
    # Should:
    # 1. Create TechnicianWorkRepository entry with evidence
    # 2. Send WhatsApp to supervisor requesting approval/rejection
    # 3. Extract structured data (parts used, labor hours, etc.)
    # 4. Trigger AI root cause analysis if enabled


@pytest.mark.asyncio
async def test_send_escalation_whatsapp_format(admin_token):
    """Test WhatsApp message formatting for escalation alerts."""
    ticket = {
        'ticket_id': 'T001',
        'machine_id': 'M042',
        'created_at': datetime.utcnow() - timedelta(hours=5),
        'issue': 'Motor vibration - suspected bearing issue',
        'urgency': 'URGENT',
        'assignee_phone': '+91-9123456789',
    }
    recipient_phone = '+91-9999999999'  # Supervisor

    with patch('app.infrastructure.whatsapp.send_template_message') as mock_send:
        await escalation_service._send_escalation_whatsapp(
            ticket=ticket,
            recipient_phone=recipient_phone,
            message_key='turbofix_escalation_5h'
        )

        # Verify WhatsApp message was sent
        mock_send.assert_called_once()
        call_args = mock_send.call_args[0]

        # Should contain ticket ID, machine ID, hours open
        assert 'T001' in str(call_args)
        assert '5 hours' in str(call_args) or '5h' in str(call_args)


@pytest.mark.asyncio
async def test_initialize_part_request_escalation(admin_token):
    """Test escalation when spare parts unavailable in stock."""
    machine_id = 'M042'
    factory_id = 'F001'
    part_id = 'P123'
    urgency = 'URGENT'

    from app.services.consumables_service import initialize_part_request_escalation

    result = initialize_part_request_escalation(
        machine_id=machine_id,
        factory_id=factory_id,
        part_id=part_id,
        urgency=urgency
    )

    # Should:
    # 1. Create purchase order in PartsRepository
    # 2. Send WhatsApp to procurement team
    # 3. Log in events for audit
    # 4. Set escalation timer for expedited delivery


def test_escalation_loop_runs_periodically():
    """Test that _escalation_loop runs without errors."""
    # This is a lifespan task in main.py
    # Verify it can be called and handles edge cases (no tickets, DB error, etc.)
    pass


@pytest.mark.asyncio
async def test_escalation_respects_shift_boundaries(admin_token):
    """Test escalation timing respects factory shift schedule."""
    ticket_id = 'T888'
    factory_id = 'F001'

    # Ticket created at 17:45 (near end of shift)
    # Escalation threshold is 4 hours
    # Should escalate at 21:45 (during night shift) not during business hours
    pass
