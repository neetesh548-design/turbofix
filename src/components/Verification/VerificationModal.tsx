/**
 * VerificationModal — capture and review surface for a verification.
 *
 * Two modes share one modal because they are two halves of the same record:
 *   * mode="capture"  the technician walks a 4-step wizard
 *                     (checks -> evidence -> signature -> review) and submits.
 *   * mode="review"   the supervisor sees exactly what was submitted, read
 *                     only, and approves / requests changes / rejects.
 *
 * Props:
 * - open (boolean)
 * - mode ('capture' | 'review')
 * - verification (TicketVerification | null)
 * - policy (VerificationPolicy): drives which steps are mandatory
 * - actor (VerificationActor): who is operating the modal
 * - busy (boolean): a mutation is in flight
 * - errorKey (string | null): i18n key of the last failure
 * - workOrderLabel (string): WO number / machine name shown in the title
 * - onClose ()
 * - onSaveDraft (draft) => Promise<unknown>
 * - onSubmit (draft) => Promise<unknown>
 * - onApprove / onReject / onRequestChanges (input) => Promise<unknown>
 * - onUploadEvidence (file) => Promise<VerificationEvidence | null>
 * - onCaptureSignature (dataUrl) => Promise<string | null>
 *
 * Accessibility:
 * - Ant Design's Modal traps focus and wires aria-modal; the title is bound
 *   through `aria-labelledby` so the dialog announces the work order.
 * - Step changes and errors are announced via aria-live regions.
 * - Every control has a visible label; nothing relies on placeholder text.
 * - Destructive actions (reject) require a typed reason before they enable.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Checkbox,
  Descriptions,
  Divider,
  Image,
  Input,
  Modal,
  Space,
  Steps,
  Tag,
  Typography,
} from 'antd';
import { useVerificationT } from '../../lib/verification/verificationI18n';
import EvidenceUploader from './EvidenceUploader';
import SignaturePad from './SignaturePad';
import {
  validateForSubmission,
  type TicketVerification,
  type VerificationActor,
  type VerificationChecklistItem,
  type VerificationDecisionInput,
  type VerificationDraft,
  type VerificationEvidence,
  type VerificationPolicy,
} from '../../lib/verification/types';

export type VerificationModalMode = 'capture' | 'review';

export interface VerificationModalProps {
  open: boolean;
  mode: VerificationModalMode;
  verification: TicketVerification | null;
  policy: VerificationPolicy;
  actor: VerificationActor;
  busy?: boolean;
  errorKey?: string | null;
  workOrderLabel?: string;
  onClose: () => void;
  onSaveDraft: (draft: VerificationDraft) => Promise<unknown>;
  onSubmit: (draft: VerificationDraft) => Promise<unknown>;
  onApprove: (input: VerificationDecisionInput) => Promise<unknown>;
  onReject: (input: VerificationDecisionInput) => Promise<unknown>;
  onRequestChanges: (input: VerificationDecisionInput) => Promise<unknown>;
  onUploadEvidence: (file: File) => Promise<VerificationEvidence | null>;
  onCaptureSignature: (dataUrl: string) => Promise<string | null>;
}

const MIN_NOTES = 10;

function draftFrom(verification: TicketVerification | null): VerificationDraft {
  return {
    checklist: verification?.checklist ?? [],
    evidence: verification?.evidence ?? [],
    technician_notes: verification?.technician_notes ?? '',
    signature_url: verification?.signature_url ?? null,
    signed_by_name: verification?.signed_by_name ?? '',
  };
}

export const VerificationModal: React.FC<VerificationModalProps> = ({
  open,
  mode,
  verification,
  policy,
  actor,
  busy = false,
  errorKey = null,
  workOrderLabel = '',
  onClose,
  onSaveDraft,
  onSubmit,
  onApprove,
  onReject,
  onRequestChanges,
  onUploadEvidence,
  onCaptureSignature,
}) => {
  const { t } = useVerificationT();
  const [step, setStep] = useState<number>(0);
  const [draft, setDraft] = useState<VerificationDraft>(() => draftFrom(verification));
  const [reviewNotes, setReviewNotes] = useState<string>('');
  const [uploading, setUploading] = useState<boolean>(false);
  const [announcement, setAnnouncement] = useState<string>('');

  // Re-seed whenever the modal opens on a different record.
  useEffect(() => {
    if (open) {
      setDraft(draftFrom(verification));
      setStep(0);
      setReviewNotes('');
    }
  }, [open, verification]);

  const problems = useMemo(() => validateForSubmission(draft, policy), [draft, policy]);
  const canSubmit = problems.length === 0 && !busy;

  const patchDraft = useCallback((patch: Partial<VerificationDraft>) => {
    setDraft((previous) => ({ ...previous, ...patch }));
  }, []);

  const toggleCheck = useCallback((key: string, checked: boolean) => {
    setDraft((previous) => ({
      ...previous,
      checklist: previous.checklist.map((item: VerificationChecklistItem) =>
        item.key === key ? { ...item, checked } : item,
      ),
    }));
  }, []);

  const handleUpload = useCallback(
    async (file: File): Promise<VerificationEvidence | null> => {
      setUploading(true);
      try {
        const uploaded = await onUploadEvidence(file);
        if (uploaded) {
          setDraft((previous) => ({ ...previous, evidence: [...previous.evidence, uploaded] }));
          setAnnouncement(t('verification.event.evidence_added'));
        }
        return uploaded;
      } finally {
        setUploading(false);
      }
    },
    [onUploadEvidence, t],
  );

  const handleRemoveEvidence = useCallback((item: VerificationEvidence) => {
    setDraft((previous) => ({
      ...previous,
      evidence: previous.evidence.filter((candidate) => candidate.id !== item.id),
    }));
  }, []);

  const handleCaptionChange = useCallback((id: string, caption: string) => {
    setDraft((previous) => ({
      ...previous,
      evidence: previous.evidence.map((item) => (item.id === id ? { ...item, caption } : item)),
    }));
  }, []);

  const handleSignature = useCallback(
    async (dataUrl: string | null): Promise<void> => {
      if (!dataUrl) {
        patchDraft({ signature_url: null });
        return;
      }
      const stored = await onCaptureSignature(dataUrl);
      patchDraft({ signature_url: stored });
    },
    [onCaptureSignature, patchDraft],
  );

  const decisionInput = (reason?: string): VerificationDecisionInput => ({
    reviewer: actor,
    review_notes: reviewNotes,
    rejection_reason: reason ?? reviewNotes,
  });

  const titleId = 'verification-modal-title';
  const title = (
    <span id={titleId}>
      {t('verification.title')}
      {workOrderLabel ? ` — ${workOrderLabel}` : ''}
      {verification ? (
        <Tag style={{ marginInlineStart: 8 }} data-testid="verification-modal-status">
          {t(`verification.status.${verification.status}`)}
        </Tag>
      ) : null}
    </span>
  );

  // -------------------------------------------------------------------------
  // Capture wizard
  // -------------------------------------------------------------------------

  const checklistStep = (
    <Space direction="vertical" size="middle" style={{ width: '100%' }}>
      <fieldset style={{ border: 0, margin: 0, padding: 0 }}>
        <legend>
          <Typography.Text strong>{t('verification.step.checklist')}</Typography.Text>
        </legend>
        <Space direction="vertical" size="small" style={{ width: '100%', marginTop: 8 }}>
          {draft.checklist.map((item) => (
            <Checkbox
              key={item.key}
              checked={item.checked}
              disabled={busy}
              data-testid={`check-${item.key}`}
              onChange={(event) => toggleCheck(item.key, event.target.checked)}
            >
              {t(item.label_key)}
              {item.required ? (
                <Typography.Text type="danger" aria-label="required">
                  {' *'}
                </Typography.Text>
              ) : null}
            </Checkbox>
          ))}
        </Space>
      </fieldset>

      <div>
        <label htmlFor="verification-notes">
          <Typography.Text strong>{t('verification.field.notes')}</Typography.Text>
        </label>
        <Input.TextArea
          id="verification-notes"
          rows={4}
          value={draft.technician_notes}
          disabled={busy}
          maxLength={2000}
          showCount
          placeholder={t('verification.field.notes_placeholder')}
          aria-describedby="verification-notes-hint"
          data-testid="verification-notes"
          onChange={(event) => patchDraft({ technician_notes: event.target.value })}
        />
        <Typography.Text type="secondary" id="verification-notes-hint">
          {t('verification.error.notes_too_short')}
        </Typography.Text>
      </div>
    </Space>
  );

  const evidenceStep = (
    <EvidenceUploader
      evidence={draft.evidence}
      disabled={busy}
      uploading={uploading}
      minRequired={policy.require_photo_evidence ? Math.max(policy.min_evidence_count, 1) : 0}
      onUpload={handleUpload}
      onRemove={handleRemoveEvidence}
      onCaptionChange={handleCaptionChange}
    />
  );

  const signatureStep = (
    <SignaturePad
      value={draft.signature_url}
      signerName={draft.signed_by_name || actor.name}
      disabled={busy}
      onChange={(dataUrl) => {
        void handleSignature(dataUrl);
      }}
      onSignerNameChange={(name) => patchDraft({ signed_by_name: name })}
    />
  );

  const summary = (
    <Descriptions column={1} size="small" bordered data-testid="verification-summary">
      <Descriptions.Item label={t('verification.step.checklist')}>
        {draft.checklist.filter((item) => item.checked).length}/{draft.checklist.length}
      </Descriptions.Item>
      <Descriptions.Item label={t('verification.evidence.title')}>
        {t('verification.evidence.count', { n: draft.evidence.length })}
      </Descriptions.Item>
      <Descriptions.Item label={t('verification.signature.title')}>
        {draft.signature_url ? t('verification.signature.captured') : '—'}
      </Descriptions.Item>
      <Descriptions.Item label={t('verification.field.notes')}>
        {draft.technician_notes || '—'}
      </Descriptions.Item>
    </Descriptions>
  );

  const reviewStepContent = (
    <Space direction="vertical" size="middle" style={{ width: '100%' }}>
      {problems.length > 0 ? (
        <Alert
          type="warning"
          showIcon
          role="alert"
          data-testid="verification-problems"
          message={t('verification.gate.blocked_title')}
          description={
            <ul style={{ margin: 0, paddingInlineStart: 20 }}>
              {problems.map((key) => (
                <li key={key}>{t(key)}</li>
              ))}
            </ul>
          }
        />
      ) : null}
      {summary}
    </Space>
  );

  const captureSteps = [
    { title: t('verification.step.checklist'), content: checklistStep },
    { title: t('verification.step.evidence'), content: evidenceStep },
    { title: t('verification.step.signature'), content: signatureStep },
    { title: t('verification.step.review'), content: reviewStepContent },
  ];

  const captureFooter = (
    <Space wrap>
      <Button onClick={onClose} disabled={busy} data-testid="verification-cancel">
        {t('verification.action.cancel')}
      </Button>
      <Button
        onClick={() => {
          void onSaveDraft(draft);
        }}
        disabled={busy}
        data-testid="verification-save-draft"
      >
        {t('verification.action.save_draft')}
      </Button>
      {step > 0 ? (
        <Button onClick={() => setStep((previous) => previous - 1)} disabled={busy}>
          {t('verification.action.back')}
        </Button>
      ) : null}
      {step < captureSteps.length - 1 ? (
        <Button
          type="primary"
          onClick={() => {
            setStep((previous) => previous + 1);
            setAnnouncement(captureSteps[Math.min(step + 1, captureSteps.length - 1)].title);
          }}
          disabled={busy}
          data-testid="verification-next"
        >
          {t('verification.action.next')}
        </Button>
      ) : (
        <Button
          type="primary"
          loading={busy}
          disabled={!canSubmit}
          onClick={() => {
            void onSubmit(draft);
          }}
          data-testid="verification-submit"
        >
          {t('verification.action.submit')}
        </Button>
      )}
    </Space>
  );

  // -------------------------------------------------------------------------
  // Review pane
  // -------------------------------------------------------------------------

  const reviewPane = verification ? (
    <Space direction="vertical" size="middle" style={{ width: '100%' }}>
      <Descriptions column={1} size="small" bordered>
        <Descriptions.Item label={t('verification.submitted_by', { name: '' }).trim()}>
          {verification.submitted_by_name ?? '—'}
        </Descriptions.Item>
        <Descriptions.Item label={t('verification.attempt', { n: verification.attempt })}>
          {verification.submitted_at
            ? new Date(verification.submitted_at).toLocaleString()
            : '—'}
        </Descriptions.Item>
        <Descriptions.Item label={t('verification.field.notes')}>
          {verification.technician_notes ?? '—'}
        </Descriptions.Item>
      </Descriptions>

      <div>
        <Typography.Text strong>{t('verification.step.checklist')}</Typography.Text>
        <ul style={{ marginTop: 8 }}>
          {verification.checklist.map((item) => (
            <li key={item.key}>
              <Tag color={item.checked ? 'green' : 'default'}>
                {item.checked ? '✓' : '—'}
              </Tag>
              {t(item.label_key)}
            </li>
          ))}
        </ul>
      </div>

      <div>
        <Typography.Text strong>{t('verification.evidence.title')}</Typography.Text>
        {verification.evidence.length === 0 ? (
          <Typography.Paragraph type="secondary">
            {t('verification.evidence.empty')}
          </Typography.Paragraph>
        ) : (
          <Image.PreviewGroup>
            <Space wrap style={{ marginTop: 8 }} data-testid="review-evidence">
              {verification.evidence.map((item) => (
                <figure key={item.id} style={{ margin: 0, maxWidth: 160 }}>
                  <Image
                    src={item.url}
                    alt={item.caption || item.file_name || t('verification.evidence.title')}
                    width={150}
                    height={110}
                    style={{ objectFit: 'cover', borderRadius: 6 }}
                  />
                  {item.caption ? (
                    <figcaption>
                      <Typography.Text type="secondary">{item.caption}</Typography.Text>
                    </figcaption>
                  ) : null}
                </figure>
              ))}
            </Space>
          </Image.PreviewGroup>
        )}
      </div>

      {verification.signature_url ? (
        <div>
          <Typography.Text strong>{t('verification.signature.title')}</Typography.Text>
          <div style={{ background: '#fff', borderRadius: 6, padding: 8, marginTop: 8 }}>
            <img
              src={verification.signature_url}
              alt={`${t('verification.signature.title')} — ${verification.signed_by_name ?? ''}`}
              style={{ maxWidth: 260, height: 'auto' }}
            />
          </div>
        </div>
      ) : null}

      <Divider style={{ margin: '8px 0' }} />

      <div>
        <label htmlFor="verification-review-notes">
          <Typography.Text strong>{t('verification.field.review_notes')}</Typography.Text>
        </label>
        <Input.TextArea
          id="verification-review-notes"
          rows={3}
          value={reviewNotes}
          disabled={busy}
          maxLength={1000}
          data-testid="verification-review-notes"
          onChange={(event) => setReviewNotes(event.target.value)}
        />
      </div>
    </Space>
  ) : null;

  const reviewFooter = (
    <Space wrap>
      <Button onClick={onClose} disabled={busy}>
        {t('verification.action.cancel')}
      </Button>
      <Button
        disabled={busy || reviewNotes.trim().length === 0}
        onClick={() => {
          void onRequestChanges(decisionInput());
        }}
        data-testid="verification-request-changes"
      >
        {t('verification.action.request_changes')}
      </Button>
      <Button
        danger
        disabled={busy || reviewNotes.trim().length === 0}
        onClick={() => {
          void onReject(decisionInput());
        }}
        data-testid="verification-reject"
      >
        {t('verification.action.reject')}
      </Button>
      <Button
        type="primary"
        loading={busy}
        onClick={() => {
          void onApprove(decisionInput());
        }}
        data-testid="verification-approve"
      >
        {t('verification.action.approve')}
      </Button>
    </Space>
  );

  return (
    <Modal
      open={open}
      onCancel={onClose}
      title={title}
      width={720}
      destroyOnHidden
      maskClosable={!busy}
      footer={mode === 'capture' ? captureFooter : reviewFooter}
      aria-labelledby={titleId}
      data-testid={`verification-modal-${mode}`}
      styles={{ body: { maxHeight: '65vh', overflowY: 'auto' } }}
    >
      {errorKey ? (
        <Alert
          type="error"
          showIcon
          role="alert"
          style={{ marginBottom: 16 }}
          message={t(errorKey)}
          data-testid="verification-error"
        />
      ) : null}

      {mode === 'capture' ? (
        <>
          <Steps
            current={step}
            size="small"
            responsive
            style={{ marginBottom: 20 }}
            onChange={(next) => setStep(next)}
            items={captureSteps.map((entry) => ({ title: entry.title }))}
            data-testid="verification-steps"
          />
          {captureSteps[step].content}
        </>
      ) : (
        reviewPane
      )}

      <span
        aria-live="polite"
        role="status"
        style={{
          position: 'absolute',
          width: 1,
          height: 1,
          overflow: 'hidden',
          clip: 'rect(0 0 0 0)',
          whiteSpace: 'nowrap',
        }}
      >
        {announcement}
      </span>
    </Modal>
  );
};

export default VerificationModal;
export { MIN_NOTES };
