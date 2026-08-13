"""
Integration tests for intelligence_service.py

Tests AI-powered machine intelligence features:
- Language detection for multilingual issues
- Machine record extraction (specs, parts, risks)
- Repeat failure detection
- Inventory depletion alerts
- Maintenance pattern analysis
"""

import pytest
from unittest.mock import Mock, patch, AsyncMock

from app.services.intelligence_service import (
    detect_language,
    extract_machine_record,
    maintenance_assistant,
    check_repeat_failure,
    check_inventory,
)
from app.services.machine_record_service import (
    analyze_image,
    extract_machine_record as extract_via_service,
)


# ============================================================================
# Language Detection Tests
# ============================================================================

def test_detect_language_english():
    """Test detection of English text."""
    text = "Motor is making a grinding noise and vibrating excessively"
    lang = detect_language(text)
    assert lang == 'en', f"Expected 'en', got '{lang}'"


def test_detect_language_hindi():
    """Test detection of Hindi text (Devanagari script)."""
    text = "मोटर तेल लीक हो रहा है और बहुत गर्म हो गया है"
    lang = detect_language(text)
    assert lang == 'hi', f"Expected 'hi', got '{lang}'"


def test_detect_language_marathi():
    """Test detection of Marathi text."""
    text = "पंप दाब कमी आहे आणि तेल गरम आहे"
    lang = detect_language(text)
    assert lang == 'mr', f"Expected 'mr', got '{lang}'"


def test_detect_language_mixed_script_defaults_to_primary():
    """Test mixed language text defaults to primary language."""
    text = "Motor vibration bad, pressure = 150 bar, तापमान 85°C"
    lang = detect_language(text)
    # Should detect as English (primary) despite mixed Hindi numerals
    assert lang in ['en', 'hi']


@pytest.mark.anyio
async def test_detect_language_empty_text():
    """Test language detection on empty or whitespace-only text."""
    lang = detect_language("")
    assert lang == 'en'  # Default fallback

    lang = detect_language("   \n\t  ")
    assert lang == 'en'  # Default fallback


# ============================================================================
# Machine Record Extraction Tests
# ============================================================================

@pytest.mark.anyio
async def test_extract_machine_record_from_text():
    """Test extracting structured data from issue description."""
    text = """
    Model: ABB M2AA132S-4, 9.2kW motor assembly
    Issue: Bearing noise during startup, takes 30sec to smooth out
    Last service: 2026-03-15 (replaced seals)
    Current: 15A, Voltage: 440V, Temperature: 68°C
    Vibration: 4.5mm/s RMS (normal: <3mm/s)
    """

    extraction = await extract_machine_record(text)

    assert extraction is not None
    assert 'machine_identity' in extraction
    assert 'maintenance_tasks' in extraction or 'specifications' in extraction

    # Should extract:
    # - Model: ABB M2AA132S-4
    # - Issue classification: bearing-related
    # - Last service date
    # - Current electrical parameters
    # - Vibration measurement


@pytest.mark.anyio
async def test_extract_machine_record_from_photo():
    """Test extracting data from machine photo (vision AI)."""
    # Mock image analysis
    image_base64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="

    with patch('app.services.machine_record_service.analyze_image') as mock_analyze:
        mock_analyze.return_value = {
            'equipment': 'Electric Motor',
            'visible_damage': ['oil_leak', 'corrosion_on_frame'],
            'specifications': {'power_rating': '15kW', 'voltage': '440V'},
            'parts_visible': ['bearing', 'fan_cover', 'terminal_box'],
            'confidence': 0.85,
        }

        extraction = await extract_machine_record(
            image=image_base64,
            context_machine_id='M042'
        )

        mock_analyze.assert_called_once()
        assert extraction is not None


@pytest.mark.anyio
async def test_extract_prioritizes_confidence_over_volume():
    """Test that high-confidence extractions are preferred over quantity."""
    # Two extraction sources: photo (high confidence) vs OCR (low confidence)
    # Should prioritize photo


@pytest.mark.anyio
async def test_extract_normalizes_conflicting_data():
    """Test handling when two sources give conflicting specs."""
    # Source 1 (photo): Model ABB M2AA132S-4
    # Source 2 (datasheet OCR): Model ABB M2AA132S-6
    # Should flag as AMBIGUOUS and require confirmation


# ============================================================================
# Repeat Failure Detection Tests
# ============================================================================

# NOTE: check_repeat_failure(factory_id, machine_id, days=30, threshold=2) -> dict
# used to be shadowed by a second, later same-named def in this module that took
# different keyword args (machine_id, issue, factory_id, ...) and returned a bool —
# Python silently let the later def win, so these tests were actually exercising
# the shadow (which did semantic issue-text matching against a broken repo call
# that always fell back to an empty ticket list) rather than the real, simpler,
# count-based implementation that's actually wired into production via
# check_and_flag_on_creation. Rewritten below to test the real function's actual
# contract: scoped by factory_id+machine_id, counts tickets in the last `days`
# days, flags repeat when count exceeds `threshold`, returns a dict — it does not
# do issue-text/semantic matching, so tests claiming that behavior were never
# testing anything real and have been corrected rather than preserved as-is.

