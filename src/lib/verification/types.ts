/**
 * Verification Flow — domain model.
 *
 * A verification is the closed-loop gate between "the technician says the
 * repair is done" and "the work order is closed". It carries the evidence
 * (checklist, photos, notes, signature), the submission, and the supervisor's
 * decision. Every state change is mirrored into `verification_events`, which is
 * the audit trail surfaced by VerificationHistory.
 *
 * Written in strict TypeScript: no `any`, every field explicitly nullable where
 * the database allows NULL.
 */

/** Lifecycle of a single verification attempt. */
export type VerificationStatus =
  | 'draft'
  | 'pending_review'
  | 'approved'
  | 'rejected'
  | 'changes_requested'
  | 'cancelled';

/** Actions recorded in the append-only audit trail. */
export type VerificationAction =
  | 'created'
  | 'submitted'
  | 'approved'
  | 'rejected'
  | 'changes_requested'
  | 'cancelled'
  | 'updated'
  | 'evidence_added'
  | 'closure_blocked'
  | 'closure_override';

/** Statuses from which no further transition is possible. */
export const TERMINAL_STATUSES: readonly VerificationStatus[] = [
  'approved',
  'rejected',
  'cancelled',
] as const;

/** Statuses that occupy the single "live verification per ticket" slot. */
export const ACTIVE_STATUSES: readonly VerificationStatus[] = [
  'draft',
  'pending_review',
  'changes_requested',
] as const;

export type EvidenceKind = 'photo' | 'document' | 'signature';

export interface VerificationEvidence {
  /** Client-generated stable id, used as the React key. */
  id: string;
  /** Storage object path inside the `verification-evidence` bucket. */
  path: string;
  /** Signed or public URL for display. May expire — re-sign on read. */
  url: string;
  caption: string;
  kind: EvidenceKind;
  uploaded_at: string;
  /** Original file name, kept for the audit record. */
  file_name?: string;
  size_bytes?: number;
}

export interface VerificationChecklistItem {
  key: string;
  /** i18n key resolved at render time, never a pre-translated string. */
  label_key: string;
  checked: boolean;
  /** Blocks submission while unchecked. */
  required: boolean;
}

export interface TicketVerification {
  id: string;
  ticket_id: string;
  machine_id: string | null;
  company_id: string | null;
  status: VerificationStatus;
  attempt: number;
  requires_supervisor: boolean;

  checklist: VerificationChecklistItem[];
  evidence: VerificationEvidence[];
  signature_url: string | null;
  signed_by_name: string | null;
  technician_notes: string | null;

  submitted_by: string | null;
  submitted_by_name: string | null;
  submitted_at: string | null;

  reviewer_id: string | null;
  reviewer_name: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
  rejection_reason: string | null;

  created_at: string;
  updated_at: string;
}

export interface VerificationEvent {
  id: string;
  verification_id: string | null;
  ticket_id: string | null;
  machine_id: string | null;
  company_id: string | null;
  action: VerificationAction;
  actor_id: string | null;
  actor_name: string | null;
  from_status: VerificationStatus | null;
  to_status: VerificationStatus | null;
  details: Record<string, unknown>;
  created_at: string;
}

export interface VerificationPolicy {
  enforce_verification_on_close: boolean;
  require_photo_evidence: boolean;
  require_signature: boolean;
  min_evidence_count: number;
  allow_self_approval: boolean;
}

export const DEFAULT_VERIFICATION_POLICY: VerificationPolicy = {
  enforce_verification_on_close: true,
  require_photo_evidence: true,
  require_signature: false,
  min_evidence_count: 1,
  allow_self_approval: false,
};

/** Minimal identity the UI passes down; avoids importing an auth type here. */
export interface VerificationActor {
  id: string | null;
  name: string;
  role: string;
}

export interface VerificationDraft {
  checklist: VerificationChecklistItem[];
  evidence: VerificationEvidence[];
  technician_notes: string;
  signature_url: string | null;
  signed_by_name: string;
}

export interface VerificationDecisionInput {
  reviewer: VerificationActor;
  review_notes: string;
  /** Required when rejecting. */
  rejection_reason?: string;
}

