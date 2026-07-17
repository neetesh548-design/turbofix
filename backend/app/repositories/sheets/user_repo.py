"""Google Sheets implementation of UserRepository."""

from typing import List, Optional

from app.repositories.base import (
    COMPANIES_HEADER,
    USERS_HEADER,
    UserRepository,
    new_user_id,
)
from app.repositories.sheets.client import get_worksheet, read_records


def _normalize(value) -> str:
    # Keep identifiers comparable even if a storage adapter returns numeric cells.
    return str(value).strip().lower() if value is not None else ""


class SheetsUserRepository(UserRepository):
    """Reads/writes Users and Companies worksheets in a Google Sheet."""

    def __init__(self, service_account_file: str, sheet_id: str):
        self._sa_file = service_account_file
        self._sheet_id = sheet_id

    def _ws(self, title: str):
        return get_worksheet(self._sa_file, self._sheet_id, title)

    def next_user_id(self, company_code: str) -> str:
        return new_user_id(company_code)

    def get_by_identifier(self, identifier: str) -> Optional[dict]:
        ws = self._ws("Users")
        target = _normalize(identifier)
        for record in read_records(ws, USERS_HEADER):
            if _normalize(record.get("phone")) == target or _normalize(record.get("email")) == target:
                return record
        return None

    def get_by_id(self, user_id: str) -> Optional[dict]:
        ws = self._ws("Users")
        for record in read_records(ws, USERS_HEADER):
            if record.get("user_id") == user_id:
                return record
        return None

    def list_users(self) -> List[dict]:
        ws = self._ws("Users")
        return read_records(ws, USERS_HEADER)


    def add(self, row: dict) -> None:
        ws = self._ws("Users")
        ws.append_row([row.get(col, "") for col in USERS_HEADER], value_input_option="RAW")

    def update_password(self, user_id: str, new_password_hash: str) -> bool:
        ws = self._ws("Users")
        cell = ws.find(user_id, in_column=1)
        if cell is None:
            return False
        hash_col = USERS_HEADER.index("password_hash") + 1
        ws.update_cell(cell.row, hash_col, new_password_hash)
        return True

    def get_company(self, company_code: str) -> Optional[dict]:
        ws = self._ws("Companies")
        target = _normalize(company_code)
        for record in read_records(ws, COMPANIES_HEADER):
            if _normalize(record.get("company_code")) == target:
                return record
        return None

    def list_companies(self) -> List[dict]:
        ws = self._ws("Companies")
        return read_records(ws, COMPANIES_HEADER)

    def update_company(self, company_code: str, fields: dict) -> bool:
        ws = self._ws("Companies")
        header = ws.row_values(1)
        for col in fields:
            if col not in header:
                header.append(col)
                ws.update_cell(1, len(header), col)
        cell = ws.find(company_code, in_column=1)
        if cell is None:
            return False
        for key, value in fields.items():
            if key in header:
                ws.update_cell(cell.row, header.index(key) + 1, value)
        return True

    def add_company(self, company_code: str, company_name: str, admin_contact_phone: str, machine_quota: int, approved: bool) -> None:
        ws = self._ws("Companies")
        from datetime import datetime
        row_data = {
            "company_code": company_code,
            "company_name": company_name,
            "admin_contact_phone": admin_contact_phone,
            "onboarded_date": datetime.now().strftime("%Y-%m-%d"),
            "machine_quota": machine_quota,
            "approved": "yes" if approved else "no"
        }
        ws.append_row([row_data.get(col, "") for col in COMPANIES_HEADER], value_input_option="RAW")
