/**
 * POApprovalCard — one purchase order, reviewed and decided in place.
 *
 * A supervisor approving spend needs three facts before they sign:
 * what it costs, when it lands, and what stays broken until it does.
 * The card states all three in one sentence above the buttons rather
 * than making the reader assemble it from a table row.
 *
 * "Request changes" opens a comment box and requires text — sending a
 * PO back with no reason just moves the delay to someone else.
 *
 * Props:
 * - po        (object) a normalised PO from normalizePo()
 * - onApprove (fn)     called with the PO
 * - onRequestChanges (fn) called with (po, comment)
 * - busy      (bool)   disables both actions while a decision is in flight
 */

import React, { useState } from 'react';
import {
  Check, MessageSquare, Truck, Clock, User, ChevronDown, AlertOctagon,
} from 'lucide-react';
import { formatInr } from '../../utils/inventoryMetrics.js';

const PRIORITY_TONE = { critical: 'danger', high: 'warning', medium: '', low: '' };

function deliveryCopy(po) {
  if (po.daysToDelivery == null) return 'no delivery date set';
  if (po.daysToDelivery < 0) return `overdue by ${Math.abs(po.daysToDelivery)} day${Math.abs(po.daysToDelivery) === 1 ? '' : 's'}`;
  if (po.daysToDelivery === 0) return 'arrives today';
  return `arrives in ${po.daysToDelivery} day${po.daysToDelivery === 1 ? '' : 's'}`;
}

export default function POApprovalCard({ po, onApprove, onRequestChanges, busy = false }) {
  const [expanded, setExpanded] = useState(false);
  const [commenting, setCommenting] = useState(false);
  const [comment, setComment] = useState('');

  if (!po) return null;

  const tone = PRIORITY_TONE[po.priority] || '';
  const canSend = comment.trim().length > 0;

  const submitChanges = (event) => {
    event.preventDefault();
    if (!canSend) return;
    onRequestChanges?.(po, comment.trim());
    setComment('');
    setCommenting(false);
  };

  return (
    <article className={`inv-po-card ${tone}`} data-testid="inv-po-card" data-po={po.poNumber}>
      <header className="inv-po-head">
        <div className="inv-po-title">
          <code className="inv-po-number">{po.poNumber}</code>
          <strong>{po.vendor}</strong>
          {po.priority === 'critical' && (
            <span className="inv-po-flag" title="Blocks a critical machine">
              <AlertOctagon size={12} aria-hidden="true" /> Critical
            </span>
          )}
        </div>
        <b className="inv-po-amount">{formatInr(po.total)}</b>
      </header>

      <dl className="inv-po-meta">
        <div>
          <dt><User size={12} aria-hidden="true" /> Requested by</dt>
          <dd>{po.requestedBy}</dd>
        </div>
        <div>
          <dt><Clock size={12} aria-hidden="true" /> Waiting</dt>
          <dd>{po.ageDays == null ? '—' : `${po.ageDays} day${po.ageDays === 1 ? '' : 's'}`}</dd>
        </div>
        <div>
          <dt><Truck size={12} aria-hidden="true" /> Delivery</dt>
          <dd>{deliveryCopy(po)}</dd>
        </div>
      </dl>

      <button
        type="button"
        className="inv-po-toggle"
        aria-expanded={expanded}
        onClick={() => setExpanded((open) => !open)}
      >
        <ChevronDown size={13} aria-hidden="true" className={expanded ? 'open' : ''} />
        {po.itemCount} line item{po.itemCount === 1 ? '' : 's'}
      </button>

      {expanded && (
        <ul className="inv-po-items">
          {po.items.map((line, index) => (
            <li key={line.part_number || line.name || index}>
              <span className="inv-po-item-name">
                {line.name}
                {line.part_number ? <code>{line.part_number}</code> : null}
              </span>
              <span className="inv-po-item-qty">{line.qty} ×</span>
              <span className="inv-po-item-cost">{formatInr(line.unit_cost)}</span>
            </li>
          ))}
        </ul>
      )}

      <p className="inv-po-impact">
        If approved, it {deliveryCopy(po)}, costs <strong>{formatInr(po.total)}</strong>
        {po.unblocks.length > 0 && <> and unblocks <strong>{po.unblocks.join(', ')}</strong></>}.
      </p>

      {commenting ? (
        <form className="inv-po-comment" onSubmit={submitChanges}>
          <label htmlFor={`po-comment-${po.id}`} className="sr-only">
            What needs to change on {po.poNumber}?
          </label>
          <textarea
            id={`po-comment-${po.id}`}
            rows={2}
            value={comment}
            placeholder="What needs to change? e.g. split the quantity, re-quote with Omron…"
            onChange={(event) => setComment(event.target.value)}
          />
          <div className="inv-po-actions">
            <button type="button" className="inv-btn ghost" onClick={() => setCommenting(false)}>Cancel</button>
            <button type="submit" className="inv-btn" disabled={!canSend || busy}>Send back</button>
          </div>
        </form>
      ) : (
        <div className="inv-po-actions">
          <button
            type="button"
            className="inv-btn ghost"
            onClick={() => setCommenting(true)}
            disabled={busy}
            data-testid="inv-po-request-changes"
          >
            <MessageSquare size={13} aria-hidden="true" /> Request changes
          </button>
          <button
            type="button"
            className="inv-btn primary"
            onClick={() => onApprove?.(po)}
            disabled={busy}
            data-testid="inv-po-approve"
          >
            <Check size={13} aria-hidden="true" /> Approve {formatInr(po.total)}
          </button>
        </div>
      )}
    </article>
  );
}