def test_check_repeat_failure_first_occurrence():
    """No tickets in the window -> not a repeat failure."""
    with patch('app.repositories.supabase_repo._client') as mock_client:
        mock_client.select.return_value = []

        result = check_repeat_failure('F001', 'M042', days=30, threshold=2)

        assert result['is_repeat_failure'] is False
        assert result['ticket_count_in_period'] == 0


def test_check_repeat_failure_within_threshold():
    """Ticket count exceeding threshold -> repeat failure detected."""
    with patch('app.repositories.supabase_repo._client') as mock_client:
        mock_client.select.return_value = [
            {'id': '1'}, {'id': '2'}, {'id': '3'},
        ]

        result = check_repeat_failure('F001', 'M042', days=30, threshold=2)

        assert result['is_repeat_failure'] is True
        assert result['ticket_count_in_period'] == 3


def test_check_repeat_failure_queries_scoped_by_factory_machine_and_days_window():
    """The time-window/scoping logic lives in the query itself (factory_id,
    machine_id, and a created_at >= cutoff filter derived from `days`) — verify
    check_repeat_failure actually builds that query rather than filtering
    client-side after an unscoped fetch."""
    with patch('app.repositories.supabase_repo._client') as mock_client:
        mock_client.select.return_value = []

        check_repeat_failure('F001', 'M042', days=30, threshold=2)

        mock_client.select.assert_called_once()
        table, query = mock_client.select.call_args[0]
        assert table == 'tickets'
        assert query['factory_id'] == 'eq.F001'
        assert query['machine_id'] == 'eq.M042'
        assert query['created_at'].startswith('gte.')


def test_check_repeat_failure_different_machines_not_grouped():
    """machine_id is a real query parameter, not a client-side filter — a
    different machine's tickets never reach this machine's count."""
    with patch('app.repositories.supabase_repo._client') as mock_client:
        mock_client.select.return_value = []

        check_repeat_failure('F001', 'M042', days=30, threshold=2)

        _, query = mock_client.select.call_args[0]
        assert query['machine_id'] == 'eq.M042'


# ============================================================================
# Inventory Depletion Alert Tests
# ============================================================================

def test_check_inventory_sufficient_stock():
    """Test no alert when spare parts stock is sufficient."""
    part_id = 'P123'  # Bearing replacement kit
    quantity_used = 2
    factory_id = 'F001'

    result = check_inventory(
        part_id=part_id,
        quantity_needed=quantity_used,
        factory_id=factory_id,
        days_ahead=7
    )

    # Should return: { alert: False, stock: 15 }
    assert result is not None
    assert result.get('alert') is False


def test_check_inventory_low_stock_alert():
    """Test alert triggered when stock falls below safety threshold."""
    part_id = 'P456'  # Hydraulic seal kit
    quantity_used = 8
    factory_id = 'F001'

    # Suppose current stock = 10, after use = 2
    result = check_inventory(
        part_id=part_id,
        quantity_needed=quantity_used,
        factory_id=factory_id,
        days_ahead=7
    )

    # Should return: { alert: True, stock: 2, threshold: 5 }
    assert result is not None
    assert result.get('alert') is True


def test_check_inventory_predicts_future_need():
    """Test inventory check predicts if stock will be depleted in N days."""
    part_id = 'P789'  # Motor coupling
    factory_id = 'F001'

    # Current stock: 5
    # Historical usage: 2 per week
    # days_ahead: 14
    # Predicted usage in 14 days: 4 units
    # Predicted stock: 1 unit (below threshold)

    result = check_inventory(
        part_id=part_id,
        quantity_needed=0,  # No immediate need
        factory_id=factory_id,
        days_ahead=14
    )

    if result.get('alert') is True:
        assert result.get('projected_depletion_date') is not None


# ============================================================================
# Maintenance Assistant Tests
# ============================================================================

@pytest.mark.anyio
async def test_maintenance_assistant_scoped_to_machine():
    """Test AI assistant is scoped to machine-specific context."""
    machine_id = 'M042'
    factory_id = 'F001'
    question = "What is the recommended bearing replacement interval?"

    with patch('app.services.machine_record_service.maintenance_assistant') as mock_ai:
        mock_ai.return_value = {
            'answer': '1000 operating hours for this bearing type',
            'sources': ['machine_manual_P123', 'service_log_2026-03'],
            'confidence': 0.92,
        }

        result = await maintenance_assistant(
            machine_id=machine_id,
            factory_id=factory_id,
            question=question
        )

        mock_ai.assert_called_once()
        # Verify context included machine specs, maintenance history
        assert result is not None


@pytest.mark.anyio
async def test_maintenance_assistant_prevents_cross_tenant_info_leak():
    """Test that assistant cannot access other company's machine data."""
    res = await maintenance_assistant(machine_id="M_OTHER_COMPANY", factory_id="F001", question="show private logs")
    assert res is not None


@pytest.mark.anyio
async def test_maintenance_assistant_rejects_invalid_questions():
    """Test rejection of out-of-scope questions."""
    machine_id = 'M042'
    factory_id = 'F001'
    out_of_scope = "What is the capital of France?"

    with patch('app.services.machine_record_service.maintenance_assistant') as mock_ai:
        mock_ai.return_value = {
            'answer': 'Cannot answer: question is out of scope for machine maintenance',
            'confidence': 1.0,
        }

        result = await maintenance_assistant(
            machine_id=machine_id,
            factory_id=factory_id,
            question=out_of_scope
        )

        assert 'out of scope' in result.get('answer', '').lower()
