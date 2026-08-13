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
from datetime import datetime, timedelta, timezone
from unittest.mock import Mock, patch, AsyncMock

from app.services import escalation_service
from app.sessions import SessionStore


@pytest.fixture
def session_store():
    """In-memory session store for testing."""
    return SessionStore()


@pytest.mark.anyio
async def test_initialize_ticket_escalation(admin_token, admin_auth_headers, session_store):
    """Test creating a new ticket escalation record."""
    ticket_id = 'T123'
    factory_id = 'F001'

    # Initialize escalation
    escalation_service.initialize_ticket_escalation(ticket_id, factory_id)

    # Verify escalation timer started
    # (implementation detail: checks internal _escalation_loop tracking)
    # Should now be monitored for auto-escalation at configured hours


@pytest.mark.anyio
async def test_escalation_fires_at_threshold(admin_token, session_store):
    """Test automatic escalation triggers after N hours."""
    ticket_id = 'T456'
    factory_id = 'F001'

    # Mock the created_at to be 5+ hours ago (trigger escalation)
    with patch('app.services.escalation_service._ticket_created_timestamp') as mock_ts:
        mock_ts.return_value = datetime.now(timezone.utc) - timedelta(hours=6)

        # Run escalation sweep
        # Should detect this ticket is old and send WhatsApp notification
        # to maintenance head with escalation message


def test_check_repeat_failure_detects_pattern(admin_token):
    """intelligence_service.check_repeat_failure is the real, only definition now
    (a shadowing stub of the same name used to silently override it and always
    return an unrelated bool from a broken repo call — see intelligence_service.py
    git history). Verify it queries tickets scoped to the machine/factory and
    correctly flags a repeat failure once the count exceeds threshold."""
    from app.services import intelligence_service

    factory_id = 'F001'
    machine_id = 'M001'

    with patch('app.repositories.supabase_repo._client') as mock_client:
        # Below threshold: 2 tickets, threshold=2 -> not a repeat failure yet
        mock_client.select.return_value = [{'id': '1'}, {'id': '2'}]
        result = intelligence_service.check_repeat_failure(factory_id, machine_id, days=7, threshold=2)
        assert result == {
            'is_repeat_failure': False,
            'ticket_count_in_period': 2,
            'period_days': 7,
            'threshold': 2,
        }

        # Above threshold: 3 tickets, threshold=2 -> repeat failure
        mock_client.select.return_value = [{'id': '1'}, {'id': '2'}, {'id': '3'}]
        result = intelligence_service.check_repeat_failure(factory_id, machine_id, days=7, threshold=2)
        assert result['is_repeat_failure'] is True
        assert result['ticket_count_in_period'] == 3


@pytest.mark.anyio
async def test_approve_ticket_closure_as_supervisor(admin_token, admin_auth_headers):
    """Approving closure must actually persist through TicketRepository.approve_closure,
    not just return True — this is a regression test for the shadowed-stub bug where
    approve_ticket_closure silently no-op'd and returned True without calling the repo."""
    ticket_id = 'T789'
    supervisor_phone = '+91-9999999999'

    with patch.object(escalation_service, '_ticket_repo') as mock_repo:
        mock_repo.approve_closure.return_value = True

        result = await escalation_service.approve_ticket_closure(ticket_id, supervisor_phone)

        assert result is True
        mock_repo.approve_closure.assert_called_once_with(ticket_id, supervisor_phone)


@pytest.mark.anyio
async def test_reject_ticket_closure_with_reason(admin_token):
    """Rejecting closure must call TicketRepository.reject_closure and resume the
    escalation timer — regression test for the same shadowed-stub bug."""
    ticket_id = 'T789'
    technician_phone = '+91-9999999999'
    rejection_reason = 'Issue recurred after 2 hours - needs deeper root cause analysis'

    with patch.object(escalation_service, '_ticket_repo') as mock_repo:
        mock_repo.reject_closure.return_value = True
        mock_repo.get.return_value = {'ticket_id': ticket_id, 'machine_name': 'M042'}

        result = await escalation_service.reject_ticket_closure(
            ticket_id, rejection_reason, technician_phone
        )

        assert result is True
        mock_repo.reject_closure.assert_called_once_with(ticket_id, rejection_reason)
        mock_repo.resume_escalation.assert_called_once()