/** Result of the client-side gate; mirrors the database trigger's rules. */
export interface ClosureGateResult {
  allowed: boolean;
  /** i18n key describing why closure is blocked. */
  reason_key: string | null;
  /** What the user should do next. */
  next_action: 'submit_verification' | 'await_review' | 'resubmit' | 'close' | 'none';
}

/**
 * Roles permitted to approve or reject a verification. Kept separate from
 * `roles.js` navigation permissions because sign-off authority is narrower
 * than page access.
 */
export const APPROVER_ROLES: readonly string[] = [
  'supervisor',
  'maintenance_engineer',
  'maintenance_head',
  'owner',
] as const;

export function canApproveVerification(
  actor: VerificationActor,
  verification: TicketVerification | null,
  policy: VerificationPolicy = DEFAULT_VERIFICATION_POLICY,
): boolean {
  if (!verification) return false;
  if (verification.status !== 'pending_review') return false;
  if (!APPROVER_ROLES.includes(actor.role)) return false;
  // Segregation of duties — mirrors the database trigger.
  if (
    verification.requires_supervisor &&
    !policy.allow_self_approval &&
    actor.id !== null &&
    actor.id === verification.submitted_by
  ) {
    return false;
  }
  return true;
}

/** The default evidence checklist raised with every new verification. */
export function defaultChecklist(): VerificationChecklistItem[] {
  return [
    { key: 'fault_cleared', label_key: 'verification.check.fault_cleared', checked: false, required: true },
    { key: 'machine_running', label_key: 'verification.check.machine_running', checked: false, required: true },
    { key: 'area_safe', label_key: 'verification.check.area_safe', checked: false, required: true },
    { key: 'guards_refitted', label_key: 'verification.check.guards_refitted', checked: false, required: false },
    { key: 'parts_recorded', label_key: 'verification.check.parts_recorded', checked: false, required: false },
  ];
}

/**
 * Pure, testable readiness check run before the record is sent to Supabase.
 * Returns the i18n keys of every unmet requirement.
 */
export function validateForSubmission(
  draft: VerificationDraft,
  policy: VerificationPolicy = DEFAULT_VERIFICATION_POLICY,
): string[] {
  const problems: string[] = [];

  const unchecked = draft.checklist.filter((item) => item.required && !item.checked);
  if (unchecked.length > 0) problems.push('verification.error.checklist_incomplete');

  const minEvidence = Math.max(policy.min_evidence_count, 1);
  if (policy.require_photo_evidence && draft.evidence.length < minEvidence) {
    problems.push('verification.error.evidence_required');
  }

  if (policy.require_signature && !draft.signature_url) {
    problems.push('verification.error.signature_required');
  }

  if (draft.technician_notes.trim().length < 10) {
    problems.push('verification.error.notes_too_short');
  }

  return problems;
}

/**
 * Client-side mirror of `enforce_verification_before_closure`. The database is
 * still the authority; this exists so the UI can disable the Close button and
 * explain itself rather than surfacing a raw Postgres error.
 */
export function evaluateClosureGate(
  verification: TicketVerification | null,
  policy: VerificationPolicy = DEFAULT_VERIFICATION_POLICY,
): ClosureGateResult {
  if (!policy.enforce_verification_on_close) {
    return { allowed: true, reason_key: null, next_action: 'close' };
  }
  if (verification === null) {
    return {
      allowed: false,
      reason_key: 'verification.gate.not_started',
      next_action: 'submit_verification',
    };
  }
  switch (verification.status) {
    case 'approved':
      return { allowed: true, reason_key: null, next_action: 'close' };
    case 'pending_review':
      return {
        allowed: false,
        reason_key: 'verification.gate.awaiting_review',
        next_action: 'await_review',
      };
    case 'rejected':
    case 'changes_requested':
      return {
        allowed: false,
        reason_key: 'verification.gate.rejected',
        next_action: 'resubmit',
      };
    case 'draft':
      return {
        allowed: false,
        reason_key: 'verification.gate.draft',
        next_action: 'submit_verification',
      };
    case 'cancelled':
    default:
      return {
        allowed: false,
        reason_key: 'verification.gate.not_started',
        next_action: 'submit_verification',
      };
  }
}
