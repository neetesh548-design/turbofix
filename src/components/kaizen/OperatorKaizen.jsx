/**
 * OperatorKaizen — "My ideas".
 *
 * The person who spots the waste is the person least likely to have five
 * spare minutes and a laptop. So the submission form is the first thing
 * on the page, stays reachable while scrolling, and asks for four things
 * only: what, which waste, why, and roughly what it is worth.
 *
 * Savings can be entered in minutes-a-day, because that is how an
 * operator experiences a wasted motion. The rupee conversion happens in
 * kaizenMetrics so the board and the operator never disagree about it.
 *
 * Sections, in order of what the submitter cares about:
 *   1. Submit an idea            — sticky, always one tap away
 *   2. My ideas                  — status, votes, feedback, trial results
 *   3. Hall of fame              — proof that ideas here actually land
 *
 * Props:
 * - metrics ({ mine, hallOfFame }) from buildKaizenMetrics('operator', …)
 * - user    (object) the signed-in operator, for the submitter name
 * - machines (array) machine picker options
 * - onSubmit (fn(draft) => Promise<{ id }>) persists the idea
 * - loading (bool)
 */

import React, { useMemo, useState } from 'react';
import {
  Camera, CheckCircle2, Lightbulb, Send, Sparkles, Trophy, IndianRupee, Clock,
} from 'lucide-react';
import DashboardChart from '../dashboard/DashboardChart.jsx';
import KaizenIdeaCard from './KaizenIdeaCard.jsx';
import KaizenPhotoGallery from './KaizenPhotoGallery.jsx';
import {
  LEAN_WASTES,
  KAIZEN_CATEGORIES,
  minutesPerDayToAnnualRupees,
  formatInr,
  formatInrCompact,
  realizedSaving,
  statusMeta,
} from '../../utils/kaizenMetrics.js';

const PROPOSAL_LIMIT = 200;

const EMPTY_DRAFT = {
  title: '',
  waste: 'motion',
  category: 'simplification',
  machineId: '',
  proposal: '',
  savingMode: 'rupees',
  savingValue: '',
  photoUrl: '',
};

