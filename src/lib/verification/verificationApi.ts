/**
 * Verification Flow — API layer.
 *
 * Every read/write against the verification tables goes through here so that:
 *   * rows are normalised into the strict types in `./types` (Supabase returns
 *     `jsonb` as `unknown`, and legacy rows may carry nulls),
 *   * Postgres trigger errors are converted into stable, translatable codes
 *     instead of leaking raw SQL messages into the UI,
 *   * the components stay free of Supabase specifics and are trivial to mock.
 *
 * Endpoints (Supabase PostgREST / Storage):
 *   GET    ticket_verifications?ticket_id=eq.:id        listVerifications
 *   GET    ticket_verifications (active)                getActiveVerification
 *   GET    verification_events?ticket_id=eq.:id         listVerificationEvents
 *   GET    verification_queue                           listVerificationQueue
 *   GET    verification_settings?company_id=eq.:id      getVerificationPolicy
 *   POST   ticket_verifications                         createVerification
 *   PATCH  ticket_verifications?id=eq.:id               saveDraft / submit / decide
 *   PATCH  tickets?id=eq.:id                            closeTicketWithOverride
 *   POST   storage/verification-evidence/*              uploadEvidence / uploadSignature
 */

import { supabase } from '../../supabaseClient';
import {
  ACTIVE_STATUSES,
  DEFAULT_VERIFICATION_POLICY,
  defaultChecklist,
  validateForSubmission,
  type TicketVerification,
  type VerificationActor,
  type VerificationChecklistItem,
  type VerificationDecisionInput,
  type VerificationDraft,
  type VerificationEvent,
  type VerificationEvidence,
  type VerificationPolicy,
  type VerificationStatus,
} from './types';

const TABLE = 'ticket_verifications';
const EVENTS_TABLE = 'verification_events';
const SETTINGS_TABLE = 'verification_settings';
const QUEUE_VIEW = 'verification_queue';
const BUCKET = 'verification-evidence';
const SIGNED_URL_TTL_SECONDS = 60 * 60; // 1 hour
const MAX_EVIDENCE_BYTES = 10 * 1024 * 1024;
const ALLOWED_EVIDENCE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'application/pdf',
];

/**
 * A failure the UI can render. `messageKey` is an i18n key; `code` is stable
 * and safe to assert on in tests.
 */
export class VerificationError extends Error {
  readonly code: string;
  readonly messageKey: string;
  readonly cause?: unknown;

  constructor(code: string, messageKey: string, cause?: unknown) {
    super(`${code}: ${messageKey}`);
    this.name = 'VerificationError';
    this.code = code;
    this.messageKey = messageKey;
    this.cause = cause;
  }
}

/** Maps the sentinel prefixes raised by the SQL triggers to i18n keys. */
const TRIGGER_ERROR_KEYS: Record<string, string> = {
  VERIFICATION_REQUIRED: 'verification.error.approval_required',
  VERIFICATION_EVIDENCE_REQUIRED: 'verification.error.evidence_required',
  VERIFICATION_SIGNATURE_REQUIRED: 'verification.error.signature_required',
  VERIFICATION_REVIEWER_REQUIRED: 'verification.error.reviewer_required',
  VERIFICATION_SELF_APPROVAL_BLOCKED: 'verification.error.self_approval',
  VERIFICATION_INVALID_TRANSITION: 'verification.error.invalid_transition',
  VERIFICATION_REASON_REQUIRED: 'verification.error.reason_required',
};

function toVerificationError(error: unknown, fallbackCode: string): VerificationError {
  const raw =
    typeof error === 'object' && error !== null && 'message' in error
      ? String((error as { message: unknown }).message)
      : String(error);

  for (const sentinel of Object.keys(TRIGGER_ERROR_KEYS)) {
    if (raw.includes(sentinel)) {
      return new VerificationError(sentinel, TRIGGER_ERROR_KEYS[sentinel], error);
    }
  }
  if (raw.includes('ticket_verifications_one_active_idx')) {
    return new VerificationError(
      'VERIFICATION_ALREADY_ACTIVE',
      'verification.error.already_active',
      error,
    );
  }
  if (raw.toLowerCase().includes('row-level security') || raw.includes('42501')) {
    return new VerificationError('VERIFICATION_FORBIDDEN', 'verification.error.forbidden', error);
  }
  return new VerificationError(fallbackCode, 'verification.error.generic', error);
}

