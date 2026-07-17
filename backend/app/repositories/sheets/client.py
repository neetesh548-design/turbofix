"""Shared, cached Google Sheets client for all Sheets-backed repositories.

A single gspread.Client is reused across all repo instances in the same
process — creating one per call would exhaust OAuth token limits quickly.
Thread-safe via a simple module-level lock.
"""

import threading
from functools import lru_cache
from typing import Any, Iterable

import gspread
from gspread.exceptions import WorksheetNotFound
from google.oauth2.service_account import Credentials
from tenacity import retry, retry_if_not_exception_type, stop_after_attempt, wait_exponential

_SCOPES = [
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/drive",  # needed by Drive file storage
]

_lock = threading.Lock()
_client: gspread.Client = None


class SheetsUnavailableError(RuntimeError):
    """Raised when the live spreadsheet cannot be read after retrying."""


@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=0.25, min=0.25, max=1.0),
    reraise=True,
)
def _get_all_values(worksheet) -> list[list[Any]]:
    return worksheet.get_all_values()


def read_records(worksheet, expected_headers: Iterable[str]) -> list[dict]:
    """Read canonical records while tolerating old, extra, or blank columns.

    Production worksheets can lag behind the application schema or contain blank
    columns added by operators. gspread's ``expected_headers`` rejects missing
    columns, which made otherwise-readable legacy tabs fail with HTTP 500. Map the
    columns that exist and return blanks for newly introduced fields instead.
    """
    headers = list(expected_headers)
    try:
        values = _get_all_values(worksheet)
    except Exception as exc:
        raise SheetsUnavailableError("Google Sheets is temporarily unavailable") from exc

    if not values:
        return []

    actual_headers = [str(value).strip() for value in values[0]]
    column_indexes: dict[str, int] = {}
    for index, header in enumerate(actual_headers):
        if header and header not in column_indexes:
            column_indexes[header] = index

    records = []
    for row in values[1:]:
        if not any(str(value).strip() for value in row):
            continue
        records.append({
            header: row[column_indexes[header]]
            if header in column_indexes and column_indexes[header] < len(row)
            else ""
            for header in headers
        })
    return records


def ensure_headers(worksheet, expected_headers: Iterable[str]) -> list[str]:
    """Append newly introduced schema columns without disturbing existing data."""
    try:
        actual_headers = [str(value).strip() for value in worksheet.row_values(1)]
        for header in expected_headers:
            if header not in actual_headers:
                actual_headers.append(header)
                worksheet.update_cell(1, len(actual_headers), header)
        return actual_headers
    except Exception as exc:
        raise SheetsUnavailableError("Google Sheets is temporarily unavailable") from exc


def get_client(service_account_file: str) -> gspread.Client:
    """Return a shared, authenticated gspread client (created once, then cached)."""
    global _client
    with _lock:
        if _client is None:
            creds = Credentials.from_service_account_file(service_account_file, scopes=_SCOPES)
            _client = gspread.authorize(creds)
        return _client


@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=0.25, min=0.25, max=1.0),
    reraise=True,
)
def _open_spreadsheet(service_account_file: str, sheet_id: str) -> gspread.Spreadsheet:
    return get_client(service_account_file).open_by_key(sheet_id)


@lru_cache(maxsize=8)
def get_spreadsheet(service_account_file: str, sheet_id: str) -> gspread.Spreadsheet:
    """Return a cached spreadsheet instead of fetching metadata every request."""
    try:
        return _open_spreadsheet(service_account_file, sheet_id)
    except Exception as exc:
        raise SheetsUnavailableError("Google Sheets is temporarily unavailable") from exc


@retry(
    retry=retry_if_not_exception_type(WorksheetNotFound),
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=0.25, min=0.25, max=1.0),
    reraise=True,
)
def _find_worksheet(spreadsheet: gspread.Spreadsheet, title: str):
    return spreadsheet.worksheet(title)


@lru_cache(maxsize=64)
def get_worksheet(service_account_file: str, sheet_id: str, title: str):
    """Return a cached worksheet and avoid a metadata API call per endpoint."""
    try:
        return _find_worksheet(get_spreadsheet(service_account_file, sheet_id), title)
    except WorksheetNotFound:
        raise
    except Exception as exc:
        raise SheetsUnavailableError("Google Sheets is temporarily unavailable") from exc
