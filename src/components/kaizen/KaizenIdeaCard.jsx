/**
 * KaizenIdeaCard — one idea, collapsed to a line and expandable to the
 * whole story. Shared by all three boards so an idea looks the same to
 * the operator who submitted it and the manager who funded it.
 *
 * Collapsed it answers: what is it, where is it in the pipeline, what is
 * it worth. Expanded it adds the proposal text, the money breakdown, the
 * reviewer's comment and the before/after photographs.
 *
 * Props:
 * - idea      (object)  a kaizen_opportunities row
 * - defaultOpen (bool)  start expanded
 * - footer    (node)    always-visible controls. The supervisor's whole
 *                       job is approve / need-info / reject, so those
 *                       cannot cost an extra click to reveal.
 * - actions   (node)    controls that only make sense once you have read
 *                       the proposal; rendered inside the expanded body
 * - meta      (node)    extra chips beside the status badge
 * - showPhotos (bool)   render the gallery when expanded (default true)
 */

import React, { useId, useState } from 'react';
import { ChevronDown, IndianRupee, MessageSquare, User } from 'lucide-react';
import KaizenStatusBadge from './KaizenStatusBadge.jsx';
import KaizenPhotoGallery from './KaizenPhotoGallery.jsx';
import {
  categoryLabel,
  wasteLabel,
  estimatedSaving,
  realizedSaving,
  ideaCost,
  estimatedRoi,
  realizedRoi,
  performanceBand,
  isRealizedIdea,
  formatInr,
  formatInrCompact,
  formatShortDate,
} from '../../utils/kaizenMetrics.js';

const BAND_LABEL = {
  over: 'Beat forecast',
  on: 'On track',
  under: 'Under forecast',
};

export default function KaizenIdeaCard({
  idea,
  defaultOpen = false,
  footer = null,
  actions = null,
  meta = null,
  showPhotos = true,
}) {
  const [open, setOpen] = useState(defaultOpen);
  const bodyId = useId();

  if (!idea) return null;

  const realized = realizedSaving(idea);
  const measured = isRealizedIdea(idea) && realized != null;
  const estimate = estimatedSaving(idea);
  const cost = ideaCost(idea);
  const roi = measured ? realizedRoi(idea) : estimatedRoi(idea);
  const band = performanceBand(idea);

  // Headline money: what it returned once we know, what it promised until then.
  const headlineValue = measured ? realized : estimate;
  const headlineLabel = measured ? 'Realized' : 'Estimated';

  return (
    <article
      className={`kz-idea ${open ? 'open' : ''}`}
      data-testid="kaizen-idea-card"
      data-idea-id={idea.id}
      data-status={idea.status}
    >
      <div className="kz-idea-head">
        <button
          type="button"
          className="kz-idea-toggle"
          aria-expanded={open}
          aria-controls={bodyId}
          onClick={() => setOpen((value) => !value)}
        >
          <ChevronDown size={16} className="kz-idea-chevron" aria-hidden="true" />
          <span className="kz-idea-title">
            <strong>{idea.title || 'Untitled idea'}</strong>
            <small>
              {idea.id}
              {idea.machine_id ? ` · ${idea.machine_id}` : ''}
              {' · '}
              {formatShortDate(idea.created_at)}
            </small>
          </span>
        </button>

        <div className="kz-idea-tags">
          {meta}
          <span className="kz-chip">{categoryLabel(idea.category)}</span>
          <KaizenStatusBadge status={idea.status} size="sm" />
        </div>

        <div className={`kz-idea-money ${band ? `band-${band}` : ''}`}>
          <strong>{headlineValue > 0 ? formatInrCompact(headlineValue) : '—'}</strong>
          <small>{headlineLabel}{band ? ` · ${BAND_LABEL[band]}` : ''}</small>
        </div>
      </div>

      {open && (
        <div className="kz-idea-body" id={bodyId}>
          {idea.proposal && <p className="kz-idea-proposal">{idea.proposal}</p>}

          <dl className="kz-idea-facts">
            <Fact label="Submitted by" value={idea.created_by_name || 'Unknown'} icon={User} />
            <Fact label="Waste addressed" value={wasteLabel(idea.waste_category)} />
            <Fact label="Estimated saving" value={estimate > 0 ? formatInr(estimate) : 'Not estimated'} icon={IndianRupee} />
            <Fact label="Cost to implement" value={cost > 0 ? formatInr(cost) : 'No spend'} />
            <Fact
              label={measured ? 'Realized saving' : 'Realized saving'}
              value={measured ? formatInr(realized) : 'Not yet measured'}
              tone={measured ? 'ok' : ''}
            />
            <Fact
              label="ROI"
              value={roi == null ? 'No spend to measure against' : `${roi}%`}
              tone={roi == null ? '' : roi >= 100 ? 'ok' : roi >= 0 ? 'warning' : 'danger'}
            />
            {idea.due_date && <Fact label="Target date" value={formatShortDate(idea.due_date)} />}
            {idea.verified_by_name && (
              <Fact label="Verified by" value={`${idea.verified_by_name} · ${formatShortDate(idea.verified_at)}`} tone="ok" />
            )}
            {idea.trial_duration_shifts && (
              <Fact label="Trial length" value={`${idea.trial_duration_shifts} shifts`} />
            )}
          </dl>

          {idea.review_comment && (
            <p className="kz-idea-comment">
              <MessageSquare size={14} aria-hidden="true" />
              <span>{idea.review_comment}</span>
            </p>
          )}

          {showPhotos && (
            <KaizenPhotoGallery
              before={idea.before_photo_url}
              after={idea.after_photo_url}
              title={idea.title}
            />
          )}

          {actions && <div className="kz-idea-actions">{actions}</div>}
        </div>
      )}

      {footer && <div className="kz-idea-footer">{footer}</div>}
    </article>
  );
}

function Fact({ label, value, tone = '', icon: Icon }) {
  return (
    <div className={`kz-fact ${tone}`}>
      <dt>{Icon ? <Icon size={12} aria-hidden="true" /> : null}{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
