"""Google Sheets-backed technician work records."""

from typing import List, Optional

from gspread.exceptions import WorksheetNotFound

from app.repositories.base import TECHNICIAN_WORK_HEADER, TechnicianWorkRepository
from app.repositories.sheets.client import get_spreadsheet, get_worksheet, read_records


class SheetsTechnicianWorkRepository(TechnicianWorkRepository):
    def __init__(self, service_account_file: str, sheet_id: str):
        self._service_account_file = service_account_file
        self._sheet_id = sheet_id

    def _worksheet(self):
        try:
            return get_worksheet(
                self._service_account_file, self._sheet_id, "TechnicianWork"
            )
        except WorksheetNotFound:
            spreadsheet = get_spreadsheet(
                self._service_account_file, self._sheet_id
            )
            worksheet = spreadsheet.add_worksheet(
                title="TechnicianWork", rows=1000, cols=len(TECHNICIAN_WORK_HEADER)
            )
            worksheet.append_row(TECHNICIAN_WORK_HEADER, value_input_option="RAW")
            return worksheet

    def get(self, ticket_id: str) -> Optional[dict]:
        worksheet = self._worksheet()
        cell = worksheet.find(ticket_id, in_column=1)
        if cell is None:
            return None
        values = worksheet.row_values(cell.row)
        values += [""] * (len(TECHNICIAN_WORK_HEADER) - len(values))
        return dict(zip(TECHNICIAN_WORK_HEADER, values))

    def list_company(self, company_code: str) -> List[dict]:
        return [
            row
            for row in read_records(self._worksheet(), TECHNICIAN_WORK_HEADER)
            if row.get("company_code") == company_code
        ]

    def upsert(self, row: dict) -> None:
        worksheet = self._worksheet()
        cell = worksheet.find(row["ticket_id"], in_column=1)
        values = [row.get(key, "") for key in TECHNICIAN_WORK_HEADER]
        if cell is None:
            worksheet.append_row(values, value_input_option="RAW")
            return
        last_column = chr(ord("A") + len(TECHNICIAN_WORK_HEADER) - 1)
        worksheet.update(
            values=[values],
            range_name=f"A{cell.row}:{last_column}{cell.row}",
            value_input_option="RAW",
        )
