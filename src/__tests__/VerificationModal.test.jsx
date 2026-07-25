/**
 * Component tests for VerificationModal — the capture wizard and review pane.
 *
 * The wizard's job is to make an incomplete submission impossible: these tests
 * pin the submit button's enablement to the same rules the SQL trigger
 * enforces, and check that the review pane refuses a silent rejection.
 */

import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import VerificationModal from '../components/Verification/VerificationModal';
import { DEFAULT_VERIFICATION_POLICY, defaultChecklist } from '../lib/verification/types';

const technician = { id: 'user-tech', name: 'A. Technician', role: 'maintenance_technician' };
const supervisor = { id: 'user-sup', name: 'S. Supervisor', role: 'supervisor' };

const photo = (id = 'e-1') => ({
  id,
  path: `t-1/${id}.jpg`,
  url: `https://example.test/${id}.jpg`,
  caption: 'After repair',
  kind: 'photo',
  uploaded_at: '2026-07-25T10:00:00Z',
  file_name: `${id}.jpg`,
});

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

let handlers;

function renderModal(props = {}) {
  return render(
    <VerificationModal
      open
      mode="capture"
      verification={verification()}
      policy={DEFAULT_VERIFICATION_POLICY}
      actor={technician}
      workOrderLabel="WO-000123"
      {...handlers}
      {...props}
    />,
  );
}

/** Walks the wizard to the final review step. */
async function goToReviewStep() {
  await userEvent.click(screen.getByTestId('verification-next')); // evidence
  await userEvent.click(screen.getByTestId('verification-next')); // signature
  await userEvent.click(screen.getByTestId('verification-next')); // review
}

