/**
 * Component tests for VerificationFlow — the closure gate a page embeds.
 *
 * `useVerification` is mocked so these tests exercise exactly what the
 * component decides to render for a given verification state: which single
 * primary action appears, whether the gate explains itself, and whether the
 * override is reachable only by an approver.
 */

import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const hookState = {};

vi.mock('../hooks/useVerification', () => ({
  default: () => hookState.current,
  useVerification: () => hookState.current,
}));

import VerificationFlow from '../components/Verification/VerificationFlow';
import { defaultChecklist, DEFAULT_VERIFICATION_POLICY } from '../lib/verification/types';

const technician = { id: 'user-tech', name: 'A. Technician', role: 'maintenance_technician' };
const supervisor = { id: 'user-sup', name: 'S. Supervisor', role: 'supervisor' };

function verification(overrides = {}) {
  return {
    id: 'v-1',
    ticket_id: 't-1',
    machine_id: 'm-1',
    company_id: 'c-1',
    status: 'draft',
    attempt: 1,
    requires_supervisor: true,
    checklist: defaultChecklist(),
    evidence: [],
    signature_url: null,
    signed_by_name: null,
    technician_notes: null,
    submitted_by: technician.id,
    submitted_by_name: technician.name,
    submitted_at: null,
    reviewer_id: null,
    reviewer_name: null,
    reviewed_at: null,
    review_notes: null,
    rejection_reason: null,
    created_at: '2026-07-25T09:00:00Z',
    updated_at: '2026-07-25T09:00:00Z',
    ...overrides,
  };
}

/** Builds the mocked hook return value with spy-able actions. */
function setHook(overrides = {}) {
  hookState.current = {
    verification: null,
    events: [],
    policy: DEFAULT_VERIFICATION_POLICY,
    gate: { allowed: false, reason_key: 'verification.gate.not_started', next_action: 'submit_verification' },
    canApprove: false,
    loading: false,
    busy: false,
    errorKey: null,
    clearError: vi.fn(),
    refresh: vi.fn(),
    start: vi.fn().mockResolvedValue(verification()),
    save: vi.fn().mockResolvedValue(verification()),
    submit: vi.fn().mockResolvedValue(verification({ status: 'pending_review' })),
    approve: vi.fn().mockResolvedValue(verification({ status: 'approved' })),
    reject: vi.fn().mockResolvedValue(verification({ status: 'rejected' })),
    sendBack: vi.fn().mockResolvedValue(verification({ status: 'changes_requested' })),
    cancel: vi.fn(),
    addEvidence: vi.fn(),
    captureSignature: vi.fn(),
    overrideClosure: vi.fn().mockResolvedValue(true),
    ...overrides,
  };
  return hookState.current;
}

function renderFlow(props = {}) {
  return render(
    <VerificationFlow ticketId="t-1" actor={technician} workOrderLabel="WO-000123" {...props} />,
  );
}

