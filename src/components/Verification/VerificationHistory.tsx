/**
 * VerificationHistory — the audit trail for a work order's verifications.
 *
 * Props:
 * - events (VerificationEvent[]): newest-first rows from `verification_events`
 * - loading (boolean)
 * - compact (boolean): drops the card chrome for embedding inside a modal
 * - maxItems (number): show only the newest N with a "show all" toggle
 *
 * Every row in `verification_events` is written by a SECURITY DEFINER trigger
 * and there is no UPDATE/DELETE policy on the table, so what renders here is
 * exactly what the database recorded — including blocked closures and audited
 * overrides, which are the two rows an auditor actually looks for.
 *
 * Accessibility:
 * - Rendered as an ordered list so screen readers announce position and count.
 * - Timestamps use <time datetime> with a locale-formatted label.
 * - Status colour is always paired with a text label (1.4.1 Use of Colour).
 */

import React, { useMemo, useState } from 'react';
import { Button, Card, Empty, Space, Spin, Tag, Timeline, Typography } from 'antd';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  ExclamationCircleOutlined,
  FileImageOutlined,
  PlusCircleOutlined,
  SendOutlined,
  StopOutlined,
  UndoOutlined,
} from '@ant-design/icons';
import { useVerificationT } from '../../lib/verification/verificationI18n';
import type { VerificationAction, VerificationEvent } from '../../lib/verification/types';

export interface VerificationHistoryProps {
  events: VerificationEvent[];
  loading?: boolean;
  compact?: boolean;
  maxItems?: number;
}

interface ActionPresentation {
  color: string;
  icon: React.ReactNode;
}

const ACTION_PRESENTATION: Record<VerificationAction, ActionPresentation> = {
  created: { color: 'blue', icon: <PlusCircleOutlined aria-hidden="true" /> },
  submitted: { color: 'processing', icon: <SendOutlined aria-hidden="true" /> },
  approved: { color: 'green', icon: <CheckCircleOutlined aria-hidden="true" /> },
  rejected: { color: 'red', icon: <CloseCircleOutlined aria-hidden="true" /> },
  changes_requested: { color: 'orange', icon: <UndoOutlined aria-hidden="true" /> },
  cancelled: { color: 'default', icon: <StopOutlined aria-hidden="true" /> },
  updated: { color: 'default', icon: <ExclamationCircleOutlined aria-hidden="true" /> },
  evidence_added: { color: 'cyan', icon: <FileImageOutlined aria-hidden="true" /> },
  closure_blocked: { color: 'red', icon: <StopOutlined aria-hidden="true" /> },
  closure_override: { color: 'volcano', icon: <ExclamationCircleOutlined aria-hidden="true" /> },
};

function presentationFor(action: VerificationAction): ActionPresentation {
  return ACTION_PRESENTATION[action] ?? ACTION_PRESENTATION.updated;
}

export const VerificationHistory: React.FC<VerificationHistoryProps> = ({
  events,
  loading = false,
  compact = false,
  maxItems = 6,
}) => {
  const { t, language } = useVerificationT();
  const [expanded, setExpanded] = useState<boolean>(false);

  const formatTimestamp = useMemo(
    () =>
      (iso: string): string => {
        try {
          return new Intl.DateTimeFormat(language, {
            dateStyle: 'medium',
            timeStyle: 'short',
          }).format(new Date(iso));
        } catch {
          return iso;
        }
      },
    [language],
  );

  const visible = expanded ? events : events.slice(0, maxItems);
  const hasMore = events.length > maxItems;

  const body = (() => {
    if (loading) {
      return (
        <div style={{ textAlign: 'center', padding: 24 }}>
          <Spin aria-label={t('verification.loading')} />
        </div>
      );
    }
    if (events.length === 0) {
      return (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={t('verification.history.empty')}
          data-testid="verification-history-empty"
        />
      );
    }
    return (
      <>
        <Timeline
          mode="left"
          data-testid="verification-history-timeline"
          items={visible.map((event) => {
            const presentation = presentationFor(event.action);
            const reason =
              typeof event.details.rejection_reason === 'string'
                ? event.details.rejection_reason
                : typeof event.details.reason === 'string'
                  ? event.details.reason
                  : '';
            const notes = typeof event.details.notes === 'string' ? event.details.notes : '';

            return {
              key: event.id,
              color: presentation.color,
              dot: presentation.icon,
              children: (
                <div>
                  <Space size={8} wrap>
                    <Tag color={presentation.color} data-testid={`event-${event.action}`}>
                      {t(`verification.event.${event.action}`)}
                    </Tag>
                    <time dateTime={event.created_at}>
                      <Typography.Text type="secondary">
                        {formatTimestamp(event.created_at)}
                      </Typography.Text>
                    </time>
                  </Space>
                  <div>
                    <Typography.Text>
                      {event.action === 'approved' || event.action === 'rejected'
                        ? t('verification.reviewed_by', { name: event.actor_name ?? '—' })
                        : t('verification.submitted_by', { name: event.actor_name ?? '—' })}
                    </Typography.Text>
                  </div>
                  {reason ? (
                    <Typography.Paragraph
                      type="secondary"
                      style={{ marginBottom: 0 }}
                      ellipsis={{ rows: 3, expandable: true, symbol: t('verification.action.next') }}
                    >
                      {reason}
                    </Typography.Paragraph>
                  ) : null}
                  {!reason && notes ? (
                    <Typography.Paragraph
                      type="secondary"
                      style={{ marginBottom: 0 }}
                      ellipsis={{ rows: 3, expandable: true, symbol: t('verification.action.next') }}
                    >
                      {notes}
                    </Typography.Paragraph>
                  ) : null}
                </div>
              ),
            };
          })}
        />
        {hasMore ? (
          <Button
            type="link"
            onClick={() => setExpanded((previous) => !previous)}
            aria-expanded={expanded}
            data-testid="verification-history-toggle"
          >
            {expanded
              ? t('verification.action.back')
              : t('verification.action.view_history')}
          </Button>
        ) : null}
      </>
    );
  })();

  if (compact) {
    return (
      <section aria-label={t('verification.history.aria')} data-testid="verification-history">
        {body}
      </section>
    );
  }

  return (
    <Card
      title={t('verification.history.title')}
      size="small"
      data-testid="verification-history"
      aria-label={t('verification.history.aria')}
    >
      {body}
    </Card>
  );
};

export default VerificationHistory;
