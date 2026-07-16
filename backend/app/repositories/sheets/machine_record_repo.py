"""Google Sheets implementation of the AI machine-record repository."""

from typing import List, Optional

from app.repositories.base import (
    MACHINE_RECORDS_HEADER,
    MachineRecordRepository,
    new_machine_record_id,
)
from app.repositories.sheets.client import get_spreadsheet


class SheetsMachineRecordRepository(MachineRecordRepository):
    def __init__(self, service_account_file: str, sheet_id: str):
        self._sa_file = service_account_file
        self._sheet_id = sheet_id

    def _ws(self):
        spreadsheet = get_spreadsheet(self._sa_file, self._sheet_id)
        try:
            return spreadsheet.worksheet("AIRecords")
        except Exception:
            worksheet = spreadsheet.add_worksheet(
                title="AIRecords", rows=1000, cols=len(MACHINE_RECORDS_HEADER)
            )
            worksheet.append_row(MACHINE_RECORDS_HEADER, value_input_option="RAW")
            return worksheet

    def next_record_id(self) -> str:
        return new_machine_record_id()

    def list(
        self,
        company_code: str,
        machine_id: Optional[str] = None,
        status: Optional[str] = None,
    ) -> List[dict]:
        records = []
        for record in self._ws().get_all_records():
            if record.get("company_code") != company_code:
                continue
            if machine_id is not None and record.get("machine_id") != machine_id:
                continue
            if status is not None and record.get("status") != status:
                continue
            records.append(record)
        return records

    def get(self, record_id: str) -> Optional[dict]:
        worksheet = self._ws()
        cell = worksheet.find(record_id, in_column=1)
        if cell is None:
            return None
        row = worksheet.row_values(cell.row)
        row += [""] * (len(MACHINE_RECORDS_HEADER) - len(row))
        return dict(zip(MACHINE_RECORDS_HEADER, row))

    def add(self, row: dict) -> None:
        self._ws().append_row(
            [row.get(column, "") for column in MACHINE_RECORDS_HEADER],
            value_input_option="RAW",
        )

    def update(self, record_id: str, updates: dict) -> bool:
        worksheet = self._ws()
        cell = worksheet.find(record_id, in_column=1)
        if cell is None:
            return False
        for key, value in updates.items():
            if key in MACHINE_RECORDS_HEADER:
                worksheet.update_cell(
                    cell.row, MACHINE_RECORDS_HEADER.index(key) + 1, value
                )
        return True

    def find_by_hash(
        self, company_code: str, machine_id: str, file_hash: str
    ) -> Optional[dict]:
        for record in self.list(company_code, machine_id):
            if record.get("file_hash") == file_hash:
                return record
        return None