beforeEach(() => {
  handlers = {
    onClose: vi.fn(),
    onSaveDraft: vi.fn().mockResolvedValue(undefined),
    onSubmit: vi.fn().mockResolvedValue(undefined),
    onApprove: vi.fn().mockResolvedValue(undefined),
    onReject: vi.fn().mockResolvedValue(undefined),
    onRequestChanges: vi.fn().mockResolvedValue(undefined),
    onUploadEvidence: vi.fn().mockResolvedValue(photo()),
    onCaptureSignature: vi.fn().mockResolvedValue('https://example.test/sig.png'),
  };
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('VerificationModal — capture wizard', () => {
  it('opens on the checklist step with the mandatory items marked', () => {
    renderModal();
    expect(screen.getByTestId('check-fault_cleared')).toBeInTheDocument();
    expect(screen.getByTestId('verification-notes')).toBeInTheDocument();
  });

  it('shows the work order in the dialog title', () => {
    renderModal();
    expect(screen.getByText(/WO-000123/)).toBeInTheDocument();
  });

  it('blocks submission of an empty verification and lists every problem', async () => {
    renderModal();
    await goToReviewStep();

    expect(screen.getByTestId('verification-submit')).toBeDisabled();
    const problems = screen.getByTestId('verification-problems');
    expect(problems).toHaveTextContent(/Complete all required checks/i);
    expect(problems).toHaveTextContent(/at least one photo/i);
    expect(problems).toHaveTextContent(/at least 10 characters/i);
  });

  it('enables submission once checks, notes and evidence are present', async () => {
    renderModal({ verification: verification({ evidence: [photo()] }) });

    await userEvent.click(screen.getByTestId('check-fault_cleared'));
    await userEvent.click(screen.getByTestId('check-machine_running'));
    await userEvent.click(screen.getByTestId('check-area_safe'));
    await userEvent.type(
      screen.getByTestId('verification-notes'),
      'Replaced the hydraulic seal and ran the machine.',
    );
    await goToReviewStep();

    const submit = screen.getByTestId('verification-submit');
    await waitFor(() => expect(submit).toBeEnabled());

    await userEvent.click(submit);
    expect(handlers.onSubmit).toHaveBeenCalledTimes(1);

    const draft = handlers.onSubmit.mock.calls[0][0];
    expect(draft.evidence).toHaveLength(1);
    expect(draft.checklist.filter((item) => item.checked)).toHaveLength(3);
  });

  it('stays blocked when an optional check is ticked but a mandatory one is not', async () => {
    renderModal({ verification: verification({ evidence: [photo()] }) });

    await userEvent.click(screen.getByTestId('check-guards_refitted'));
    await userEvent.type(screen.getByTestId('verification-notes'), 'Long enough notes here.');
    await goToReviewStep();

    expect(screen.getByTestId('verification-submit')).toBeDisabled();
  });

  it('saves a draft without requiring a complete record', async () => {
    renderModal();
    await userEvent.click(screen.getByTestId('verification-save-draft'));
    expect(handlers.onSaveDraft).toHaveBeenCalledTimes(1);
    expect(handlers.onSubmit).not.toHaveBeenCalled();
  });

  it('summarises progress on the review step', async () => {
    renderModal({ verification: verification({ evidence: [photo(), photo('e-2')] }) });
    await userEvent.click(screen.getByTestId('check-fault_cleared'));
    await goToReviewStep();

    const summary = screen.getByTestId('verification-summary');
    expect(summary).toHaveTextContent('1/5');
    expect(summary).toHaveTextContent('2 attached');
  });

  it('lets the technician step back to fix something', async () => {
    renderModal();
    await userEvent.click(screen.getByTestId('verification-next'));
    expect(screen.getByTestId('evidence-uploader')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Back' }));
    expect(screen.getByTestId('verification-notes')).toBeInTheDocument();
  });

  it('warns on the evidence step while the photo requirement is unmet', async () => {
    renderModal();
    await userEvent.click(screen.getByTestId('verification-next'));
    expect(screen.getByTestId('evidence-shortfall')).toBeInTheDocument();
    expect(screen.getByTestId('evidence-empty')).toBeInTheDocument();
  });

  it('drops the evidence warning once a photo is attached', async () => {
    renderModal({ verification: verification({ evidence: [photo()] }) });
    await userEvent.click(screen.getByTestId('verification-next'));
    expect(screen.queryByTestId('evidence-shortfall')).not.toBeInTheDocument();
    expect(screen.getByTestId('evidence-list')).toBeInTheDocument();
  });

  it('uploads a chosen file and adds it to the draft', async () => {
    renderModal();
    await userEvent.click(screen.getByTestId('verification-next'));

    const file = new File(['bytes'], 'repair.jpg', { type: 'image/jpeg' });
    await userEvent.upload(screen.getByTestId('evidence-input'), file);

    await waitFor(() => expect(handlers.onUploadEvidence).toHaveBeenCalledTimes(1));
    expect(handlers.onUploadEvidence.mock.calls[0][0].name).toBe('repair.jpg');
    await waitFor(() => expect(screen.getByTestId('evidence-list')).toBeInTheDocument());
  });

  it('offers a keyboard-operable alternative to drawing a signature', async () => {
    renderModal();
    await userEvent.click(screen.getByTestId('verification-next'));
    await userEvent.click(screen.getByTestId('verification-next'));

    expect(screen.getByTestId('signature-pad')).toBeInTheDocument();
    expect(screen.getByTestId('signature-canvas')).toHaveAttribute('role', 'img');
    expect(screen.getByTestId('signature-mode')).toBeInTheDocument();
    expect(screen.getByTestId('signature-name')).toBeInTheDocument();
  });

  it('surfaces a server-side failure inside the dialog', () => {
    renderModal({ errorKey: 'verification.error.already_active' });
    expect(screen.getByTestId('verification-error')).toHaveTextContent(
      /verification is already open/i,
    );
  });

  it('disables the controls while a mutation is in flight', () => {
    renderModal({ busy: true });
    expect(screen.getByTestId('verification-save-draft')).toBeDisabled();
    expect(screen.getByTestId('verification-cancel')).toBeDisabled();
  });
});

describe('VerificationModal — review pane', () => {
  const submitted = verification({
    status: 'pending_review',
    evidence: [photo()],
    technician_notes: 'Replaced the seal, ran the machine for ten minutes.',
    submitted_at: '2026-07-25T10:00:00Z',
    signature_url: 'https://example.test/sig.png',
    signed_by_name: 'A. Technician',
    checklist: defaultChecklist().map((item) => ({ ...item, checked: true })),
  });

  const renderReview = (props = {}) =>
    renderModal({ mode: 'review', verification: submitted, actor: supervisor, ...props });

  it('shows the technician the evidence that was submitted', () => {
    renderReview();
    expect(screen.getByTestId('review-evidence')).toBeInTheDocument();
    expect(screen.getByText(/Replaced the seal/)).toBeInTheDocument();
  });

  it('renders the signature with a meaningful alt text', () => {
    renderReview();
    expect(screen.getByAltText(/Signature — A\. Technician/)).toBeInTheDocument();
  });

  it('lets a supervisor approve without typing anything', async () => {
    renderReview();
    await userEvent.click(screen.getByTestId('verification-approve'));
    expect(handlers.onApprove).toHaveBeenCalledTimes(1);
    expect(handlers.onApprove.mock.calls[0][0].reviewer).toEqual(supervisor);
  });

  it('refuses a rejection with no reason', () => {
    renderReview();
    expect(screen.getByTestId('verification-reject')).toBeDisabled();
    expect(screen.getByTestId('verification-request-changes')).toBeDisabled();
  });

  it('enables rejection once a reason is typed and passes it through', async () => {
    renderReview();
    await userEvent.type(
      screen.getByTestId('verification-review-notes'),
      'Photo shows the guard is still off',
    );

    const reject = screen.getByTestId('verification-reject');
    await waitFor(() => expect(reject).toBeEnabled());
    await userEvent.click(reject);

    expect(handlers.onReject.mock.calls[0][0].rejection_reason).toBe(
      'Photo shows the guard is still off',
    );
  });

  it('supports sending the work back without a hard rejection', async () => {
    renderReview();
    await userEvent.type(screen.getByTestId('verification-review-notes'), 'Need a wider shot');
    await userEvent.click(screen.getByTestId('verification-request-changes'));
    expect(handlers.onRequestChanges).toHaveBeenCalledTimes(1);
    expect(handlers.onReject).not.toHaveBeenCalled();
  });

  it('does not offer the capture wizard controls in review mode', () => {
    renderReview();
    expect(screen.queryByTestId('verification-steps')).not.toBeInTheDocument();
    expect(screen.queryByTestId('verification-submit')).not.toBeInTheDocument();
  });

  it('reports the current status in the title', () => {
    renderReview();
    expect(screen.getByTestId('verification-modal-status')).toHaveTextContent('Awaiting approval');
  });
});
