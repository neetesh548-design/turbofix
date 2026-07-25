/**
 * Unit tests for the pure verification domain rules.
 *
 * These functions are the client-side mirror of the SQL triggers, so the cases
 * here double as documentation of what the database will and will not allow.
 */

import { describe, expect, it } from 'vitest';
import {
  APPROVER_ROLES,
  DEFAULT_VERIFICATION_POLICY,
  canApproveVerification,
  defaultChecklist,
  evaluateClosureGate,
  validateForSubmission,
  type TicketVerification,
  type VerificationActor,
  type VerificationDraft,
  type VerificationEvidence,
  type VerificationPolicy,
  type VerificationStatus,
} from '../lib/verification/types';

function evidence(count: number): VerificationEvidence[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `ev-${index}`,
    path: `t/ev-${index}.jpg`,
    url: `https://example.test/ev-${index}.jpg`,
    caption: '',
    kind: 'photo' as const,
    uploaded_at: '2026-07-25T10:00:00Z',
  }));
}

function completeDraft(overrides: Partial<VerificationDraft> = {}): VerificationDraft {
  return {
    checklist: defaultChecklist().map((item) => ({ ...item, checked: true })),
    evidence: evidence(1),
    technician_notes: 'Replaced the hydraulic seal and ran the machine for ten minutes.',
    signature_url: 'https://example.test/sig.png',
    signed_by_name: 'A. Technician',
    ...overrides,
  };
}

function verificationOf(
  status: VerificationStatus,
  overrides: Partial<TicketVerification> = {},
): TicketVerification {
  return {
    id: 'v-1',
    ticket_id: 't-1',
    machine_id: 'm-1',
    company_id: 'c-1',
    status,
    attempt: 1,
    requires_supervisor: true,
    checklist: defaultChecklist(),
    evidence: evidence(1),
    signature_url: null,
    signed_by_name: null,
    technician_notes: 'notes',
    submitted_by: 'user-tech',
    submitted_by_name: 'A. Technician',
    submitted_at: '2026-07-25T10:00:00Z',
    reviewer_id: null,
    reviewer_name: null,
    reviewed_at: null,
    review_notes: null,
    rejection_reason: null,
    created_at: '2026-07-25T09:00:00Z',
    updated_at: '2026-07-25T10:00:00Z',
    ...overrides,
  };
}

describe('defaultChecklist', () => {
  it('raises three mandatory safety checks', () => {
    const checklist = defaultChecklist();
    expect(checklist.filter((item) => item.required)).toHaveLength(3);
    expect(checklist.every((item) => item.checked === false)).toBe(true);
  });

  it('uses i18n keys rather than literal English labels', () => {
    expect(defaultChecklist().every((item) => item.label_key.startsWith('verification.check.'))).toBe(
      true,
    );
  });

  it('returns a fresh array so two verifications never share state', () => {
    const first = defaultChecklist();
    first[0].checked = true;
    expect(defaultChecklist()[0].checked).toBe(false);
  });
});

describe('validateForSubmission', () => {
  it('accepts a complete draft', () => {
    expect(validateForSubmission(completeDraft())).toEqual([]);
  });

  it('rejects a draft with an unchecked mandatory item', () => {
    const draft = completeDraft();
    draft.checklist = draft.checklist.map((item) =>
      item.key === 'area_safe' ? { ...item, checked: false } : item,
    );
    expect(validateForSubmission(draft)).toContain('verification.error.checklist_incomplete');
  });

  it('ignores unchecked optional items', () => {
    const draft = completeDraft();
    draft.checklist = draft.checklist.map((item) =>
      item.required ? item : { ...item, checked: false },
    );
    expect(validateForSubmission(draft)).toEqual([]);
  });

  it('requires photo evidence when the policy demands it', () => {
    expect(validateForSubmission(completeDraft({ evidence: [] }))).toContain(
      'verification.error.evidence_required',
    );
  });

  it('honours a raised minimum evidence count', () => {
    const policy: VerificationPolicy = { ...DEFAULT_VERIFICATION_POLICY, min_evidence_count: 3 };
    expect(validateForSubmission(completeDraft({ evidence: evidence(2) }), policy)).toContain(
      'verification.error.evidence_required',
    );
    expect(validateForSubmission(completeDraft({ evidence: evidence(3) }), policy)).toEqual([]);
  });

  it('skips the evidence rule when the company disables photo evidence', () => {
    const policy: VerificationPolicy = {
      ...DEFAULT_VERIFICATION_POLICY,
      require_photo_evidence: false,
    };
    expect(validateForSubmission(completeDraft({ evidence: [] }), policy)).toEqual([]);
  });

  it('requires a signature only when the policy asks for one', () => {
    const draft = completeDraft({ signature_url: null });
    expect(validateForSubmission(draft)).toEqual([]);

    const strict: VerificationPolicy = { ...DEFAULT_VERIFICATION_POLICY, require_signature: true };
    expect(validateForSubmission(draft, strict)).toContain('verification.error.signature_required');
  });

  it('rejects notes that are too short to be an audit record', () => {
    expect(validateForSubmission(completeDraft({ technician_notes: 'ok' }))).toContain(
      'verification.error.notes_too_short',
    );
  });

  it('treats whitespace-only notes as empty', () => {
    expect(validateForSubmission(completeDraft({ technician_notes: '            ' }))).toContain(
      'verification.error.notes_too_short',
    );
  });

  it('reports every problem at once rather than stopping at the first', () => {
    const problems = validateForSubmission({
      checklist: defaultChecklist(),
      evidence: [],
      technician_notes: '',
      signature_url: null,
      signed_by_name: '',
    });
    expect(problems).toHaveLength(3);
  });
});

