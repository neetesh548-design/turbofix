"""Hierarchy-aware contact privacy helpers for company staff."""

from __future__ import annotations

import re
from typing import Iterable


def mask_phone(phone: str | None) -> str:
    value = str(phone or "").strip()
    if not value:
        return "Mobile number not available"
    digits = re.sub(r"\D", "", value)
    if len(digits) <= 4:
        return "•" * len(digits)
    prefix = "+" if value.startswith("+") else ""
    return f"{prefix}{'•' * max(4, len(digits) - 4)} {digits[-4:]}"


def mask_email(email: str | None) -> str:
    value = str(email or "").strip()
    if not value:
        return "Email not available"
    local, separator, domain = value.partition("@")
    if not separator:
        return f"{local[:1]}••••"
    return f"{local[:1]}{'•' * max(3, len(local) - 1)}@{domain}"


def _first_user_id(users: list[dict], roles: Iterable[str]) -> str:
    allowed = set(roles)
    return next(
        (str(user.get("user_id") or "") for user in users if user.get("role") in allowed),
        "",
    )


def company_hierarchy(users: Iterable[dict]) -> list[dict]:
    """Return users with an effective manager, including legacy-row defaults."""
    company_users = [dict(user) for user in users]
    known_ids = {str(user.get("user_id") or "") for user in company_users}
    owner_id = _first_user_id(company_users, {"owner"})
    head_id = _first_user_id(company_users, {"maintenance_head"}) or owner_id
    operational_manager_id = _first_user_id(
        company_users, {"supervisor", "maintenance_engineer"}
    ) or head_id

    for user in company_users:
        role = str(user.get("role") or "")
        manager_id = str(user.get("manager_user_id") or "").strip()
        if manager_id not in known_ids or manager_id == user.get("user_id"):
            if role == "owner":
                manager_id = ""
            elif role == "maintenance_head":
                manager_id = owner_id
            elif role in {"supervisor", "maintenance_engineer"}:
                manager_id = head_id
            else:
                manager_id = operational_manager_id
        user["manager_user_id"] = manager_id
    return company_users


def _manager_chain(user: dict, by_id: dict[str, dict]) -> set[str]:
    chain: set[str] = set()
    manager_id = str(user.get("manager_user_id") or "")
    while manager_id and manager_id not in chain:
        chain.add(manager_id)
        manager = by_id.get(manager_id)
        if manager is None:
            break
        manager_id = str(manager.get("manager_user_id") or "")
    return chain


def can_reveal_contact(viewer: dict, target: dict, users: Iterable[dict]) -> bool:
    if viewer.get("company_code") != target.get("company_code"):
        return False
    if viewer.get("user_id") == target.get("user_id"):
        return True
    if viewer.get("role") in {"owner", "maintenance_head"}:
        return True

    hierarchy = company_hierarchy(users)
    by_id = {str(user.get("user_id") or ""): user for user in hierarchy}
    viewer_row = by_id.get(str(viewer.get("user_id") or ""), viewer)
    target_row = by_id.get(str(target.get("user_id") or ""), target)
    viewer_id = str(viewer_row.get("user_id") or "")
    target_id = str(target_row.get("user_id") or "")

    viewer_managers = _manager_chain(viewer_row, by_id)
    target_managers = _manager_chain(target_row, by_id)
    if target_id in viewer_managers:
        return True
    if viewer_row.get("role") in {"supervisor", "maintenance_engineer"}:
        return viewer_id in target_managers
    return False


def directory_entry(viewer: dict, target: dict, users: Iterable[dict]) -> dict:
    hierarchy = company_hierarchy(users)
    by_id = {str(user.get("user_id") or ""): user for user in hierarchy}
    target_row = by_id.get(str(target.get("user_id") or ""), target)
    manager = by_id.get(str(target_row.get("manager_user_id") or ""))
    phone = str(target_row.get("phone") or "").strip()
    email = str(target_row.get("email") or "").strip()
    portal_value = str(target_row.get("portal_access") or "").strip().lower()
    portal_access = portal_value in {"yes", "true", "1"} if portal_value else bool(
        target_row.get("password_hash") and (phone or email)
    )
    return {
        "user_id": target_row.get("user_id", ""),
        "name": target_row.get("name", ""),
        "role": target_row.get("role", ""),
        "manager_user_id": target_row.get("manager_user_id", ""),
        "manager_name": manager.get("name", "") if manager else "",
        "department": target_row.get("department", ""),
        "plant_location": target_row.get("plant_location", ""),
        "shift": target_row.get("shift", ""),
        "created_at": target_row.get("created_at", ""),
        "phone_masked": mask_phone(phone),
        "email_masked": mask_email(email),
        "phone_available": bool(phone),
        "email_available": bool(email),
        "can_receive_alerts": bool(phone),
        "portal_access": portal_access,
        "can_reveal_contact": can_reveal_contact(viewer, target_row, hierarchy),
    }
