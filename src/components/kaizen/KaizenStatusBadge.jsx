/**
 * KaizenStatusBadge — one status, one colour, everywhere.
 *
 * Nine statuses collapse to four tones (info / warning / ok / danger) so
 * a glance down a list reads as "waiting", "moving", "done", "stopped"
 * without anyone memorising the vocabulary.
 */

import React from 'react';
import { statusMeta } from '../../utils/kaizenMetrics.js';

export default function KaizenStatusBadge({ status, size = 'md' }) {
  const meta = statusMeta(status);
  return (
    <span
      className={`kz-badge kz-badge-${meta.tone || 'info'} ${size === 'sm' ? 'sm' : ''}`}
      data-status={meta.value}
      data-testid="kaizen-status-badge"
    >
      {meta.label}
    </span>
  );
}
