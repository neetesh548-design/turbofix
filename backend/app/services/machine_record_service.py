"""AI-assisted machine-record ingestion, review, approval, and backup."""

import csv
import base64
import hashlib
import io
import json
import re
import zipfile
from datetime import datetime, timezone
from pathlib import Path
from xml.etree import ElementTree
import zlib

import openpyxl
from fastapi import HTTPException

from app.ai import provider as ai_provider
from app.auth import CurrentUser
from app.infrastructure.file_storage import (
    FileStorage,
    FileTooLargeError,
    UnsupportedFileTypeError,
    validate_upload,
)
from app.infrastructure.logging import get_logger
from app.repositories.base import (
    MACHINE_RECORD_SOURCE_KINDS,
    MACHINE_RECORD_TYPES,
    DocumentRepository,
    MachineRecordRepository,
    MachineRepository,
    PartsRepository,
)
from app.services.machine_data_service import build_machine_data, machine_data_path

log = get_logger("turbofix.machine_records")

_EXCEL_CELL_SAFE_LIMIT = 32000

IDENTITY_FIELDS = ("manufacturer", "model", "serial_number", "year")
LIST_SCHEMAS = {
    "specifications": ("name", "value", "unit", "confidence", "source"),
    "maintenance_tasks": ("task", "frequency", "procedure", "safety_note", "confidence", "source"),
    "spare_parts": ("name", "part_number", "quantity", "unit", "supplier", "confidence", "source"),
    "consumables": ("name", "specification", "quantity", "unit", "replacement_interval", "confidence", "source"),
    "service_history": ("date", "issue", "work_performed", "technician", "hours", "parts_used", "confidence", "source"),
    "risks": ("risk", "recommended_action", "confidence", "source"),
}


def empty_extraction(note: str = "") -> dict:
    data = {
        "summary": "",
        "machine_identity": {
            field: {"value": "", "confidence": 0, "source": ""}
            for field in IDENTITY_FIELDS
        },
        **{section: [] for section in LIST_SCHEMAS},
        "source_notes": [],
    }
    if note:
        data["source_notes"].append(note)
    return data


def _encode_json(value) -> str:
    raw = json.dumps(value, ensure_ascii=False, separators=(",", ":"))
    if len(raw) <= 28000:
        return raw
    compressed = "zlib:" + base64.b64encode(zlib.compress(raw.encode("utf-8"), 9)).decode("ascii")
    if len(compressed) > _EXCEL_CELL_SAFE_LIMIT:
        raise HTTPException(
            status_code=413,
            detail="the extracted record is too large for the configured data store; split it into smaller files",
        )
    return compressed


def _decode_json(value: str, default):
    try:
        if str(value or "").startswith("zlib:"):
            decoded = zlib.decompress(base64.b64decode(str(value)[5:])).decode("utf-8")
            return json.loads(decoded)
        return json.loads(value or json.dumps(default))
    except (TypeError, ValueError, zlib.error):
        return default


def _confidence(value) -> int:
    try:
        return max(0, min(100, int(float(value))))
    except (TypeError, ValueError):
        return 0


def normalize_extraction(raw: dict | None) -> dict:
    raw = raw if isinstance(raw, dict) else {}
    normalized = empty_extraction()
    normalized["summary"] = str(raw.get("summary") or "").strip()
    identity = raw.get("machine_identity") if isinstance(raw.get("machine_identity"), dict) else {}
    for field in IDENTITY_FIELDS:
        value = identity.get(field, {})
        if not isinstance(value, dict):
            value = {"value": value}
        normalized["machine_identity"][field] = {
            "value": str(value.get("value") or "").strip(),
            "confidence": _confidence(value.get("confidence")),
            "source": str(value.get("source") or "").strip(),
        }
    for section, fields in LIST_SCHEMAS.items():
        items = raw.get(section) if isinstance(raw.get(section), list) else []
        for item in items:
            if not isinstance(item, dict):
                continue
            clean = {}
            for field in fields:
                clean[field] = _confidence(item.get(field)) if field == "confidence" else str(item.get(field) or "").strip()
            if any(clean.get(field) for field in fields if field not in {"confidence", "source"}):
                normalized[section].append(clean)
    notes = raw.get("source_notes") if isinstance(raw.get("source_notes"), list) else []
    normalized["source_notes"] = [str(note).strip() for note in notes if str(note).strip()]
    return normalized


