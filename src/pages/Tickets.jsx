import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import AppShell from '../components/AppShell';
import AdvancedFeaturesDrilldown from '../components/AdvancedFeaturesDrilldown';
import { supabase } from '../supabaseClient';

// Canonical 10-state work-order lifecycle (roadmap §3.4).
const LIFECYCLE = {
  reported: { label: 'Reported', color: '#F87171' },
  acknowledged: { label: 'Acknowledged', color: '#FBBF24' },
  assigned: { label: 'Assigned', color: '#FBBF24' },
  work_started: { label: 'Work started', color: '#60A5FA' },
  waiting_spare: { label: 'Waiting for spare', color: '#F59E0B' },
  waiting_approval: { label: 'Waiting for approval', color: '#F59E0B' },
  waiting_vendor: { label: 'Waiting for vendor', color: '#F59E0B' },
  repair_completed: { label: 'Repair completed', color: '#34D399' },
  verification_pending: { label: 'Verification pending', color: '#A78BFA' },
  closed: { label: 'Closed', color: '#25D366' },
};
const stageInfo = (ticket) => {
  const raw = String(ticket.lifecycle_stage || '').toLowerCase();
  if (LIFECYCLE[raw]) return LIFECYCLE[raw];
  // Fallback for legacy rows with no lifecycle_stage yet.
  return ['closed', 'resolved'].includes(String(ticket.status || '').toLowerCase()) ? LIFECYCLE.closed : LIFECYCLE.reported;
};

const getDirectCause = (t) => {
  if (t.root_cause && t.root_cause.trim()) return t.root_cause;
  if (t.ai_summary?.predicted_issue && t.ai_summary.predicted_issue.trim()) return t.ai_summary.predicted_issue;

  const mName = t.machine_name && t.machine_name !== 'Unknown' ? t.machine_name : 'Machine';
  const text = ((t.issue_text || '') + ' ' + mName).toLowerCase();
  
  if (/leak|oil|fluid|seal|drop|तेल|गळती/.test(text)) {
    return `${mName}: Hydraulic/Lubrication Seal Degradation or Fitting Pressure Drop`;
  }
  if (/smoke|burn|heat|fire|hot|धुआं|गरम/.test(text)) {
    return `${mName}: Thermal Overload Relay Trip or Motor Coil Resistance Failure`;
  }
  if (/noise|vibration|sound|vibrat|आवाज/.test(text)) {
    return `${mName}: Spindle Shaft Bearing Misalignment or Drive Belt Friction`;
  }
  if (/sensor|limit|tripped|electric|switch/.test(text)) {
    return `${mName}: Proximity Sensor Misalignment or Interlock Circuit Trip`;
  }

  return `${mName}: Mechanical Drive Resistance & Actuator Operational Failure`;
};

const getRootCauseFix = (t) => {
  if (t.repair_action && t.repair_action.trim()) return t.repair_action;
  if (t.ai_summary?.recommended_action && t.ai_summary.recommended_action.trim()) return t.ai_summary.recommended_action;

  const mName = t.machine_name && t.machine_name !== 'Unknown' ? t.machine_name : 'Machine';
  const text = ((t.issue_text || '') + ' ' + mName).toLowerCase();

  if (/leak|oil|fluid|seal|drop|तेल|गळती/.test(text)) {
    return `Replace hydraulic cylinder seal rings, torque pipe fittings to specification, and top up ISO VG 68 oil.`;
  }
  if (/smoke|burn|heat|fire|hot|धुआं|गरम/.test(text)) {
    return `Isolate main power, inspect motor windings resistance, clean cooling fins, and test thermal overload relay.`;
  }
  if (/noise|vibration|sound|vibrat|आवाज/.test(text)) {
    return `Re-align drive pulleys, replace high-speed spindle bearings, and apply synthetic lithium grease.`;
  }
  
  return `Perform full diagnostic check on safety interlocks, recalibrate proximity sensors, and test full stroke operation under load.`;
};

