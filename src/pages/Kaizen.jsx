/**
 * Kaizen — role-aware continuous-improvement board.
 *
 * One page, three audiences, and almost nothing in common between what
 * they need from it. The operator needs a submission box and proof that
 * ideas here actually land. The supervisor needs a decision queue. The
 * plant manager needs to know whether any of it returned money. Showing
 * all three to everyone is how a Kaizen page turns into a form nobody
 * fills in, so the page reads the signed-in role once and renders the
 * board built for it — no toggle, nothing to configure.
 *
 * Role → board
 *   operator, technician, contractor        → OperatorKaizen  ("My ideas")
 *   supervisor, engineer, shift in-charge   → SupervisorKaizen ("Review & approve")
 *   owner, plant_manager, admin             → ManagerKaizen   ("Impact")
 *   anything else / signed out              → ManagerKaizen (read-only summary)
 *
 * Impact tracking is the spine of all three: an idea carries an
 * *estimated* saving from the moment it is submitted and a *realized*
 * saving from the moment it is verified. The two are never summed. See
 * utils/kaizenMetrics.js, where all the arithmetic lives.
 *
 * @workflow
 *   1. Read tf_user → resolve the Kaizen role
 *   2. Fetch kaizen_opportunities + machines (3s budget, demo fallback)
 *   3. Compute that role's metrics through a 5-minute cache
 *   4. Render the board; every write updates local state first, then
 *      Supabase, so the shop floor stays usable on a bad connection
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Lightbulb } from 'lucide-react';
import AppShell from '../components/AppShell';
import { getRoleLabel } from '../lib/roles';
import OperatorKaizen from '../components/kaizen/OperatorKaizen.jsx';
import SupervisorKaizen from '../components/kaizen/SupervisorKaizen.jsx';
import ManagerKaizen from '../components/kaizen/ManagerKaizen.jsx';
import {
  KAIZEN_ROLES,
  buildKaizenMetrics,
  resolveKaizenRole,
  nextIdeaId,
} from '../utils/kaizenMetrics.js';
import { DEMO_KAIZENS, DEMO_OPERATOR } from '../utils/demoKaizen.js';
import { createMetricsCache, readStoredUser } from '../utils/dashboardMetrics.js';
import { supabase } from '@/supabaseClient';
import './Dashboard.css';
import './Kaizen.css';

/**
 * Header copy and the two shortcut links, per role. The links are not
 * decoration: `records.html` is gated away from operators by ROLE_NAV,
 * so offering it to them would be a dead end. Each role gets the two
 * places they actually go next from here.
 */
const ROLE_HEADINGS = {
  [KAIZEN_ROLES.OPERATOR]: {
    kicker: 'My ideas',
    title: 'Kaizen',
    lead: 'You see the waste before anyone else does. Log it here and it gets an answer.',
    links: [
      { label: 'My machines', href: 'machines.html', primary: false },
      { label: 'Report an issue', href: 'support.html', primary: true },
    ],
  },
  [KAIZEN_ROLES.SUPERVISOR]: {
    kicker: 'Review & approve',
    title: 'Kaizen review',
    lead: 'Decide what gets tried, keep the trials moving, and turn what works into the standard.',
    links: [
      { label: 'Machine health', href: 'machines.html', primary: false },
      { label: 'Open tickets', href: 'tickets.html', primary: true },
    ],
  },
  [KAIZEN_ROLES.MANAGER]: {
    kicker: 'Impact',
    title: 'Kaizen impact',
    lead: 'What continuous improvement has actually returned, what is still in flight, and where it is stuck.',
    links: [
      { label: 'Improvement records', href: 'records.html', primary: false },
      { label: 'Business dashboard', href: 'dashboard.html', primary: true },
    ],
  },
};

/** Supabase read with the 3s budget the rest of the app uses. */
function fetchWithTimeout(promise, ms = 3000) {
  return Promise.race([
    promise,
    new Promise((resolve) => setTimeout(() => resolve({ data: [] }), ms)),
  ]).catch(() => ({ data: [] }));
}