def overall_confidence(data: dict) -> int:
    scores = []
    for field in data.get("machine_identity", {}).values():
        if field.get("value"):
            scores.append(_confidence(field.get("confidence")))
    for section in LIST_SCHEMAS:
        scores.extend(
            _confidence(item.get("confidence"))
            for item in data.get(section, [])
            if isinstance(item, dict)
        )
    return round(sum(scores) / len(scores)) if scores else 0


def public_record(record: dict, documents: DocumentRepository | None = None) -> dict:
    output = dict(record)
    decoded = _decode_json(record.get("extracted_json"), None)
    output["extracted_data"] = (
        normalize_extraction(decoded)
        if decoded is not None
        else empty_extraction("Stored extraction could not be read.")
    )
    output["history"] = _decode_json(record.get("history_json"), [])
    output.pop("extracted_json", None)
    output.pop("history_json", None)
    if documents and record.get("document_id"):
        document = documents.get(record["document_id"])
        if document:
            output["file_name"] = document.get("file_name", "")
            output["document_title"] = document.get("title", "")
    try:
        output["overall_confidence"] = int(float(output.get("overall_confidence") or 0))
        output["version"] = int(float(output.get("version") or 1))
    except (TypeError, ValueError):
        pass
    return output


def _source_text(content: bytes, filename: str) -> str:
    extension = Path(filename).suffix.lower()
    if extension in {".txt", ".md", ".csv"}:
        return content.decode("utf-8", errors="ignore")[:50000]
    if extension == ".xlsx":
        workbook = openpyxl.load_workbook(io.BytesIO(content), data_only=True, read_only=True)
        lines = []
        for worksheet in workbook.worksheets:
            lines.append(f"Sheet: {worksheet.title}")
            for row in worksheet.iter_rows(values_only=True):
                values = [str(value) for value in row if value not in (None, "")]
                if values:
                    lines.append(" | ".join(values))
                if sum(len(line) for line in lines) > 50000:
                    return "\n".join(lines)[:50000]
        return "\n".join(lines)
    if extension == ".docx":
        with zipfile.ZipFile(io.BytesIO(content)) as archive:
            xml = archive.read("word/document.xml")
        root = ElementTree.fromstring(xml)
        return " ".join(text.strip() for text in root.itertext() if text.strip())[:50000]
    return ""


async def extract_record_data(
    *, content: bytes, filename: str, record_type: str, title: str
) -> dict:
    source_text = _source_text(content, filename)
    try:
        raw = await ai_provider.extract_machine_record(
            content=content,
            filename=filename,
            record_type=record_type,
            title=title,
            source_text=source_text,
        )
        return normalize_extraction(raw)
    except Exception as exc:
        log.warning("machine_record.extraction_unavailable", file=filename, error=str(exc))
        note = "AI extraction is unavailable. Enter or verify the record before Maintenance Head approval."
        fallback = empty_extraction(note)
        fallback["summary"] = source_text[:800].strip()
        return fallback


def _document_category(record_type: str) -> str:
    return {
        "manual": "manual",
        "wiring_diagram": "circuit_diagram",
        "hydraulic_diagram": "hydraulic_diagram",
        "spare_parts_bom": "spare_parts_catalog",
    }.get(record_type, "other")


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _history(action: str, user: CurrentUser, note: str = "") -> dict:
    return {
        "action": action,
        "by": user.user_id,
        "name": user.name,
        "role": user.role,
        "at": _now(),
        "note": note,
    }


