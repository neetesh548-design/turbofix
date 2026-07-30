import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { Archive, Download, Ticket as TicketIcon, X, CheckCheck, UserPlus } from 'lucide-react';

import AppShell from '@/components/AppShell';
import QuickReportDialog from '@/components/QuickReportDialog';
import { ShiftHandoverModal } from '@/components/tickets/ShiftHandoverModal';
import TicketKpiBar from '@/components/tickets/TicketKpiBar';
import TicketToolbar from '@/components/tickets/TicketToolbar';
import TicketRow from '@/components/tickets/TicketRow';
import TicketDetailPanel from '@/components/tickets/TicketDetailPanel';
import { supabase } from '@/supabaseClient';

import { partitionTickets, downloadArchivedCSV, isEligibleForArchive } from '@/utils/ticketArchive';
import { downloadTicketsCSV } from '@/utils/ticketExport';
import { DEMO_TICKETS } from '@/utils/demoTickets';
import { applyCurrentShiftAssignments } from '@/utils/shiftAssignments';
import { filterRowsToVisibleMachines, isShiftScopedRole, visibleMachineIdSet, visibleMachinesForUser } from '@/utils/machineVisibility';
import {
  computeSla,
  summarizeTickets,
  ticketAgeHours,
  isTicketClosed,
  isTicketInProgress,
} from '@/utils/ticketSla';
import { urgencyRank } from '@/utils/ticketMeta';
import { QUEUE_FILTERS } from '@/utils/ticketQueues';
import { filterRowsForUserCompany } from '@/utils/tenant';
import { can, CAPABILITIES } from '@/lib/roles';
import { normalizeRole } from '@/lib/roles';
import './Tickets.css';

/** How often the SLA clock re-renders. One minute is enough for hour-scale SLAs. */
const CLOCK_INTERVAL_MS = 60_000;

/** "Overdue" quick filter: open longer than this regardless of urgency target. */
const OVERDUE_HOURS = 24;

const idOf = (ticket) => ticket.ticket_id || ticket.id;

function readSignedInUser() {
  try {
    return JSON.parse(localStorage.getItem('tf_user') || 'null');
  } catch {
    return null;
  }
}

/**
 * Tickets — the Work Order Control Board.
 *
 * A single surface for dispatch, monitoring and analytics:
 *  - KPI strip (open / breached / in-progress / resolved today / avg resolution)
 *  - search, queue filters, sort, advanced filters, CSV export
 *  - rich rows carrying identity, issue + AI insight, status, urgency, SLA,
 *    assignee, age and quick actions
 *  - row drill-down for the repair record, AI diagnosis and lifecycle actions
 *  - multi-select bulk assign / close
 *
 * SLA is derived client-side (see utils/ticketSla.js) because the tickets table
 * carries no SLA column. Assignment writes to `machines.technician_user_id`,
 * which is where this schema actually stores machine ownership.
 */
