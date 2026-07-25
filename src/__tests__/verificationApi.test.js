/**
 * Unit tests for the verification API layer.
 *
 * Supabase is mocked with a chainable stub so we can assert on the exact
 * payload sent to PostgREST and on how trigger exceptions are translated into
 * stable, translatable error codes.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const state = {
  responses: [],
  calls: [],
  storage: {},
};

/** A thenable query builder: every chained method records the call. */
function makeQuery(table) {
  const record = { table, ops: [] };
  state.calls.push(record);

  const nextResponse = () =>
    state.responses.length > 0 ? state.responses.shift() : { data: [], error: null };

  const builder = {
    _record: record,
    then(resolve, reject) {
      return Promise.resolve(nextResponse()).then(resolve, reject);
    },
  };

  ['select', 'eq', 'in', 'order', 'limit', 'insert', 'update', 'maybeSingle', 'single'].forEach(
    (method) => {
      builder[method] = (...args) => {
        record.ops.push([method, ...args]);
        if (method === 'maybeSingle' || method === 'single') {
          return Promise.resolve(nextResponse());
        }
        return builder;
      };
    },
  );

  return builder;
}

vi.mock('../supabaseClient', () => ({
  supabase: {
    from: (table) => makeQuery(table),
    storage: {
      from: () => ({
        upload: (...args) => {
          state.storage.upload = args;
          return Promise.resolve(state.storage.uploadResult ?? { data: { path: args[0] }, error: null });
        },
        createSignedUrl: (path) =>
          Promise.resolve(
            state.storage.signedResult ?? {
              data: { signedUrl: `https://signed.test/${path}` },
              error: null,
            },
          ),
        getPublicUrl: (path) => ({ data: { publicUrl: `https://public.test/${path}` } }),
        remove: (paths) => {
          state.storage.removed = paths;
          return Promise.resolve({ data: null, error: null });
        },
      }),
    },
  },
}));

const api = await import('../lib/verification/verificationApi');

/** Queue the responses the next Supabase calls should resolve with. */
function queue(...responses) {
  state.responses.push(...responses);
}

const row = (overrides = {}) => ({
  id: 'v-1',
  ticket_id: 't-1',
  machine_id: 'm-1',
  company_id: 'c-1',
  status: 'draft',
  attempt: 1,
  requires_supervisor: true,
  checklist: [],
  evidence: [],
  created_at: '2026-07-25T09:00:00Z',
  updated_at: '2026-07-25T09:00:00Z',
  ...overrides,
});

const actor = { id: 'user-1', name: 'A. Technician', role: 'maintenance_technician' };

