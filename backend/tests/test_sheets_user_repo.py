from app.repositories.base import COMPANIES_HEADER
from app.repositories.sheets.user_repo import SheetsUserRepository


class FakeWorksheet:
    def __init__(self):
        self.expected_headers = None

    def get_all_records(self, **kwargs):
        self.expected_headers = kwargs.get("expected_headers")
        return [{"company_code": "ACME3", "company_name": "Acme Forge Pvt Ltd"}]


class FakeSpreadsheet:
    def __init__(self, worksheet):
        self._worksheet = worksheet

    def worksheet(self, name):
        assert name == "Companies"
        return self._worksheet


def test_get_company_uses_fixed_headers_for_extra_sheet_columns():
    worksheet = FakeWorksheet()
    repo = SheetsUserRepository("unused.json", "unused-sheet")
    repo._ss = lambda: FakeSpreadsheet(worksheet)

    company = repo.get_company("acme3")

    assert company["company_name"] == "Acme Forge Pvt Ltd"
    assert worksheet.expected_headers == COMPANIES_HEADER