async def create_record(
    *, user: CurrentUser, machine_id: str, record_type: str, source_kind: str,
    title: str, filename: str, content: bytes, machines: MachineRepository,
    documents: DocumentRepository, records: MachineRecordRepository, storage: FileStorage,
) -> dict:
    user.assert_can_upload_machine_records()
    if record_type not in MACHINE_RECORD_TYPES:
        raise HTTPException(status_code=400, detail=f"record_type must be one of {MACHINE_RECORD_TYPES}")
    if source_kind not in MACHINE_RECORD_SOURCE_KINDS:
        raise HTTPException(status_code=400, detail=f"source_kind must be one of {MACHINE_RECORD_SOURCE_KINDS}")
    machine = machines.get(machine_id)
    if machine is None or machine.get("company_code") != user.company_code:
        raise HTTPException(status_code=404, detail="machine not found")
    try:
        validate_upload(filename, len(content), content)
    except UnsupportedFileTypeError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except FileTooLargeError as exc:
        raise HTTPException(status_code=413, detail=str(exc))

    file_hash = hashlib.sha256(content).hexdigest()
    duplicate = records.find_by_hash(user.company_code, machine_id, file_hash)
    if duplicate:
        raise HTTPException(
            status_code=409,
            detail=f"This file is already in the records inbox as {duplicate['record_id']}.",
        )

    document_id = documents.next_document_id()
    storage_path = await storage.save(
        user.company_code, machine_id, document_id, filename, content
    )
    created_at = _now()
    document_created = False
    try:
        documents.add({
            "document_id": document_id,
            "company_code": user.company_code,
            "machine_id": machine_id,
            "category": _document_category(record_type),
            "title": title,
            "file_name": filename,
            "storage_path": storage_path,
            "uploaded_by": user.user_id,
            "uploaded_at": created_at,
        })
        document_created = True

        extracted = await extract_record_data(
            content=content, filename=filename, record_type=record_type, title=title
        )
        record = {
            "record_id": records.next_record_id(),
            "document_id": document_id,
            "company_code": user.company_code,
            "machine_id": machine_id,
            "record_type": record_type,
            "source_kind": source_kind,
            "title": title,
            "status": "needs_review",
            "overall_confidence": overall_confidence(extracted),
            "extracted_json": _encode_json(extracted),
            "review_notes": "",
            "created_by": user.user_id,
            "created_at": created_at,
            "updated_by": user.user_id,
            "updated_at": created_at,
            "approved_by": "",
            "approved_at": "",
            "version": 1,
            "file_hash": file_hash,
            "history_json": _encode_json([_history("uploaded_and_extracted", user)]),
        }
        records.add(record)
        return public_record(record, documents)
    except Exception:
        if document_created:
            try:
                documents.delete(document_id)
            except Exception as cleanup_error:
                log.warning(
                    "machine_record.document_cleanup_failed",
                    document=document_id,
                    error=str(cleanup_error),
                )
        try:
            await storage.delete(storage_path)
        except Exception as cleanup_error:
            log.warning(
                "machine_record.storage_cleanup_failed",
                path=storage_path,
                error=str(cleanup_error),
            )
        raise


def update_draft(
    *, user: CurrentUser, record_id: str, extracted_data: dict,
    review_notes: str, records: MachineRecordRepository, documents: DocumentRepository,
) -> dict:
    record = records.get(record_id)
    if record is None or record.get("company_code") != user.company_code:
        raise HTTPException(status_code=404, detail="record not found")
    if record.get("status") == "approved":
        raise HTTPException(status_code=409, detail="approved knowledge is locked; upload a revised source")
    user.assert_can_upload_machine_records()
    normalized = normalize_extraction(extracted_data)
    history = public_record(record).get("history", [])
    history.append(_history("draft_updated", user, review_notes))
    version = int(float(record.get("version") or 1)) + 1
    updates = {
        "status": "needs_review",
        "overall_confidence": overall_confidence(normalized),
        "extracted_json": _encode_json(normalized),
        "review_notes": review_notes.strip(),
        "updated_by": user.user_id,
        "updated_at": _now(),
        "approved_by": "",
        "approved_at": "",
        "version": version,
        "history_json": _encode_json(history),
    }
    records.update(record_id, updates)
    return public_record(records.get(record_id), documents)


