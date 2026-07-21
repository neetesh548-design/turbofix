"""Consumables & Spares service — Phase 3 capabilities.

1. Part request via WhatsApp (consumable escalation chain)
2. Reservation-based inventory (reserve on request, release on issue/cancel)
3. PO workflow (auto-generate, approve/reject via WhatsApp)
4. Auto-reorder (stock below reorder_level triggers PO)
"""

import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional

from app import config
from app.infrastructure.logging import get_logger
from app.repositories.supabase_repo import (
    SupabaseEscalationConfigRepository,
    SupabasePartRequestRepository,
    _client,
)
from app.services.escalation_service import initialize_part_request_escalation

log = get_logger("turbofix.consumables")

_part_repo = SupabasePartRequestRepository()
_esc_config = SupabaseEscalationConfigRepository()


def _new_po_code() -> str:
    return f"PO{datetime.now(timezone.utc):%Y%m%d%H%M%S}-{secrets.token_hex(2)}"


# ---- Part Request Creation ------------------------------------------------

def create_part_request(factory_id: str, machine_id: str,
                        requested_by_phone: str, part_name: str,
                        part_number: str = "", qty: int = 1,
                        linked_ticket_id: str = "") -> dict:
    """Create a new part request and start the consumable escalation chain."""
    result = _part_repo.create({
        "factory_id": factory_id,
        "machine_id": machine_id,
        "requested_by_phone": requested_by_phone,
        "part_name": part_name,
        "part_number": part_number,
        "qty": qty,
        "linked_ticket_id": linked_ticket_id,
    })

    request_code = result.get("request_code", "")

    stock_info = check_and_reserve_stock(factory_id, part_name, part_number, qty)
    if stock_info:
        request_id_row = _client.select_one("part_requests", {
            "request_code": f"eq.{request_code}",
        })
        if request_id_row:
            _part_repo.update_status(
                request_id_row["id"],
                "issued" if stock_info["reserved"] else "open",
                {"stock_status": stock_info["status_text"]},
            )

    request_row = _client.select_one("part_requests", {
        "request_code": f"eq.{request_code}",
    })
    if request_row:
        initialize_part_request_escalation(request_row["id"], factory_id)

    log.info("consumables.request_created", request_code=request_code,
             part_name=part_name, qty=qty, factory_id=factory_id)
    return result


# ---- Reservation-based Inventory ------------------------------------------

def check_and_reserve_stock(factory_id: str, part_name: str,
                            part_number: str, qty: int) -> Optional[dict]:
    """Check stock availability and reserve if sufficient."""
    item = _find_inventory_item(factory_id, part_name, part_number)
    if not item:
        return {"reserved": False, "status_text": "Item not in inventory"}

    table = item["table"]
    item_id = item["id"]
    stock_qty = item.get("stock_qty", 0)
    reserved_qty = item.get("reserved_qty", 0)
    available = stock_qty - reserved_qty

    if available >= qty:
        try:
            _client.update(table, {"id": f"eq.{item_id}"}, {
                "reserved_qty": reserved_qty + qty,
            })
            log.info("consumables.stock_reserved", item_id=item_id, qty=qty,
                     remaining=available - qty)
            return {"reserved": True, "status_text": f"Reserved {qty} (available: {available - qty})"}
        except Exception as exc:
            log.error("consumables.reserve_failed", error=str(exc))
            return {"reserved": False, "status_text": "Reserve failed"}
    else:
        return {
            "reserved": False,
            "status_text": f"Insufficient stock (available: {available}, needed: {qty})",
        }


def release_reservation(factory_id: str, part_name: str,
                        part_number: str, qty: int) -> bool:
    """Release reserved stock (on cancellation)."""
    item = _find_inventory_item(factory_id, part_name, part_number)
    if not item:
        return False

    table = item["table"]
    item_id = item["id"]
    reserved_qty = item.get("reserved_qty", 0)
    new_reserved = max(0, reserved_qty - qty)

    try:
        _client.update(table, {"id": f"eq.{item_id}"}, {
            "reserved_qty": new_reserved,
        })
        return True
    except Exception:
        return False