// ---------------------------------------------------------------------------
// Row normalisation
// ---------------------------------------------------------------------------

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function asString(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

/** Normalises a PostgREST row into a fully-typed TicketVerification. */
export function normaliseVerification(row: Record<string, unknown>): TicketVerification {
  return {
    id: String(row.id),
    ticket_id: String(row.ticket_id),
    machine_id: asString(row.machine_id),
    company_id: asString(row.company_id),
    status: (asString(row.status) ?? 'draft') as VerificationStatus,
    attempt: typeof row.attempt === 'number' ? row.attempt : 1,
    requires_supervisor: row.requires_supervisor !== false,
    checklist: asArray<VerificationChecklistItem>(row.checklist),
    evidence: asArray<VerificationEvidence>(row.evidence),
    signature_url: asString(row.signature_url),
    signed_by_name: asString(row.signed_by_name),
    technician_notes: asString(row.technician_notes),
    submitted_by: asString(row.submitted_by),
    submitted_by_name: asString(row.submitted_by_name),
    submitted_at: asString(row.submitted_at),
    reviewer_id: asString(row.reviewer_id),
    reviewer_name: asString(row.reviewer_name),
    reviewed_at: asString(row.reviewed_at),
    review_notes: asString(row.review_notes),
    rejection_reason: asString(row.rejection_reason),
    created_at: String(row.created_at ?? new Date().toISOString()),
    updated_at: String(row.updated_at ?? row.created_at ?? new Date().toISOString()),
  };
}

export function normaliseEvent(row: Record<string, unknown>): VerificationEvent {
  return {
    id: String(row.id),
    verification_id: asString(row.verification_id),
    ticket_id: asString(row.ticket_id),
    machine_id: asString(row.machine_id),
    company_id: asString(row.company_id),
    action: (asString(row.action) ?? 'updated') as VerificationEvent['action'],
    actor_id: asString(row.actor_id),
    actor_name: asString(row.actor_name),
    from_status: asString(row.from_status) as VerificationStatus | null,
    to_status: asString(row.to_status) as VerificationStatus | null,
    details: asRecord(row.details),
    created_at: String(row.created_at ?? new Date().toISOString()),
  };
}

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

/** Company verification policy, falling back to the safe defaults. */
export async function getVerificationPolicy(
  companyId: string | null,
): Promise<VerificationPolicy> {
  if (!companyId) return DEFAULT_VERIFICATION_POLICY;
  const { data, error } = await supabase
    .from(SETTINGS_TABLE)
    .select('*')
    .eq('company_id', companyId)
    .maybeSingle();

  if (error || !data) return DEFAULT_VERIFICATION_POLICY;
  const row = data as Record<string, unknown>;
  return {
    enforce_verification_on_close: row.enforce_verification_on_close !== false,
    require_photo_evidence: row.require_photo_evidence !== false,
    require_signature: row.require_signature === true,
    min_evidence_count:
      typeof row.min_evidence_count === 'number' ? row.min_evidence_count : 1,
    allow_self_approval: row.allow_self_approval === true,
  };
}

/** Every verification attempt for a ticket, newest first. */
export async function listVerifications(ticketId: string): Promise<TicketVerification[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('ticket_id', ticketId)
    .order('created_at', { ascending: false });

  if (error) throw toVerificationError(error, 'VERIFICATION_LIST_FAILED');
  return asArray<Record<string, unknown>>(data).map(normaliseVerification);
}

/** The single live verification for a ticket, or null. */
export async function getActiveVerification(
  ticketId: string,
): Promise<TicketVerification | null> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('ticket_id', ticketId)
    .in('status', [...ACTIVE_STATUSES])
    .order('created_at', { ascending: false })
    .limit(1);

  if (error) throw toVerificationError(error, 'VERIFICATION_FETCH_FAILED');
  const rows = asArray<Record<string, unknown>>(data);
  return rows.length > 0 ? normaliseVerification(rows[0]) : null;
}