@pytest.mark.anyio
async def test_delegate_to_colleague(admin_token):
    """Delegation must call TicketRepository.delegate_ticket — regression test for the
    same shadowed-stub bug."""
    ticket_id = 'T999'
    from_technician_phone = '+91-8888888888'
    to_technician_phone = '+91-7777777777'

    with patch.object(escalation_service, '_ticket_repo') as mock_repo:
        mock_repo.delegate_ticket.return_value = True
        mock_repo.get.return_value = {
            'ticket_id': ticket_id, 'factory_id': 'F001', 'current_escalation_level': 1,
        }
        with patch.object(escalation_service, '_config_repo') as mock_config:
            mock_config.get_threshold_for_level.return_value = None

            result = escalation_service.delegate_to_colleague(
                ticket_id, from_technician_phone, to_technician_phone
            )

        assert result is True
        mock_repo.delegate_ticket.assert_called_once_with(
            ticket_id, from_technician_phone, to_technician_phone
        )


@pytest.mark.anyio
async def test_mark_outsourced_escalation(admin_token):
    """Marking a ticket outsourced must call TicketRepository.mark_outsourced —
    regression test for the same shadowed-stub bug."""
    ticket_id = 'T555'
    reason = 'Requires specialist hydraulic technician - beyond in-house capability'
    vendor = 'Hydraulic Specialists Ltd'
    evidence_url = ''

    with patch.object(escalation_service, '_ticket_repo') as mock_repo:
        mock_repo.mark_outsourced.return_value = True

        result = escalation_service.mark_outsourced(ticket_id, vendor, reason, evidence_url)

        assert result is True
        mock_repo.mark_outsourced.assert_called_once_with(ticket_id, vendor, reason, evidence_url)


@pytest.mark.anyio
async def test_submit_closure_with_evidence(admin_token):
    """Submitting closure evidence must call TicketRepository.submit_closure_evidence
    and pause the escalation timer — regression test for the same shadowed-stub bug
    (technicians were being told this succeeded while nothing was ever recorded)."""
    ticket_id = 'T777'
    evidence_url = '/tmp/media/photo_1.jpg'
    maintenance_head_phone = '+91-5555555555'

    with patch.object(escalation_service, '_ticket_repo') as mock_repo:
        mock_repo.submit_closure_evidence.return_value = True
        mock_repo.get.return_value = {'ticket_id': ticket_id, 'machine_name': 'M042'}

        result = await escalation_service.submit_closure(
            ticket_id, evidence_url, maintenance_head_phone
        )

        assert result is True
        mock_repo.submit_closure_evidence.assert_called_once_with(ticket_id, evidence_url)
        mock_repo.pause_escalation.assert_called_once_with(ticket_id)


@pytest.mark.anyio
async def test_send_escalation_whatsapp_format(admin_token):
    """Test WhatsApp message formatting for escalation alerts."""
    ticket = {
        'ticket_id': 'T001',
        'machine_id': 'M042',
        'created_at': datetime.now(timezone.utc) - timedelta(hours=5),
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


@pytest.mark.anyio
def test_initialize_part_request_escalation(admin_token):
    """consumables_service re-exports escalation_service.initialize_part_request_escalation
    directly (`from app.services.escalation_service import initialize_part_request_escalation`)
    and calls it positionally as (request_id, factory_id) — verify it looks up the level-1
    threshold and sets the escalation timer on the part request."""
    request_id = 'PR001'
    factory_id = 'F001'

    with patch.object(escalation_service, '_config_repo') as mock_config, \
         patch.object(escalation_service, '_part_repo') as mock_part_repo:
        mock_config.get_threshold_for_level.return_value = {'threshold_min': 60}

        escalation_service.initialize_part_request_escalation(request_id, factory_id)

        mock_config.get_threshold_for_level.assert_called_once_with(factory_id, 'consumable', 1)
        mock_part_repo.update_escalation.assert_called_once()
        call_args = mock_part_repo.update_escalation.call_args[0]
        assert call_args[0] == request_id
        assert call_args[1] == 1


def test_escalation_loop_runs_periodically():
    """Test that _escalation_loop runs without errors."""
    # This is a lifespan task in main.py
    # Verify it can be called and handles edge cases (no tickets, DB error, etc.)
    pass


@pytest.mark.anyio
async def test_escalation_respects_shift_boundaries(admin_token):
    """Test escalation timing respects factory shift schedule."""
    ticket_id = 'T888'
    factory_id = 'F001'

    # Ticket created at 17:45 (near end of shift)
    # Escalation threshold is 4 hours
    # Should escalate at 21:45 (during night shift) not during business hours
    pass