export default function Tickets() {
  const location = useLocation();
  const getParam = useCallback(
    (key, fallback) => new URLSearchParams(location.search).get(key) || fallback,
    [location.search]
  );

  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [activeFilter, setActiveFilter] = useState(() => getParam('activeFilter', 'all'));
  const [searchTerm, setSearchTerm] = useState('');
  const [sortKey, setSortKey] = useState('priority');
  const [sortDir, setSortDir] = useState('desc');
  const [expandedId, setExpandedId] = useState(null);
  const [selectedIds, setSelectedIds] = useState(() => new Set());

  const [showAdvanced, setShowAdvanced] = useState(false);
  const [filterMachine, setFilterMachine] = useState(() => getParam('machine', 'all'));
  const [filterStage, setFilterStage] = useState(() => getParam('status', 'all'));
  const [filterTechnician, setFilterTechnician] = useState('all');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');

  const [machinesList, setMachinesList] = useState([]);
  const [techniciansList, setTechniciansList] = useState([]);
  const [quickReportOpen, setQuickReportOpen] = useState(false);
  const [handoverOpen, setHandoverOpen] = useState(false);

  // Ticking clock so age and SLA bars stay live without a full refetch.
  const [now, setNow] = useState(() => new Date());

  const signedInUser = useMemo(readSignedInUser, []);
  const currentUserId = signedInUser?.user_id || signedInUser?.id || null;
  const appRole = normalizeRole(signedInUser?.role);
  const permissions = useMemo(() => ({
    select: can(signedInUser?.role, CAPABILITIES.BULK_TICKET_ACTIONS),
    assign: can(signedInUser?.role, CAPABILITIES.ASSIGN_TICKET),
    start: can(signedInUser?.role, CAPABILITIES.START_REPAIR),
    updateRepair: can(signedInUser?.role, CAPABILITIES.UPDATE_REPAIR),
    changePriority: can(signedInUser?.role, CAPABILITIES.CHANGE_PRIORITY),
    verifyClose: can(signedInUser?.role, CAPABILITIES.VERIFY_CLOSE),
    export: can(signedInUser?.role, CAPABILITIES.EXPORT_TICKETS),
    handover: can(signedInUser?.role, CAPABILITIES.SHIFT_HANDOVER),
    bulk: can(signedInUser?.role, CAPABILITIES.BULK_TICKET_ACTIONS),
  }), [signedInUser?.role]);

  const fetchTickets = useCallback(async () => {
    setError('');
    if (signedInUser?.inventory_mode === 'demo') {
      let localTickets = [];
      try {
        const localQrTickets = JSON.parse(localStorage.getItem('tf_qr_tickets') || '[]');
        const localOfflineTickets = JSON.parse(localStorage.getItem('tf_offline_tickets') || '[]');
        const localDemoTickets = JSON.parse(localStorage.getItem('tf_demo_tickets') || '[]');
        const localBreakdowns = JSON.parse(localStorage.getItem('tf_breakdown_reports') || '[]');
        const allLocal = [...localQrTickets, ...localOfflineTickets, ...localDemoTickets, ...localBreakdowns];
        const existingIds = new Set(DEMO_TICKETS.map((t) => String(t.id || t.ticket_id || t.wo_number)));

        allLocal.forEach((t) => {
          if (!t) return;
          const tid = String(t.id || t.ticket_id || t.wo_number || '');
          if (tid && !existingIds.has(tid)) {
            existingIds.add(tid);
            localTickets.push({
              ticket_id: tid,
              wo_number: t.wo_number || (t.id ? String(t.id).slice(0, 8) : 'WO-QR'),
              machine_id: t.machine_id || 'MCH-001',
              machine_name: t.machine_name || 'Machine Tag',
              status: t.status || 'open',
              issue_text: t.issue_text || t.description || 'QR Breakdown reported',
              description: t.issue_text || t.description,
              ai_summary: t.ai_summary || 'Submitted via QR Gateway',
              urgency: (t.urgency ? t.urgency.charAt(0).toUpperCase() + t.urgency.slice(1) : 'Medium'),
              created_at: t.created_at || new Date().toISOString(),
              reported_at: t.created_at || new Date().toISOString(),
              reporter_phone: t.reporter_phone,
              lifecycle_stage: t.lifecycle_stage || 'open',
              technician_name: t.technician_name || 'Unassigned',
            });
          }
        });
      } catch (e) {
        console.warn('Notice loading local demo tickets:', e);
      }

      setTickets([...localTickets, ...DEMO_TICKETS]);
      setMachinesList(DEMO_TICKETS.map(({ machine_id: id, machine_name: name }) => ({ id, name })));
      setTechniciansList([]);
      setLoading(false);
      return;
    }
    try {
      const compRes = signedInUser?.company_code
        ? await supabase.from('companies').select('id, name, domain').ilike('domain', signedInUser.company_code).maybeSingle()
        : { data: null };
      const companyId = compRes.data?.id || null;

      let machinesQuery = supabase.from('machines').select('id,name,company_id,technician_user_id,supervisor_id');
      if (companyId) {
        machinesQuery = machinesQuery.eq('company_id', companyId);
      }

      const [ticketsRes, machinesRes, directoryRes, shiftRosterRes, shiftAssignmentRes] = await Promise.all([
        supabase.from('tickets').select('*'),
        machinesQuery,
        supabase.functions.invoke('onboard_team_member', { body: { action: 'list' } }),
        supabase.from('shift_rosters').select('*'),
        supabase.from('machine_shift_assignments').select('*'),
      ]);

      if (ticketsRes.error) throw new Error(ticketsRes.error.message);
      if (machinesRes.error) throw new Error(machinesRes.error.message);

      let rawMachines = (machinesRes.data || []).map((m) => ({ ...m, company_code: signedInUser?.company_code, company_id: companyId }));
      let rawTickets = (ticketsRes.data || []).map((t) => ({ ...t, company_code: t.company_code || signedInUser?.company_code }));

      // Merge local & QR Gateway submitted tickets
      try {
        const localQrTickets = JSON.parse(localStorage.getItem('tf_qr_tickets') || '[]');
        const localOfflineTickets = JSON.parse(localStorage.getItem('tf_offline_tickets') || '[]');
        const localDemoTickets = JSON.parse(localStorage.getItem('tf_demo_tickets') || '[]');
        const localBreakdowns = JSON.parse(localStorage.getItem('tf_breakdown_reports') || '[]');

        const allLocal = [...localQrTickets, ...localOfflineTickets, ...localDemoTickets, ...localBreakdowns];
        const existingIds = new Set(rawTickets.map((t) => String(t.id || t.ticket_id || t.wo_number)));

        allLocal.forEach((t) => {
          if (!t) return;
          const tid = String(t.id || t.ticket_id || t.wo_number || '');
          if (tid && !existingIds.has(tid)) {
            existingIds.add(tid);
            rawTickets.unshift({
              ...t,
              id: tid,
              company_code: t.company_code || signedInUser?.company_code || 'EXIDE',
            });
          }
        });
      } catch (e) {
        console.warn('Notice reading local ticket queues:', e);
      }

      rawMachines = filterRowsForUserCompany(rawMachines, signedInUser);
      rawTickets = filterRowsForUserCompany(rawTickets, signedInUser);

      const directoryMembers = directoryRes.data?.members || [];
      const teamMap = {};
      const techsOnly = [];
      directoryMembers.forEach((member) => {
        teamMap[member.user_id] = member.name;
        if (
          ['maintenance_technician', 'technician', 'owner', 'supervisor', 'engineer'].includes(
            member.role
          )
        ) {
          techsOnly.push(member);
        }
      });
      setTechniciansList(techsOnly);

      const machineMap = {};
      const machineTechMap = {};
      const machineTechNameMap = {};
      const currentMachines = applyCurrentShiftAssignments(rawMachines || [], shiftRosterRes.data || [], shiftAssignmentRes.data || []);
      const shouldScope = isShiftScopedRole(signedInUser?.role);
      const visibleMachines = visibleMachinesForUser(currentMachines, signedInUser);
      const visibleMachineIds = visibleMachineIdSet(currentMachines, signedInUser);
      const visibleTickets = shouldScope ? filterRowsToVisibleMachines(rawTickets || [], visibleMachineIds) : (rawTickets || []);

      const mList = visibleMachines.map((machine) => {
        machineMap[machine.id] = machine.name;
        if (machine.machine_id) machineMap[machine.machine_id] = machine.name;
        if (machine.name) machineMap[machine.name] = machine.name;
        const techId = machine.technician_user_id;
        machineTechMap[machine.id] = techId || null;
        machineTechNameMap[machine.id] = techId ? teamMap[techId] || 'Unassigned' : 'Unassigned';
        return { id: machine.id, name: machine.name };
      });
      setMachinesList(mList);

      // Urgency lives either on the ticket column (in-app / WhatsApp) or inside
      // the AI summary. Normalise both to a single Title-case value.
      const normUrgency = (t) => {
        const raw = String(
          t.urgency || (typeof t.ai_summary === 'object' ? t.ai_summary?.urgency : '') || ''
        ).toLowerCase();
        return raw ? raw.charAt(0).toUpperCase() + raw.slice(1) : 'Medium';
      };

      const data = visibleTickets.map((t) => ({
        ticket_id: t.id || t.ticket_id || t.wo_number,
        machine_id: t.machine_id,
        machine_name: machineMap[t.machine_id] || t.machine_name || 'Machine ' + (t.machine_id || 'Tag'),
        status: t.status || 'open',
        issue_text: t.issue_text || t.description || 'Breakdown reported',
        ai_summary: t.ai_summary,
        urgency: normUrgency(t),
        description: t.issue_text || t.description,
        created_at: t.created_at || new Date().toISOString(),
        reported_at: t.created_at || new Date().toISOString(),
        reporter_phone: t.reporter_phone,
        wo_number: t.wo_number || (t.id ? String(t.id).slice(0, 8) : 'WO-QR'),
        lifecycle_stage: t.lifecycle_stage || 'open',
        root_cause: t.root_cause,
        repair_action: t.repair_action,
        parts_used: t.parts_used,
        labour_minutes: t.labour_minutes,
        downtime_minutes: t.downtime_minutes,
        started_at: t.started_at,
        resolved_at: t.resolved_at,
        verified_at: t.verified_at,
        closure_approved_by: t.closure_approved_by,
        repeat_failure_flag: t.repeat_failure_flag,
        repeat_failure_count: t.repeat_failure_count,
        technician_id: t.technician_id || machineTechMap[t.machine_id] || null,
        technician_name: t.technician_name || machineTechNameMap[t.machine_id] || 'Unassigned',
      }));

      // Demo data belongs only to demo sessions. Combine new QR tickets with DEMO_TICKETS so newly submitted issues appear at the top.
      const demoSession = signedInUser?.inventory_mode === 'demo' || signedInUser?.company_code === 'TFDEMO';
      if (demoSession) {
        const existingIds = new Set(data.map((t) => String(t.ticket_id || t.wo_number)));
        const uniqueDemo = DEMO_TICKETS.filter((t) => !existingIds.has(String(t.ticket_id || t.wo_number)));
        setTickets([...data, ...uniqueDemo]);
      } else {
        setTickets(data);
      }
    } catch (err) {
      setError(err.message || 'An error occurred while loading tickets.');
    } finally {
      setLoading(false);
    }
  }, [signedInUser]);

  // Re-subscribe when the signed-in user context changes so scoped roles see
  // the current shift's machine/ticket set.
  useEffect(() => {
    document.title = 'Tickets | TurboFix';
    fetchTickets();

    const handleTicketCreated = () => fetchTickets();
    window.addEventListener('ticketCreated', handleTicketCreated);
    window.addEventListener('storage', handleTicketCreated);

    const channel = supabase
      .channel('public:tickets_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tickets' }, () => {
        fetchTickets();
      })
      .subscribe();

    return () => {
      window.removeEventListener('ticketCreated', handleTicketCreated);
      window.removeEventListener('storage', handleTicketCreated);
      supabase.removeChannel(channel);
    };
  }, [fetchTickets]);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), CLOCK_INTERVAL_MS);
    return () => clearInterval(timer);
  }, []);

  // Global Cmd/Ctrl+N shortcut (see accessibility.js) dispatches this instead
  // of AppShell owning the dialog, since only this page has the machine list.
  useEffect(() => {
    const openQuickReport = () => setQuickReportOpen(true);
    document.addEventListener('open-quick-report', openQuickReport);
    return () => document.removeEventListener('open-quick-report', openQuickReport);
  }, []);

  // Transient success banners shouldn't linger.
  useEffect(() => {
    if (!success) return undefined;
    const timer = setTimeout(() => setSuccess(''), 5000);
    return () => clearTimeout(timer);
  }, [success]);

  // ---------------------------------------------------------------------
  // Mutations
  // ---------------------------------------------------------------------

  /**
   * Local-first write: update state, then try to persist. Realtime
   * subscription (see effect above) reconciles any drift on success, so no
   * refetch is needed on the happy path.
   */
  const updateLifecycleStage = useCallback(
    async (ticketId, nextStage, nextStatus = null) => {
      const closing = nextStage === 'closed' || nextStatus === 'resolved';
      if (closing ? !permissions.verifyClose : !permissions.updateRepair) {
        setError('Your role is not authorized to perform this work-order action.');
        return;
      }
      setError('');
      const patch = { lifecycle_stage: nextStage };
      if (nextStatus) patch.status = nextStatus;
      if (nextStage === 'work_started') patch.started_at = new Date().toISOString();
      if (nextStage === 'repair_completed' || nextStatus === 'resolved') {
        patch.resolved_at = new Date().toISOString();
      }

      let previousTickets;
      setTickets((current) => {
        previousTickets = current;
        return current.map((t) => (idOf(t) === ticketId ? { ...t, ...patch } : t));
      });

      try {
        const { error: updateErr } = await supabase.from('tickets').update(patch).eq('id', ticketId);
        if (updateErr) throw new Error(updateErr.message);
        setSuccess(`Work order ${String(ticketId).substring(0, 8)} updated.`);
      } catch (err) {
        if (previousTickets) setTickets(previousTickets);
        setError(err.message);
      }
    },
    [permissions.updateRepair, permissions.verifyClose]
  );

  const handleCloseTicket = useCallback(
    async (ticketId) => {
      if (
        !window.confirm(
          'Close this work order directly? This bypasses the technician repair record and supervisor verification.'
        )
      ) {
        return;
      }
      await updateLifecycleStage(ticketId, 'closed', 'resolved');
    },
    [updateLifecycleStage]
  );

  const handleStart = useCallback(
    (ticketId) => updateLifecycleStage(ticketId, 'work_started'),
    [updateLifecycleStage]
  );

  /**
   * Inline edit. Urgency is a ticket column; assignment is not — this schema
   * stores machine ownership on `machines.technician_user_id`, so assigning a
   * technician here re-points the machine and therefore every work order on it.
   */
  const handleFieldChange = useCallback(
    async (ticketId, patch) => {
      if (
        ('urgency' in patch && !permissions.changePriority) ||
        ('assigned_to' in patch && !permissions.assign) ||
        (('root_cause' in patch || 'repair_action' in patch || 'parts_used' in patch) && !permissions.updateRepair)
      ) {
        setError('Your role is not authorized to change that work-order field.');
        return;
      }
      setError('');
      const ticket = tickets.find((t) => idOf(t) === ticketId);
      if (!ticket) return;

      const previousTickets = tickets;

      try {
        if ('urgency' in patch) {
          setTickets((current) =>
            current.map((t) => (idOf(t) === ticketId ? { ...t, urgency: patch.urgency || '' } : t))
          );
          const { error: updateErr } = await supabase
            .from('tickets')
            .update({ urgency: patch.urgency || null })
            .eq('id', ticketId);
          if (updateErr) throw new Error(updateErr.message);
          setSuccess('Urgency updated.');
        }

        if ('assigned_to' in patch) {
          if (!ticket.machine_id) throw new Error('This ticket has no machine to assign.');
          // Ownership lives on the machine, so every ticket on it reflects the change.
          const techName =
            techniciansList.find((t) => t.user_id === patch.assigned_to)?.name ||
            (patch.assigned_to ? 'Assigned' : 'Unassigned');
          setTickets((current) =>
            current.map((t) =>
              t.machine_id === ticket.machine_id
                ? { ...t, technician_id: patch.assigned_to || null, technician_name: techName }
                : t
            )
          );
          const { error: updateErr } = await supabase
            .from('machines')
            .update({ technician_user_id: patch.assigned_to })
            .eq('id', ticket.machine_id);
          if (updateErr) throw new Error(updateErr.message);
          setSuccess(
            `Technician updated for ${ticket.machine_name}. This applies to all work orders on that machine.`
          );
        }
      } catch (err) {
        setTickets(previousTickets);
        setError(err.message);
      }
    },
    [tickets, techniciansList, permissions]
  );

  /** Row-level "assign" shortcut: opens the drill-down where the picker lives. */
  const handleAssign = useCallback((ticketId) => setExpandedId(ticketId), []);

  // ---------------------------------------------------------------------
  // Derived data
  // ---------------------------------------------------------------------

  const roleTicketPool = useMemo(() => {
    if (appRole === 'quality_inspector') {
      return tickets.filter((ticket) =>
        ['repair_completed', 'verification_pending', 'closed'].includes(String(ticket.lifecycle_stage || '').toLowerCase())
      );
    }
    if (appRole === 'safety_officer') {
      const safetyWords = ['unsafe', 'danger', 'fire', 'smoke', 'shock', 'guard', 'loto'];
      return tickets.filter((ticket) =>
        String(ticket.urgency || '').toLowerCase() === 'critical' ||
        safetyWords.some((word) => String(ticket.issue_text || '').toLowerCase().includes(word))
      );
    }
    return tickets;
  }, [appRole, tickets]);

  const { activeTickets, archivedTickets } = useMemo(() => partitionTickets(roleTicketPool), [roleTicketPool]);

  const summary = useMemo(() => summarizeTickets(activeTickets, now), [activeTickets, now]);

  /** Text + advanced-panel filters. Queue filters are applied separately so the
   *  queue tab counts can be computed from the same base. */
  const baseFiltered = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    return roleTicketPool.filter((t) => {
      if (term) {
        const haystack = [
          t.wo_number,
          t.machine_name,
          t.technician_name,
          t.issue_text,
          t.reporter_phone,
          t.status,
          t.urgency,
          t.ticket_id,
        ];
        if (!haystack.some((field) => String(field || '').toLowerCase().includes(term))) {
          return false;
        }
      }

      if (filterMachine !== 'all' && String(t.machine_id) !== String(filterMachine)) return false;
      if (filterTechnician !== 'all' && String(t.technician_id) !== String(filterTechnician)) {
        return false;
      }

      if (filterStage !== 'all') {
        if (filterStage === 'open') {
          if (isTicketClosed(t)) return false;
        } else if (filterStage === 'closed') {
          if (!isTicketClosed(t)) return false;
        } else if (String(t.lifecycle_stage || '').toLowerCase() !== filterStage.toLowerCase()) {
          return false;
        }
      }

      if (t.created_at && (filterStartDate || filterEndDate)) {
        const ticketTime = new Date(t.created_at).getTime();
        if (filterStartDate && ticketTime < new Date(`${filterStartDate}T00:00:00`).getTime()) {
          return false;
        }
        if (filterEndDate && ticketTime > new Date(`${filterEndDate}T23:59:59`).getTime()) {
          return false;
        }
      }

      return true;
    });
  }, [
    roleTicketPool,
    searchTerm,
    filterMachine,
    filterTechnician,
    filterStage,
    filterStartDate,
    filterEndDate,
  ]);

  const matchesQueue = useCallback(
    (ticket, queue) => {
      const archived = isEligibleForArchive(ticket);
      if (queue === 'archived') return archived;
      // Long-closed work orders stay out of every live queue.
      if (archived) return false;

      switch (queue) {
        case 'open':
          return !isTicketClosed(ticket);
        case 'breached':
          return computeSla(ticket, now).state === 'breached';
        case 'overdue': {
          if (isTicketClosed(ticket)) return false;
          const age = ticketAgeHours(ticket, now);
          return age != null && age > OVERDUE_HOURS;
        }
        case 'in_progress':
          return isTicketInProgress(ticket);
        case 'resolved_today': {
          if (!isTicketClosed(ticket)) return false;
          const closedAt = ticket.resolved_at || ticket.closed_at || ticket.verified_at;
          if (!closedAt) return false;
          const d = new Date(String(closedAt).replace(' ', 'T'));
          return (
            d.getFullYear() === now.getFullYear() &&
            d.getMonth() === now.getMonth() &&
            d.getDate() === now.getDate()
          );
        }
        case 'mine':
          return currentUserId != null && String(ticket.technician_id) === String(currentUserId);
        case 'all':
        default:
          return true;
      }
    },
    [now, currentUserId]
  );

  const queueCounts = useMemo(() => {
    const counts = {};
    QUEUE_FILTERS.forEach(({ key }) => {
      counts[key] = baseFiltered.filter((t) => matchesQueue(t, key)).length;
    });
    return counts;
  }, [baseFiltered, matchesQueue]);

  const visibleTickets = useMemo(() => {
    const filtered = baseFiltered.filter((t) => matchesQueue(t, activeFilter));
    const dir = sortDir === 'asc' ? 1 : -1;

    const compare = (a, b) => {
      switch (sortKey) {
        case 'age': {
          // Ascending = newest first, so oldest-first is the "desc" default.
          const aAge = ticketAgeHours(a, now) ?? 0;
          const bAge = ticketAgeHours(b, now) ?? 0;
          return (aAge - bAge) * dir;
        }
        case 'sla': {
          const aRatio = computeSla(a, now).ratio ?? 0;
          const bRatio = computeSla(b, now).ratio ?? 0;
          return (aRatio - bRatio) * dir;
        }
        case 'assignee':
          return String(a.technician_name || '').localeCompare(String(b.technician_name || '')) * dir;
        case 'machine':
          return String(a.machine_name || '').localeCompare(String(b.machine_name || '')) * dir;
        case 'priority':
        default: {
          // Lower rank = more urgent, so invert to keep "desc" = most urgent first.
          const byUrgency = (urgencyRank(b) - urgencyRank(a)) * dir;
          if (byUrgency !== 0) return byUrgency;
          const aOpen = isTicketClosed(a) ? 1 : 0;
          const bOpen = isTicketClosed(b) ? 1 : 0;
          if (aOpen !== bOpen) return aOpen - bOpen;
          return (ticketAgeHours(a, now) ?? 0) - (ticketAgeHours(b, now) ?? 0);
        }
      }
    };

    return [...filtered].sort(compare);
  }, [baseFiltered, matchesQueue, activeFilter, sortKey, sortDir, now]);

  // Drop selections that scrolled out of the current view.
  useEffect(() => {
    setSelectedIds((prev) => {
      if (prev.size === 0) return prev;
      const visible = new Set(visibleTickets.map(idOf));
      const next = new Set([...prev].filter((id) => visible.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [visibleTickets]);

  // ---------------------------------------------------------------------
  // Selection + bulk actions
  // ---------------------------------------------------------------------

  const toggleSelect = useCallback((ticketId) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(ticketId)) next.delete(ticketId);
      else next.add(ticketId);
      return next;
    });
  }, []);

  const allVisibleSelected =
    visibleTickets.length > 0 && visibleTickets.every((t) => selectedIds.has(idOf(t)));

  const toggleSelectAll = useCallback(() => {
    setSelectedIds((prev) => {
      const visibleIds = visibleTickets.map(idOf);
      const everySelected = visibleIds.length > 0 && visibleIds.every((id) => prev.has(id));
      return everySelected ? new Set() : new Set(visibleIds);
    });
  }, [visibleTickets]);

  const toggleExpand = useCallback(
    (ticketId) => setExpandedId((prev) => (prev === ticketId ? null : ticketId)),
    []
  );

  const bulkClose = useCallback(async () => {
    if (!permissions.bulk || !permissions.verifyClose) {
      setError('Your role is not authorized to close multiple work orders.');
      return;
    }
    const ids = [...selectedIds];
    if (ids.length === 0) return;
    if (
      !window.confirm(
        `Close ${ids.length} work order${ids.length === 1 ? '' : 's'}? This bypasses technician repair records and supervisor verification.`
      )
    ) {
      return;
    }

    setError('');
    const idSet = new Set(ids);
    const resolvedAt = new Date().toISOString();
    let previousTickets;
    setTickets((current) => {
      previousTickets = current;
      return current.map((t) =>
        idSet.has(idOf(t))
          ? { ...t, status: 'resolved', lifecycle_stage: 'closed', resolved_at: resolvedAt }
          : t
      );
    });
    setSelectedIds(new Set());

    try {
      const { error: updateErr } = await supabase
        .from('tickets')
        .update({
          status: 'resolved',
          lifecycle_stage: 'closed',
          resolved_at: resolvedAt,
        })
        .in('id', ids);
      if (updateErr) throw new Error(updateErr.message);
      setSuccess(`Closed ${ids.length} work order${ids.length === 1 ? '' : 's'}.`);
    } catch (err) {
      if (previousTickets) setTickets(previousTickets);
      setError(err.message);
    }
  }, [selectedIds, permissions.bulk, permissions.verifyClose]);

  const bulkAssign = useCallback(
    async (technicianUserId) => {
      if (!permissions.bulk || !permissions.assign) {
        setError('Your role is not authorized to assign multiple work orders.');
        return;
      }
      const ids = [...selectedIds];
      if (ids.length === 0 || !technicianUserId) return;

      const machineIdSet = new Set(
        tickets.filter((t) => ids.includes(idOf(t))).map((t) => t.machine_id).filter(Boolean)
      );
      if (machineIdSet.size === 0) {
        setError('None of the selected work orders have a machine to assign.');
        return;
      }

      const techName =
        techniciansList.find((t) => t.user_id === technicianUserId)?.name || 'technician';
      if (
        !window.confirm(
          `Assign ${techName} to ${machineIdSet.size} machine${machineIdSet.size === 1 ? '' : 's'}? Ownership is stored per machine, so this affects every work order on them.`
        )
      ) {
        return;
      }

      setError('');
      let previousTickets;
      setTickets((current) => {
        previousTickets = current;
        return current.map((t) =>
          machineIdSet.has(t.machine_id)
            ? { ...t, technician_id: technicianUserId, technician_name: techName }
            : t
        );
      });
      setSelectedIds(new Set());

      try {
        const { error: updateErr } = await supabase
          .from('machines')
          .update({ technician_user_id: technicianUserId })
          .in('id', [...machineIdSet]);
        if (updateErr) throw new Error(updateErr.message);
        setSuccess(`Assigned ${techName} to ${machineIdSet.size} machine(s).`);
      } catch (err) {
        if (previousTickets) setTickets(previousTickets);
        setError(err.message);
      }
    },
    [selectedIds, tickets, techniciansList, permissions.bulk, permissions.assign]
  );

  const resetFilters = useCallback(() => {
    setFilterMachine('all');
    setFilterStage('all');
    setFilterTechnician('all');
    setFilterStartDate('');
    setFilterEndDate('');
    setSearchTerm('');
  }, []);

  const handleExport = useCallback(() => {
    if (visibleTickets.length === 0) {
      setError('Nothing to export in the current view.');
      return;
    }
    downloadTicketsCSV(visibleTickets);
    setSuccess(`Exported ${visibleTickets.length} work order(s) to CSV.`);
  }, [visibleTickets]);

  // ---------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------

  return (
    <AppShell active="tickets">
      <div className="vault-wrap workspace-page tickets-page tickets-board">
        <header className="tickets-heading">
          <div>
            <h1>Work Order Control Board</h1>
            <p>
              Dispatch, monitor and analyse every work order. SLA targets are derived from urgency:
              Critical 4h · High 8h · Medium 24h · Low 72h.
            </p>
          </div>
          <div className="tickets-heading-actions">
            {permissions.export && archivedTickets.length > 0 && (
              <button
                type="button"
                className="tickets-icon-btn"
                onClick={() => downloadArchivedCSV(archivedTickets)}
                title={`${archivedTickets.length} archived work orders (closed over 90 days ago)`}
              >
                <Archive size={14} />
                Archive ({archivedTickets.length})
              </button>
            )}
            {permissions.handover && <button
              type="button"
              className="tickets-icon-btn"
              onClick={() => setHandoverOpen(true)}
              title="Generate 1-click shift handover digest"
            >
              📋 Shift handover
            </button>}
            <button
              type="button"
              className="tickets-icon-btn"
              style={{
                background: 'var(--brand)',
                borderColor: 'var(--brand)',
                color: '#052e16',
                fontWeight: 700,
              }}
              onClick={() => setQuickReportOpen(true)}
            >
              <TicketIcon size={14} />
              Quick report
            </button>
          </div>
        </header>

        <ShiftHandoverModal
          open={handoverOpen}
          onClose={() => setHandoverOpen(false)}
          tickets={tickets}
          machines={machinesList}
        />

        {error && (
          <div
            role="alert"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              background: 'rgba(248,113,113,0.12)',
              border: '1px solid rgba(248,113,113,0.35)',
              color: '#fecaca',
              padding: '11px 15px',
              borderRadius: 10,
              marginBottom: 14,
              fontSize: '0.86rem',
            }}
          >
            <span style={{ flex: 1 }}>{error}</span>
            <button
              type="button"
              onClick={() => setError('')}
              aria-label="Dismiss error"
              style={{ background: 'none', border: 0, color: 'inherit', cursor: 'pointer' }}
            >
              <X size={15} />
            </button>
          </div>
        )}

        {success && (
          <div
            role="status"
            style={{
              background: 'rgba(37,211,102,0.12)',
              border: '1px solid rgba(37,211,102,0.35)',
              color: '#bbf7d0',
              padding: '11px 15px',
              borderRadius: 10,
              marginBottom: 14,
              fontSize: '0.86rem',
            }}
          >
            {success}
          </div>
        )}

        <TicketKpiBar summary={summary} activeFilter={activeFilter} onSelect={setActiveFilter} />

        <TicketToolbar
          search={searchTerm}
          onSearchChange={setSearchTerm}
          activeFilter={activeFilter}
          onFilterChange={setActiveFilter}
          counts={queueCounts}
          sortKey={sortKey}
          onSortChange={setSortKey}
          sortDir={sortDir}
          onSortDirToggle={() => setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))}
          advancedOpen={showAdvanced}
          onToggleAdvanced={() => setShowAdvanced((open) => !open)}
          onExport={permissions.export ? handleExport : undefined}
        />

        {showAdvanced && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
              gap: 12,
              padding: 16,
              marginBottom: 14,
              background: '#0e1722',
              border: '1px solid var(--border)',
              borderRadius: 12,
            }}
          >
            {[
              {
                label: 'Machine',
                value: filterMachine,
                onChange: setFilterMachine,
                options: [
                  { value: 'all', label: 'All machines' },
                  ...machinesList.map((m) => ({ value: m.id, label: m.name })),
                ],
              },
              {
                label: 'Lifecycle stage',
                value: filterStage,
                onChange: setFilterStage,
                options: [
                  { value: 'all', label: 'All stages' },
                  { value: 'open', label: 'Any open' },
                  { value: 'closed', label: 'Any closed' },
                  { value: 'reported', label: 'Reported' },
                  { value: 'acknowledged', label: 'Acknowledged' },
                  { value: 'assigned', label: 'Assigned' },
                  { value: 'work_started', label: 'Work started' },
                  { value: 'waiting_spare', label: 'Waiting for spare' },
                  { value: 'repair_completed', label: 'Repair completed' },
                  { value: 'verification_pending', label: 'Verification pending' },
                ],
              },
              {
                label: 'Technician',
                value: filterTechnician,
                onChange: setFilterTechnician,
                options: [
                  { value: 'all', label: 'All technicians' },
                  ...techniciansList.map((t) => ({ value: t.user_id, label: t.name })),
                ],
              },
            ].map(({ label, value, onChange, options }) => (
              <label key={label} style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <span
                  style={{
                    fontSize: '0.68rem',
                    color: 'var(--slate-light)',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}
                >
                  {label}
                </span>
                <select
                  className="tickets-select"
                  value={value}
                  onChange={(event) => onChange(event.target.value)}
                >
                  {options.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            ))}

            {[
              ['Reported from', filterStartDate, setFilterStartDate],
              ['Reported to', filterEndDate, setFilterEndDate],
            ].map(([label, value, onChange]) => (
              <label key={label} style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <span
                  style={{
                    fontSize: '0.68rem',
                    color: 'var(--slate-light)',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}
                >
                  {label}
                </span>
                <input
                  type="date"
                  className="tickets-select"
                  value={value}
                  onChange={(event) => onChange(event.target.value)}
                />
              </label>
            ))}

            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
              <button
                type="button"
                className="tickets-icon-btn"
                style={{ width: '100%', justifyContent: 'center', color: '#F87171' }}
                onClick={resetFilters}
              >
                Reset filters
              </button>
            </div>
          </div>
        )}

        {permissions.bulk && selectedIds.size > 0 && (
          <div className="tickets-bulk-bar" role="region" aria-label="Bulk actions">
            <strong>
              {selectedIds.size} selected
            </strong>
            <div className="tickets-bulk-spacer" />
            <label style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <UserPlus size={14} aria-hidden="true" style={{ color: 'var(--slate-light)' }} />
              <select
                className="tickets-select"
                value=""
                onChange={(event) => bulkAssign(event.target.value)}
                aria-label="Assign selected work orders to a technician"
              >
                <option value="">Assign to…</option>
                {techniciansList.map((tech) => (
                  <option key={tech.user_id} value={tech.user_id}>
                    {tech.name}
                  </option>
                ))}
              </select>
            </label>
            <button type="button" className="tickets-icon-btn" onClick={bulkClose}>
              <CheckCheck size={14} />
              Close selected
            </button>
            <button
              type="button"
              className="tickets-icon-btn"
              onClick={() =>
                downloadTicketsCSV(visibleTickets.filter((t) => selectedIds.has(idOf(t))))
              }
            >
              <Download size={14} />
              Export selected
            </button>
            <button
              type="button"
              className="tickets-icon-btn"
              onClick={() => setSelectedIds(new Set())}
            >
              <X size={14} />
              Clear
            </button>
          </div>
        )}

        {/* Column headers — hidden on mobile, where rows become cards. */}
        <div className="tickets-list-header" aria-hidden="true">
          <div className="tickets-col-select">
            <input
              type="checkbox"
              className="tickets-checkbox"
              checked={allVisibleSelected}
              onChange={toggleSelectAll}
              aria-label="Select all visible work orders"
            />
          </div>
          <div className="tickets-col-identity">Work order / machine</div>
          <div className="tickets-col-issue">Issue &amp; AI insight</div>
          <div className="tickets-col-status">Status · urgency · SLA</div>
          <div className="tickets-col-assignee">Assignee &amp; age</div>
          <div className="tickets-col-actions" style={{ textAlign: 'right' }}>
            Actions
          </div>
        </div>

        {loading ? (
          <div className="tickets-list" aria-busy="true" aria-label="Loading work orders">
            {[0, 1, 2, 3, 4].map((index) => (
              <div key={index} className="tickets-skeleton" />
            ))}
          </div>
        ) : visibleTickets.length === 0 ? (
          <div className="tickets-empty">
            <TicketIcon size={30} style={{ margin: '0 auto 10px', color: 'var(--slate-light)' }} />
            <strong style={{ display: 'block', color: 'var(--ink)', marginBottom: 6 }}>
              {tickets.length === 0
                ? 'No work orders logged yet'
                : 'No work orders match these filters'}
            </strong>
            <p style={{ margin: 0, fontSize: '0.88rem' }}>
              {tickets.length === 0
                ? 'Issues reported from the app or over WhatsApp appear here automatically.'
                : 'Try clearing the search or switching queue.'}
            </p>
            {tickets.length > 0 && (
              <button
                type="button"
                className="tickets-icon-btn"
                style={{ marginTop: 14 }}
                onClick={() => {
                  resetFilters();
                  setActiveFilter('all');
                }}
              >
                Reset all filters
              </button>
            )}
          </div>
        ) : (
          <div className="tickets-list">
            {visibleTickets.map((ticket) => {
              const ticketId = idOf(ticket);
              const isExpanded = expandedId === ticketId;
              return (
                <TicketRow
                  key={ticketId}
                  ticket={ticket}
                  ticketId={ticketId}
                  expanded={isExpanded}
                  selected={selectedIds.has(ticketId)}
                  onToggleExpand={toggleExpand}
                  onToggleSelect={toggleSelect}
                  onStart={handleStart}
                  onAssign={handleAssign}
                  permissions={permissions}
                  now={now}
                >
                  {isExpanded && (
                    <TicketDetailPanel
                      ticket={ticket}
                      ticketId={ticketId}
                      technicians={techniciansList}
                      onStageChange={updateLifecycleStage}
                      onClose={handleCloseTicket}
                      onFieldChange={handleFieldChange}
                      now={now}
                      permissions={permissions}
                    />
                  )}
                </TicketRow>
              );
            })}
          </div>
        )}

        {!loading && visibleTickets.length > 0 && (
          <p
            style={{
              marginTop: 14,
              textAlign: 'center',
              color: 'var(--slate-light)',
              fontSize: '0.76rem',
            }}
          >
            Showing {visibleTickets.length} of {tickets.length} work orders
            {archivedTickets.length > 0 && ` · ${archivedTickets.length} archived (>90 days closed)`}
          </p>
        )}
      </div>

      <QuickReportDialog
        open={quickReportOpen}
        onClose={() => setQuickReportOpen(false)}
        machines={machinesList}
        onTicketCreated={() => {
          setSuccess('Ticket created. Supervisor has been notified via WhatsApp.');
          setQuickReportOpen(false);
          fetchTickets();
        }}
      />
    </AppShell>
  );
}