/**
 * The verification that governs closure: the live one if there is one,
 * otherwise the most recent terminal decision.
 */
export async function getGoverningVerification(
  ticketId: string,
): Promise<TicketVerification | null> {
  const all = await listVerifications(ticketId);
  if (all.length === 0) return null;
  const active = all.find((v) => (ACTIVE_STATUSES as readonly string[]).includes(v.status));
  if (active) return active;
  const approved = all.find((v) => v.status === 'approved');
  return approved ?? all[0];
}

/** Append-only audit trail for a ticket, newest first. */
export async function listVerificationEvents(ticketId: string): Promise<VerificationEvent[]> {
  const { data, error } = await supabase
    .from(EVENTS_TABLE)
    .select('*')
    .eq('ticket_id', ticketId)
    .order('created_at', { ascending: false });

  if (error) throw toVerificationError(error, 'VERIFICATION_EVENTS_FAILED');
  return asArray<Record<string, unknown>>(data).map(normaliseEvent);
}

export interface VerificationQueueItem {
  verification_id: string;
  ticket_id: string;
  machine_id: string | null;
  status: VerificationStatus;
  submitted_by_name: string | null;
  submitted_at: string | null;
  technician_notes: string | null;
  evidence_count: number;
  has_signature: boolean;
  wo_number: string | null;
  issue_text: string | null;
  urgency: string | null;
  machine_name: string | null;
}

/** Everything currently waiting on a supervisor. */
export async function listVerificationQueue(
  companyId: string | null,
): Promise<VerificationQueueItem[]> {
  let query = supabase.from(QUEUE_VIEW).select('*').order('submitted_at', { ascending: true });
  if (companyId) query = query.eq('company_id', companyId);

  const { data, error } = await query;
  if (error) throw toVerificationError(error, 'VERIFICATION_QUEUE_FAILED');

  return asArray<Record<string, unknown>>(data).map((row) => ({
    verification_id: String(row.verification_id),
    ticket_id: String(row.ticket_id),
    machine_id: asString(row.machine_id),
    status: (asString(row.status) ?? 'pending_review') as VerificationStatus,
    submitted_by_name: asString(row.submitted_by_name),
    submitted_at: asString(row.submitted_at),
    technician_notes: asString(row.technician_notes),
    evidence_count: typeof row.evidence_count === 'number' ? row.evidence_count : 0,
    has_signature: row.has_signature === true,
    wo_number: asString(row.wo_number),
    issue_text: asString(row.issue_text),
    urgency: asString(row.urgency),
    machine_name: asString(row.machine_name),
  }));
}

// ---------------------------------------------------------------------------
// Writes
// ---------------------------------------------------------------------------

/**
 * Raises a fresh verification for a ticket. If a live one already exists it is
 * returned untouched, which makes the call idempotent from the UI's point of
 * view (double-tap on a slow phone must not create two records).
 */
export async function createVerification(
  ticketId: string,
  actor: VerificationActor,
  options: { requiresSupervisor?: boolean } = {},
): Promise<TicketVerification> {
  const existing = await getActiveVerification(ticketId);
  if (existing) return existing;

  const previous = await listVerifications(ticketId);
  const { data, error } = await supabase
    .from(TABLE)
    .insert({
      ticket_id: ticketId,
      status: 'draft',
      attempt: previous.length + 1,
      requires_supervisor: options.requiresSupervisor !== false,
      checklist: defaultChecklist(),
      evidence: [],
      submitted_by: actor.id,
      submitted_by_name: actor.name,
    })
    .select()
    .single();

  if (error) throw toVerificationError(error, 'VERIFICATION_CREATE_FAILED');
  return normaliseVerification(data as Record<string, unknown>);
}

