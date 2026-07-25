"""Storage for KPI snapshots (the analytics time series).

Two implementations, matching how the rest of TurboFix selects a backend:

- ``SupabaseSnapshotRepository`` — the real store, backed by the
  ``kpi_snapshots`` table (see migration 20260725130000_kpi_snapshots.sql).
- ``InMemorySnapshotRepository`` — used by the local/xlsx store and by tests.
  History does NOT survive a restart; that is acceptable because the local
  store is a development convenience, not a deployment target.

Snapshots are append-only. Neither implementation exposes an update method:
a recomputed KPI definition must produce a new row, never rewrite recorded
history, or trend analysis would silently change shape after the fact.
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from datetime import datetime, timedelta, timezone
from typing import Dict, List, Optional

from app.infrastructure.logging import get_logger
from app.services.analytics_service import Snapshot

log = get_logger("turbofix.snapshots")

TABLE = "kpi_snapshots"


class SnapshotRepository(ABC):
    """Append-only access to the KPI snapshot time series."""

    @abstractmethod
    def append(self, snapshot: Snapshot) -> None:
        """Record one snapshot. Must not overwrite an existing row."""

    @abstractmethod
    def list_since(self, company_code: str, days: int = 30) -> List[Snapshot]:
        """Return snapshots for a company within the window, oldest first."""

    @abstractmethod
    def latest(self, company_code: str) -> Optional[Snapshot]:
        """Return the most recent snapshot for a company, or None."""


class InMemorySnapshotRepository(SnapshotRepository):
    """Process-local snapshot store. Not durable — dev and test only."""

    def __init__(self) -> None:
        self._rows: Dict[str, List[Snapshot]] = {}

    def append(self, snapshot: Snapshot) -> None:
        series = self._rows.setdefault(snapshot.company_code, [])
        # Mirror the DB's unique (company_code, captured_at) index so a retried
        # capture behaves the same in dev as in production.
        if any(s.captured_at == snapshot.captured_at for s in series):
            log.info("snapshot.duplicate_ignored", company_code=snapshot.company_code)
            return
        series.append(snapshot)

    def list_since(self, company_code: str, days: int = 30) -> List[Snapshot]:
        cutoff = datetime.now(timezone.utc) - timedelta(days=days)
        return sorted(
            (s for s in self._rows.get(company_code, []) if s.captured_at >= cutoff),
            key=lambda s: s.captured_at,
        )

    def latest(self, company_code: str) -> Optional[Snapshot]:
        series = self._rows.get(company_code, [])
        return max(series, key=lambda s: s.captured_at) if series else None

    def clear(self) -> None:
        """Test helper — drop all recorded snapshots."""
        self._rows.clear()


class SupabaseSnapshotRepository(SnapshotRepository):
    """Durable snapshot store backed by the kpi_snapshots table."""

    def append(self, snapshot: Snapshot) -> None:
        from app.repositories.supabase_repo import _client

        try:
            _client.insert(TABLE, snapshot.to_row())
        except Exception as exc:
            # A missed snapshot degrades trend resolution; it must never break
            # the request or scheduled job that triggered the capture.
            log.error(
                "snapshot.append_failed",
                company_code=snapshot.company_code,
                error=str(exc),
            )

    def list_since(self, company_code: str, days: int = 30) -> List[Snapshot]:
        from app.repositories.supabase_repo import _client

        cutoff = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()
        try:
            rows = _client.select(TABLE, {
                "company_code": f"eq.{company_code}",
                "captured_at": f"gte.{cutoff}",
                "order": "captured_at.asc",
            })
        except Exception as exc:
            log.error("snapshot.list_failed", company_code=company_code, error=str(exc))
            return []
        return [Snapshot.from_row(row) for row in rows]

    def latest(self, company_code: str) -> Optional[Snapshot]:
        from app.repositories.supabase_repo import _client

        try:
            row = _client.select_one(TABLE, {
                "company_code": f"eq.{company_code}",
                "order": "captured_at.desc",
                "limit": "1",
            })
        except Exception as exc:
            log.error("snapshot.latest_failed", company_code=company_code, error=str(exc))
            return None
        return Snapshot.from_row(row) if row else None
