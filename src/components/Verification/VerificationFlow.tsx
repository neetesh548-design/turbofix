/**
 * VerificationFlow — the closure gate for a single work order.
 *
 * Drop this into any ticket detail surface. It owns the whole loop:
 *   1. shows why the work order cannot be closed yet,
 *   2. lets the technician raise and submit a verification with evidence,
 *   3. lets an approver review, approve, reject or send it back,
 *   4. shows the audit trail of every decision,
 *   5. offers an audited override for the rare emergency closure.
 *
 * MVP-first: the card shows one status line and one primary button. Evidence
 * capture, the audit trail and the override all live behind a drill-down, so
 * the common path is a single tap.
 *
 * Props:
 * - ticketId (string): work order being verified
 * - actor (VerificationActor): current user (id, name, role)
 * - companyId (string | null): scopes the verification policy lookup
 * - workOrderLabel (string): e.g. "WO-000123 — CNC Lathe 2"
 * - ticketClosed (boolean): hides the gate for already-closed work orders
 * - allowOverride (boolean): show the emergency-closure affordance
 * - compact (boolean): renders inline without the surrounding Card
 * - onChange (): called after any state change so the parent can refetch
 *
 * Accessibility:
 * - The status card is a labelled region; the gate reason is in an Alert with
 *   role="status" so a screen reader hears why closure is blocked.
 * - Status is conveyed with both colour and text.
 * - The override confirm requires a typed reason of at least 10 characters,
 *   which is validated inline rather than only on submit.
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Collapse,
  Input,
  Modal,
  Space,
  Spin,
  Tag,
  Typography,
  message,
} from 'antd';
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons';
import { useVerificationT } from '../../lib/verification/verificationI18n';
import useVerification from '../../hooks/useVerification';
import VerificationModal, { type VerificationModalMode } from './VerificationModal';
import VerificationHistory from './VerificationHistory';
import {
  APPROVER_ROLES,
  type VerificationActor,
  type VerificationDecisionInput,
  type VerificationDraft,
  type VerificationStatus,
} from '../../lib/verification/types';

export interface VerificationFlowProps {
  ticketId: string;
  actor: VerificationActor;
  companyId?: string | null;
  workOrderLabel?: string;
  ticketClosed?: boolean;
  allowOverride?: boolean;
  compact?: boolean;
  onChange?: () => void;
}

const STATUS_COLOR: Record<VerificationStatus | 'not_started', string> = {
  not_started: 'default',
  draft: 'blue',
  pending_review: 'gold',
  approved: 'green',
  rejected: 'red',
  changes_requested: 'orange',
  cancelled: 'default',
};

const MIN_OVERRIDE_REASON = 10;

export const VerificationFlow: React.FC<VerificationFlowProps> = ({
  ticketId,
  actor,
  companyId = null,
  workOrderLabel = '',
  ticketClosed = false,
  allowOverride = false,
  compact = false,
  onChange,
}) => {
  const { t } = useVerificationT();
  const verificationState = useVerification({ ticketId, actor, companyId });
  const {
    verification,
    events,
    policy,
    gate,
    canApprove,
    loading,
    busy,
    errorKey,
    clearError,
    start,
    save,
    submit,
    approve,
    reject,
    sendBack,
    addEvidence,
    captureSignature,
    overrideClosure,
  } = verificationState;

  const [modalMode, setModalMode] = useState<VerificationModalMode | null>(null);
  const [overrideOpen, setOverrideOpen] = useState<boolean>(false);
  const [overrideReason, setOverrideReason] = useState<string>('');

  const status: VerificationStatus | 'not_started' = verification?.status ?? 'not_started';
  const isApprover = APPROVER_ROLES.includes(actor.role);

  const notify = useCallback(
    (successKey: string) => {
      message.success(t(successKey));
      onChange?.();
    },
    [t, onChange],
  );

  // --- actions -------------------------------------------------------------

  const handleStart = useCallback(async (): Promise<void> => {
    const created = await start();
    if (created) setModalMode('capture');
  }, [start]);

  const handleSaveDraft = useCallback(
    async (draft: VerificationDraft): Promise<void> => {
      const saved = await save(draft);
      if (saved) notify('verification.success.saved');
    },
    [save, notify],
  );

  const handleSubmit = useCallback(
    async (draft: VerificationDraft): Promise<void> => {
      const submitted = await submit(draft);
      if (submitted) {
        setModalMode(null);
        notify('verification.success.submitted');
      }
    },
    [submit, notify],
  );

  const handleDecision = useCallback(
    (
      operation: (input: VerificationDecisionInput) => Promise<unknown>,
      successKey: string,
    ) =>
      async (input: VerificationDecisionInput): Promise<void> => {
        const result = await operation(input);
        if (result) {
          setModalMode(null);
          notify(successKey);
        }
      },
    [notify],
  );

  const handleOverride = useCallback(async (): Promise<void> => {
    const ok = await overrideClosure(overrideReason);
    if (ok) {
      setOverrideOpen(false);
      setOverrideReason('');
      notify('verification.success.overridden');
    }
  }, [overrideClosure, overrideReason, notify]);

  // --- presentation --------------------------------------------------------

  const statusIcon = useMemo(() => {
    if (status === 'approved') return <CheckCircleOutlined aria-hidden="true" />;
    if (status === 'pending_review') return <ClockCircleOutlined aria-hidden="true" />;
    if (status === 'rejected' || status === 'changes_requested') {
      return <ExclamationCircleOutlined aria-hidden="true" />;
    }
    return <SafetyCertificateOutlined aria-hidden="true" />;
  }, [status]);

  /** The single MVP call-to-action, derived from the gate. */
  const primaryAction = useMemo((): React.ReactNode => {
    if (ticketClosed || status === 'approved') return null;

    if (canApprove) {
      return (
        <Button
          type="primary"
          onClick={() => setModalMode('review')}
          disabled={busy}
          data-testid="verification-open-review"
        >
          {t('verification.action.review')}
        </Button>
      );
    }

    if (status === 'pending_review') {
      return (
        <Button disabled data-testid="verification-awaiting">
          {t('verification.status.pending_review')}
        </Button>
      );
    }

    if (verification && (status === 'draft' || status === 'changes_requested')) {
      return (
        <Button
          type="primary"
          onClick={() => setModalMode('capture')}
          disabled={busy}
          data-testid="verification-continue"
        >
          {t('verification.action.continue')}
        </Button>
      );
    }

    return (
      <Button
        type="primary"
        loading={busy}
        onClick={() => {
          void handleStart();
        }}
        data-testid="verification-start"
      >
        {t('verification.action.start')}
      </Button>
    );
  }, [ticketClosed, status, canApprove, verification, busy, t, handleStart]);

  const gateAlert =
    !ticketClosed && !gate.allowed && gate.reason_key ? (
      <Alert
        type={status === 'rejected' || status === 'changes_requested' ? 'error' : 'info'}
        showIcon
        role="status"
        message={t('verification.gate.blocked_title')}
        description={t(gate.reason_key)}
        data-testid="verification-gate"
      />
    ) : null;

  const body = (
    <Space direction="vertical" size="middle" style={{ width: '100%' }}>
      {loading ? (
        <div style={{ textAlign: 'center', padding: 16 }}>
          <Spin aria-label={t('verification.loading')} />
        </div>
      ) : null}

      <Space wrap align="center">
        <Tag
          color={STATUS_COLOR[status]}
          icon={statusIcon}
          data-testid="verification-status"
        >
          {t(`verification.status.${status}`)}
        </Tag>
        {verification && verification.attempt > 1 ? (
          <Typography.Text type="secondary">
            {t('verification.attempt', { n: verification.attempt })}
          </Typography.Text>
        ) : null}
        {verification?.submitted_by_name ? (
          <Typography.Text type="secondary">
            {t('verification.submitted_by', { name: verification.submitted_by_name })}
          </Typography.Text>
        ) : null}
      </Space>

      {gateAlert}

      {errorKey ? (
        <Alert
          type="error"
          showIcon
          closable
          role="alert"
          onClose={clearError}
          message={t(errorKey)}
          data-testid="verification-flow-error"
        />
      ) : null}

      <Space wrap>
        {primaryAction}
        {allowOverride && !ticketClosed && !gate.allowed && isApprover ? (
          <Button
            danger
            type="text"
            onClick={() => setOverrideOpen(true)}
            data-testid="verification-override-open"
          >
            {t('verification.action.override')}
          </Button>
        ) : null}
      </Space>

      <Collapse
        ghost
        items={[
          {
            key: 'history',
            label: t('verification.action.view_history'),
            children: <VerificationHistory events={events} loading={loading} compact />,
          },
        ]}
        data-testid="verification-history-drilldown"
      />
    </Space>
  );

  return (
    <section aria-label={t('verification.title')} data-testid="verification-flow">
      {compact ? (
        body
      ) : (
        <Card
          size="small"
          title={
            <Space>
              <SafetyCertificateOutlined aria-hidden="true" />
              <span>{t('verification.title')}</span>
            </Space>
          }
          extra={workOrderLabel ? <Typography.Text type="secondary">{workOrderLabel}</Typography.Text> : null}
        >
          {body}
        </Card>
      )}

      <VerificationModal
        open={modalMode !== null}
        mode={modalMode ?? 'capture'}
        verification={verification}
        policy={policy}
        actor={actor}
        busy={busy}
        errorKey={errorKey}
        workOrderLabel={workOrderLabel}
        onClose={() => setModalMode(null)}
        onSaveDraft={handleSaveDraft}
        onSubmit={handleSubmit}
        onApprove={handleDecision(approve, 'verification.success.approved')}
        onReject={handleDecision(reject, 'verification.success.rejected')}
        onRequestChanges={handleDecision(sendBack, 'verification.success.changes_requested')}
        onUploadEvidence={addEvidence}
        onCaptureSignature={captureSignature}
      />

      <Modal
        open={overrideOpen}
        title={t('verification.action.override')}
        okText={t('verification.action.close_ticket')}
        cancelText={t('verification.action.cancel')}
        okButtonProps={{
          danger: true,
          disabled: overrideReason.trim().length < MIN_OVERRIDE_REASON,
          loading: busy,
          'data-testid': 'verification-override-confirm',
        }}
        onOk={() => {
          void handleOverride();
        }}
        onCancel={() => setOverrideOpen(false)}
        data-testid="verification-override-modal"
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          <Alert
            type="warning"
            showIcon
            role="alert"
            message={t('verification.error.approval_required')}
            description={t('verification.event.closure_override')}
          />
          <label htmlFor="verification-override-reason">
            <Typography.Text strong>{t('verification.field.override_reason')}</Typography.Text>
          </label>
          <Input.TextArea
            id="verification-override-reason"
            rows={3}
            value={overrideReason}
            maxLength={500}
            showCount
            data-testid="verification-override-reason"
            onChange={(event) => setOverrideReason(event.target.value)}
          />
          {overrideReason.length > 0 && overrideReason.trim().length < MIN_OVERRIDE_REASON ? (
            <Typography.Text type="danger" role="alert">
              {t('verification.error.override_reason_too_short')}
            </Typography.Text>
          ) : null}
        </Space>
      </Modal>
    </section>
  );
};

export default VerificationFlow;