/** Persists in-progress evidence without submitting it for review. */
export async function saveDraft(
  verificationId: string,
  draft: VerificationDraft,
): Promise<TicketVerification> {
  const { data, error } = await supabase
    .from(TABLE)
    .update({
      checklist: draft.checklist,
      evidence: draft.evidence,
      technician_notes: draft.technician_notes,
      signature_url: draft.signature_url,
      signed_by_name: draft.signed_by_name,
    })
    .eq('id', verificationId)
    .select()
    .single();

  if (error) throw toVerificationError(error, 'VERIFICATION_SAVE_FAILED');
  return normaliseVerification(data as Record<string, unknown>);
}

/**
 * Submits the verification for supervisor review. Validates locally first so
 * the user gets a precise, translated message instead of a trigger exception.
 */
export async function submitVerification(
  verificationId: string,
  draft: VerificationDraft,
  actor: VerificationActor,
  policy: VerificationPolicy = DEFAULT_VERIFICATION_POLICY,
): Promise<TicketVerification> {
  const problems = validateForSubmission(draft, policy);
  if (problems.length > 0) {
    throw new VerificationError('VERIFICATION_INCOMPLETE', problems[0]);
  }

  const { data, error } = await supabase
    .from(TABLE)
    .update({
      checklist: draft.checklist,
      evidence: draft.evidence,
      technician_notes: draft.technician_notes,
      signature_url: draft.signature_url,
      signed_by_name: draft.signed_by_name,
      status: 'pending_review',
      submitted_by: actor.id,
      submitted_by_name: actor.name,
      submitted_at: new Date().toISOString(),
    })
    .eq('id', verificationId)
    .select()
    .single();

  if (error) throw toVerificationError(error, 'VERIFICATION_SUBMIT_FAILED');
  return normaliseVerification(data as Record<string, unknown>);
}

async function decide(
  verificationId: string,
  status: Extract<VerificationStatus, 'approved' | 'rejected' | 'changes_requested'>,
  input: VerificationDecisionInput,
): Promise<TicketVerification> {
  if (status !== 'approved' && !(input.rejection_reason ?? input.review_notes).trim()) {
    throw new VerificationError('VERIFICATION_REASON_REQUIRED', 'verification.error.reason_required');
  }

  const { data, error } = await supabase
    .from(TABLE)
    .update({
      status,
      reviewer_id: input.reviewer.id,
      reviewer_name: input.reviewer.name,
      reviewed_at: new Date().toISOString(),
      review_notes: input.review_notes,
      rejection_reason: status === 'approved' ? null : (input.rejection_reason ?? input.review_notes),
    })
    .eq('id', verificationId)
    .select()
    .single();

  if (error) throw toVerificationError(error, 'VERIFICATION_DECISION_FAILED');
  return normaliseVerification(data as Record<string, unknown>);
}

/** Supervisor approves — the database trigger then closes the work order. */
export function approveVerification(
  verificationId: string,
  input: VerificationDecisionInput,
): Promise<TicketVerification> {
  return decide(verificationId, 'approved', input);
}

/** Supervisor rejects — the ticket is reopened for rework. */
export function rejectVerification(
  verificationId: string,
  input: VerificationDecisionInput,
): Promise<TicketVerification> {
  return decide(verificationId, 'rejected', input);
}

/** Supervisor sends it back for more evidence without a hard rejection. */
export function requestChanges(
  verificationId: string,
  input: VerificationDecisionInput,
): Promise<TicketVerification> {
  return decide(verificationId, 'changes_requested', input);
}