def issue_stock(factory_id: str, part_name: str, part_number: str,
                qty: int, issued_by: str) -> bool:
    """Actually issue stock — deduct from stock_qty and release reservation."""
    item = _find_inventory_item(factory_id, part_name, part_number)
    if not item:
        return False

    table = item["table"]
    item_id = item["id"]
    stock_qty = item.get("stock_qty", 0)
    reserved_qty = item.get("reserved_qty", 0)

    try:
        _client.update(table, {"id": f"eq.{item_id}"}, {
            "stock_qty": max(0, stock_qty - qty),
            "reserved_qty": max(0, reserved_qty - qty),
        })
        log.info("consumables.stock_issued", item_id=item_id, qty=qty,
                 issued_by=issued_by)
        return True
    except Exception:
        return False


def _find_inventory_item(factory_id: str, part_name: str,
                         part_number: str) -> Optional[dict]:
    """Search for an item in consumables then parts tables."""
    if part_number:
        row = _client.select_one("consumables", {
            "factory_id": f"eq.{factory_id}",
            "part_number": f"eq.{part_number}",
        })
        if row:
            return {**row, "table": "consumables"}

        row = _client.select_one("parts", {
            "factory_id": f"eq.{factory_id}",
            "part_number": f"eq.{part_number}",
        })
        if row:
            return {**row, "table": "parts"}

    row = _client.select_one("consumables", {
        "factory_id": f"eq.{factory_id}",
        "name": f"ilike.*{part_name}*",
    })
    if row:
        return {**row, "table": "consumables"}

    row = _client.select_one("parts", {
        "factory_id": f"eq.{factory_id}",
        "part_name": f"ilike.*{part_name}*",
    })
    if row:
        return {**row, "table": "parts"}

    return None


# ---- PO Workflow -----------------------------------------------------------

def create_purchase_order(factory_id: str, part_request_id: str,
                          item_type: str, item_name: str,
                          item_number: str = "", qty: int = 1,
                          vendor: str = "", estimated_cost: float = 0,
                          requested_by: str = "",
                          auto_generated: bool = False) -> dict:
    """Create a new purchase order."""
    po_code = _new_po_code()
    data = {
        "po_code": po_code,
        "factory_id": factory_id,
        "part_request_id": part_request_id if part_request_id else None,
        "item_type": item_type,
        "item_id": item_number,
        "item_name": item_name,
        "item_number": item_number,
        "qty": qty,
        "vendor": vendor,
        "estimated_cost": estimated_cost,
        "requested_by": requested_by,
        "auto_generated": auto_generated,
        "status": "pending",
    }
    _client.insert("purchase_orders", data)
    log.info("consumables.po_created", po_code=po_code, item=item_name,
             qty=qty, auto=auto_generated)
    return {"po_code": po_code, "status": "pending"}


def get_purchase_order(po_code: str) -> Optional[dict]:
    """Get a PO by its code."""
    row = _client.select_one("purchase_orders", {"po_code": f"eq.{po_code}"})
    if not row:
        return None
    return {
        "id": row.get("id", ""),
        "po_code": row.get("po_code", ""),
        "factory_id": row.get("factory_id", ""),
        "item_name": row.get("item_name", ""),
        "item_number": row.get("item_number", ""),
        "qty": row.get("qty", 1),
        "vendor": row.get("vendor", ""),
        "estimated_cost": row.get("estimated_cost"),
        "status": row.get("status", "pending"),
        "requested_by": row.get("requested_by", ""),
        "approved_by": row.get("approved_by", ""),
        "rejection_reason": row.get("rejection_reason", ""),
        "auto_generated": row.get("auto_generated", False),
        "created_at": str(row.get("created_at", "")),
    }