beforeEach(() => {
  state.responses = [];
  state.calls = [];
  state.storage = {};
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('normaliseVerification', () => {
  it('fills every nullable field so components never see undefined', () => {
    const result = api.normaliseVerification(row());
    expect(result.signature_url).toBeNull();
    expect(result.reviewer_name).toBeNull();
    expect(result.checklist).toEqual([]);
    expect(result.evidence).toEqual([]);
  });

  it('coerces a non-array jsonb payload into an empty array', () => {
    const result = api.normaliseVerification(row({ checklist: null, evidence: 'oops' }));
    expect(result.checklist).toEqual([]);
    expect(result.evidence).toEqual([]);
  });

  it('defaults requires_supervisor to true for legacy rows', () => {
    expect(api.normaliseVerification(row({ requires_supervisor: undefined })).requires_supervisor).toBe(
      true,
    );
    expect(api.normaliseVerification(row({ requires_supervisor: false })).requires_supervisor).toBe(
      false,
    );
  });

  it('treats an empty string as null', () => {
    expect(api.normaliseVerification(row({ reviewer_name: '' })).reviewer_name).toBeNull();
  });
});

describe('normaliseEvent', () => {
  it('defaults an unknown action to "updated" and details to an object', () => {
    const event = api.normaliseEvent({ id: 'e-1', action: null, details: null });
    expect(event.action).toBe('updated');
    expect(event.details).toEqual({});
  });
});

describe('getVerificationPolicy', () => {
  it('returns the safe defaults when the company has no settings row', async () => {
    queue({ data: null, error: null });
    const policy = await api.getVerificationPolicy('c-1');
    expect(policy.enforce_verification_on_close).toBe(true);
    expect(policy.min_evidence_count).toBe(1);
    expect(policy.allow_self_approval).toBe(false);
  });

  it('returns the defaults without querying when there is no company', async () => {
    const policy = await api.getVerificationPolicy(null);
    expect(policy.enforce_verification_on_close).toBe(true);
    expect(state.calls).toHaveLength(0);
  });

  it('reads the company overrides', async () => {
    queue({
      data: {
        enforce_verification_on_close: false,
        require_photo_evidence: false,
        require_signature: true,
        min_evidence_count: 4,
        allow_self_approval: true,
      },
      error: null,
    });
    const policy = await api.getVerificationPolicy('c-1');
    expect(policy).toEqual({
      enforce_verification_on_close: false,
      require_photo_evidence: false,
      require_signature: true,
      min_evidence_count: 4,
      allow_self_approval: true,
    });
  });

  it('falls back to the defaults when the settings query errors', async () => {
    queue({ data: null, error: { message: 'boom' } });
    const policy = await api.getVerificationPolicy('c-1');
    expect(policy.enforce_verification_on_close).toBe(true);
  });
});

describe('getActiveVerification', () => {
  it('returns null when nothing is live', async () => {
    queue({ data: [], error: null });
    expect(await api.getActiveVerification('t-1')).toBeNull();
  });

  it('filters to the three active statuses', async () => {
    queue({ data: [row({ status: 'pending_review' })], error: null });
    const result = await api.getActiveVerification('t-1');
    expect(result?.status).toBe('pending_review');

    const inOp = state.calls[0].ops.find(([method]) => method === 'in');
    expect(inOp[2]).toEqual(['draft', 'pending_review', 'changes_requested']);
  });
});

describe('getGoverningVerification', () => {
  it('prefers a live record over a historical decision', async () => {
    queue({
      data: [row({ id: 'v-2', status: 'changes_requested' }), row({ id: 'v-1', status: 'rejected' })],
      error: null,
    });
    const result = await api.getGoverningVerification('t-1');
    expect(result?.id).toBe('v-2');
  });

  it('falls back to the approved record when nothing is live', async () => {
    queue({
      data: [row({ id: 'v-3', status: 'cancelled' }), row({ id: 'v-2', status: 'approved' })],
      error: null,
    });
    const result = await api.getGoverningVerification('t-1');
    expect(result?.id).toBe('v-2');
  });

  it('returns null for a ticket with no verifications', async () => {
    queue({ data: [], error: null });
    expect(await api.getGoverningVerification('t-1')).toBeNull();
  });
});

describe('createVerification', () => {
  it('is idempotent — returns the live record instead of creating a second', async () => {
    queue({ data: [row({ id: 'existing', status: 'draft' })], error: null });
    const result = await api.createVerification('t-1', actor);
    expect(result.id).toBe('existing');
    expect(state.calls.some((call) => call.ops.some(([method]) => method === 'insert'))).toBe(false);
  });

  it('numbers the attempt from the ticket history', async () => {
    queue(
      { data: [], error: null }, // no active
      { data: [row({ status: 'rejected' }), row({ status: 'cancelled' })], error: null }, // history
      { data: row({ attempt: 3 }), error: null }, // insert -> single
    );
    await api.createVerification('t-1', actor);

    const insertCall = state.calls.find((call) =>
      call.ops.some(([method]) => method === 'insert'),
    );
    const payload = insertCall.ops.find(([method]) => method === 'insert')[1];
    expect(payload.attempt).toBe(3);
    expect(payload.status).toBe('draft');
    expect(payload.submitted_by_name).toBe('A. Technician');
    expect(payload.checklist.length).toBeGreaterThan(0);
  });
});

describe('submitVerification', () => {
  const goodDraft = {
    checklist: [{ key: 'a', label_key: 'verification.check.fault_cleared', checked: true, required: true }],
    evidence: [
      { id: 'e1', path: 'p', url: 'u', caption: '', kind: 'photo', uploaded_at: '2026-07-25T10:00:00Z' },
    ],
    technician_notes: 'Replaced the seal and ran the machine for ten minutes.',
    signature_url: null,
    signed_by_name: 'A. Technician',
  };

  it('refuses to call the database when the draft is incomplete', async () => {
    await expect(
      api.submitVerification('v-1', { ...goodDraft, evidence: [] }, actor),
    ).rejects.toMatchObject({
      code: 'VERIFICATION_INCOMPLETE',
      messageKey: 'verification.error.evidence_required',
    });
    expect(state.calls).toHaveLength(0);
  });

  it('sends the record to pending_review with the submitter recorded', async () => {
    queue({ data: row({ status: 'pending_review' }), error: null });
    const result = await api.submitVerification('v-1', goodDraft, actor);
    expect(result.status).toBe('pending_review');

    const payload = state.calls[0].ops.find(([method]) => method === 'update')[1];
    expect(payload.status).toBe('pending_review');
    expect(payload.submitted_by).toBe('user-1');
    expect(payload.submitted_at).toBeTruthy();
  });
});

describe('decisions', () => {
  const reviewer = { id: 'user-2', name: 'S. Supervisor', role: 'supervisor' };

  it('clears the rejection reason when approving', async () => {
    queue({ data: row({ status: 'approved' }), error: null });
    await api.approveVerification('v-1', { reviewer, review_notes: 'Looks good' });

    const payload = state.calls[0].ops.find(([method]) => method === 'update')[1];
    expect(payload.status).toBe('approved');
    expect(payload.rejection_reason).toBeNull();
    expect(payload.reviewer_name).toBe('S. Supervisor');
  });

  it('requires a reason before rejecting', async () => {
    await expect(
      api.rejectVerification('v-1', { reviewer, review_notes: '   ' }),
    ).rejects.toMatchObject({ code: 'VERIFICATION_REASON_REQUIRED' });
    expect(state.calls).toHaveLength(0);
  });

  it('falls back to the review notes as the rejection reason', async () => {
    queue({ data: row({ status: 'rejected' }), error: null });
    await api.rejectVerification('v-1', { reviewer, review_notes: 'Photo shows the guard is off' });

    const payload = state.calls[0].ops.find(([method]) => method === 'update')[1];
    expect(payload.rejection_reason).toBe('Photo shows the guard is off');
  });

  it('sends changes_requested without closing the ticket', async () => {
    queue({ data: row({ status: 'changes_requested' }), error: null });
    const result = await api.requestChanges('v-1', { reviewer, review_notes: 'Need a wider shot' });
    expect(result.status).toBe('changes_requested');
  });
});

describe('closeTicketWithOverride', () => {
  it('demands a substantive reason', async () => {
    await expect(api.closeTicketWithOverride('t-1', 'urgent', actor)).rejects.toMatchObject({
      messageKey: 'verification.error.override_reason_too_short',
    });
    expect(state.calls).toHaveLength(0);
  });

  it('writes the override reason so the trigger can audit it', async () => {
    queue({ data: null, error: null });
    await api.closeTicketWithOverride('t-1', 'Line stopped, plant head authorised closure', actor);

    const payload = state.calls[0].ops.find(([method]) => method === 'update')[1];
    expect(state.calls[0].table).toBe('tickets');
    expect(payload.closure_override_reason).toBe('Line stopped, plant head authorised closure');
    expect(payload.closure_override_by).toBe('A. Technician');
    expect(payload.lifecycle_stage).toBe('closed');
  });
});

describe('trigger error translation', () => {
  it.each([
    ['VERIFICATION_REQUIRED: work order WO-1 cannot be closed', 'verification.error.approval_required'],
    ['VERIFICATION_SELF_APPROVAL_BLOCKED: nope', 'verification.error.self_approval'],
    ['VERIFICATION_EVIDENCE_REQUIRED: at least 1', 'verification.error.evidence_required'],
    ['VERIFICATION_SIGNATURE_REQUIRED: sign it', 'verification.error.signature_required'],
    ['VERIFICATION_INVALID_TRANSITION: no', 'verification.error.invalid_transition'],
    ['duplicate key value violates unique constraint "ticket_verifications_one_active_idx"', 'verification.error.already_active'],
    ['new row violates row-level security policy', 'verification.error.forbidden'],
    ['connection reset by peer', 'verification.error.generic'],
  ])('maps %s to a translatable key', async (message, expectedKey) => {
    queue({ data: null, error: { message } });
    await expect(api.listVerifications('t-1')).rejects.toMatchObject({ messageKey: expectedKey });
  });

  it('preserves the original error for debugging', async () => {
    const original = { message: 'VERIFICATION_REQUIRED: blocked' };
    queue({ data: null, error: original });
    await api.listVerifications('t-1').catch((error) => {
      expect(error.cause).toBe(original);
      expect(error.name).toBe('VerificationError');
    });
  });
});

describe('uploadEvidence', () => {
  const file = (overrides = {}) => ({
    name: 'repair.jpg',
    size: 1024,
    type: 'image/jpeg',
    ...overrides,
  });

  it('rejects a file over the 10 MB limit before touching storage', async () => {
    await expect(
      api.uploadEvidence('t-1', file({ size: 11 * 1024 * 1024 })),
    ).rejects.toMatchObject({ messageKey: 'verification.error.file_too_large' });
    expect(state.storage.upload).toBeUndefined();
  });

  it('rejects an unsupported content type', async () => {
    await expect(
      api.uploadEvidence('t-1', file({ type: 'video/mp4', name: 'clip.mp4' })),
    ).rejects.toMatchObject({ messageKey: 'verification.error.file_type' });
  });

  it('stores the file under the ticket and returns a signed URL', async () => {
    const result = await api.uploadEvidence('t-1', file(), 'After repair');
    expect(state.storage.upload[0]).toMatch(/^t-1\//);
    expect(result.kind).toBe('photo');
    expect(result.caption).toBe('After repair');
    expect(result.file_name).toBe('repair.jpg');
    expect(result.url).toContain('signed.test');
  });

  it('classifies a PDF as a document', async () => {
    const result = await api.uploadEvidence('t-1', file({ type: 'application/pdf', name: 'report.pdf' }));
    expect(result.kind).toBe('document');
  });

  it('falls back to the public URL when signing fails', async () => {
    state.storage.signedResult = { data: null, error: { message: 'no signer' } };
    const result = await api.uploadEvidence('t-1', file());
    expect(result.url).toContain('public.test');
  });

  it('translates a storage failure', async () => {
    state.storage.uploadResult = { data: null, error: { message: 'row-level security' } };
    await expect(api.uploadEvidence('t-1', file())).rejects.toMatchObject({
      messageKey: 'verification.error.forbidden',
    });
  });
});

describe('uploadSignature', () => {
  it('rejects anything that is not a base64 image data URL', async () => {
    await expect(api.uploadSignature('t-1', 'https://example.test/sig.png')).rejects.toMatchObject({
      messageKey: 'verification.error.signature_invalid',
    });
  });

  it('uploads a decoded PNG and returns its URL', async () => {
    const dataUrl = `data:image/png;base64,${btoa('fake-png-bytes')}`;
    const url = await api.uploadSignature('t-1', dataUrl);
    expect(state.storage.upload[0]).toMatch(/^t-1\/signature-/);
    expect(url).toContain('signed.test');
  });
});
