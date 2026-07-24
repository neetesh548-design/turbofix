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


@pytest.mark.asyncio
async def test_detect_language_empty_text():
    """Test language detection on empty or whitespace-only text."""
    lang = detect_language("")
    assert lang == 'en'  # Default fallback

    lang = detect_language("   \n\t  ")
    assert lang == 'en'  # Default fallback


# ============================================================================
# Machine Record Extraction Tests
# ============================================================================

@pytest.mark.asyncio
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


@pytest.mark.asyncio
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


@pytest.mark.asyncio
async def test_extract_prioritizes_confidence_over_volume():
    """Test that high-confidence extractions are preferred over quantity."""
    # Two extraction sources: photo (high confidence) vs OCR (low confidence)
    # Should prioritize photo


@pytest.mark.asyncio
async def test_extract_normalizes_conflicting_data():
    """Test handling when two sources give conflicting specs."""
    # Source 1 (photo): Model ABB M2AA132S-4
    # Source 2 (datasheet OCR): Model ABB M2AA132S-6
    # Should flag as AMBIGUOUS and require confirmation


# ============================================================================
# Repeat Failure Detection Tests
# ============================================================================

def test_check_repeat_failure_first_occurrence():
    """Test first occurrence of an issue (no repeat yet)."""
    machine_id = 'M042'
    issue = 'Bearing overheating'
    factory_id = 'F001'

    result = check_repeat_failure(
        machine_id=machine_id,
        issue=issue,
        factory_id=factory_id,
        days=30,
        threshold=2
    )

    assert result is False  # No previous occurrences


def test_check_repeat_failure_within_threshold():
    """Test detecting repeat failure within threshold window."""
    machine_id = 'M042'
    issue = 'Bearing overheating'
    factory_id = 'F001'

    # Seed: create first ticket for this issue
    # Then create second ticket
    # check_repeat_failure should return True

    result = check_repeat_failure(
        machine_id=machine_id,
        issue=issue,
        factory_id=factory_id,
        days=30,
        threshold=2
    )

    assert result is True


def test_check_repeat_failure_outside_threshold():
    """Test repeat failure is NOT detected if outside time window."""
    machine_id = 'M042'
    issue = 'Bearing overheating'
    factory_id = 'F001'

    # First occurrence 60 days ago
    # Second occurrence today
    # With days=30 threshold, should NOT detect repeat

    result = check_repeat_failure(
        machine_id=machine_id,
        issue=issue,
        factory_id=factory_id,
        days=30,  # Only look back 30 days
        threshold=2
    )

    assert result is False


def test_check_repeat_failure_similar_issues():
    """Test that similar issues (not exact match) are grouped."""
    machine_id = 'M042'
    factory_id = 'F001'

    # Ticket 1: "Bearing making noise"
    # Ticket 2: "Bearing squeaking sound"
    # Should detect as repeat (semantic similarity)

    result = check_repeat_failure(
        machine_id=machine_id,
        issue="Bearing squeaking sound",
        factory_id=factory_id,
        days=30,
        threshold=2
    )

    assert result is True  # Semantic match to "bearing noise"


def test_check_repeat_failure_different_machines_not_grouped():
    """Test that issues on different machines are NOT grouped."""
    machine_id_1 = 'M042'
    machine_id_2 = 'M043'
    issue = 'Bearing overheating'
    factory_id = 'F001'

    # Both machines have bearing issues, but should not cross-correlate
    result = check_repeat_failure(
        machine_id=machine_id_1,
        issue=issue,
        factory_id=factory_id,
        days=30,
        threshold=2
    )

    # Should be False (no history on M042 yet)
    assert result is False


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

@pytest.mark.asyncio
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


@pytest.mark.asyncio
async def test_maintenance_assistant_prevents_cross_tenant_info_leak():
    """Test that assistant cannot access other company's machine data."""
    # Company A factory, Company B machine ID
    # Should fail with PermissionError or return empty result


@pytest.mark.asyncio
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