async def approve_purchase_order(po_code: str, approved_by: str) -> bool:
    """Store Manager/VP approves a PO."""
    po = _client.select_one("purchase_orders", {"po_code": f"eq.{po_code}"})
    if not po:
        return False
    if po.get("status") != "pending":
        return False

    try:
        _client.update("purchase_orders", {"po_code": f"eq.{po_code}"}, {
            "status": "approved",
            "approved_by": approved_by,
            "approved_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
        })
        log.info("consumables.po_approved", po_code=po_code,
                 approved_by=approved_by)

        part_request_id = po.get("part_request_id")
        if part_request_id:
            _part_repo.update_status(part_request_id, "po_approved", {
                "po_approved_by": approved_by,
            })

        await _send_po_notification(
            po.get("requested_by", ""),
            [po_code, po.get("item_name", ""), str(po.get("qty", 1)), "APPROVED"],
        )
        return True
    except Exception as exc:
        log.error("consumables.po_approve_failed", po_code=po_code, error=str(exc))
        return False


async def reject_purchase_order(po_code: str, rejected_by: str,
                                reason: str) -> bool:
    """Store Manager/VP rejects a PO."""
    po = _client.select_one("purchase_orders", {"po_code": f"eq.{po_code}"})
    if not po:
        return False
    if po.get("status") != "pending":
        return False

    try:
        _client.update("purchase_orders", {"po_code": f"eq.{po_code}"}, {
            "status": "rejected",
            "rejection_reason": reason,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        })
        log.info("consumables.po_rejected", po_code=po_code, reason=reason)

        part_request_id = po.get("part_request_id")
        if part_request_id:
            _part_repo.update_status(part_request_id, "po_rejected")

        await _send_po_notification(
            po.get("requested_by", ""),
            [po_code, po.get("item_name", ""), reason, "REJECTED"],
        )
        return True
    except Exception as exc:
        log.error("consumables.po_reject_failed", po_code=po_code, error=str(exc))
        return False


def list_pending_pos(factory_id: str) -> list:
    """List all pending POs for a factory."""
    rows = _client.select("purchase_orders", {
        "factory_id": f"eq.{factory_id}",
        "status": "eq.pending",
        "order": "created_at.asc",
    })
    return [
        {
            "po_code": r.get("po_code", ""),
            "item_name": r.get("item_name", ""),
            "qty": r.get("qty", 1),
            "vendor": r.get("vendor", ""),
            "estimated_cost": r.get("estimated_cost"),
            "auto_generated": r.get("auto_generated", False),
            "created_at": str(r.get("created_at", "")),
        }
        for r in rows
    ]


# ---- Auto-Reorder ---------------------------------------------------------

async def run_auto_reorder_check() -> None:
    """Check all inventory items and create POs for those below reorder level."""
    factories = _client.select("factories", {})

    for factory in factories:
        factory_id = factory.get("id", "")
        if not factory_id:
            continue

        await _check_reorder_for_table(factory_id, "consumables", "consumable")
        await _check_reorder_for_table(factory_id, "parts", "spare_part")


