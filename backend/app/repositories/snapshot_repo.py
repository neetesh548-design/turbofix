"""Metrics storage — persistence for computed analytics snapshots.

Two implementations behind one interface:

- ``LocalAnalyticsSnapshotRepository`` — in-memory, used by tests and local dev.
  Mirrors the Supabase upsert semantics exactly (including overwrite-on-conflict)
  so a test that passes locally reflects real production behaviour.
- ``SupabaseAnalyticsSnapshotRepository`` — PostgREST-backed, writing to the
  ``analytics_snapshots`` table created in 20260725120000.

Both enforce the same conflict key: (factory_id, period_kind, period_start).
"""

from __future__ import annotations

import copy
import json
from datetime import datetime, timezone
from typing import List, Optional

from app.repositories.base import AnalyticsSnapshotRepository

TABLE = "analytics_snapshots"

# Must match the unique index analytics_snapshots_period_uniq.
CONFLICT_KEYS = ("factory_id", "period_kind", "period_start")


def _conflict_key(row: dict) -> tuple:
    return tuple(str(row.get(key) or "") for key in CONFLICT_KEYS)


def _stamped(row: dict) -> dict:
    """Return a copy with captured_at defaulted to now (UTC)."""
    stamped = copy.deepcopy(row)
    if not stamped.get("captured_at"):
        stamped["captured_at"] = datetime.now(timezone.utc).isoformat()
    return stamped


class LocalAnalyticsSnapshotRepository(AnalyticsSnapshotRepository):
    """In-memory snapshot store for local dev and tests."""

    def __init__(self):
        self._rows: list[dict] = []

    def upsert(self, row: dict) -> dict:
        if not row.get("factory_id"):
            raise ValueError("analytics snapshot requires a factory_id")
        if not row.get("period_start"):
            raise ValueError("analytics snapshot requires a period_start")

        stamped = _stamped(row)
        key = _conflict_key(stamped)
        for index, existing in enumerate(self._rows):
            if _conflict_key(existing) == key:
                self._rows[index] = stamped
                return copy.deepcopy(stamped)
        self._rows.append(stamped)
        return copy.deepcopy(stamped)

    def list_snapshots(
        self,
        factory_id: str,
        period_kind: str = "daily",
        limit: int = 30,
    ) -> List[dict]:
        matches = [
            row for row in self._rows
            if str(row.get("factory_id")) == str(factory_id)
            and str(row.get("period_kind") or "daily") == period_kind
        ]
        matches.sort(key=lambda r: str(r.get("period_start") or ""), reverse=True)
        return copy.deepcopy(matches[: max(0, limit)])

    def latest(self, factory_id: str, period_kind: str = "daily") -> Optional[dict]:
        rows = self.list_snapshots(factory_id, period_kind, limit=1)
        return rows[0] if rows else None


class SupabaseAnalyticsSnapshotRepository(AnalyticsSnapshotRepository):
    """PostgREST-backed snapshot store."""

    def __init__(self, client=None):
        # Imported lazily so that local/test runs never construct a Supabase
        # client (which reads credentials at import time).
        if client is None:
            from app.repositories.supabase_repo import _client as default_client
            client = default_client
        self._client = client

    def upsert(self, row: dict) -> dict:
        if not row.get("factory_id"):
            raise ValueError("analytics snapshot requires a factory_id")
        if not row.get("period_start"):
            raise ValueError("analytics snapshot requires a period_start")

        stamped = _stamped(row)
        # payload is jsonb; PostgREST accepts a nested dict directly, but a
        # pre-serialised string would be stored as a JSON string literal.
        if isinstance(stamped.get("payload"), str):
            try:
                stamped["payload"] = json.loads(stamped["payload"])
            except (ValueError, TypeError):
                stamped["payload"] = {}

        params = {
            "factory_id": f"eq.{stamped['factory_id']}",
            "period_kind": f"eq.{stamped.get('period_kind') or 'daily'}",
            "period_start": f"eq.{stamped['period_start']}",
        }
        existing = self._client.select_one(TABLE, params)
        if existing:
            updated = self._client.update(TABLE, params, stamped)
            return updated[0] if updated else stamped
        return self._client.insert(TABLE, stamped)

    def list_snapshots(
        self,
        factory_id: str,
        period_kind: str = "daily",
        limit: int = 30,
    ) -> List[dict]:
        return self._client.select(TABLE, {
            "factory_id": f"eq.{factory_id}",
            "period_kind": f"eq.{period_kind}",
            "order": "period_start.desc",
            "limit": max(0, limit),
        })

    def latest(self, factory_id: str, period_kind: str = "daily") -> Optional[dict]:
        rows = self.list_snapshots(factory_id, period_kind, limit=1)
        return rows[0] if rows else None