async function fetchKaizenSources() {
  const [ideasRes, machinesRes] = await Promise.all([
    fetchWithTimeout(supabase.from('kaizen_opportunities').select('*').order('created_at', { ascending: false })),
    fetchWithTimeout(supabase.from('machines').select('id, machine_id, machine_name, location')),
  ]);

  return {
    ideas: ideasRes.data || [],
    machines: machinesRes.data || [],
  };
}

/**
 * Estimated savings become realized savings at verification. Without a
 * measured figure from the field we book the estimate rather than zero —
 * a verified idea reporting ₹0 would drag the plant ROI down for a data
 * gap, not a business outcome. The board labels it as realized either
 * way, and a supervisor can correct it.
 */
function realizeSaving(idea) {
  const measured = idea?.realized_savings ?? idea?.actual_saving;
  if (measured != null && measured !== '' && Number(measured) > 0) return Number(measured);
  return Number(idea?.estimated_saving) || 0;
}

export default function Kaizen() {
  const [user, setUser] = useState(() => readStoredUser());
  const [ideas, setIdeas] = useState([]);
  const [machines, setMachines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isDemo, setIsDemo] = useState(false);

  // One cache per mount, 5-minute TTL — see createMetricsCache.
  const cacheRef = useRef(null);
  if (cacheRef.current === null) cacheRef.current = createMetricsCache();

  const role = useMemo(() => resolveKaizenRole(user?.role), [user]);

  useEffect(() => {
    document.title = 'Kaizen | TurboFix';
  }, []);

  // Signing in or out on another tab must re-point the board rather than
  // strand a supervisor on the manager view until they reload.
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

    fetchKaizenSources()
      .then((sources) => {
        if (!mounted) return;
        const demo = user?.inventory_mode === 'demo';
        cacheRef.current.clear();
        setIsDemo(demo);
        setIdeas(demo ? DEMO_KAIZENS : sources.ideas);
        setMachines(sources.machines);
      })
      .catch((err) => {
        if (!mounted) return;
        setError(err?.message || 'Could not reach the workspace');
        setIsDemo(false);
        setIdeas([]);
      })
      .finally(() => { if (mounted) setLoading(false); });

    return () => { mounted = false; };
  }, [user?.inventory_mode]);

  /**
   * On demo data a signed-out visitor would otherwise see an empty "My
   * ideas". Borrowing the demo operator's identity keeps the operator
   * board populated without touching what a real signed-in user sees.
   */
  const effectiveUser = useMemo(() => {
    if (!isDemo || role !== KAIZEN_ROLES.OPERATOR) return user;
    return user?.name ? user : { ...(user || {}), ...DEMO_OPERATOR };
  }, [isDemo, role, user]);

  const metrics = useMemo(() => {
    const key = [
      role,
      isDemo ? 'demo' : 'live',
      ideas.length,
      // Statuses change without the count changing; fold them into the key
      // so an approval invalidates the cache the same as a new idea would.
      ideas.map((idea) => `${idea?.id}:${idea?.status}`).join('|'),
      effectiveUser?.user_id || effectiveUser?.name || 'anon',
    ].join('~');

    return cacheRef.current.resolve(key, () => buildKaizenMetrics(role, { ideas, user: effectiveUser }));
  }, [role, ideas, effectiveUser, isDemo]);

  /** Local-first write: update state, then try to persist. */
  const persist = useCallback(async (id, patch) => {
    setIdeas((current) => current.map((idea) => (idea.id === id ? { ...idea, ...patch } : idea)));
    try {
      await supabase.from('kaizen_opportunities').update(patch).eq('id', id);
    } catch {
      // Offline or the row lives only in demo data. The board already
      // reflects the change; the next successful sync reconciles it.
    }
  }, []);

  const handleSubmitIdea = useCallback(async (draft) => {
    const record = {
      ...draft,
      id: nextIdeaId(ideas),
      status: 'submitted',
      estimated_cost: 0,
      realized_savings: null,
      standardisation_status: 'no_update_required',
      created_at: new Date().toISOString(),
    };

    setIdeas((current) => [record, ...current]);

    try {
      const { data } = await supabase.from('kaizen_opportunities').insert(record).select();
      if (data?.[0]) {
        setIdeas((current) => current.map((idea) => (idea.id === record.id ? data[0] : idea)));
        return data[0];
      }
    } catch {
      // Kept locally; the operator still gets their receipt.
    }
    return record;
  }, [ideas]);

  const handleDecision = useCallback((id, status, { comment } = {}) => {
    persist(id, {
      status,
      ...(comment ? { review_comment: comment } : {}),
      ...(status === 'approved' ? { approved_at: new Date().toISOString() } : {}),
      updated_at: new Date().toISOString(),
    });
  }, [persist]);

  const handleCompleteTrial = useCallback((id) => {
    const idea = ideas.find((row) => row.id === id);
    persist(id, {
      status: 'verified',
      realized_savings: realizeSaving(idea),
      verified_by_name: user?.name || 'Supervisor',
      verified_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  }, [ideas, persist, user]);

  const handleStandardise = useCallback((id) => {
    persist(id, {
      status: 'closed',
      standardisation_status: 'pm_checklist',
      updated_at: new Date().toISOString(),
    });
  }, [persist]);

  const heading = ROLE_HEADINGS[role] || ROLE_HEADINGS[KAIZEN_ROLES.MANAGER];

  return (
    <AppShell active="kaizen">
      <div className="decision-page md-dashboard rd-page kz-page" data-role={role} data-testid="kaizen-page">
        <header className="md-header rd-header">
          <div>
            <span className="eyebrow eyebrow-light">
              <Lightbulb size={13} aria-hidden="true" /> {heading.kicker}
            </span>
            <h1>{heading.title}</h1>
            <p>{heading.lead}</p>
          </div>
          <div className="decision-actions">
            {heading.links.map((link) => (
              <a
                key={link.href}
                className={`btn btn-sm ${link.primary ? 'btn-primary' : 'btn-ghost'}`}
                href={link.href}
              >
                {link.label}
              </a>
            ))}
          </div>
        </header>

        {/* Kaizen Connection Banner */}
        <div className="stitch-glass-tile overflow-hidden mb-6 flex flex-col md:flex-row items-center gap-6 p-4 sm:p-5 relative group border border-amber-500/30">
          <div className="w-full md:w-1/3 h-44 rounded-xl overflow-hidden relative flex-shrink-0">
            <img
              src={`${import.meta.env.BASE_URL}assets/kaizen_innovation_shopfloor.jpg`}
              alt="Shopfloor Kaizen Innovation"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A] via-transparent to-transparent opacity-70" />
            <span className="absolute bottom-2 left-2 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/30 text-amber-300 border border-amber-500/40 backdrop-blur-md">
              Shopfloor Kaizen Center
            </span>
          </div>
          <div className="flex-1 space-y-2">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 text-xs font-semibold border border-amber-500/20">
              <span>{getRoleLabel(user?.role)} view</span>
            </div>
            <h2 className="text-lg font-bold text-slate-100 leading-snug">
              "Empower shopfloor technicians to submit low-cost fixture improvements and track realized rupee savings."
            </h2>
            <p className="text-xs text-slate-300 leading-relaxed">
              From operator submission to 30-day trial verification and plant-wide standardisation, track your ROI and Kaizen leaderboard live.
            </p>
          </div>
        </div>

        {error && (
          <div className="decision-alert">
            {error}. Showing sample ideas until the workspace is reachable.
          </div>
        )}

        {loading && <p className="rd-loading" role="status">Loading improvement ideas…</p>}

        {!loading && isDemo && (
          <p className="rd-demo-banner" data-testid="kaizen-demo-banner">
            Showing a sample improvement programme — no Kaizen ideas came back from the workspace.
            Every figure below is illustrative until your plant data loads.
          </p>
        )}

        {role === KAIZEN_ROLES.OPERATOR && (
          <OperatorKaizen
            metrics={metrics}
            user={effectiveUser}
            machines={machines}
            onSubmit={handleSubmitIdea}
            loading={loading}
          />
        )}

        {role === KAIZEN_ROLES.SUPERVISOR && (
          <SupervisorKaizen
            metrics={metrics}
            onDecision={handleDecision}
            onCompleteTrial={handleCompleteTrial}
            onStandardise={handleStandardise}
            loading={loading}
          />
        )}

        {role === KAIZEN_ROLES.MANAGER && (
          <ManagerKaizen metrics={metrics} loading={loading} />
        )}
      </div>
    </AppShell>
  );
}
