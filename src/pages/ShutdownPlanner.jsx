import React, { useEffect, useMemo, useState } from 'react';
import AppShell from '../components/AppShell';
import { apiFetch } from '@/lib/api';

const priorityRank = { Critical: 0, Recommended: 1, Preventive: 2 };
const estimationStorageKey = 'tf_shutdown_estimation_rules';
const defaultEstimationRules = { preventiveHours: 1, hoursPerIssue: 2, maxHoursPerMachine: 6 };

function toDateInput(date) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

function nextSunday() {
  const date = new Date();
  const daysUntilSunday = (7 - date.getDay()) || 7;
  date.setDate(date.getDate() + daysUntilSunday);
  return toDateInput(date);
}

function formatDate(value) {
  if (!value) return 'No date selected';
  return new Date(`${value}T00:00:00`).toLocaleDateString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function loadEstimationRules() {
  try {
    const stored = JSON.parse(window.localStorage.getItem(estimationStorageKey));
    return stored ? { ...defaultEstimationRules, ...stored } : defaultEstimationRules;
  } catch {
    return defaultEstimationRules;
  }
}

function clampHours(value, minimum = 0.5, maximum = 48) {
  return Math.min(maximum, Math.max(minimum, Number(value) || minimum));
}

function calculateEstimate(issueCount, rules) {
  return issueCount > 0
    ? Math.min(rules.maxHoursPerMachine, issueCount * rules.hoursPerIssue)
    : rules.preventiveHours;
}

export default function ShutdownPlanner() {
  const [machines, setMachines] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [date, setDate] = useState(nextSunday);
  const [hours, setHours] = useState('8');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [reviewMode, setReviewMode] = useState(false);
  const [estimationRules, setEstimationRules] = useState(loadEstimationRules);
  const [hourOverrides, setHourOverrides] = useState({});

  useEffect(() => {
    Promise.all([apiFetch('/vault/machines'), apiFetch('/vault/tickets')])
      .then(async ([machineResponse, ticketResponse]) => {
        if (!machineResponse.ok || !ticketResponse.ok) throw new Error('Maintenance data could not be loaded.');
        const machineData = await machineResponse.json();
        const ticketData = await ticketResponse.json();
        setMachines(machineData);
        setTickets(ticketData);
        setSelectedIds(machineData.map((machine) => machine.machine_id));
      })
      .catch((error) => setLoadError(error.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(estimationStorageKey, JSON.stringify(estimationRules));
    } catch {
      return;
    }
  }, [estimationRules]);

  const plan = useMemo(() => machines.map((machine) => {
    const issues = tickets.filter((ticket) => (
      ticket.machine_id === machine.machine_id
      && String(ticket.status || 'Open').toLowerCase() === 'open'
    ));
    const hasHighUrgency = issues.some((ticket) => String(ticket.urgency).toLowerCase() === 'high');
    const priority = hasHighUrgency ? 'Critical' : issues.length ? 'Recommended' : 'Preventive';
    return {
      ...machine,
      issues,
      priority,
      estimate: Object.prototype.hasOwnProperty.call(hourOverrides, machine.machine_id)
        ? hourOverrides[machine.machine_id]
        : calculateEstimate(issues.length, estimationRules),
      customized: Object.prototype.hasOwnProperty.call(hourOverrides, machine.machine_id),
      reason: hasHighUrgency
        ? 'High-urgency issue needs attention'
        : issues.length
          ? `${issues.length} open issue${issues.length > 1 ? 's' : ''} to resolve`
          : 'Preventive maintenance opportunity',
    };
  }).sort((first, second) => priorityRank[first.priority] - priorityRank[second.priority]), [machines, tickets, estimationRules, hourOverrides]);

  const selectedPlan = plan.filter((machine) => selectedIds.includes(machine.machine_id));
  const plannedHours = selectedPlan.reduce((total, machine) => total + machine.estimate, 0);
  const availableHours = Math.max(0, Number(hours) || 0);
  const priorityCount = selectedPlan.filter((machine) => machine.priority !== 'Preventive').length;
  const remainingHours = availableHours - plannedHours;
  const fitsWindow = remainingHours >= 0;
  const allSelected = plan.length > 0 && selectedIds.length === plan.length;
  const capacityMessage = !fitsWindow
    ? `${Math.abs(remainingHours)} more hour${Math.abs(remainingHours) === 1 ? '' : 's'} needed. Remove work or increase the window.`
    : remainingHours === 0
      ? 'The work fits exactly. No contingency time remains.'
      : `${remainingHours} hour${remainingHours === 1 ? '' : 's'} remain for delays and checks.`;

  const updatePlan = (callback) => {
    callback();
    setReviewMode(false);
  };

  const toggleMachine = (machineId) => updatePlan(() => {
    setSelectedIds((current) => current.includes(machineId)
      ? current.filter((id) => id !== machineId)
      : [...current, machineId]);
  });

  const toggleAll = () => updatePlan(() => {
    setSelectedIds(allSelected ? [] : plan.map((machine) => machine.machine_id));
  });

  const updateEstimationRule = (rule, value) => updatePlan(() => {
    const maximum = rule === 'maxHoursPerMachine' ? 48 : 24;
    setEstimationRules((current) => ({ ...current, [rule]: clampHours(value, 0.5, maximum) }));
  });

  const updateMachineHours = (machineId, value) => updatePlan(() => {
    setHourOverrides((current) => ({ ...current, [machineId]: clampHours(value) }));
  });

  const resetEstimates = () => updatePlan(() => {
    setEstimationRules(defaultEstimationRules);
    setHourOverrides({});
  });

  const reviewPlan = () => {
    setReviewMode(true);
    window.requestAnimationFrame(() => document.getElementById('shutdown-review')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  };

  return <AppShell active="shutdown"><div className="planner-page shutdown-page">
    <div className="decision-heading shutdown-heading">
      <div><span className="eyebrow eyebrow-light">Shutdown planner</span><h1>Plan the next maintenance stop</h1><p>Set the available window, choose the right work, and leave with a clear sequence for your team.</p></div>
      <a className="btn btn-ghost btn-sm" href="machines.html">Manage machine data</a>
    </div>

    <nav className="shutdown-steps" aria-label="Shutdown planning steps">
      <span className="complete"><b>1</b> Set the window</span>
      <span className={selectedIds.length ? 'complete' : 'active'}><b>2</b> Choose work</span>
      <span className={reviewMode ? 'complete' : ''}><b>3</b> Review plan</span>
    </nav>

    {loadError && <div className="decision-alert" role="alert">{loadError}</div>}

    <section className="shutdown-window-card" aria-labelledby="shutdown-window-title">
      <div className="shutdown-section-heading"><span>1</span><div><h2 id="shutdown-window-title">When can maintenance work?</h2><p>TurboFix compares the selected work with this shutdown window.</p></div></div>
      <div className="shutdown-window-fields">
        <label className="shutdown-field"><span>Shutdown date</span><input type="date" min={toDateInput(new Date())} value={date} onChange={(event) => updatePlan(() => setDate(event.target.value))} /><small>Suggested: next Sunday</small></label>
        <label className="shutdown-field"><span>Maintenance hours available</span><input type="number" min="1" max="48" value={hours} onChange={(event) => updatePlan(() => setHours(event.target.value))} /><small>Total time the machines can remain stopped</small></label>
        <div className="shutdown-window-summary"><span>Planned window</span><strong>{formatDate(date)}</strong><small>{availableHours || 0} working hour{availableHours === 1 ? '' : 's'} available</small></div>
      </div>
      <details className="shutdown-estimator">
        <summary><span><strong>Customize hour calculation</strong><small>{estimationRules.preventiveHours} hr preventive · {estimationRules.hoursPerIssue} hr per open issue · {estimationRules.maxHoursPerMachine} hr maximum</small></span><b>Adjust rules</b></summary>
        <div className="shutdown-estimator-body">
          <label><span>Preventive service</span><input aria-label="Preventive service hours" type="number" min="0.5" max="24" step="0.5" value={estimationRules.preventiveHours} onChange={(event) => updateEstimationRule('preventiveHours', event.target.value)} /><small>Hours for a machine with no open issue</small></label>
          <label><span>Each open issue</span><input aria-label="Hours per open issue" type="number" min="0.5" max="24" step="0.5" value={estimationRules.hoursPerIssue} onChange={(event) => updateEstimationRule('hoursPerIssue', event.target.value)} /><small>Multiplied by the number of open issues</small></label>
          <label><span>Maximum per machine</span><input aria-label="Maximum hours per machine" type="number" min="0.5" max="48" step="0.5" value={estimationRules.maxHoursPerMachine} onChange={(event) => updateEstimationRule('maxHoursPerMachine', event.target.value)} /><small>Caps the automatic estimate</small></label>
          <button type="button" onClick={resetEstimates}>Reset default hours</button>
        </div>
        <p>These rules are saved in this browser. Individual machine hours below take priority.</p>
      </details>
    </section>

    <div className="shutdown-layout">
      <section className="shutdown-work-card" aria-labelledby="shutdown-work-title">
        <div className="shutdown-work-header">
          <div className="shutdown-section-heading"><span>2</span><div><h2 id="shutdown-work-title">Choose work for this shutdown</h2><p>Machines are already sorted by business risk.</p></div></div>
          {plan.length > 0 && <button className="shutdown-select-all" type="button" onClick={toggleAll}>{allSelected ? 'Clear all' : 'Select all'}</button>}
        </div>

        {loading && <div className="shutdown-empty">Checking machines and open tickets…</div>}
        {!loading && !plan.length && <div className="shutdown-empty"><strong>No machines found</strong><span>Register machines before creating a shutdown plan.</span><a href="machines.html">Register a machine</a></div>}
        {!loading && plan.map((machine) => {
          const selected = selectedIds.includes(machine.machine_id);
          const sequence = selectedPlan.findIndex((item) => item.machine_id === machine.machine_id) + 1;
          return <div className={`shutdown-work-row ${selected ? 'selected' : ''}`} key={machine.machine_id}>
            <label className="shutdown-machine-check"><input aria-label={`Include ${machine.machine_name} in shutdown`} type="checkbox" checked={selected} onChange={() => toggleMachine(machine.machine_id)} /><span className="shutdown-sequence">{selected ? sequence : '—'}</span></label>
            <span className="shutdown-work-main"><strong>{machine.machine_name}</strong><small>{machine.location || machine.machine_id} · {machine.reason}</small>{machine.issues[0]?.description && <em>{machine.issues[0].description}</em>}</span>
            <span className={`shutdown-risk ${machine.priority.toLowerCase()}`}>{machine.priority}</span>
            <label className="shutdown-effort"><span>Hours</span><input aria-label={`${machine.machine_name} planned hours`} type="number" min="0.5" max="48" step="0.5" value={machine.estimate} onChange={(event) => updateMachineHours(machine.machine_id, event.target.value)} /><small>{machine.customized ? 'custom' : 'estimated'}</small></label>
          </div>;
        })}
      </section>

      <aside className={`shutdown-review-card ${fitsWindow ? 'fits' : 'over'}`} id="shutdown-review">
        <div className="shutdown-section-heading"><span>3</span><div><h2>{reviewMode ? 'Confirm the worklist' : 'Your plan at a glance'}</h2><p>{reviewMode ? 'Use this summary in the shutdown meeting.' : 'Review capacity before sharing the plan.'}</p></div></div>
        <div className="shutdown-review-date"><span>Shutdown</span><strong>{formatDate(date)}</strong></div>
        <div className="shutdown-review-metrics"><div><strong>{selectedPlan.length}</strong><span>machines</span></div><div><strong>{priorityCount}</strong><span>priority jobs</span></div><div><strong>{plannedHours}</strong><span>hours planned</span></div></div>
        <div className="shutdown-capacity"><div><span>Planned capacity</span><strong>{plannedHours} of {availableHours || 0} hr</strong></div><div className="shutdown-capacity-track"><span style={{ width: `${Math.min(100, availableHours ? (plannedHours / availableHours) * 100 : 100)}%` }} /></div><p>{capacityMessage}</p></div>
        {!selectedPlan.length && <div className="shutdown-review-warning">Select at least one machine to continue.</div>}
        {reviewMode ? <>
          <div className="shutdown-ready"><strong>Worklist ready for team review</strong><span>Confirm permits, isolation, people, spares, and manuals before the shutdown starts.</span></div>
          <button className="btn shutdown-primary-action" type="button" onClick={() => window.print()}>Print or save worklist</button>
          <a className="shutdown-secondary-action" href="tickets.html">Open tickets and work orders</a>
          <button className="shutdown-edit-action" type="button" onClick={() => setReviewMode(false)}>Back to edit plan</button>
        </> : <button className="btn shutdown-primary-action" type="button" disabled={!date || !selectedPlan.length} onClick={reviewPlan}>{fitsWindow ? 'Review selected work' : 'Review capacity issue'}</button>}
      </aside>
    </div>

    <div className="shutdown-safety-note"><strong>Before approval:</strong><span>Verify lockout/tagout, permits, technician availability, required spares, and the latest MachineData for every selected asset.</span></div>
  </div></AppShell>;
}
