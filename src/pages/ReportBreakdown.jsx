/**
 * Report Breakdown — the 10-second issue logger.
 *
 * One page, one screen, three questions: which machine, what's wrong,
 * photo? Everything else on this page exists to remove a decision from
 * the person reporting, not to add one.
 *
 * The design constraint that drove every choice here: the operator who
 * notices the problem is holding a phone, wearing gloves, standing next
 * to a machine that is costing ₹25,000 an hour to stand still. They
 * will not scroll a wizard. So:
 *
 *   - all three steps are on one screen, always visible, never gated
 *     behind Next buttons — you can scan, speak and submit without a
 *     single page transition,
 *   - urgency and subsystem are *inferred* from plain language and
 *     shown pre-filled, editable, never asked as a dropdown,
 *   - the only two required fields are machine and issue text,
 *   - the confirmation names a person and a time, because "submitted
 *     successfully" tells a shop floor nothing.
 *
 * Role → what changes (see components/breakdown/RoleForm.jsx):
 *   operator    the three steps, nothing else
 *   technician  + their findings, next action, and who to escalate to
 *   supervisor  + reason, assignee, and the downtime cost per hour
 *   vendor      + callback contact, and only contracted machines
 *
 * @workflow
 *   1. Read tf_user → resolve the breakdown role
 *   2. Fetch machines + recent reports (3s budget, demo fallback)
 *   3. Auto-select a machine from ?machine= (QR deep link) where given
 *   4. Classify the issue text on every keystroke — locally, no network
 *   5. Route the finished record, persist local-first, show the receipt
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, CheckCircle2, Send, Siren, Zap } from 'lucide-react';
import AppShell from '../components/AppShell';
import { getRoleLabel } from '../lib/roles';
import MachineSelector from '../components/breakdown/MachineSelector.jsx';
import IssueCapture from '../components/breakdown/IssueCapture.jsx';
import PhotoCapture from '../components/breakdown/PhotoCapture.jsx';
import HistorySuggestion from '../components/breakdown/HistorySuggestion.jsx';
import { findSimilarFixes } from '../utils/similarFixes.js';
import RoleForm from '../components/breakdown/RoleForm.jsx';
import {
  BREAKDOWN_ROLES,
  TECH_SEVERITY,
  assignedTechnician,
  buildBreakdownRecord,
  classifyIssue,
  confirmationMessage,
  formatResponseWindow,
  machineHistoryInsight,
  machineIdOf,
  machineNameOf,
  reporterSummary,
  resolveBreakdownRole,
  shiftSummary,
  urgencyMeta,
  validateDraft,
  vendorMachines,
  vendorSummary,
} from '../utils/breakdownRouter.js';
import {
  DEMO_BREAKDOWN_MACHINES,
  DEMO_BREAKDOWN_REPORTS,
  DEMO_REPORTER,
  DEMO_TECHNICIANS,
  DEMO_VENDOR_CONTACT,
} from '../utils/demoBreakdown.js';
import { readStoredUser } from '../utils/dashboardMetrics.js';
import { isShiftScopedRole, visibleMachinesForUser } from '../utils/machineVisibility.js';
import { applyCurrentShiftAssignments } from '../utils/shiftAssignments.js';
import { supabase } from '@/supabaseClient';
import './Dashboard.css';
import './ReportBreakdown.css';

const BASE = import.meta.env.BASE_URL;
const OFFLINE_QUEUE_KEY = 'tf_offline_tickets';

/** Header copy per role. Says what this page does *for them*. */
const ROLE_HEADINGS = {
  [BREAKDOWN_ROLES.OPERATOR]: {
    kicker: 'Report a breakdown',
    title: 'Tell TurboFix what happened',
    lead: 'Pick the machine, add a short description, and send it on.',
  },
  [BREAKDOWN_ROLES.TECHNICIAN]: {
    kicker: 'Log an issue',
    title: 'Capture what you found',
    lead: 'Add the machine, describe the fault, and keep moving.',
  },
  [BREAKDOWN_ROLES.SUPERVISOR]: {
    kicker: 'Raise and assign',
    title: 'Route the next action',
    lead: 'Pick the machine, assign ownership, and send it forward.',
  },
  [BREAKDOWN_ROLES.VENDOR]: {
    kicker: 'Contracted equipment',
    title: 'Report a machine issue',
    lead: 'Choose the machine you support and add the problem.',
  },
};

