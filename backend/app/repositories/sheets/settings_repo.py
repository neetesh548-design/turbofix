"""Google Sheets-backed company settings repository."""

from typing import Optional

from gspread.exceptions import WorksheetNotFound

from app.repositories.base import SETTINGS_HEADER, SettingsRepository
from app.repositories.sheets.client import get_spreadsheet, get_worksheet


class SheetsSettingsRepository(SettingsRepository):
    def __init__(self, service_account_file: str, sheet_id: str):
        self._service_account_file = service_account_file
        self._sheet_id = sheet_id

    def _worksheet(self):
        try:
            return get_worksheet(
                self._service_account_file, self._sheet_id, "Settings"
            )
        except WorksheetNotFound:
            spreadsheet = get_spreadsheet(
                self._service_account_file, self._sheet_id
            )
            worksheet = spreadsheet.add_worksheet(
                title="Settings", rows=100, cols=len(SETTINGS_HEADER)
            )
            worksheet.append_row(SETTINGS_HEADER, value_input_option="RAW")
            return worksheet

    def get(self, company_code: str) -> Optional[dict]:
        worksheet = self._worksheet()
        cell = worksheet.find(company_code, in_column=1)
        if cell is None:
            return None
        values = worksheet.row_values(cell.row)
        values += [""] * (len(SETTINGS_HEADER) - len(values))
        return dict(zip(SETTINGS_HEADER, values))

    def upsert(self, row: dict) -> None:
        worksheet = self._worksheet()
        cell = worksheet.find(row["company_code"], in_column=1)
        values = [row.get(key, "") for key in SETTINGS_HEADER]
        if cell is None:
            worksheet.append_row(values, value_input_option="RAW")
            return
        worksheet.update(
            values=[values],
            range_name=f"A{cell.row}:D{cell.row}",
            value_input_option="RAW",
        )
