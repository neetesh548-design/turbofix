from app.repositories.base import COMPANIES_HEADER, TICKETS_HEADER
from app.repositories.sheets.client import read_records
from app.repositories.sheets.user_repo import SheetsUserRepository


class FakeWorksheet:
    def __init__(self):
        self.values = [
            COMPANIES_HEADER + ["", ""],
            ["ACME3", "Acme Forge Pvt Ltd", "+919820012345", "2026-01-15", "10", "yes", "", ""],
        ]

    def get_all_values(self):
        return self.values


class FakeSpreadsheet:
    def __init__(self, worksheet):
        self._worksheet = worksheet

    def worksheet(self, name):
        assert name == "Companies"
        return self._worksheet


def test_get_company_tolerates_extra_blank_sheet_columns():
    worksheet = FakeWorksheet()
    repo = SheetsUserRepository("unused.json", "unused-sheet")
    repo._ss = lambda: FakeSpreadsheet(worksheet)

    company = repo.get_company("acme3")

    assert company["company_name"] == "Acme Forge Pvt Ltd"


def test_read_records_fills_new_columns_missing_from_legacy_sheet():
    legacy_headers = TICKETS_HEADER[:-1]
    worksheet = FakeWorksheet()
    worksheet.values = [legacy_headers, ["T-001", "M-001", "ACME3"]]

    records = read_records(worksheet, TICKETS_HEADER)

    assert records[0]["ticket_id"] == "T-001"
    assert records[0]["company_code"] == "ACME3"
    assert records[0]["closed_by"] == ""