export default function Tickets() {
  const location = useLocation();
  const getParam = (k, d) => new URLSearchParams(location.search).get(k) || d;
  
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const [activeFilter, setActiveFilter] = useState(() => getParam('activeFilter', 'all'));
  const [expandedId, setExpandedId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [filterMachine, setFilterMachine] = useState(() => getParam('machine', 'all'));
  const [filterStatus, setFilterStatus] = useState(() => getParam('status', 'all'));
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [filterTechnician, setFilterTechnician] = useState('all');
  const [machinesList, setMachinesList] = useState([]);
  const [techniciansList, setTechniciansList] = useState([]);

  useEffect(() => {
    document.title = 'Tickets | TurboFix';
    fetchTicketsAndEscalation();

    const channel = supabase
      .channel('public:tickets_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tickets' }, () => {
        fetchTicketsAndEscalation();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchTicketsAndEscalation = async () => {
    setLoading(true);
    setError('');
    try {
      const [ticketsRes, machinesRes, directoryRes] = await Promise.all([
        supabase.from('tickets').select('*'),
        supabase.from('machines').select('id,name,technician_user_id,supervisor_id'),
        supabase.functions.invoke('onboard_team_member', { body: { action: 'list' } }),
      ]);

      if (ticketsRes.error) throw new Error(ticketsRes.error.message);
      if (machinesRes.error) throw new Error(machinesRes.error.message);

      const directoryMembers = directoryRes.data?.members || [];
      const teamMap = {};
      const techsOnly = [];
      directoryMembers.forEach(m => {
        teamMap[m.user_id] = m.name;
        if (['maintenance_technician', 'technician', 'owner', 'supervisor', 'engineer'].includes(m.role)) {
          techsOnly.push(m);
        }
      });
      setTechniciansList(techsOnly);

      const machineMap = {};
      const machineTechMap = {};
      const machineTechNameMap = {};
      const mList = (machinesRes.data || []).map(m => {
        machineMap[m.id] = m.name;
        const techId = m.technician_user_id;
        machineTechMap[m.id] = techId || null;
        machineTechNameMap[m.id] = techId ? (teamMap[techId] || 'Unassigned') : 'Unassigned';
        return { id: m.id, name: m.name };
      });
      setMachinesList(mList);

      // Urgency can live on the ticket column (in-app / WhatsApp) or inside the
      // AI summary. Normalise both to a single Title-case value.
      const normUrgency = (t) => {
        const raw = String(t.urgency || (typeof t.ai_summary === 'object' ? t.ai_summary?.urgency : '') || '').toLowerCase();
        return raw ? raw.charAt(0).toUpperCase() + raw.slice(1) : '';
      };
      const data = (ticketsRes.data || []).map(t => ({
        ticket_id: t.id,
        machine_id: t.machine_id,
        machine_name: machineMap[t.machine_id] || 'Unknown',
        status: t.status,
        issue_text: t.issue_text,
        ai_summary: t.ai_summary,
        urgency: normUrgency(t),
        description: t.issue_text,
        created_at: t.created_at,
        reported_at: t.created_at,
        reporter_phone: t.reporter_phone,
        wo_number: t.wo_number,
        lifecycle_stage: t.lifecycle_stage,
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
        technician_id: machineTechMap[t.machine_id] || null,
        technician_name: machineTechNameMap[t.machine_id] || 'Unassigned'
      }));
      // Open work first, then most-recent — the queue an owner actually scans.
      data.sort((a, b) => {
        const aOpen = String(a.status).toLowerCase() === 'open' ? 0 : 1;
        const bOpen = String(b.status).toLowerCase() === 'open' ? 0 : 1;
        if (aOpen !== bOpen) return aOpen - bOpen;
        return new Date(b.created_at || 0) - new Date(a.created_at || 0);
      });
      setTickets(data);
    } catch (err) {
      setError(err.message || 'An error occurred while loading tickets.');
    } finally {
      setLoading(false);
    }
  };

  const handleCloseTicket = async (ticketId) => {
    if (!window.confirm('Close this work order directly? This bypasses the technician repair record and supervisor verification.')) return;
    setError('');
    setSuccess('');
    try {
      const { error: updateErr } = await supabase.from('tickets').update({ status: 'resolved' }).eq('id', ticketId);
      if (updateErr) throw new Error(updateErr.message);
      setSuccess(`Ticket ${ticketId.substring(0, 8)} has been successfully closed.`);
      fetchTicketsAndEscalation();
    } catch (err) {
      setError(err.message);
    }
  };

  const formatDateTime = (dtStr) => {
    if (!dtStr) return '—';
    try {
      const d = new Date(dtStr.replace(' ', 'T'));
      return d.toLocaleString();
    } catch {
      return dtStr;
    }
  };

  const isUrgent = (ticket) => ['high', 'critical'].includes(String(ticket.urgency).toLowerCase());
  const openCount = tickets.filter((ticket) => String(ticket.status).toLowerCase() === 'open').length;
  const urgentCount = tickets.filter((ticket) => String(ticket.status).toLowerCase() === 'open' && isUrgent(ticket)).length;
  const closedCount = tickets.filter((ticket) => ['closed', 'resolved'].includes(String(ticket.status).toLowerCase())).length;
  
  const visibleTickets = tickets.filter((t) => {
    // 1. Text Search Filter (WO, machine name, issue text, phone, etc.)
    const matchesSearch = !searchTerm.trim() || [
      t.wo_number,
      t.machine_name,
      t.issue_text,
      t.reporter_phone,
      t.status,
      t.urgency,
      t.ticket_id
    ].some(field => String(field || '').toLowerCase().includes(searchTerm.toLowerCase()));

    // 2. Machine Filter
    const matchesMachine = filterMachine === 'all' || String(t.machine_id) === String(filterMachine);

    // 3. Status Filter (Tab status filter key: 'all', 'open', 'urgent', 'closed')
    let matchesTabStatus = true;
    if (activeFilter === 'open') {
      matchesTabStatus = String(t.status).toLowerCase() === 'open';
    } else if (activeFilter === 'urgent') {
      matchesTabStatus = ['high', 'critical'].includes(String(t.urgency).toLowerCase()) && String(t.status).toLowerCase() === 'open';
    } else if (activeFilter === 'closed') {
      matchesTabStatus = ['closed', 'resolved'].includes(String(t.status).toLowerCase());
    }

    // 4. Advanced Status Filter Dropdown
    let matchesStatus = true;
    if (filterStatus !== 'all') {
      if (filterStatus === 'open') {
        matchesStatus = String(t.status).toLowerCase() === 'open';
      } else if (filterStatus === 'closed') {
        matchesStatus = ['closed', 'resolved'].includes(String(t.status).toLowerCase());
      } else {
        matchesStatus = String(t.lifecycle_stage || '').toLowerCase() === filterStatus.toLowerCase();
      }
    }

    // 5. Date Range Filter
    let matchesDate = true;
    if (t.created_at) {
      const ticketTime = new Date(t.created_at).getTime();
      if (filterStartDate) {
        const startMs = new Date(filterStartDate + 'T00:00:00').getTime();
        if (ticketTime < startMs) matchesDate = false;
      }
      if (filterEndDate) {
        const endMs = new Date(filterEndDate + 'T23:59:59').getTime();
        if (ticketTime > endMs) matchesDate = false;
      }
    }

    // 6. Technician Filter
    const matchesTechnician = filterTechnician === 'all' || String(t.technician_id) === String(filterTechnician);

    return matchesSearch && matchesMachine && matchesTabStatus && matchesStatus && matchesDate && matchesTechnician;
  });

  return (
    <AppShell active="tickets">
      {/* Pulse Animations style tag */}
      <style dangerouslySetInnerHTML={{ __html: `
        .glow-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          display: inline-block;
          margin-right: 8px;
          box-shadow: 0 0 8px currentColor;
        }
        .glow-dot.healthy {
          background-color: #25D366;
          color: #25D366;
          animation: pulse-green 2s infinite;
        }
        .glow-dot.down {
          background-color: #EF4444;
          color: #EF4444;
          animation: pulse-red 2s infinite;
        }
        @keyframes pulse-green {
          0% { box-shadow: 0 0 0 0 rgba(37, 211, 102, 0.7); }
          70% { box-shadow: 0 0 0 6px rgba(37, 211, 102, 0); }
          100% { box-shadow: 0 0 0 0 rgba(37, 211, 102, 0); }
        }
        @keyframes pulse-red {
          0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7); }
          70% { box-shadow: 0 0 0 6px rgba(239, 68, 68, 0); }
          100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
        }
        
        .vault-card {
          border: 1px solid rgba(255, 255, 255, 0.1) !important;
        }
      ` }} />

      <div className="vault-wrap workspace-page tickets-page" style={{ maxWidth: '1100px', padding: '20px 24px 80px' }}>
        <div className="workspace-page-heading" style={{ marginBottom: '20px' }}>
          <h1 style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '2rem', margin: 0, textTransform: 'uppercase' }}>Work Order Control Board</h1>
          <p style={{ color: 'var(--slate)', fontSize: '0.9rem', margin: '4px 0 0' }}>TurboFix keeps the normal flow on repair, verification, and closure while analytics continues to power diagnostics and priority signals underneath.</p>
        </div>

        {/* Japanese TPS Andon Visual Health Banner */}
        <div style={{ 
          background: openCount > 0 ? 'rgba(239, 68, 68, 0.12)' : 'rgba(37, 211, 102, 0.12)', 
          border: `1px solid ${openCount > 0 ? 'rgba(239, 68, 68, 0.3)' : 'rgba(37, 211, 102, 0.3)'}`, 
          borderRadius: '10px', 
          padding: '12px 16px', 
          marginBottom: '20px', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          backdropFilter: 'blur(10px)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ 
              width: '12px', 
              height: '12px', 
              borderRadius: '50%', 
              background: openCount > 0 ? '#ef4444' : '#25D366',
              boxShadow: openCount > 0 ? '0 0 12px #ef4444' : '0 0 12px #25D366'
            }} />
            <div>
              <strong style={{ fontSize: '0.95rem', color: 'white', textTransform: 'uppercase', fontFamily: 'Rajdhani, sans-serif', letterSpacing: '0.5px' }}>
                {openCount > 0 ? `${openCount} active maintenance item${openCount === 1 ? '' : 's'} need attention` : 'All machines are clear right now'}
              </strong>
              <div style={{ fontSize: '0.78rem', color: '#cbd5e1' }}>
              {openCount > 0 ? 'Use the queue below to see priority, ownership, stage, and the next safe action.' : 'There are no open tickets. New issues will appear here as soon as they are reported.'}
              </div>
            </div>
          </div>
          <span style={{ fontSize: '0.72rem', fontWeight: 'bold', color: openCount > 0 ? '#ef4444' : '#25D366', background: 'rgba(0,0,0,0.3)', padding: '4px 10px', borderRadius: '6px', fontFamily: 'monospace' }}>
            {openCount > 0 ? 'Needs action' : 'Running clear'}
          </span>
        </div>

        {error && <div className="vault-error show" style={{ marginBottom: '16px' }}>{error}</div>}
        {success && <div className="vault-success" style={{ background: '#065f46', color: '#d1fae5', padding: '12px 16px', borderRadius: '8px', marginBottom: '16px', fontSize: '14px' }}>{success}</div>}

        {!loading && tickets.length > 0 && (
          <>
            <section className="postlogin-summary" aria-label="Ticket summary filters">
              {[['all', tickets.length, 'All tickets'], ['open', openCount, 'Open work'], ['urgent', urgentCount, 'Urgent issues'], ['closed', closedCount, 'Closed tickets']].map(([key, value, label]) => <button type="button" className={activeFilter === key ? 'active' : ''} onClick={() => setActiveFilter(key)} key={key}><strong>{value}</strong><span>{label}</span><small>View details →</small></button>)}
            </section>
            <div style={{ margin: '16px 0 16px', display: 'flex', gap: '12px' }}>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="🔍 Search tickets by WO number, machine name, issue, phone..."
                style={{
                  width: '100%',
                  background: '#0b1118',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: '8px',
                  padding: '10px 14px',
                  color: 'white',
                  fontSize: '0.85rem'
                }}
              />
            </div>

            {/* ADVANCED FEATURES: Multi-Faceted Filters */}
            <AdvancedFeaturesDrilldown isOpen={showAdvanced} onToggle={() => setShowAdvanced(!showAdvanced)}>
              <div style={{
              background: '#0e1722',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: '10px',
              padding: '16px',
              marginBottom: '20px',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '12px'
            }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 'bold', textTransform: 'uppercase' }}>Filter by Machine</label>
                <select 
                  value={filterMachine} 
                  onChange={(e) => setFilterMachine(e.target.value)} 
                  style={{ height: '42px', background: '#0b1118', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '6px', color: 'white', padding: '0 8px', fontSize: '0.85rem' }}
                >
                  <option value="all">All Machines</option>
                  {machinesList.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 'bold', textTransform: 'uppercase' }}>Filter by Status</label>
                <select 
                  value={filterStatus} 
                  onChange={(e) => setFilterStatus(e.target.value)} 
                  style={{ height: '42px', background: '#0b1118', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '6px', color: 'white', padding: '0 8px', fontSize: '0.85rem' }}
                >
                  <option value="all">All Statuses</option>
                  <option value="open">🟢 Open</option>
                  <option value="closed">🔴 Closed</option>
                  <option value="reported">Reported</option>
                  <option value="acknowledged">Acknowledged</option>
                  <option value="assigned">Assigned</option>
                  <option value="work_started">Work Started</option>
                  <option value="waiting_spare">Waiting for Spare</option>
                  <option value="repair_completed">Repair Completed</option>
                  <option value="verification_pending">Verification Pending</option>
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 'bold', textTransform: 'uppercase' }}>Filter by Technician</label>
                <select 
                  value={filterTechnician} 
                  onChange={(e) => setFilterTechnician(e.target.value)} 
                  style={{ height: '42px', background: '#0b1118', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '6px', color: 'white', padding: '0 8px', fontSize: '0.85rem' }}
                >
                  <option value="all">All Technicians</option>
                  {techniciansList.map(t => <option key={t.user_id} value={t.user_id}>{t.name} ({t.role.replace('maintenance_', '')})</option>)}
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 'bold', textTransform: 'uppercase' }}>Start Date</label>
                <input 
                  type="date" 
                  value={filterStartDate} 
                  onChange={(e) => setFilterStartDate(e.target.value)} 
                  style={{ height: '42px', background: '#0b1118', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '6px', color: 'white', padding: '0 8px', fontSize: '0.85rem', colorScheme: 'dark' }} 
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 'bold', textTransform: 'uppercase' }}>End Date</label>
                <input 
                  type="date" 
                  value={filterEndDate} 
                  onChange={(e) => setFilterEndDate(e.target.value)} 
                  style={{ height: '42px', background: '#0b1118', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '6px', color: 'white', padding: '0 8px', fontSize: '0.85rem', colorScheme: 'dark' }} 
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                <button 
                  type="button" 
                  onClick={() => {
                    setFilterMachine('all');
                    setFilterStatus('all');
                    setFilterStartDate('');
                    setFilterEndDate('');
                    setFilterTechnician('all');
                    setSearchTerm('');
                  }}
                  style={{ height: '42px', width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: '#F87171', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.85rem' }}
                >
                  Reset Filters
                </button>
              </div>
            </div>
            </AdvancedFeaturesDrilldown>
          </>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--slate)' }}>Loading tickets...</div>
        ) : tickets.length === 0 ? (
          <div className="vault-card" style={{ textAlign: 'center', padding: '40px' }}>
            <p style={{ color: 'var(--slate)', margin: 0 }}>No tickets logged yet. Issues reported from the app or over WhatsApp appear here automatically.</p>
          </div>
        ) : (
          <div className="vault-card" style={{ padding: 0, overflowX: 'auto' }}>
            <table className="vault-table">
              <thead>
                <tr>
                  <th>Work Order</th>
                  <th>Machine Name</th>
                  <th>Reported At</th>
                  <th>Urgency</th>
                  <th>Description / AI Summary</th>
                  <th>Lifecycle Stage</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {visibleTickets.length === 0 && <tr><td colSpan="8" style={{ textAlign: 'center', color: 'var(--slate)', padding: '32px' }}>No tickets match this view.</td></tr>}
                {visibleTickets.map((t) => {
                  const ticketId = t.ticket_id || t.id || '—';
                  const status = String(t.status || 'Open').toLowerCase();
                  const stage = stageInfo(t);
                  const isClosed = ['closed', 'resolved'].includes(status);
                  const isExpanded = expandedId === ticketId;
                  const hasRecord = t.root_cause || t.repair_action || t.parts_used || t.labour_minutes || t.downtime_minutes;

                  return (
                    <React.Fragment key={ticketId}>
                    <tr onClick={() => setExpandedId(isExpanded ? null : ticketId)} style={{ cursor: 'pointer', background: isExpanded ? 'rgba(255,255,255,0.03)' : 'transparent' }} title="Click to view repair details">
                      <td style={{ fontFamily: 'monospace', fontWeight: 'bold', color: 'white' }}>
                        <span style={{ display: 'inline-block', width: '12px', color: 'var(--slate)', transform: isExpanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s' }}>›</span> {t.wo_number || (ticketId !== '—' ? ticketId.split('-')[0] || ticketId : ticketId)}
                      </td>
                      <td style={{ fontWeight: '600', color: 'white' }}>
                        <div>{t.machine_name || t.machine_id}</div>
                        <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span>🔧 Assigned:</span>
                          <span style={{ color: '#8deead', fontWeight: 'bold' }}>{t.technician_name}</span>
                        </div>
                        {t.repeat_failure_flag && <span title="Recurring failure — RCA recommended" style={{ display: 'inline-block', marginTop: '4px', fontSize: '0.66rem', fontWeight: 700, textTransform: 'uppercase', color: '#F87171', border: '1px solid #F87171', borderRadius: '999px', padding: '1px 7px', whiteSpace: 'nowrap' }}>Repeat ×{(t.repeat_failure_count || 0) + 1}</span>}
                      </td>
                      <td style={{ whiteSpace: 'nowrap', color: '#cbd5e1' }}>{formatDateTime(t.reported_at)}</td>
                      <td>
                        {(() => {
                          if (!t.urgency) return '—';
                          const u = t.urgency.toLowerCase();
                          const c = u === 'critical' ? { background: 'rgba(239,68,68,0.15)', color: '#F87171', border: '1px solid rgba(239,68,68,0.4)' }
                            : u === 'high' ? { background: 'rgba(245,158,11,0.15)', color: '#FBBF24', border: '1px solid rgba(245,158,11,0.4)' }
                            : u === 'medium' ? { background: 'rgba(96,165,250,0.12)', color: '#60A5FA', border: '1px solid rgba(96,165,250,0.35)' }
                            : { background: 'rgba(148,163,184,0.12)', color: '#94a3b8', border: '1px solid rgba(148,163,184,0.3)' };
                          return <span style={{ ...c, fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', borderRadius: '999px', padding: '2px 9px', whiteSpace: 'nowrap' }}>{t.urgency}</span>;
                        })()}
                      </td>
                      <td style={{ maxWidth: '260px', fontSize: '0.82rem', color: '#cbd5e1' }}>
                        {t.description || (t.ai_summary && t.ai_summary.predicted_issue) || '—'}
                      </td>
                      <td>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', fontWeight: 700, padding: '3px 9px', borderRadius: '999px', color: stage.color, border: `1px solid ${stage.color}`, background: `${stage.color}1a`, whiteSpace: 'nowrap' }}>
                          <span style={{ width: 6, height: 6, borderRadius: '50%', background: stage.color }} /> {stage.label}
                        </span>
                      </td>
                      <td>
                        {status === 'open' ? (
                          <span className="vault-role-badge read-only" style={{ display: 'inline-flex', alignItems: 'center', background: 'rgba(239, 68, 68, 0.12)', color: '#F87171', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                            <span className="glow-dot down" /> Open
                          </span>
                        ) : (
                          <span className="vault-role-badge" style={{ display: 'inline-flex', alignItems: 'center', background: 'rgba(37, 211, 102, 0.12)', color: '#25D366', border: '1px solid rgba(37, 211, 102, 0.2)' }}>
                            <span className="glow-dot healthy" /> Closed
                          </span>
                        )}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        {status === 'open' ? (
                          <button className="vault-btn vault-btn-danger" style={{ padding: '6px 14px', fontSize: '0.75rem' }} onClick={(e) => { e.stopPropagation(); handleCloseTicket(ticketId); }}>
                            Direct close
                          </button>
                        ) : (
                          <span style={{ fontSize: '0.8rem', color: 'var(--slate-light)' }}>
                            {t.closure_approved_by ? `Verified by ${t.closure_approved_by}` : 'Closed'}
                          </span>
                        )}
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr>
                        <td colSpan="8" style={{ background: 'rgba(0,0,0,0.25)', padding: '16px 20px' }}>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '12px 20px' }}>
                            {[
                              ['Root cause', t.root_cause],
                              ['Repair action', t.repair_action],
                              ['Parts used', t.parts_used],
                              ['Labour time', t.labour_minutes ? `${t.labour_minutes} min` : null],
                              ['Machine downtime', t.downtime_minutes != null ? `${t.downtime_minutes} min` : null],
                              ['Work started', t.started_at ? formatDateTime(t.started_at) : null],
                              ['Closed', t.resolved_at ? formatDateTime(t.resolved_at) : null],
                              ['Verified by', t.closure_approved_by],
                            ].map(([label, value]) => (
                              <div key={label}>
                                <small style={{ display: 'block', color: 'var(--slate)', fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</small>
                                <span style={{ color: value ? 'white' : 'var(--slate)', fontSize: '0.85rem' }}>{value || '—'}</span>
                              </div>
                            ))}
                          </div>
                          {t.ai_summary?.photo_url && (
                            <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                              <small style={{ display: 'block', color: 'var(--slate)', fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '6px' }}>Reported Photo</small>
                              <a href={t.ai_summary.photo_url} target="_blank" rel="noopener noreferrer">
                                <img src={t.ai_summary.photo_url} alt="Reported issue photo" style={{ maxWidth: '240px', maxHeight: '160px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer', objectFit: 'cover' }} />
                              </a>
                            </div>
                          )}

                          {/* AI Machine Predictive Diagnosis & Historical Machine Intelligence Card */}
                          <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.06)', background: 'rgba(59, 130, 246, 0.06)', padding: '14px', borderRadius: '10px', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                              <strong style={{ fontSize: '0.82rem', color: '#60A5FA', textTransform: 'uppercase', letterSpacing: '0.04em', fontFamily: 'Rajdhani, sans-serif', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                🤖 AI MACHINE DIAGNOSIS — {t.machine_name || 'Unit'}
                              </strong>
                              <span style={{ fontSize: '0.68rem', color: '#60A5FA', background: 'rgba(59, 130, 246, 0.15)', padding: '2px 8px', borderRadius: '4px', fontWeight: 'bold' }}>Predictive Diagnostics</span>
                            </div>
                            
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px', fontSize: '0.8rem', color: '#e2e8f0', marginBottom: '10px' }}>
                              <div style={{ background: 'rgba(0,0,0,0.3)', padding: '10px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                <small style={{ display: 'block', color: '#94a3b8', fontSize: '0.68rem', textTransform: 'uppercase', fontWeight: 'bold', marginBottom: '2px' }}>AI Predicted Root Cause</small>
                                <span>{t.ai_summary?.predicted_issue || `${t.machine_name}: Inspection required for reported issue.`}</span>
                              </div>
                              <div style={{ background: 'rgba(0,0,0,0.3)', padding: '10px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                <small style={{ display: 'block', color: '#94a3b8', fontSize: '0.68rem', textTransform: 'uppercase', fontWeight: 'bold', marginBottom: '2px' }}>Recommended Repair Step</small>
                                <span>{t.ai_summary?.recommended_action || 'Perform standard troubleshooting protocol and verify component interlocks.'}</span>
                              </div>
                              <div style={{ background: 'rgba(0,0,0,0.3)', padding: '10px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                <small style={{ display: 'block', color: '#94a3b8', fontSize: '0.68rem', textTransform: 'uppercase', fontWeight: 'bold', marginBottom: '2px' }}>Suggested Spare Parts</small>
                                <span>{t.ai_summary?.recommended_parts || 'Standard maintenance spares & seal kits.'}</span>
                              </div>
                            </div>

                            {/* Machine History Insight */}
                            <div style={{ fontSize: '0.78rem', color: '#fbbf24', background: 'rgba(245, 158, 11, 0.08)', padding: '8px 12px', borderRadius: '6px', border: '1px solid rgba(245, 158, 11, 0.2)', fontStyle: 'italic' }}>
                              {t.ai_summary?.historical_insights || `⚠️ ${t.machine_name} breakdown pattern tracked by TurboFix Machine Intelligence.`}
                            </div>
                          </div>

                          {/* Japanese TPS Kaizen 5-Why RCA Standard Card */}
                          <div style={{ marginTop: '12px', background: 'rgba(134,59,255,0.05)', padding: '12px 14px', borderRadius: '8px', border: '1px solid rgba(134,59,255,0.15)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                              <strong style={{ fontSize: '0.78rem', color: '#a78bfa', textTransform: 'uppercase', letterSpacing: '0.04em', fontFamily: 'Rajdhani, sans-serif' }}>
                                🇯🇵 KAIZEN 5-WHY ROOT CAUSE DIAGNOSIS (改善)
                              </strong>
                              <span style={{ fontSize: '0.68rem', color: '#863bff', background: 'rgba(134,59,255,0.12)', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>Standard Work</span>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.8rem', color: '#cbd5e1' }}>
                              <div><strong style={{ color: '#94a3b8' }}>Why 1 (Reported Symptom):</strong> {t.issue_text || '—'}</div>
                              <div><strong style={{ color: '#94a3b8' }}>Why 2 (Direct Cause):</strong> {getDirectCause(t)}</div>
                              <div><strong style={{ color: '#94a3b8' }}>Why 3 (Root Cause & Fix):</strong> {getRootCauseFix(t)}</div>
                            </div>
                          </div>

                          {!hasRecord && !isClosed && <div style={{ color: 'var(--slate)', fontSize: '0.82rem', marginTop: '10px' }}>The technician has not recorded manual repair logs yet. AI Predictive Diagnosis is active above.</div>}
                        </td>
                      </tr>
                    )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppShell>
  );
}