describe('evaluateClosureGate', () => {
  it('blocks closure when no verification exists', () => {
    const gate = evaluateClosureGate(null);
    expect(gate.allowed).toBe(false);
    expect(gate.next_action).toBe('submit_verification');
    expect(gate.reason_key).toBe('verification.gate.not_started');
  });

  it('allows closure once approved', () => {
    const gate = evaluateClosureGate(verificationOf('approved'));
    expect(gate.allowed).toBe(true);
    expect(gate.reason_key).toBeNull();
    expect(gate.next_action).toBe('close');
  });

  it.each<[VerificationStatus, string]>([
    ['draft', 'submit_verification'],
    ['pending_review', 'await_review'],
    ['rejected', 'resubmit'],
    ['changes_requested', 'resubmit'],
    ['cancelled', 'submit_verification'],
  ])('blocks closure while %s and asks the user to %s', (status, nextAction) => {
    const gate = evaluateClosureGate(verificationOf(status));
    expect(gate.allowed).toBe(false);
    expect(gate.next_action).toBe(nextAction);
    expect(gate.reason_key).not.toBeNull();
  });

  it('lets a company opt out of the gate entirely', () => {
    const policy: VerificationPolicy = {
      ...DEFAULT_VERIFICATION_POLICY,
      enforce_verification_on_close: false,
    };
    expect(evaluateClosureGate(null, policy).allowed).toBe(true);
  });
});

describe('canApproveVerification', () => {
  const supervisor: VerificationActor = { id: 'user-sup', name: 'S. Supervisor', role: 'supervisor' };
  const technician: VerificationActor = {
    id: 'user-tech',
    name: 'A. Technician',
    role: 'maintenance_technician',
  };

  it('lets an approver role sign off work waiting for review', () => {
    expect(canApproveVerification(supervisor, verificationOf('pending_review'))).toBe(true);
  });

  it('refuses a technician regardless of the record', () => {
    expect(canApproveVerification(technician, verificationOf('pending_review'))).toBe(false);
  });

  it('blocks self-approval — the submitter cannot sign off their own work', () => {
    const ownWork = verificationOf('pending_review', { submitted_by: supervisor.id });
    expect(canApproveVerification(supervisor, ownWork)).toBe(false);
  });

  it('permits self-approval when the company explicitly allows it', () => {
    const policy: VerificationPolicy = { ...DEFAULT_VERIFICATION_POLICY, allow_self_approval: true };
    const ownWork = verificationOf('pending_review', { submitted_by: supervisor.id });
    expect(canApproveVerification(supervisor, ownWork, policy)).toBe(true);
  });

  it('permits self-approval when supervisor sign-off is not required', () => {
    const ownWork = verificationOf('pending_review', {
      submitted_by: supervisor.id,
      requires_supervisor: false,
    });
    expect(canApproveVerification(supervisor, ownWork)).toBe(true);
  });

  it('does not treat two anonymous actors as the same person', () => {
    const anonymous: VerificationActor = { id: null, name: 'Kiosk', role: 'supervisor' };
    const anonymousSubmission = verificationOf('pending_review', { submitted_by: null });
    expect(canApproveVerification(anonymous, anonymousSubmission)).toBe(true);
  });

  it('refuses anything that is not awaiting review', () => {
    (['draft', 'approved', 'rejected', 'cancelled'] as VerificationStatus[]).forEach((status) => {
      expect(canApproveVerification(supervisor, verificationOf(status))).toBe(false);
    });
  });

  it('refuses when there is no verification at all', () => {
    expect(canApproveVerification(supervisor, null)).toBe(false);
  });

  it('keeps the approver list aligned with the roles that can sign off', () => {
    expect(APPROVER_ROLES).not.toContain('maintenance_technician');
    expect(APPROVER_ROLES).toContain('supervisor');
  });
});