async def _check_reorder_for_table(factory_id: str, table: str,
                                   item_type: str) -> None:
    """Check a specific inventory table for items below reorder level."""
    rows = _client.select(table, {"factory_id": f"eq.{factory_id}"})

    for item in rows:
        item_id = item.get("id", "")
        stock_qty = item.get("stock_qty", 0)
        reserved_qty = item.get("reserved_qty", 0)
        reorder_level = item.get("reorder_level", 0)

        if reorder_level <= 0:
            continue

        available = stock_qty - reserved_qty
        if available > reorder_level:
            continue

        if _has_recent_auto_reorder(factory_id, item_type, item_id):
            continue

        item_name = item.get("name") or item.get("part_name", "Unknown")
        item_number = item.get("part_number", "")
        reorder_qty = max(reorder_level * 2, 1)

        po = create_purchase_order(
            factory_id=factory_id,
            part_request_id="",
            item_type=item_type,
            item_name=item_name,
            item_number=item_number,
            qty=reorder_qty,
            auto_generated=True,
            requested_by="system",
        )

        _record_auto_reorder(factory_id, item_type, item_id, po.get("po_code", ""))

        thresholds = _esc_config.get_thresholds(factory_id, "consumable")
        store_incharge = next(
            (t for t in thresholds if "incharge" in t["role_label"].lower()), None
        )
        if store_incharge and store_incharge["notify_phone"]:
            await _send_po_notification(
                store_incharge["notify_phone"],
                [po["po_code"], item_name, str(reorder_qty),
                 f"AUTO-REORDER: Stock at {available}, reorder level {reorder_level}"],
            )

        log.info("consumables.auto_reorder", item_name=item_name,
                 available=available, reorder_level=reorder_level,
                 po_code=po["po_code"])


def _has_recent_auto_reorder(factory_id: str, item_type: str,
                             item_id: str) -> bool:
    """Check if an auto-reorder was already triggered recently (prevent duplicates)."""
    row = _client.select_one("auto_reorder_log", {
        "factory_id": f"eq.{factory_id}",
        "item_type": f"eq.{item_type}",
        "item_id": f"eq.{item_id}",
    })
    if not row:
        return False

    triggered_at = row.get("triggered_at", "")
    if not triggered_at:
        return False

    try:
        ts = datetime.fromisoformat(str(triggered_at).replace("Z", "+00:00"))
        return (datetime.now(timezone.utc) - ts) < timedelta(days=7)
    except (ValueError, TypeError):
        return False


def _record_auto_reorder(factory_id: str, item_type: str,
                         item_id: str, po_code: str) -> None:
    """Record that an auto-reorder was triggered."""
    existing = _client.select_one("auto_reorder_log", {
        "factory_id": f"eq.{factory_id}",
        "item_type": f"eq.{item_type}",
        "item_id": f"eq.{item_id}",
    })

    po_row = _client.select_one("purchase_orders", {"po_code": f"eq.{po_code}"})
    po_id = po_row["id"] if po_row else None

    if existing:
        _client.update("auto_reorder_log", {"id": f"eq.{existing['id']}"}, {
            "po_id": po_id,
            "triggered_at": datetime.now(timezone.utc).isoformat(),
        })
    else:
        _client.insert("auto_reorder_log", {
            "factory_id": factory_id,
            "item_type": item_type,
            "item_id": item_id,
            "po_id": po_id,
            "triggered_at": datetime.now(timezone.utc).isoformat(),
        })


# ---- WhatsApp Notifications -----------------------------------------------

async def _send_po_notification(phone: str, params: list) -> None:
    """Send PO-related notification."""
    from app.services.notification_service import send_po_notification
    await send_po_notification(phone, params)


# ---- Issue Part (Store Incharge action) ------------------------------------

async def issue_part(request_code: str, issued_by: str,
                     evidence_url: str = "") -> bool:
    """Store Incharge issues the part — deducts stock and marks request as issued."""
    pr = _part_repo.get(request_code)
    if not pr:
        return False

    factory_id = pr.get("factory_id", "")
    part_name = pr.get("part_name", "")
    part_number = pr.get("part_number", "")
    qty = pr.get("qty", 1)

    issue_stock(factory_id, part_name, part_number, qty, issued_by)

    request_id = pr.get("id", "")
    _part_repo.update_status(request_id, "issued", {
        "issued_by": issued_by,
        "issue_evidence_url": evidence_url,
    })

    await _send_po_notification(
        pr.get("requested_by_phone", ""),
        [request_code, part_name, str(qty), "ISSUED"],
    )

    log.info("consumables.part_issued", request_code=request_code,
             issued_by=issued_by)
    return True