/** Supabase read with the 3s budget the rest of the app uses. */
function fetchWithTimeout(promise, ms = 3000) {
  return Promise.race([
    promise,
    new Promise((resolve) => setTimeout(() => resolve({ data: [] }), ms)),
  ]).catch(() => ({ data: [] }));
}

/**
 * Machine rows arrive in two shapes across this codebase (`id/name`
 * from the plain table read, `machine_id/machine_name` from the vault
 * view). Normalise once here rather than guarding at every call site.
 */
function normaliseMachine(row) {
  if (!row) return null;
  return {
    ...row,
    machine_id: row.machine_id || row.id,
    machine_name: row.machine_name || row.name,
  };
}

/** Tickets are the breakdown history — same rows, reporting vocabulary. */
function normaliseReport(row) {
  if (!row) return null;
  return {
    ...row,
    issue_text: row.issue_text || row.description || '',
    created_at: row.created_at || row.reported_at,
    urgency: String(row.urgency || 'medium').toLowerCase(),
  };
}

async function fetchBreakdownSources() {
  const [machinesRes, ticketsRes, directoryRes, shiftRosterRes, shiftAssignmentRes] = await Promise.all([
    fetchWithTimeout(supabase.from('machines').select('*')),
    fetchWithTimeout(
      supabase.from('tickets').select('*').order('created_at', { ascending: false }).limit(200),
    ),
    fetchWithTimeout(supabase.functions.invoke('onboard_team_member', { body: { action: 'list' } })),
    fetchWithTimeout(supabase.from('shift_rosters').select('*')),
    fetchWithTimeout(supabase.from('machine_shift_assignments').select('*')),
  ]);
  const members = directoryRes.data?.members || [];
  const teamById = Object.fromEntries(members.map((member) => [member.user_id, member]));
  const shifted = applyCurrentShiftAssignments(machinesRes.data || [], shiftRosterRes.data || [], shiftAssignmentRes.data || []);

  return {
    machines: shifted.map((machine) => ({
      ...normaliseMachine(machine),
      assignments: {
        ...(machine.assignments || {}),
        technician: teamById[machine.technician_user_id] || machine.assignments?.technician || null,
        supervisor: teamById[machine.supervisor_id] || machine.assignments?.supervisor || null,
        engineer: teamById[machine.engineer_user_id] || machine.assignments?.engineer || null,
      },
    })).filter(Boolean),
    reports: (ticketsRes.data || []).map(normaliseReport).filter(Boolean),
  };
}

const EMPTY_DRAFT = {
  machine: null,
  issueText: '',
  photoUrl: '',
  severity: TECH_SEVERITY.SELF,
  nextAction: '',
  finding: '',
  reason: 'breakdown',
  assignTo: null,
  contactName: '',
  contactPhone: '',
  availability: '',
};