export default function OperatorKaizen({
  metrics,
  user,
  machines = [],
  onSubmit,
  loading = false,
}) {
  const mine = metrics?.mine || { ideas: [], total: 0 };
  const famous = metrics?.hallOfFame || [];

  const [draft, setDraft] = useState(EMPTY_DRAFT);
  const [submitting, setSubmitting] = useState(false);
  const [receipt, setReceipt] = useState(null);
  const [error, setError] = useState('');

  const set = (key) => (event) => {
    const { value } = event.target;
    setDraft((current) => ({ ...current, [key]: value }));
  };

  // Live preview of the rupee figure so the operator sees what the
  // supervisor will see before they commit to a number.
  const annualSaving = useMemo(() => {
    const amount = Number(draft.savingValue) || 0;
    if (amount <= 0) return 0;
    return draft.savingMode === 'minutes'
      ? minutesPerDayToAnnualRupees(amount)
      : Math.round(amount);
  }, [draft.savingMode, draft.savingValue]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!draft.title.trim()) {
      setError('Give the idea a title so people can find it.');
      return;
    }
    if (!draft.proposal.trim()) {
      setError('Add a line on why it is worth fixing.');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      const saved = await onSubmit({
        title: draft.title.trim(),
        proposal: draft.proposal.trim(),
        waste_category: draft.waste,
        category: draft.category,
        machine_id: draft.machineId || null,
        estimated_saving: annualSaving,
        before_photo_url: draft.photoUrl.trim() || null,
        created_by_name: user?.name || 'Operator',
      });
      setReceipt({ id: saved?.id || 'your idea', saving: annualSaving });
      setDraft(EMPTY_DRAFT);
    } catch (err) {
      setError(err?.message || 'Could not save the idea. It is kept on this device — try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="rd-board kz-board kz-board-operator" data-testid="operator-kaizen" data-loading={loading ? 'true' : 'false'}>

      {/* ---------- 1. Submit ---------- */}
      <section className="kz-submit" aria-labelledby="kz-submit-heading">
        <header className="kz-submit-head">
          <div>
            <span className="rd-kicker"><Lightbulb size={13} aria-hidden="true" /> Spotted some waste?</span>
            <h2 id="kz-submit-heading">Submit an idea</h2>
          </div>
          <p className="kz-submit-lead">
            Four fields, thirty seconds. Every idea gets a reply from your supervisor.
          </p>
        </header>

        {receipt && (
          <div className="kz-receipt" role="status" data-testid="kaizen-receipt">
            <CheckCircle2 size={18} aria-hidden="true" />
            <div>
              <strong>Thank you — idea {receipt.id} submitted.</strong>
              <span>
                {receipt.saving > 0
                  ? `Logged at ${formatInr(receipt.saving)} a year. Your supervisor reviews it next.`
                  : 'Your supervisor reviews it next and will estimate the saving with you.'}
              </span>
            </div>
            <button type="button" className="kz-receipt-close" onClick={() => setReceipt(null)}>Dismiss</button>
          </div>
        )}

        <form className="kz-form" onSubmit={handleSubmit}>
          <div className="kz-field kz-field-wide">
            <label htmlFor="kz-title">What is the idea?</label>
            <input
              id="kz-title"
              value={draft.title}
              onChange={set('title')}
              placeholder="e.g. Move the scrap bin next to the unloading table"
              maxLength={120}
              required
            />
          </div>

          <div className="kz-field">
            <label htmlFor="kz-waste">What is the waste?</label>
            <select id="kz-waste" value={draft.waste} onChange={set('waste')}>
              {LEAN_WASTES.map((waste) => (
                <option key={waste.value} value={waste.value}>{waste.label} — {waste.hint}</option>
              ))}
            </select>
          </div>

          <div className="kz-field">
            <label htmlFor="kz-category">Improvement type</label>
            <select id="kz-category" value={draft.category} onChange={set('category')}>
              {KAIZEN_CATEGORIES.map((category) => (
                <option key={category.value} value={category.value}>{category.label}</option>
              ))}
            </select>
          </div>

          <div className="kz-field">
            <label htmlFor="kz-machine">Machine (optional)</label>
            <select id="kz-machine" value={draft.machineId} onChange={set('machineId')}>
              <option value="">Not machine specific</option>
              {machines.map((machine) => (
                <option key={machine.id || machine.machine_id} value={machine.machine_id || machine.id}>
                  {machine.machine_id || machine.id} — {machine.machine_name || machine.name}
                </option>
              ))}
            </select>
          </div>

          <div className="kz-field kz-field-wide">
            <label htmlFor="kz-proposal">
              Why fix it?
              <small className={draft.proposal.length >= PROPOSAL_LIMIT ? 'over' : ''}>
                {draft.proposal.length}/{PROPOSAL_LIMIT}
              </small>
            </label>
            <textarea
              id="kz-proposal"
              value={draft.proposal}
              onChange={set('proposal')}
              rows={2}
              maxLength={PROPOSAL_LIMIT}
              placeholder="What goes wrong today, and what changes if we fix it?"
              required
            />
          </div>

          <div className="kz-field kz-field-saving">
            <label htmlFor="kz-saving">Roughly what does it save?</label>
            <div className="kz-saving-row">
              <div className="kz-toggle" role="group" aria-label="Saving unit">
                <button
                  type="button"
                  className={draft.savingMode === 'rupees' ? 'active' : ''}
                  onClick={() => setDraft((d) => ({ ...d, savingMode: 'rupees' }))}
                >
                  <IndianRupee size={12} aria-hidden="true" /> per year
                </button>
                <button
                  type="button"
                  className={draft.savingMode === 'minutes' ? 'active' : ''}
                  onClick={() => setDraft((d) => ({ ...d, savingMode: 'minutes' }))}
                >
                  <Clock size={12} aria-hidden="true" /> min / day
                </button>
              </div>
              <input
                id="kz-saving"
                type="number"
                min="0"
                inputMode="numeric"
                value={draft.savingValue}
                onChange={set('savingValue')}
                placeholder={draft.savingMode === 'minutes' ? 'e.g. 12' : 'e.g. 24000'}
              />
            </div>
            {draft.savingMode === 'minutes' && annualSaving > 0 && (
              <small className="kz-saving-hint" data-testid="kaizen-saving-preview">
                ≈ {formatInr(annualSaving)} a year at the shop labour rate
              </small>
            )}
          </div>

          <div className="kz-field kz-field-wide">
            <label htmlFor="kz-photo"><Camera size={12} aria-hidden="true" /> Photo of the problem (optional)</label>
            <input
              id="kz-photo"
              type="url"
              value={draft.photoUrl}
              onChange={set('photoUrl')}
              placeholder="Paste a photo link, or leave blank and add it later"
            />
          </div>

          {error && <p className="kz-form-error" role="alert">{error}</p>}

          <div className="kz-form-actions">
            <button type="submit" className="kz-btn kz-btn-primary" disabled={submitting} data-testid="kaizen-submit">
              <Send size={14} aria-hidden="true" /> {submitting ? 'Submitting…' : 'Submit idea'}
            </button>
          </div>
        </form>
      </section>

      {/* ---------- 2. My ideas ---------- */}
      <DashboardChart
        title="My ideas"
        subtitle={`${mine.total} submitted`}
        caption={mine.realizedTotal > 0 ? `${formatInrCompact(mine.realizedTotal)} saved so far` : undefined}
      >
        <div className="kz-mine-strip">
          <MineStat label="Awaiting review" value={mine.awaitingReview ?? 0} />
          <MineStat label="In trial" value={mine.inTrial ?? 0} tone="warning" />
          <MineStat label="Implemented" value={mine.implemented ?? 0} tone="ok" />
          <MineStat
            label="Money you saved"
            value={mine.realizedTotal > 0 ? formatInrCompact(mine.realizedTotal) : '—'}
            tone={mine.realizedTotal > 0 ? 'ok' : ''}
          />
        </div>

        {mine.ideas.length ? (
          <div className="kz-idea-list" data-testid="kaizen-my-ideas">
            {mine.ideas.map((idea) => (
              <KaizenIdeaCard
                key={idea.id}
                idea={idea}
                meta={<span className="kz-chip subtle">{statusMeta(idea.status).stage === 'submitted' ? 'With your supervisor' : 'Moving'}</span>}
              />
            ))}
          </div>
        ) : (
          <p className="rd-empty">
            <Sparkles size={15} aria-hidden="true" />
            No ideas from you yet. The form above takes about thirty seconds.
          </p>
        )}
      </DashboardChart>

      {/* ---------- 3. Hall of fame ---------- */}
      <DashboardChart
        title="Hall of fame"
        subtitle="Ideas from this shop that landed"
        caption="Verified savings, not estimates"
      >
        {famous.length ? (
          <div className="kz-fame" data-testid="kaizen-hall-of-fame">
            {famous.map((idea, index) => (
              <article className="kz-fame-item" key={idea.id}>
                <div className="kz-fame-rank" aria-hidden="true">
                  <Trophy size={14} />
                  <span>{index + 1}</span>
                </div>
                <div className="kz-fame-text">
                  <strong>{idea.title}</strong>
                  <small>{idea.created_by_name} · {idea.id}</small>
                </div>
                <div className="kz-fame-saving">
                  <strong>{formatInrCompact(realizedSaving(idea) ?? 0)}</strong>
                  <small>saved / year</small>
                </div>
                <KaizenPhotoGallery
                  before={idea.before_photo_url}
                  after={idea.after_photo_url}
                  title={idea.title}
                  compact
                />
              </article>
            ))}
          </div>
        ) : (
          <p className="rd-empty">
            <Trophy size={15} aria-hidden="true" />
            Nothing verified yet. The first idea through the whole cycle lands here.
          </p>
        )}
      </DashboardChart>
    </div>
  );
}

function MineStat({ label, value, tone = '' }) {
  return (
    <div className={`rd-mini-stat ${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
