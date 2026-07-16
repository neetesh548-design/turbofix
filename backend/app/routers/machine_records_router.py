"""AI machine-record inbox, review, approval, and backup endpoints."""

from typing import Optional
from urllib.parse import quote

from fastapi import APIRouter, Depends, File, Form, Query, Response, UploadFile
from pydantic import BaseModel, Field

from app.auth import CurrentUser, get_current_user
from app.dependencies import get_documents, get_machine_records, get_machines, get_parts
from app.infrastructure.file_storage import get_file_storage
from app.repositories.base import (
    DocumentRepository,
    MachineRecordRepository,
    MachineRepository,
    PartsRepository,
)
from app.services import machine_record_service

router = APIRouter(prefix="/vault/records", tags=["AI machine records"])


@router.get("")
def list_records(
    machine_id: Optional[str] = None,
    status: Optional[str] = None,
    user: CurrentUser = Depends(get_current_user),
    records: MachineRecordRepository = Depends(get_machine_records),
    documents: DocumentRepository = Depends(get_documents),
):
    return [
        machine_record_service.public_record(record, documents)
        for record in records.list(user.company_code, machine_id, status)
    ]


@router.post("", status_code=201)
async def upload_record(
    machine_id: str = Form(...),
    record_type: str = Form(...),
    source_kind: str = Form(...),
    title: str = Form(...),
    file: UploadFile = File(...),
    user: CurrentUser = Depends(get_current_user),
    machines: MachineRepository = Depends(get_machines),
    documents: DocumentRepository = Depends(get_documents),
    records: MachineRecordRepository = Depends(get_machine_records),
):
    return await machine_record_service.create_record(
        user=user,
        machine_id=machine_id,
        record_type=record_type,
        source_kind=source_kind,
        title=title.strip() or file.filename,
        filename=file.filename,
        content=await file.read(),
        machines=machines,
        documents=documents,
        records=records,
        storage=get_file_storage(),
    )


@router.get("/knowledge")
def get_approved_knowledge(
    machine_id: Optional[str] = None,
    user: CurrentUser = Depends(get_current_user),
    records: MachineRecordRepository = Depends(get_machine_records),
):
    return machine_record_service.approved_knowledge(
        company_code=user.company_code, records=records, machine_id=machine_id
    )


@router.get("/export")
async def export_records(
    machine_id: list[str] | None = Query(default=None),
    user: CurrentUser = Depends(get_current_user),
    machines: MachineRepository = Depends(get_machines),
    documents: DocumentRepository = Depends(get_documents),
    records: MachineRecordRepository = Depends(get_machine_records),
    parts: PartsRepository = Depends(get_parts),
):
    content, filename = await machine_record_service.export_backup(
        user=user,
        machine_ids=machine_id,
        machines=machines,
        documents=documents,
        records=records,
        parts=parts,
        storage=get_file_storage(),
    )
    return Response(
        content=content,
        media_type="application/zip",
        headers={"Content-Disposition": f"attachment; filename*=UTF-8''{quote(filename)}"},
    )


@router.post("/import")
async def import_records(
    file: UploadFile = File(...),
    user: CurrentUser = Depends(get_current_user),
    machines: MachineRepository = Depends(get_machines),
    documents: DocumentRepository = Depends(get_documents),
    records: MachineRecordRepository = Depends(get_machine_records),
):
    return await machine_record_service.import_backup(
        user=user,
        content=await file.read(),
        machines=machines,
        documents=documents,
        records=records,
        storage=get_file_storage(),
    )


@router.get("/{record_id}")
def get_record(
    record_id: str,
    user: CurrentUser = Depends(get_current_user),
    records: MachineRecordRepository = Depends(get_machine_records),
    documents: DocumentRepository = Depends(get_documents),
):
    record = records.get(record_id)
    if record is None or record.get("company_code") != user.company_code:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="record not found")
    return machine_record_service.public_record(record, documents)


class RecordUpdate(BaseModel):
    extracted_data: dict
    review_notes: str = Field(default="", max_length=2000)


@router.patch("/{record_id}")
def update_record(
    record_id: str,
    body: RecordUpdate,
    user: CurrentUser = Depends(get_current_user),
    records: MachineRecordRepository = Depends(get_machine_records),
    documents: DocumentRepository = Depends(get_documents),
):
    return machine_record_service.update_draft(
        user=user,
        record_id=record_id,
        extracted_data=body.extracted_data,
        review_notes=body.review_notes,
        records=records,
        documents=documents,
    )


class RecordDecision(BaseModel):
    review_notes: str = Field(default="", max_length=2000)


@router.post("/{record_id}/approve")
async def approve_record(
    record_id: str,
    body: RecordDecision,
    user: CurrentUser = Depends(get_current_user),
    records: MachineRecordRepository = Depends(get_machine_records),
    documents: DocumentRepository = Depends(get_documents),
    machines: MachineRepository = Depends(get_machines),
    parts: PartsRepository = Depends(get_parts),
):
    return await machine_record_service.decide_record(
        user=user,
        record_id=record_id,
        approved=True,
        review_notes=body.review_notes,
        records=records,
        documents=documents,
        machines=machines,
        parts=parts,
        storage=get_file_storage(),
    )


@router.post("/{record_id}/reject")
async def reject_record(
    record_id: str,
    body: RecordDecision,
    user: CurrentUser = Depends(get_current_user),
    records: MachineRecordRepository = Depends(get_machine_records),
    documents: DocumentRepository = Depends(get_documents),
    machines: MachineRepository = Depends(get_machines),
    parts: PartsRepository = Depends(get_parts),
):
    return await machine_record_service.decide_record(
        user=user,
        record_id=record_id,
        approved=False,
        review_notes=body.review_notes,
        records=records,
        documents=documents,
        machines=machines,
        parts=parts,
        storage=get_file_storage(),
    )