export async function cancelVerification(
  verificationId: string,
  actor: VerificationActor,
): Promise<TicketVerification> {
  const { data, error } = await supabase
    .from(TABLE)
    .update({
      status: 'cancelled',
      reviewer_id: actor.id,
      reviewer_name: actor.name,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', verificationId)
    .select()
    .single();

  if (error) throw toVerificationError(error, 'VERIFICATION_CANCEL_FAILED');
  return normaliseVerification(data as Record<string, unknown>);
}

/**
 * Emergency closure that bypasses the gate. The reason is mandatory and is
 * written to `verification_events` by the database trigger — there is no silent
 * bypass anywhere in the system.
 */
export async function closeTicketWithOverride(
  ticketId: string,
  reason: string,
  actor: VerificationActor,
): Promise<void> {
  if (reason.trim().length < 10) {
    throw new VerificationError('VERIFICATION_REASON_REQUIRED', 'verification.error.override_reason_too_short');
  }
  const { error } = await supabase
    .from('tickets')
    .update({
      status: 'resolved',
      lifecycle_stage: 'closed',
      closure_override_reason: reason.trim(),
      closure_override_by: actor.name,
      closure_approved_by: actor.name,
    })
    .eq('id', ticketId);

  if (error) throw toVerificationError(error, 'VERIFICATION_OVERRIDE_FAILED');
}

// ---------------------------------------------------------------------------
// Storage
// ---------------------------------------------------------------------------

function randomId(): string {
  const cryptoObj = globalThis.crypto;
  if (cryptoObj && typeof cryptoObj.randomUUID === 'function') return cryptoObj.randomUUID();
  return `ev-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

/** Uploads one evidence file and returns the entry to append to the draft. */
export async function uploadEvidence(
  ticketId: string,
  file: File,
  caption = '',
): Promise<VerificationEvidence> {
  if (file.size > MAX_EVIDENCE_BYTES) {
    throw new VerificationError('VERIFICATION_FILE_TOO_LARGE', 'verification.error.file_too_large');
  }
  if (file.type && !ALLOWED_EVIDENCE_TYPES.includes(file.type)) {
    throw new VerificationError('VERIFICATION_FILE_TYPE', 'verification.error.file_type');
  }

  const extension = file.name.includes('.') ? file.name.split('.').pop() : 'jpg';
  const path = `${ticketId}/${randomId()}.${extension}`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { cacheControl: '3600', upsert: false, contentType: file.type });

  if (error) throw toVerificationError(error, 'VERIFICATION_UPLOAD_FAILED');

  return {
    id: randomId(),
    path,
    url: await resolveEvidenceUrl(path),
    caption,
    kind: file.type === 'application/pdf' ? 'document' : 'photo',
    uploaded_at: new Date().toISOString(),
    file_name: file.name,
    size_bytes: file.size,
  };
}

/** Uploads a signature captured as a PNG data URL. */
export async function uploadSignature(ticketId: string, dataUrl: string): Promise<string> {
  const match = /^data:(image\/[a-z+]+);base64,(.+)$/i.exec(dataUrl);
  if (!match) {
    throw new VerificationError('VERIFICATION_SIGNATURE_INVALID', 'verification.error.signature_invalid');
  }
  const [, mimeType, base64] = match;
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);

  const path = `${ticketId}/signature-${randomId()}.png`;
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, new Blob([bytes], { type: mimeType }), { contentType: mimeType, upsert: true });

  if (error) throw toVerificationError(error, 'VERIFICATION_SIGNATURE_UPLOAD_FAILED');
  return resolveEvidenceUrl(path);
}

/** Signs a storage path for display; falls back to the public URL. */
export async function resolveEvidenceUrl(path: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);

  if (!error && data && typeof data.signedUrl === 'string') return data.signedUrl;

  const pub = supabase.storage.from(BUCKET).getPublicUrl(path);
  return pub.data.publicUrl;
}

/** Best-effort cleanup when a technician removes a photo before submitting. */
export async function deleteEvidence(path: string): Promise<void> {
  const { error } = await supabase.storage.from(BUCKET).remove([path]);
  if (error) throw toVerificationError(error, 'VERIFICATION_DELETE_FAILED');
}

export const __testing = { toVerificationError, TRIGGER_ERROR_KEYS, MAX_EVIDENCE_BYTES };