export default function ReportBreakdown() {
  const [user, setUser] = useState(() => readStoredUser());
  const [machines, setMachines] = useState([]);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDemo, setIsDemo] = useState(false);
  const [error, setError] = useState('');

  const [draft, setDraft] = useState(EMPTY_DRAFT);
  const [urgencyOverride, setUrgencyOverride] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [receipt, setReceipt] = useState(null);

  const autoSelectedRef = useRef(false);

  const role = useMemo(() => resolveBreakdownRole(user?.role), [user]);

  useEffect(() => {
    document.title = 'Report a breakdown | TurboFix';
  }, []);

  /**
   * AppShell pins its floating "Ask AI" trigger to the bottom-right at
   * z-index 999, which on a 375px phone covers the bottom edge of the
   * Send button — a thumb aiming at Send opens the assistant instead.
   * Everywhere else that overlap costs nothing; on the one page whose
   * entire purpose is a single fast tap it is a broken primary action,
   * so the logger lifts the trigger clear of the submit bar while it is
   * open. See the body.brk-logger-open rule in ReportBreakdown.css.
   *
   * Scoped to the form: the receipt has no submit bar, and a trigger
   * still parked 136px up would sit on top of the "who was notified"
   * list — the one thing the reporter is there to read.
   */
  useEffect(() => {
    if (receipt) return undefined;
    document.body.classList.add('brk-logger-open');
    return () => document.body.classList.remove('brk-logger-open');
  }, [receipt]);

  // Signing in or out on another tab must re-point the form rather than
  // leave a vendor looking at the supervisor's assignment picker.
  useEffect(() => {
    const refresh = () => setUser(readStoredUser());
    window.addEventListener('authChanged', refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener('authChanged', refresh);
      window.removeEventListener('storage', refresh);
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    fetchBreakdownSources()
      .then((sources) => {
        if (!mounted) return;
        const demoSession = user?.inventory_mode === 'demo';
        setIsDemo(demoSession);
        setMachines(demoSession ? DEMO_BREAKDOWN_MACHINES : sources.machines);
        setReports(demoSession ? DEMO_BREAKDOWN_REPORTS : sources.reports);
      })
      .catch((err) => {
        if (!mounted) return;
        setError(err?.message || 'Could not reach the workspace');
        setIsDemo(false);
        setMachines([]);
        setReports([]);
      })
      .finally(() => { if (mounted) setLoading(false); });

    return () => { mounted = false; };
  }, [user?.inventory_mode]);

  /** On demo data a signed-out visitor still gets a filled-in identity. */
  const effectiveUser = useMemo(() => {
    if (user?.name) return user;
    return isDemo ? DEMO_REPORTER : user;
  }, [isDemo, user]);

  /**
   * Vendors see only what they hold a contract on. This is a filter on
   * the *picker*, not a cosmetic badge: a vendor should not be able to
   * file against a machine that is not theirs.
   */
  const selectableMachines = useMemo(() => {
    if (role === BREAKDOWN_ROLES.VENDOR) {
      return vendorMachines(machines, effectiveUser?.vendor_id || (isDemo ? DEMO_VENDOR_CONTACT.vendor_id : null));
    }
    if (isShiftScopedRole(effectiveUser?.role)) return visibleMachinesForUser(machines, effectiveUser);
    return machines;
  }, [effectiveUser, isDemo, machines, role]);

  const technicians = useMemo(() => {
    if (isDemo) return DEMO_TECHNICIANS;
    // Derive the assignment list from who actually owns machines here,
    // so the picker never offers someone who has left the plant.
    const seen = new Map();
    machines.forEach((machine) => {
      const tech = assignedTechnician(machine);
      if (tech?.name && !seen.has(tech.name)) {
        seen.set(tech.name, { user_id: tech.userId || tech.name, name: tech.name, role: tech.role });
      }
    });
    return Array.from(seen.values());
  }, [isDemo, machines]);

  /**
   * Auto-select the machine, once, from the strongest available signal:
   * a ?machine= deep link (that is what the QR gateway hands us), then
   * a technician or vendor who only has one machine to report on.
   */
  useEffect(() => {
    if (autoSelectedRef.current || loading || !selectableMachines.length) return;

    const params = new URLSearchParams(window.location.search);
    const wanted = params.get('machine') || params.get('machine_id');
    const fromLink = wanted
      ? selectableMachines.find((machine) => String(machineIdOf(machine)) === String(wanted))
      : null;

    const only = selectableMachines.length === 1
      && (role === BREAKDOWN_ROLES.TECHNICIAN || role === BREAKDOWN_ROLES.VENDOR)
      ? selectableMachines[0]
      : null;

    const pick = fromLink || only;
    if (pick) {
      setDraft((current) => ({ ...current, machine: pick }));
      autoSelectedRef.current = true;
    }
  }, [loading, role, selectableMachines]);

  /** Vendors get their callback details pre-filled from the login. */
  useEffect(() => {
    if (role !== BREAKDOWN_ROLES.VENDOR) return;
    setDraft((current) => {
      if (current.contactName) return current;
      return {
        ...current,
        contactName: effectiveUser?.name || (isDemo ? DEMO_VENDOR_CONTACT.contact_name : ''),
        contactPhone: effectiveUser?.phone || (isDemo ? DEMO_VENDOR_CONTACT.phone : ''),
        availability: isDemo ? DEMO_VENDOR_CONTACT.availability : '',
      };
    });
  }, [effectiveUser, isDemo, role]);

  // Local, synchronous, on every keystroke. No debounce and no network:
  // the suggestion has to keep up with typing or it is just a flicker.
  const classification = useMemo(() => classifyIssue(draft.issueText), [draft.issueText]);

  // Distinct from `history` above: that's "this machine has been acting
  // up" at machine-selection time; this matches the sentence being typed
  // right now against past repair_action/root_cause, on any machine (see
  // utils/similarFixes.js for why the two don't overlap).
  const similarFixes = useMemo(
    () => findSimilarFixes({ issueText: draft.issueText, machine: draft.machine, tickets: reports }),
    [draft.issueText, draft.machine, reports]
  );
  const urgency = urgencyOverride || classification.urgency;

  const history = useMemo(
    () => machineHistoryInsight(machineIdOf(draft.machine), reports),
    [draft.machine, reports],
  );

  const validation = useMemo(() => validateDraft(draft, role), [draft, role]);

  const summary = useMemo(() => {
    if (role === BREAKDOWN_ROLES.SUPERVISOR) return shiftSummary(reports);
    if (role === BREAKDOWN_ROLES.VENDOR) {
      return vendorSummary(reports, effectiveUser?.vendor_id || (isDemo ? DEMO_VENDOR_CONTACT.vendor_id : null));
    }
    return reporterSummary(reports, effectiveUser);
  }, [effectiveUser, isDemo, reports, role]);

  const patch = useCallback((changes) => setDraft((current) => ({ ...current, ...changes })), []);

  /** Voice → text, through the same edge function the assistant uses. */
  const transcribe = useCallback(async (blob) => {
    const dataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(new Error('Could not read the recording.'));
      reader.readAsDataURL(blob);
    });

    const { data, error: fnError } = await supabase.functions.invoke('ai_translation', {
      body: { action: 'transcribe', audio: dataUrl },
    });
    if (fnError || data?.error) throw new Error(data?.error || fnError?.message || 'Transcription failed');
    return String(data?.transcript || '').trim();
  }, []);

  /** Background photo upload. Never on the submit path — see PhotoCapture. */
  const uploadPhoto = useCallback(async (dataUrl) => {
    const machineId = machineIdOf(draft.machine) || 'unassigned';
    const response = await fetch(dataUrl);
    const blob = await response.blob();
    const path = `${machineId}/breakdown-${Date.now()}.jpg`;

    const { error: uploadError } = await supabase.storage
      .from('repair-proofs')
      .upload(path, blob, { contentType: 'image/jpeg' });
    if (uploadError) throw uploadError;

    const { data } = supabase.storage.from('repair-proofs').getPublicUrl(path);
    return data?.publicUrl || '';
  }, [draft.machine]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!validation.valid || submitting) return;

    setSubmitting(true);
    setError('');

    const { record, routing } = buildBreakdownRecord(
      { ...draft, urgency, classification },
      { role, user: effectiveUser, reports },
    );

    // Local-first: the receipt is honest the moment it is shown, and a
    // dropped connection cannot lose what the operator just reported.
    setReports((current) => [record, ...current]);
    setReceipt({ record, routing });

    const companyCode = effectiveUser?.company_code || 'EXIDE';
    const companyId = effectiveUser?.company_id || null;

    const ticketRecord = {
      id: record.id || ('brk-' + Date.now()),
      machine_id: record.machine_id,
      issue_text: record.issue_text,
      description: record.issue_text,
      urgency: record.urgency || 'medium',
      status: 'open',
      lifecycle_stage: 'reported',
      wo_number: record.wo_number,
      photo_url: record.photo_url,
      reported_by: record.reported_by,
      assigned_to: record.assigned_to,
      company_code: companyCode,
      company_id: companyId,
      created_at: record.created_at || new Date().toISOString(),
    };

    try {
      const breakdownReports = JSON.parse(localStorage.getItem('tf_breakdown_reports') || '[]');
      breakdownReports.unshift(ticketRecord);
      localStorage.setItem('tf_breakdown_reports', JSON.stringify(breakdownReports));

      const offlineQueue = JSON.parse(localStorage.getItem(OFFLINE_QUEUE_KEY) || '[]');
      offlineQueue.unshift(ticketRecord);
      localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(offlineQueue));

      window.dispatchEvent(new Event('ticketCreated'));
      window.dispatchEvent(new Event('storage'));
    } catch (e) {
      console.warn('Could not store breakdown report locally:', e);
    }

    try {
      const { error: insertError } = await supabase.from('tickets').insert(ticketRecord);
      if (insertError) console.warn('Supabase insert notice (handled locally):', insertError.message);
    } catch {
      // Local copy already saved above
    } finally {
      setSubmitting(false);
    }
  };

  const reportAnother = () => {
    setReceipt(null);
    setDraft({ ...EMPTY_DRAFT, machine: draft.machine });
    setUrgencyOverride('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const heading = ROLE_HEADINGS[role] || ROLE_HEADINGS[BREAKDOWN_ROLES.OPERATOR];
  const meta = urgencyMeta(urgency);

  /* ---------- receipt ---------- */
  if (receipt) {
    const { record, routing } = receipt;
    return (
      <AppShell active="report">
        <div className="decision-page md-dashboard rd-page brk-page" data-role={role} data-testid="report-breakdown-page">
          <section className="brk-receipt" data-testid="breakdown-receipt" role="status">
            <span className="brk-receipt-tick" aria-hidden="true"><CheckCircle2 size={40} /></span>
            <h1>Reported</h1>
            <p className="brk-receipt-line" data-testid="breakdown-receipt-message">
              {confirmationMessage(routing, { machine: draft.machine })}
            </p>

            <dl className="brk-receipt-facts">
              <div>
                <dt>Work order</dt>
                <dd>{record.wo_number}</dd>
              </div>
              <div>
                <dt>Machine</dt>
                <dd>{record.machine_name || record.machine_id}</dd>
              </div>
              <div>
                <dt>Urgency</dt>
                <dd className={`tone-${urgencyMeta(record.urgency).tone}`}>{urgencyMeta(record.urgency).label}</dd>
              </div>
              <div>
                <dt>Response by</dt>
                <dd>{formatResponseWindow(routing.responseMinutes)}</dd>
              </div>
            </dl>

            {routing.notify.length > 0 && (
              <ul className="brk-receipt-notified">
                {routing.notify.map((person) => (
                  <li key={`${person.name}-${person.channel}`}>
                    <strong>{person.name}</strong>
                    <span>{person.why} · {person.channel}</span>
                  </li>
                ))}
              </ul>
            )}

            <div className="brk-receipt-actions">
              <button type="button" className="brk-btn brk-btn-primary" onClick={reportAnother} data-testid="breakdown-report-another">
                Report another
              </button>
              <a className="brk-btn" href={`${BASE}tickets.html`}>
                See the queue <ArrowRight size={14} aria-hidden="true" />
              </a>
            </div>
          </section>
        </div>
      </AppShell>
    );
  }

  /* ---------- form ---------- */
  return (
    <AppShell active="report">
      <div className="decision-page md-dashboard rd-page brk-page" data-role={role} data-testid="report-breakdown-page">
        <header className="md-header rd-header">
          <div>
            <span className="eyebrow eyebrow-light">
              <Siren size={13} aria-hidden="true" /> {heading.kicker}
            </span>
            <h1>{heading.title}</h1>
            <p>{heading.lead}</p>
          </div>
          {summary?.label && (
            <p className="brk-summary-pill" data-testid="breakdown-summary">
              <Zap size={12} aria-hidden="true" /> {summary.label}
            </p>
          )}
        </header>

        {/* QR Scan Connection Banner */}
        <div className="stitch-glass-tile overflow-hidden mb-6 flex flex-col md:flex-row items-center gap-6 p-4 sm:p-5 relative group border border-amber-500/30">
          <div className="w-full md:w-1/3 h-44 rounded-xl overflow-hidden relative flex-shrink-0">
            <img
              src={`${import.meta.env.BASE_URL}assets/qr_scanner_breakdown.jpg`}
              alt="10-Second QR Code Breakdown Reporting"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A] via-transparent to-transparent opacity-70" />
            <span className="absolute bottom-2 left-2 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/30 text-amber-300 border border-amber-500/40 backdrop-blur-md">
              Instant 10-Sec QR Scan
            </span>
          </div>
          <div className="flex-1 space-y-2">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 text-xs font-semibold border border-amber-500/20">
              <span>{getRoleLabel(user?.role)} view</span>
            </div>
            <h2 className="text-lg font-bold text-slate-100 leading-snug">
              "No dropdown menus or paper forms — scan the machine tag, record voice notes, and notify shift leads instantly."
            </h2>
            <p className="text-xs text-slate-300 leading-relaxed">
              Every breakdown alert automatically routes to assigned shift technicians, notifies production engineers, and logs exact timestamped evidence.
            </p>
          </div>
        </div>

        {error && (
          <div className="decision-alert">
            {error}. Sample machines are shown until the workspace is reachable.
          </div>
        )}

        {isDemo && !loading && (
          <p className="rd-demo-banner" data-testid="breakdown-demo-banner">
            Showing a sample plant until live machine data is available.
          </p>
        )}

        <form className="brk-layout" onSubmit={handleSubmit} noValidate>
          <div className="brk-main">
            <section className="brk-step" aria-labelledby="brk-step-1">
              <header className="brk-step-head">
                <span className="brk-step-num" aria-hidden="true">1</span>
                <h2 id="brk-step-1">Machine</h2>
              </header>
              <MachineSelector
                machines={selectableMachines}
                value={draft.machine}
                onSelect={(machine) => patch({ machine })}
                autoFocus={!draft.machine}
                disabled={submitting}
                emptyHint={role === BREAKDOWN_ROLES.VENDOR
                  ? 'Only machines under your contract appear here.'
                  : 'No machine matches that. Try the asset code on the sticker.'}
              />
            </section>

            <section className="brk-step" aria-labelledby="brk-step-2">
              <header className="brk-step-head">
                <span className="brk-step-num" aria-hidden="true">2</span>
                <h2 id="brk-step-2">Issue</h2>
              </header>
              <IssueCapture
                value={draft.issueText}
                onChange={(issueText) => patch({ issueText })}
                classification={classification}
                urgency={urgency}
                urgencyOverridden={Boolean(urgencyOverride)}
                onUrgencyChange={setUrgencyOverride}
                onTranscribe={transcribe}
                disabled={submitting}
                similarFixes={similarFixes}
              />
            </section>

            <section className="brk-step" aria-labelledby="brk-step-3">
              <header className="brk-step-head">
                <span className="brk-step-num" aria-hidden="true">3</span>
                <h2 id="brk-step-3">Photo</h2>
              </header>
              <PhotoCapture
                value={draft.photoUrl}
                onChange={(photoUrl) => patch({ photoUrl })}
                onUpload={isDemo ? undefined : uploadPhoto}
                encouraged={meta.rank <= 1}
                disabled={submitting}
              />
            </section>

            {role !== BREAKDOWN_ROLES.OPERATOR && (
              <section className="brk-step" aria-labelledby="brk-step-role">
                <header className="brk-step-head">
                  <span className="brk-step-num" aria-hidden="true">4</span>
                  <h2 id="brk-step-role">
                    {role === BREAKDOWN_ROLES.TECHNICIAN && 'Findings'}
                    {role === BREAKDOWN_ROLES.SUPERVISOR && 'Assignment'}
                    {role === BREAKDOWN_ROLES.VENDOR && 'Contact'}
                  </h2>
                </header>
                <RoleForm
                  role={role}
                  draft={draft}
                  onChange={patch}
                  technicians={technicians}
                  machine={draft.machine}
                  disabled={submitting}
                />
              </section>
            )}
          </div>

          <aside className="brk-side">
            <HistorySuggestion insight={history} machineId={machineIdOf(draft.machine)} />

            {draft.machine && (
              <div className="brk-preview" data-testid="breakdown-preview">
                <h3>Going to</h3>
                <p className="brk-preview-name">{machineNameOf(draft.machine)}</p>
                <p className="brk-preview-meta">
                  {assignedTechnician(draft.machine)?.name || 'Supervisor queue — nobody assigned'}
                  {' · '}
                  answer within {formatResponseWindow(meta.responseMinutes)}
                </p>
              </div>
            )}
          </aside>

          <div className="brk-submit-bar">
            <div className="brk-submit-status">
              {validation.valid
                ? <span className={`brk-ready tone-${meta.tone}`}>Ready — {meta.label.toLowerCase()} report</span>
                : <span className="brk-blocked">{validation.errors.machine || validation.errors.issueText || validation.errors.contactName}</span>}
            </div>
            <button
              type="submit"
              className="brk-btn brk-btn-primary brk-btn-submit"
              disabled={!validation.valid || submitting || loading}
              data-testid="breakdown-submit"
            >
              <Send size={15} aria-hidden="true" />
              {submitting ? 'Sending…' : 'Send report'}
            </button>
          </div>
        </form>
      </div>
    </AppShell>
  );
}