async def decide_record(
    *, user: CurrentUser, record_id: str, approved: bool, review_notes: str,
    records: MachineRecordRepository, documents: DocumentRepository,
    machines: MachineRepository, parts: PartsRepository, storage: FileStorage,
) -> dict:
    user.assert_maintenance_head()
    record = records.get(record_id)
    if record is None or record.get("company_code") != user.company_code:
        raise HTTPException(status_code=404, detail="record not found")
    if record.get("status") == "approved":
        raise HTTPException(status_code=409, detail="record is already approved")
    history = public_record(record).get("history", [])
    action = "approved" if approved else "rejected"
    history.append(_history(action, user, review_notes))
    now = _now()
    updates = {
        "status": action,
        "review_notes": review_notes.strip(),
        "updated_by": user.user_id,
        "updated_at": now,
        "approved_by": user.user_id if approved else "",
        "approved_at": now if approved else "",
        "history_json": _encode_json(history),
    }
    records.update(record_id, updates)

    machine_data = None
    if approved:
        machine = machines.get(record["machine_id"])
        machine = {**machine, "machine_id": record["machine_id"]}
        machine_data = await build_machine_data(
            machine=machine,
            documents=documents,
            parts=parts,
            records=records,
            storage=storage,
        )
    return {**public_record(records.get(record_id), documents), "machine_data": machine_data}


def approved_knowledge(
    *, company_code: str, records: MachineRecordRepository, machine_id: str | None = None
) -> list[dict]:
    return [public_record(record) for record in records.list(company_code, machine_id, "approved")]


def _safe_export_name(value: str) -> str:
    return re.sub(r"[^A-Za-z0-9._-]+", "_", value or "record").strip("_") or "record"


def _csv_bytes(rows: list[dict]) -> bytes:
    if not rows:
        return b""
    buffer = io.StringIO()
    fields = sorted({key for row in rows for key in row})
    writer = csv.DictWriter(buffer, fieldnames=fields)
    writer.writeheader()
    writer.writerows(rows)
    return buffer.getvalue().encode("utf-8")


async def export_backup(
    *, user: CurrentUser, machine_ids: list[str] | None, machines: MachineRepository,
    documents: DocumentRepository, records: MachineRecordRepository,
    parts: PartsRepository, storage: FileStorage,
) -> tuple[bytes, str]:
    company_machines = machines.get_company_machines(user.company_code)
    machine_map = {machine["machine_id"]: machine for machine in company_machines}
    selected = machine_ids or list(machine_map)
    if any(machine_id not in machine_map for machine_id in selected):
        raise HTTPException(status_code=404, detail="one or more machines were not found")

    buffer = io.BytesIO()
    manifest_records = []
    flat_sections = {section: [] for section in LIST_SCHEMAS}
    with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as archive:
        for machine_id in selected:
            machine = {**machine_map[machine_id], "machine_id": machine_id}
            await build_machine_data(
                machine=machine, documents=documents, parts=parts,
                records=records, storage=storage,
            )
            machine_folder = f"machines/{_safe_export_name(machine_id)}"
            for record in records.list(user.company_code, machine_id):
                public = public_record(record, documents)
                document = documents.get(record.get("document_id")) if record.get("document_id") else None
                original_path = ""
                if document:
                    original_path = (
                        f"{machine_folder}/originals/{_safe_export_name(record['record_id'])}_"
                        f"{_safe_export_name(document.get('file_name', 'source'))}"
                    )
                    try:
                        archive.writestr(original_path, await storage.read(document["storage_path"]))
                    except Exception as exc:
                        log.warning("machine_record.export_original_failed", record=record["record_id"], error=str(exc))
                        original_path = ""
                public["original_path"] = original_path
                archive.writestr(
                    f"{machine_folder}/records/{record['record_id']}.json",
                    json.dumps(public, indent=2, ensure_ascii=False),
                )
                manifest_records.append({
                    "record_id": record["record_id"],
                    "machine_id": machine_id,
                    "status": record.get("status"),
                    "original_path": original_path,
                })
                for section in LIST_SCHEMAS:
                    for item in public["extracted_data"].get(section, []):
                        flat_sections[section].append({
                            "machine_id": machine_id,
                            "record_id": record["record_id"],
                            "status": record.get("status"),
                            **item,
                        })
            canonical_path = machine_data_path(machine)
            if canonical_path.exists():
                archive.writestr(f"{machine_folder}/{canonical_path.name}", canonical_path.read_bytes())
            internet_path = machine_data_path(machine, internet=True)
            if internet_path.exists():
                archive.writestr(f"{machine_folder}/{internet_path.name}", internet_path.read_bytes())

        for section, rows in flat_sections.items():
            archive.writestr(f"structured/{section}.csv", _csv_bytes(rows))
        archive.writestr(
            "manifest.json",
            json.dumps({
                "format": "turbofix-machine-records-v1",
                "company_code": user.company_code,
                "exported_at": _now(),
                "machine_ids": selected,
                "records": manifest_records,
                "restore_policy": "Imported records return to needs_review and require Maintenance Head approval.",
            }, indent=2),
        )
    filename = f"TurboFix_{_safe_export_name(user.company_code)}_backup_{datetime.now():%Y%m%d_%H%M}.zip"
    return buffer.getvalue(), filename