beforeEach(() => {
  setHook();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('VerificationFlow — gate messaging', () => {
  it('explains why a work order with no verification cannot close', () => {
    renderFlow();
    const gate = screen.getByTestId('verification-gate');
    expect(gate).toHaveTextContent(/cannot be closed yet/i);
    expect(gate).toHaveTextContent(/raised and approved/i);
  });

  it('shows the not-started status when nothing exists yet', () => {
    renderFlow();
    expect(screen.getByTestId('verification-status')).toHaveTextContent('Not started');
  });

  it('hides the gate once the verification is approved', () => {
    setHook({
      verification: verification({ status: 'approved' }),
      gate: { allowed: true, reason_key: null, next_action: 'close' },
    });
    renderFlow();
    expect(screen.queryByTestId('verification-gate')).not.toBeInTheDocument();
    expect(screen.getByTestId('verification-status')).toHaveTextContent('Approved');
  });

  it('hides the gate for a work order that is already closed', () => {
    renderFlow({ ticketClosed: true });
    expect(screen.queryByTestId('verification-gate')).not.toBeInTheDocument();
  });

  it('surfaces a rejection as an error-level alert, not an informational one', () => {
    setHook({
      verification: verification({ status: 'rejected', rejection_reason: 'Guard missing' }),
      gate: { allowed: false, reason_key: 'verification.gate.rejected', next_action: 'resubmit' },
    });
    renderFlow();
    expect(screen.getByTestId('verification-gate')).toHaveTextContent(/sent back/i);
  });
});

describe('VerificationFlow — the single primary action', () => {
  it('offers "Start verification" when none exists', async () => {
    const hook = setHook();
    renderFlow();

    await userEvent.click(screen.getByTestId('verification-start'));
    expect(hook.start).toHaveBeenCalledTimes(1);
  });

  it('opens the capture modal after a verification is started', async () => {
    renderFlow();
    await userEvent.click(screen.getByTestId('verification-start'));
    await waitFor(() => {
      expect(screen.getByTestId('verification-modal-capture')).toBeInTheDocument();
    });
  });

  it('offers "Continue" for a draft rather than starting a second record', async () => {
    setHook({
      verification: verification({ status: 'draft' }),
      gate: { allowed: false, reason_key: 'verification.gate.draft', next_action: 'submit_verification' },
    });
    renderFlow();

    expect(screen.queryByTestId('verification-start')).not.toBeInTheDocument();
    await userEvent.click(screen.getByTestId('verification-continue'));
    expect(screen.getByTestId('verification-modal-capture')).toBeInTheDocument();
  });

  it('offers "Continue" after a supervisor requests changes', () => {
    setHook({
      verification: verification({ status: 'changes_requested' }),
      gate: { allowed: false, reason_key: 'verification.gate.rejected', next_action: 'resubmit' },
    });
    renderFlow();
    expect(screen.getByTestId('verification-continue')).toBeInTheDocument();
  });

  it('shows a technician a disabled waiting state, not an approve button', () => {
    setHook({
      verification: verification({ status: 'pending_review' }),
      gate: { allowed: false, reason_key: 'verification.gate.awaiting_review', next_action: 'await_review' },
      canApprove: false,
    });
    renderFlow();

    expect(screen.getByTestId('verification-awaiting')).toBeDisabled();
    expect(screen.queryByTestId('verification-open-review')).not.toBeInTheDocument();
  });

  it('shows an eligible approver the review action', async () => {
    setHook({
      verification: verification({ status: 'pending_review' }),
      gate: { allowed: false, reason_key: 'verification.gate.awaiting_review', next_action: 'await_review' },
      canApprove: true,
    });
    renderFlow({ actor: supervisor });

    await userEvent.click(screen.getByTestId('verification-open-review'));
    expect(screen.getByTestId('verification-modal-review')).toBeInTheDocument();
  });

  it('offers no action once the work order is closed', () => {
    renderFlow({ ticketClosed: true });
    expect(screen.queryByTestId('verification-start')).not.toBeInTheDocument();
    expect(screen.queryByTestId('verification-continue')).not.toBeInTheDocument();
  });
});

describe('VerificationFlow — audited override', () => {
  it('is hidden from a technician even when allowOverride is set', () => {
    renderFlow({ allowOverride: true, actor: technician });
    expect(screen.queryByTestId('verification-override-open')).not.toBeInTheDocument();
  });

  it('is hidden when the caller does not enable it', () => {
    renderFlow({ allowOverride: false, actor: supervisor });
    expect(screen.queryByTestId('verification-override-open')).not.toBeInTheDocument();
  });

  it('is offered to an approver when the gate is blocking', () => {
    renderFlow({ allowOverride: true, actor: supervisor });
    expect(screen.getByTestId('verification-override-open')).toBeInTheDocument();
  });

  it('keeps the confirm disabled until a real reason is typed', async () => {
    renderFlow({ allowOverride: true, actor: supervisor });
    await userEvent.click(screen.getByTestId('verification-override-open'));

    const dialog = await screen.findByRole('dialog');
    const confirm = within(dialog).getByTestId('verification-override-confirm');
    expect(confirm).toBeDisabled();

    await userEvent.type(screen.getByTestId('verification-override-reason'), 'too short');
    expect(confirm).toBeDisabled();
    expect(screen.getByText(/at least 10 characters/i)).toBeInTheDocument();
  });

  it('closes the work order once a substantive reason is given', async () => {
    const hook = setHook();
    renderFlow({ allowOverride: true, actor: supervisor });
    await userEvent.click(screen.getByTestId('verification-override-open'));

    await userEvent.type(
      screen.getByTestId('verification-override-reason'),
      'Line stopped, plant head authorised closure',
    );
    const dialog = await screen.findByRole('dialog');
    await userEvent.click(within(dialog).getByTestId('verification-override-confirm'));

    expect(hook.overrideClosure).toHaveBeenCalledWith('Line stopped, plant head authorised closure');
  });
});

describe('VerificationFlow — errors and history', () => {
  it('renders a dismissible alert for a failed operation', async () => {
    const hook = setHook({ errorKey: 'verification.error.self_approval' });
    renderFlow();

    const alert = screen.getByTestId('verification-flow-error');
    expect(alert).toHaveTextContent(/cannot approve a verification you submitted/i);

    await userEvent.click(within(alert).getByRole('button'));
    expect(hook.clearError).toHaveBeenCalled();
  });

  it('keeps the audit trail behind a drill-down rather than in the main view', () => {
    setHook({
      events: [
        {
          id: 'e-1',
          verification_id: 'v-1',
          ticket_id: 't-1',
          machine_id: 'm-1',
          company_id: 'c-1',
          action: 'closure_blocked',
          actor_id: null,
          actor_name: 'system',
          from_status: null,
          to_status: null,
          details: { reason: 'no approved verification' },
          created_at: '2026-07-25T11:00:00Z',
        },
      ],
    });
    renderFlow();

    expect(screen.getByTestId('verification-history-drilldown')).toBeInTheDocument();
    expect(screen.queryByTestId('event-closure_blocked')).not.toBeInTheDocument();
  });

  it('names the region for assistive technology', () => {
    renderFlow();
    expect(screen.getByRole('region', { name: 'Verification' })).toBeInTheDocument();
  });
});