async def import_backup(
    *, user: CurrentUser, content: bytes, machines: MachineRepository,
    documents: DocumentRepository, records: MachineRecordRepository, storage: FileStorage,
) -> dict:
    user.assert_maintenance_head()
    if len(content) > 100 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="backup is over the 100 MB restore limit")
    try:
        archive = zipfile.ZipFile(io.BytesIO(content))
    except zipfile.BadZipFile:
        raise HTTPException(status_code=400, detail="invalid TurboFix backup ZIP")
    if any(name.startswith("/") or ".." in Path(name).parts for name in archive.namelist()):
        raise HTTPException(status_code=400, detail="backup contains unsafe paths")
    if sum(info.file_size for info in archive.infolist()) > 250 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="expanded backup is too large")
    try:
        manifest = json.loads(archive.read("manifest.json"))
    except Exception:
        raise HTTPException(status_code=400, detail="manifest.json is missing or invalid")
    if manifest.get("format") != "turbofix-machine-records-v1":
        raise HTTPException(status_code=400, detail="unsupported backup format")

    machine_map = {
        machine["machine_id"]: machine
        for machine in machines.get_company_machines(user.company_code)
    }
    restored = 0
    skipped = 0
    for name in archive.namelist():
        if "/records/" not in name or not name.endswith(".json"):
            continue
        raw = json.loads(archive.read(name))
        machine_id = raw.get("machine_id")
        if machine_id not in machine_map:
            skipped += 1
            continue
        file_hash = raw.get("file_hash") or hashlib.sha256(archive.read(name)).hexdigest()
        if records.find_by_hash(user.company_code, machine_id, file_hash):
            skipped += 1
            continue
        original_path = raw.get("original_path")
        document_id = ""
        if original_path and original_path in archive.namelist():
            original = archive.read(original_path)
            file_name = Path(original_path).name.split("_", 1)[-1]
            document_id = documents.next_document_id()
            storage_path = await storage.save(
                user.company_code, machine_id, document_id, file_name, original
            )
            documents.add({
                "document_id": document_id,
                "company_code": user.company_code,
                "machine_id": machine_id,
                "category": _document_category(raw.get("record_type", "other")),
                "title": raw.get("title") or file_name,
                "file_name": file_name,
                "storage_path": storage_path,
                "uploaded_by": user.user_id,
                "uploaded_at": _now(),
            })
        extracted = normalize_extraction(raw.get("extracted_data"))
        history = raw.get("history") if isinstance(raw.get("history"), list) else []
        history.append(_history("restored_for_reapproval", user))
        now = _now()
        records.add({
            "record_id": records.next_record_id(),
            "document_id": document_id,
            "company_code": user.company_code,
            "machine_id": machine_id,
            "record_type": raw.get("record_type") if raw.get("record_type") in MACHINE_RECORD_TYPES else "other",
            "source_kind": raw.get("source_kind") if raw.get("source_kind") in MACHINE_RECORD_SOURCE_KINDS else "soft_copy",
            "title": raw.get("title") or "Restored machine record",
            "status": "needs_review",
            "overall_confidence": overall_confidence(extracted),
            "extracted_json": _encode_json(extracted),
            "review_notes": "Restored backup requires Maintenance Head approval.",
            "created_by": user.user_id,
            "created_at": now,
            "updated_by": user.user_id,
            "updated_at": now,
            "approved_by": "",
            "approved_at": "",
            "version": int(float(raw.get("version") or 1)) + 1,
            "file_hash": file_hash,
            "history_json": _encode_json(history),
        })
        restored += 1
    return {"restored": restored, "skipped": skipped, "status": "needs_review"}
