import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  Activity, ArrowLeft, BookOpen, Bot, CalendarDays, ChevronRight, CircleAlert,
  ClipboardList, Droplets, FileCheck2, MapPin, PackageSearch, Phone, QrCode,
  ShieldCheck, Upload, Users,
} from 'lucide-react';
import AppShell from '../components/AppShell';
import ContactReveal from '../components/ContactReveal';
import { supabase } from '@/supabaseClient';

const WORKSPACE_TABS = [
  { id: 'info', label: 'Overview', hint: 'Status and response', Icon: Activity },
  { id: 'docs', label: 'Documents', hint: 'Manuals and diagrams', Icon: BookOpen },
  { id: 'parts', label: 'Spare parts', hint: 'BOM and stock', Icon: PackageSearch },
  { id: 'consumables', label: 'Consumables', hint: 'Usage and stock', Icon: Droplets },
  { id: 'calendar', label: 'Calendar', hint: 'Order and replace', Icon: CalendarDays },
  { id: 'qr', label: 'QR tag', hint: 'Report from machine', Icon: QrCode },
];

export default function Machines() {
  const [machines, setMachines] = useState([]);
  const [team, setTeam] = useState([]);
  const [escalationPath, setEscalationPath] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedMachine, setSelectedMachine] = useState(null);
  
  // Workspace active tab: 'info' | 'docs' | 'parts' | 'consumables' | 'calendar' | 'qr'
  const [wsTab, setWsTab] = useState('info');

  // Onboarding Form states
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [technicianUserId, setTechnicianUserId] = useState('');
  const [supervisorUserId, setSupervisorUserId] = useState('');
  const [engineerUserId, setEngineerUserId] = useState('');
  const [headUserId, setHeadUserId] = useState('');

  // Sub-tabs State for Selected Machine
  const [docs, setDocs] = useState([]);
  const [parts, setParts] = useState([]);
  const [consumables, setConsumables] = useState([]);
  const [docsLoading, setDocsLoading] = useState(false);
  const [partsLoading, setPartsLoading] = useState(false);
  const [consumablesLoading, setConsumablesLoading] = useState(false);
  const [machineData, setMachineData] = useState(null);
  const [machineDataLoading, setMachineDataLoading] = useState(false);
  const [enrichingMachineData, setEnrichingMachineData] = useState(false);

  // Sub-tab Form inputs
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadCategory, setUploadCategory] = useState('manual');
  const [newPartName, setNewPartName] = useState('');
  const [newPartNum, setNewPartNum] = useState('');
  const [newPartQty, setNewPartQty] = useState('');
  const [newPartReorder, setNewPartReorder] = useState('');

  const [newConsName, setNewConsName] = useState('');
  const [newConsQty, setNewConsQty] = useState('');
  const [newConsUnit, setNewConsUnit] = useState('L');
  const [newConsBurn, setNewConsBurn] = useState('5');
  const [newConsLead, setNewConsLead] = useState('7');
  const [newConsBuffer, setNewConsBuffer] = useState('3');
  const [newConsFreq, setNewConsFreq] = useState('30');
  const [newConsLastRep, setNewConsLastRep] = useState(new Date().toISOString().split('T')[0]);

  // Calendar Year/Month
  const [currentYear, setCurrentYear] = useState(() => new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState(() => new Date().getMonth());


  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (selectedMachine) {
      loadMachineAssets(selectedMachine.machine_id);
    }
  }, [selectedMachine]);

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const [machinesRes, ticketsRes, usersRes] = await Promise.all([
        supabase.from('machines').select('id,name,location,status,assigned_technician_phone,supervisor_id,factory_id'),
        supabase.from('tickets').select('id,machine_id,status'),
        supabase.from('users').select('id,name,role,email,phone'),
      ]);

      const openByMachine = {};
      (ticketsRes.data || []).forEach(t => {
        if (t.status === 'open') openByMachine[t.machine_id] = true;
      });

      const mData = (machinesRes.data || []).map(m => ({
        machine_id: m.id,
        machine_name: m.name,
        location: m.location,
        status: m.status,
        has_open_tickets: !!openByMachine[m.id],
        assigned_technician_phone: m.assigned_technician_phone,
        supervisor_id: m.supervisor_id,
        factory_id: m.factory_id,
        assignments: {},
        wa_link: null,
      }));
      setMachines(mData);

      const teamData = (usersRes.data || []).map(u => ({
        user_id: u.id,
        name: u.name,
        role: u.role,
        email: u.email,
        phone: u.phone,
        can_receive_alerts: true,
      }));
      setTeam(teamData);
      setEscalationPath([]);
    } catch (err) {
      setError(err.message || 'An error occurred while loading data.');
    } finally {
      setLoading(false);
    }
  };

  const loadMachineAssets = async (machineId) => {
    setMachineDataLoading(true);
    setMachineData(null);
    setMachineDataLoading(false);

    setDocsLoading(true);
    try {
      const { data } = await supabase.from('documents').select('id,title,category,file_url,created_at').eq('machine_id', machineId);
      setDocs((data || []).map(d => ({ document_id: d.id, doc_id: d.id, file_name: d.title, filename: d.title, category: d.category, uploaded_at: d.created_at })));
    } catch {}
    setDocsLoading(false);

    setPartsLoading(true);
    try {
      const { data } = await supabase.from('parts').select('id,name,part_number,stock_qty,unit,reorder_level,lead_time_days,machine_id').eq('machine_id', machineId);
      setParts((data || []).map(p => ({ part_id: p.id, part_name: p.name, part_number: p.part_number, quantity_on_hand: p.stock_qty, unit: p.unit || 'pcs', reorder_level: p.reorder_level || 0, lead_time_days: p.lead_time_days })));
    } catch {}
    setPartsLoading(false);

    setConsumablesLoading(true);
    try {
      const { data } = await supabase.from('consumables').select('id,name,stock_qty,unit,reorder_level,lead_time_days,buffer_days,frequency_days,last_replaced_at,machine_id').eq('machine_id', machineId);
      setConsumables((data || []).map(c => ({
        consumable_id: c.id, name: c.name, quantity_on_hand: c.stock_qty, unit: c.unit || 'L', reorder_level: c.reorder_level || 0,
        notes: JSON.stringify({ burn_rate: 1, lead_days: c.lead_time_days || 7, buffer_days: c.buffer_days || 3, replacement_schedule_days: c.frequency_days || 30, last_replaced: c.last_replaced_at ? c.last_replaced_at.split('T')[0] : new Date().toISOString().split('T')[0] }),
      })));
    } catch {}
    setConsumablesLoading(false);
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      const { data: factoryRows } = await supabase.from('factories').select('id').limit(1);
      const factoryId = factoryRows?.[0]?.id;
      if (!factoryId) throw new Error('No factory found. Please set up a factory first.');

      const { data: newRow, error: insertErr } = await supabase.from('machines').insert({
        name, location,
        assigned_technician_phone: technicianUserId ? team.find(t => t.user_id === technicianUserId)?.phone || '' : '',
        supervisor_id: supervisorUserId || null,
        factory_id: factoryId,
      }).select().single();
      if (insertErr) throw new Error(insertErr.message);

      setSuccess(`Machine ${newRow.id} successfully onboarded!`);
      setShowAddForm(false);
      setName(''); setLocation(''); setTechnicianUserId(''); setSupervisorUserId(''); setEngineerUserId(''); setHeadUserId('');
      fetchData();
    } catch (err) {
      setError(err.message);
    }
  };

  const getAssignment = (machine, key) => machine?.assignments?.[key] || null;
  const getAssignmentName = (machine, key) => getAssignment(machine, key)?.name || 'Not assigned';
  const assignable = (role) => team.filter((member) => member.role === role && member.can_receive_alerts);
  const technicians = assignable('maintenance_technician');
  const supervisors = assignable('supervisor');
  const engineers = assignable('maintenance_engineer');
  const maintenanceHeads = assignable('maintenance_head');

  // Sub-tab handlers
  const handleUploadDoc = async (e) => {
    e.preventDefault();
    if (!uploadFile || !selectedMachine) return;
    setDocsLoading(true);
    try {
      const filePath = `${selectedMachine.machine_id}/${Date.now()}_${uploadFile.name}`;
      const { error: upErr } = await supabase.storage.from('documents').upload(filePath, uploadFile);
      if (upErr) throw new Error(upErr.message);

      const { error: insertErr } = await supabase.from('documents').insert({
        machine_id: selectedMachine.machine_id,
        title: uploadFile.name.replace(/\.[^.]+$/, ''),
        category: uploadCategory,
        file_url: filePath,
      });
      if (insertErr) throw new Error(insertErr.message);
      setUploadFile(null);
      loadMachineAssets(selectedMachine.machine_id);
    } catch (err) {
      alert(err.message);
    } finally {
      setDocsLoading(false);
    }
  };

  const handleInternetEnrichment = async () => {
    alert('Internet enrichment is not yet available in this version.');
  };

  const downloadDoc = async (docId, filename) => {
    try {
      const { data: docRow } = await supabase.from('documents').select('file_url').eq('id', docId).single();
      if (!docRow?.file_url) throw new Error('No file URL');
      const { data: signedData, error: signErr } = await supabase.storage.from('documents').createSignedUrl(docRow.file_url, 300);
      if (signErr) throw new Error(signErr.message);
      window.open(signedData.signedUrl, '_blank');
    } catch (err) {
      alert('Download failed: ' + err.message);
    }
  };

  const handleDeleteDoc = async (docId) => {
    if (!window.confirm('Delete this document?')) return;
    try {
      const { error: delErr } = await supabase.from('documents').delete().eq('id', docId);
      if (!delErr) loadMachineAssets(selectedMachine.machine_id);
    } catch {}
  };

  const handleAddPart = async (e) => {
    e.preventDefault();
    if (!selectedMachine) return;
    setPartsLoading(true);
    try {
      const { data: factoryRows } = await supabase.from('factories').select('id').limit(1);
      const factoryId = factoryRows?.[0]?.id;
      const { error: insertErr } = await supabase.from('parts').insert({
        machine_id: selectedMachine.machine_id,
        name: newPartName,
        part_number: newPartNum,
        stock_qty: parseFloat(newPartQty) || 0,
        unit: 'pcs',
        reorder_level: parseFloat(newPartReorder) || 0,
        lead_time_days: 7,
        factory_id: factoryId,
      });
      if (insertErr) throw new Error(insertErr.message);
      setNewPartName(''); setNewPartNum(''); setNewPartQty(''); setNewPartReorder('');
      loadMachineAssets(selectedMachine.machine_id);
    } catch (err) {
      alert(err.message);
    } finally {
      setPartsLoading(false);
    }
  };

  const handleDeletePart = async (partId) => {
    if (!window.confirm('Delete this spare part?')) return;
    try {
      const { error: delErr } = await supabase.from('parts').delete().eq('id', partId);
      if (!delErr) loadMachineAssets(selectedMachine.machine_id);
    } catch {}
  };

  const handleAddConsumable = async (e) => {
    e.preventDefault();
    if (!selectedMachine) return;
    setConsumablesLoading(true);
    try {
      const { data: factoryRows } = await supabase.from('factories').select('id').limit(1);
      const factoryId = factoryRows?.[0]?.id;
      const { error: insertErr } = await supabase.from('consumables').insert({
        machine_id: selectedMachine.machine_id,
        name: newConsName,
        stock_qty: parseFloat(newConsQty) || 0,
        unit: newConsUnit,
        reorder_level: (parseFloat(newConsBurn) || 1) * ((parseFloat(newConsLead) || 7) + (parseFloat(newConsBuffer) || 3)),
        lead_time_days: parseInt(newConsLead) || 7,
        buffer_days: parseInt(newConsBuffer) || 3,
        frequency_days: parseInt(newConsFreq) || 30,
        last_replaced_at: newConsLastRep || null,
        factory_id: factoryId,
      });
      if (insertErr) throw new Error(insertErr.message);
      setNewConsName(''); setNewConsQty('');
      loadMachineAssets(selectedMachine.machine_id);
    } catch (err) {
      alert(err.message);
    } finally {
      setConsumablesLoading(false);
    }
  };

  const handleDeleteConsumable = async (id) => {
    if (!window.confirm('Delete this consumable?')) return;
    try {
      const { error: delErr } = await supabase.from('consumables').delete().eq('id', id);
      if (!delErr) loadMachineAssets(selectedMachine.machine_id);
    } catch {}
  };

  // Mathematical Calculations for Calendar and Cover
  const parseConsumableMeta = (c) => {
    let meta = {
      burn_rate: 1,
      lead_days: 7,
      buffer_days: 3,
      replacement_schedule_days: 30,
      last_replaced: new Date().toISOString().split('T')[0],
    };
    try {
      if (c.notes) {
        const parsed = JSON.parse(c.notes);
        meta = { ...meta, ...parsed };
      }
    } catch {}
    return meta;
  };

  // Calculate dynamic scheduling metrics
  const getConsumableMetrics = (c) => {
    const meta = parseConsumableMeta(c);
    const stock = c.quantity_on_hand || 0;
    const burn = meta.burn_rate || 1;
    const coverDays = Math.round(stock / burn);

    // Order-by date calculation
    const lastReplacedDate = new Date(meta.last_replaced);
    const replaceDueDays = meta.replacement_schedule_days;
    const replaceDueDate = new Date(lastReplacedDate.getTime() + replaceDueDays * 24 * 60 * 60 * 1000);

    const today = new Date();
    const orderByDate = new Date(today.getTime() + (coverDays - meta.lead_days - meta.buffer_days) * 24 * 60 * 60 * 1000);

    let status = 'OK';
    const leadBufferDays = meta.lead_days + meta.buffer_days;
    if (today >= replaceDueDate || today >= orderByDate) {
      status = 'OVERDUE';
    } else if (coverDays <= leadBufferDays) {
      status = 'ORDER SOON';
    }

    return {
      coverDays,
      orderByDate: orderByDate.toISOString().split('T')[0],
      replaceDueDate: replaceDueDate.toISOString().split('T')[0],
      status,
      meta,
    };
  };

  // Calendar Rendering Helpers
  const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();

  const renderCalendarCells = () => {
    const daysInMonth = getDaysInMonth(currentYear, currentMonth);
    const startDow = getFirstDayOfMonth(currentYear, currentMonth);
    const cells = [];

    // Empty spaces for previous month
    for (let i = 0; i < (startDow === 0 ? 6 : startDow - 1); i++) {
      cells.push(<div key={`empty-${i}`} className="cal-cell out" />);
    }

    // Populate calendar cells
    for (let day = 1; day <= daysInMonth; day++) {
      const dateString = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dayEvents = [];

      consumables.forEach((c) => {
        const metrics = getConsumableMetrics(c);
        if (metrics.orderByDate === dateString) {
          dayEvents.push({ type: 'order', label: `Order ${c.name}`, class: 'ev order' });
        }
        if (metrics.replaceDueDate === dateString) {
          dayEvents.push({ type: 'due', label: `${c.name} Due`, class: 'ev due' });
        }
        if (metrics.status === 'OVERDUE' && metrics.replaceDueDate < dateString && day === new Date().getDate() && currentMonth === new Date().getMonth()) {
          dayEvents.push({ type: 'crit', label: `${c.name} Overdue!`, class: 'ev crit' });
        }
      });

      const isToday = day === new Date().getDate() && currentMonth === new Date().getMonth() && currentYear === new Date().getFullYear();

      cells.push(
        <div key={`day-${day}`} className={`cal-cell ${isToday ? 'today' : ''}`}>
          <span className="dn">{day}</span>
          {dayEvents.map((ev, idx) => (
            <span key={idx} className={ev.class} title={ev.label}>{ev.label}</span>
          ))}
        </div>
      );
    }

    return cells;
  };

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  // Map step to machine assignee dynamically
  const getAssigneeForStep = (step, idx) => {
    if (step.role === 'owner') return null;
    if (step.role === 'maintenance_technician' || step.role === 'technician') return getAssignment(selectedMachine, 'technician');
    if (step.role === 'supervisor') return getAssignment(selectedMachine, 'supervisor');
    if (step.role === 'maintenance_engineer') return getAssignment(selectedMachine, 'engineer');
    if (step.role === 'maintenance_head') return getAssignment(selectedMachine, 'maintenance_head');
    return ['technician', 'supervisor', 'engineer', 'maintenance_head'][idx]
      ? getAssignment(selectedMachine, ['technician', 'supervisor', 'engineer', 'maintenance_head'][idx])
      : null;
  };

  return (
    <AppShell active="machines">
      {/* Dynamic embedded styles for calendar, pulsing badges, and custom forms */}
      <style dangerouslySetInnerHTML={{ __html: `
        /* Glow pulsing status dot */
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

        /* Consumables Calendar styles */
        .cal {
          border: 1px solid var(--border);
          border-radius: var(--radius);
          overflow: hidden;
          background: var(--card);
          box-shadow: var(--shadow-md);
          margin-top: 10px;
        }
        .cal-bar {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 18px;
          border-bottom: 1px solid var(--border);
          background: rgba(0, 0, 0, 0.2);
        }
        .cal-bar .m {
          font-family: 'Rajdhani', sans-serif;
          font-weight: 700;
          font-size: 1.15rem;
          color: white;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .cal-bar .leg {
          margin-left: auto;
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }
        .cal-grid {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          background: rgba(255, 255, 255, 0.01);
        }
        .cal-dow {
          font-family: 'Rajdhani', sans-serif;
          font-size: 0.75rem;
          font-weight: 700;
          letter-spacing: .06em;
          color: var(--slate);
          text-align: center;
          padding: 8px 0;
          border-bottom: 1px solid var(--border);
          text-transform: uppercase;
        }
        .cal-cell {
          min-height: 76px;
          border-right: 1px solid var(--border);
          border-bottom: 1px solid var(--border);
          padding: 6px;
          font-family: monospace;
          font-size: 0.72rem;
          position: relative;
          transition: background 0.15s ease;
        }
        .cal-cell:hover {
          background: rgba(255, 255, 255, 0.02);
        }
        .cal-cell:nth-child(7n){
          border-right: none;
        }
        .cal-cell .dn {
          color: var(--slate);
          font-weight: 500;
        }
        .cal-cell.out .dn {
          opacity: .25;
        }
        .cal-cell.today {
          background: rgba(37, 211, 102, 0.07);
        }
        .cal-cell.today .dn {
          color: var(--brand);
          font-weight: 700;
        }
        .ev {
          display: block;
          margin-top: 4px;
          font-size: 0.65rem;
          line-height: 1.35;
          padding: 2px 6px;
          border-radius: 4px;
          font-weight: 700;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          text-transform: uppercase;
          font-family: 'Rajdhani', sans-serif;
        }
        .ev.order { background: rgba(245, 158, 11, 0.18); color: #FBBF24; border: 1px solid rgba(245, 158, 11, 0.3); }
        .ev.due { background: rgba(59, 130, 246, 0.18); color: #60A5FA; border: 1px solid rgba(59, 130, 246, 0.3); }
        .ev.crit { background: rgba(239, 68, 68, 0.18); color: #F87171; border: 1px solid rgba(239, 68, 68, 0.3); }

        /* Forms inside Details workspace */
        .vault-field label {
          color: var(--slate) !important;
          font-weight: 600 !important;
        }
        .vault-field select, .vault-field input {
          background-color: rgba(0, 0, 0, 0.25) !important;
          border-color: rgba(255, 255, 255, 0.1) !important;
        }
      ` }} />

      <div className="vault-wrap" style={{ maxWidth: selectedMachine ? '1380px' : '1100px', padding: '20px 24px 80px' }}>
        
        {/* VIEW 1: MACHINES DIRECTORY TABLE (when selectedMachine is null) */}
        {!selectedMachine ? (
          <>
            <div className="machines-directory-header">
              <div>
                <h1 style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '2rem', margin: 0, textTransform: 'uppercase' }}>Machines Directory</h1>
                <p style={{ color: 'var(--slate)', fontSize: '0.9rem', margin: '4px 0 0' }}>Click any machine to access its operational workspace (manuals, BOM, consumables, and replenishment calendar).</p>
              </div>
              <button className="vault-btn vault-btn-ghost machines-onboard-toggle" onClick={() => setShowAddForm(!showAddForm)}>
                {showAddForm ? 'Cancel' : '+ Onboard Machine'}
              </button>
            </div>

            {error && <div className="vault-error show" style={{ marginBottom: '16px' }}>{error}</div>}
            {success && <div className="vault-success" style={{ background: '#065f46', color: '#d1fae5', padding: '12px 16px', borderRadius: '8px', marginBottom: '16px', fontSize: '14px' }}>{success}</div>}

            {/* Onboard machine form */}
            {showAddForm && (
              <div className="vault-card machine-onboard-card">
                <div className="machine-onboard-header">
                  <div>
                    <span className="machine-onboard-kicker">New machine</span>
                    <h2>Add a machine to your plant</h2>
                    <p>Enter the machine identity, then assign the people who respond when it needs attention.</p>
                  </div>
                  <span className="machine-onboard-time">About 2 minutes</span>
                </div>
                <form onSubmit={handleAddSubmit} className="machine-onboard-form">
                  <section className="machine-form-section">
                    <div className="machine-form-section-heading">
                      <span>1</span>
                      <div><h3>Machine details</h3><p>Use the name technicians recognise on the shop floor.</p></div>
                    </div>
                    <div className="machine-form-grid">
                      <div className="vault-field machine-field-wide">
                        <label htmlFor="machineName">Machine name <strong aria-hidden="true">*</strong></label>
                        <input type="text" id="machineName" value={name} onChange={(e) => setName(e.target.value)} placeholder="Example: CNC Turning Center" required />
                      </div>
                      <div className="vault-field">
                        <label htmlFor="machineLoc">Plant location</label>
                        <input type="text" id="machineLoc" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Example: Bay 2" />
                      </div>
                    </div>
                  </section>

                  <section className="machine-form-section">
                    <div className="machine-form-section-heading">
                      <span>2</span>
                      <div><h3>Response team</h3><p>Choose who performs the work and who should be informed.</p></div>
                    </div>
                    {technicians.length === 0 && (
                      <div className="machine-team-notice">
                        <strong>No maintenance technician is available.</strong>
                        <span>Onboard a technician in Team before adding this machine.</span>
                        <a href="team.html">Open Team →</a>
                      </div>
                    )}
                    <div className="machine-role-grid">
                      <div className="vault-field">
                        <label htmlFor="technicianUserId">Primary technician <strong aria-hidden="true">*</strong></label>
                        <select id="technicianUserId" value={technicianUserId} onChange={(e) => setTechnicianUserId(e.target.value)} required disabled={technicians.length === 0}>
                          <option value="">Select a technician</option>
                          {technicians.map((member) => <option key={member.user_id} value={member.user_id}>{member.name}</option>)}
                        </select>
                        <small>Receives the job and completes the repair checklist.</small>
                      </div>
                      <div className="vault-field">
                        <label htmlFor="supervisorUserId">Supervisor <span>Optional</span></label>
                        <select id="supervisorUserId" value={supervisorUserId} onChange={(e) => setSupervisorUserId(e.target.value)}>
                          <option value="">No supervisor selected</option>
                          {supervisors.map((member) => <option key={member.user_id} value={member.user_id}>{member.name}</option>)}
                        </select>
                        <small>Reviews progress and approves closure.</small>
                      </div>
                      <div className="vault-field">
                        <label htmlFor="engineerUserId">Maintenance engineer <span>Optional</span></label>
                        <select id="engineerUserId" value={engineerUserId} onChange={(e) => setEngineerUserId(e.target.value)}>
                          <option value="">No engineer selected</option>
                          {engineers.map((member) => <option key={member.user_id} value={member.user_id}>{member.name}</option>)}
                        </select>
                        <small>Supports diagnosis and complex repairs.</small>
                      </div>
                      <div className="vault-field">
                        <label htmlFor="headUserId">Maintenance head <span>Optional</span></label>
                        <select id="headUserId" value={headUserId} onChange={(e) => setHeadUserId(e.target.value)}>
                          <option value="">No maintenance head selected</option>
                          {maintenanceHeads.map((member) => <option key={member.user_id} value={member.user_id}>{member.name}</option>)}
                        </select>
                        <small>Receives escalation and plant-risk updates.</small>
                      </div>
                    </div>
                  </section>

                  <div className="machine-form-actions">
                    <div><strong>TurboFix creates the machine ID and QR tag automatically.</strong><span>You can upload manuals, BOM, and diagrams after onboarding.</span></div>
                    <button type="submit" className="vault-btn vault-btn-primary machine-submit" disabled={technicians.length === 0}>Add machine</button>
                  </div>
                </form>
              </div>
            )}

            {loading ? (
              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--slate)' }}>Loading machines...</div>
            ) : machines.length === 0 ? (
              <div className="vault-card" style={{ textAlign: 'center', padding: '40px' }}>
                <p style={{ color: 'var(--slate)', margin: 0 }}>No machines onboarded yet. Click "+ Onboard Machine" to get started.</p>
              </div>
            ) : (
              <div className="vault-card" style={{ padding: 0, overflowX: 'auto', marginBottom: '30px', border: '1px solid rgba(255,255,255,0.1)' }}>
                <table className="vault-table">
                  <thead>
                    <tr>
                      <th>Machine ID</th>
                      <th>Name</th>
                      <th>Location</th>
                      <th>Escalation Assignees</th>
                      <th>Status</th>
                      <th style={{ textAlign: 'right' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {machines.map((m) => (
                      <tr key={m.machine_id} style={{ cursor: 'pointer' }} onClick={() => { setSelectedMachine(m); setWsTab('info'); }}>
                        <td style={{ fontFamily: 'monospace', fontWeight: 'bold', color: 'var(--brand)' }}>{m.machine_id}</td>
                        <td style={{ fontWeight: '600', color: 'white' }}>{m.machine_name}</td>
                        <td style={{ color: '#cbd5e1' }}>{m.location || '—'}</td>
                        <td>
                          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            <span className="chip mnt" style={{ padding: '2px 8px', fontSize: '10.5px', color: '#e2e8f0', background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)' }}>Tech: {getAssignmentName(m, 'technician')}</span>
                            {getAssignment(m, 'supervisor') && <span className="chip sup" style={{ padding: '2px 8px', fontSize: '10.5px', color: '#e2e8f0', background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)' }}>Sup: {getAssignmentName(m, 'supervisor')}</span>}
                            {getAssignment(m, 'engineer') && <span className="chip owner" style={{ padding: '2px 8px', fontSize: '10.5px', color: '#e2e8f0', background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)' }}>Eng: {getAssignmentName(m, 'engineer')}</span>}
                            {getAssignment(m, 'maintenance_head') && <span className="chip ok" style={{ padding: '2px 8px', fontSize: '10.5px', color: '#e2e8f0', background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)' }}>Head: {getAssignmentName(m, 'maintenance_head')}</span>}
                          </div>
                        </td>
                        <td>
                          {m.has_open_tickets ? (
                            <span className="vault-role-badge read-only" style={{ display: 'inline-flex', alignItems: 'center', background: 'rgba(239, 68, 68, 0.12)', color: '#F87171', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                              <span className="glow-dot down" /> Down
                            </span>
                          ) : (
                            <span className="vault-role-badge" style={{ display: 'inline-flex', alignItems: 'center', background: 'rgba(37, 211, 102, 0.12)', color: '#25D366', border: '1px solid rgba(37, 211, 102, 0.2)' }}>
                              <span className="glow-dot healthy" /> Healthy
                            </span>
                          )}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <button className="vault-btn vault-btn-primary" style={{ padding: '6px 14px', fontSize: '0.78rem', background: 'var(--brand)', color: '#000' }} onClick={(e) => { e.stopPropagation(); setSelectedMachine(m); setWsTab('info'); }}>
                            Open Workspace →
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        ) : (
          /* VIEW 2: DEDICATED FULL-PAGE MACHINE WORKSPACE VIEW */
          <div className="machine-workspace-page">
            <button type="button" className="machine-workspace-back" onClick={() => setSelectedMachine(null)}>
              <ArrowLeft /> Machines directory
            </button>

            <div className="machine-workspace-shell">
              <header className="machine-workspace-hero">
                <div className="machine-workspace-identity">
                  <div className="machine-workspace-id-row">
                    <span className="machine-workspace-id">{selectedMachine.machine_id}</span>
                    <span className={`machine-workspace-state ${selectedMachine.has_open_tickets ? 'down' : 'healthy'}`}>
                      <span />{selectedMachine.has_open_tickets ? 'Breakdown active' : 'Operational'}
                    </span>
                  </div>
                  <h2>{selectedMachine.machine_name}</h2>
                  <p><MapPin />{selectedMachine.location || 'Location not set'}</p>
                </div>
                <div className="machine-workspace-actions">
                  <button type="button" className="machine-action secondary" onClick={() => setWsTab('docs')}><Upload />Add document</button>
                  <a className="machine-action secondary" href={`records.html?machine_id=${encodeURIComponent(selectedMachine.machine_id)}&upload=1`}><FileCheck2 />Add old records</a>
                  <a className="machine-action primary" href={`assistant.html?machine_id=${encodeURIComponent(selectedMachine.machine_id)}`}><Bot />Ask TurboFix AI</a>
                </div>
              </header>

              <section className="machine-workspace-pulse" aria-label="Machine at a glance">
                <div className={selectedMachine.has_open_tickets ? 'attention' : 'good'}><span><Activity /></span><p><small>Current condition</small><strong>{selectedMachine.has_open_tickets ? 'Needs attention' : 'Running normally'}</strong></p></div>
                <div><span><BookOpen /></span><p><small>Technical documents</small><strong>{docs.length} available</strong></p></div>
                <div className={parts.some((part) => Number(part.quantity_on_hand) <= Number(part.reorder_level)) ? 'warning' : ''}><span><PackageSearch /></span><p><small>Spare parts</small><strong>{parts.length} listed · {parts.filter((part) => Number(part.quantity_on_hand) <= Number(part.reorder_level)).length} low</strong></p></div>
                <div className={machineData?.missing_sections?.length ? 'warning' : 'good'}><span><ShieldCheck /></span><p><small>AI knowledge</small><strong>{machineDataLoading ? 'Checking…' : machineData?.missing_sections?.length ? `${machineData.missing_sections.length} data gap${machineData.missing_sections.length === 1 ? '' : 's'}` : 'Ready for decisions'}</strong></p></div>
              </section>

              <nav className="machine-workspace-tabs" aria-label={`${selectedMachine.machine_name} workspace sections`}>
                {WORKSPACE_TABS.map(({ id, label, hint, Icon }) => {
                  const count = id === 'docs' ? docs.length : id === 'parts' ? parts.length : id === 'consumables' ? consumables.length : null;
                  return <button key={id} type="button" className={wsTab === id ? 'active' : ''} onClick={() => setWsTab(id)}>
                    <span className="machine-tab-icon"><Icon /></span>
                    <span><strong>{label}</strong><small>{hint}</small></span>
                    {count !== null && <b>{count}</b>}
                  </button>;
                })}
              </nav>

              {/* Workspace Contents */}
              
              {/* TAB 1: ESCALATION & ASSIGNEES (Dynamically loaded off escalationPath) */}
              {wsTab === 'info' && (
                <div className="machine-overview-grid">
                  <section className="machine-overview-main">
                    <div className="machine-section-heading">
                      <div><span><ClipboardList /></span><div><h3>Breakdown response path</h3><p>Who responds first, and when the issue moves to the next level.</p></div></div>
                      <a href="settings.html#response">Change response rules <ChevronRight /></a>
                    </div>
                    <div className="machine-escalation-timeline">
                      {(() => {
                        let accumulatedHours = 0;
                        return escalationPath.map((step, index) => {
                          const triggerHour = accumulatedHours;
                          accumulatedHours += Number(step.threshold_hours || 0);
                          const isLast = index === escalationPath.length - 1;
                          const assignee = getAssigneeForStep(step, index);
                          return <article key={`${step.role}-${index}`} className={index === 0 ? 'active' : ''}>
                            <div className="machine-escalation-marker"><span>{index + 1}</span></div>
                            <div className="machine-escalation-copy">
                              <small>{index === 0 ? 'Immediately after reporting' : `If still open after ${triggerHour} hour${triggerHour === 1 ? '' : 's'}`}</small>
                              <h4>{step.label}</h4>
                              {step.role === 'owner'
                                ? <p><Users />All owner accounts</p>
                                : <ContactReveal member={assignee} compact showIdentity />}
                            </div>
                            <span className="machine-escalation-time">{isLast ? 'Final escalation' : `${step.threshold_hours || 0}h response window`}</span>
                          </article>;
                        });
                      })()}
                      {escalationPath.length === 0 && <div className="machine-workspace-empty"><CircleAlert /><strong>No response path configured</strong><span>Set the response order in Settings before a breakdown occurs.</span></div>}
                    </div>
                  </section>

                  <aside className="machine-overview-side">
                    <section className={`machine-next-action ${selectedMachine.has_open_tickets ? 'urgent' : ''}`}>
                      <span className="machine-side-kicker">Recommended next action</span>
                      {selectedMachine.has_open_tickets ? <><CircleAlert /><h3>Review the open breakdown</h3><p>Confirm the assigned technician has started work and has the required manual and spares.</p><a href="tickets.html">Open breakdown tickets <ChevronRight /></a></> : machineData?.missing_sections?.length ? <><BookOpen /><h3>Complete machine knowledge</h3><p>Add {machineData.missing_sections[0]} so future AI guidance is safer and more specific.</p><button type="button" onClick={() => setWsTab('docs')}>Add missing document <ChevronRight /></button></> : <><ShieldCheck /><h3>Machine is ready</h3><p>Knowledge and response ownership are in place. Continue routine preventive maintenance.</p><a href="shutdown-planner.html">Review shutdown plan <ChevronRight /></a></>}
                    </section>
                    <section className="machine-response-team">
                      <div className="machine-side-title"><span><Phone /></span><div><h3>Response team</h3><p>People connected to this machine</p></div></div>
                      <div>
                        {[
                          ['T', 'Primary technician', 'technician'],
                          ['S', 'Supervisor', 'supervisor'],
                          ['E', 'Engineer', 'engineer'],
                          ['H', 'Maintenance head', 'maintenance_head'],
                        ].map(([initial, label, key]) => (
                          <span key={key}>
                            <b>{initial}</b>
                            <div className="machine-response-person"><small>{label}</small><ContactReveal member={getAssignment(selectedMachine, key)} compact showIdentity /></div>
                          </span>
                        ))}
                      </div>
                      <a href="team.html">Manage team assignments <ChevronRight /></a>
                    </section>
                  </aside>
                </div>
              )}

              {/* TAB 2: MANUALS & DOCUMENTS */}
              {wsTab === 'docs' && (
                <div>
                  <div style={{ marginBottom: '16px', padding: '16px', borderRadius: '8px', border: '1px solid rgba(37, 211, 102, 0.25)', background: 'rgba(37, 211, 102, 0.06)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                      <div>
                        <strong style={{ color: 'white' }}>Machine knowledge file</strong>
                        <div style={{ color: 'var(--slate)', fontSize: '0.82rem', marginTop: '4px' }}>{machineDataLoading ? 'Refreshing…' : machineData?.file_name || 'Generated after the first upload'}</div>
                      </div>
                      {machineData?.approval_required && <button type="button" className="vault-btn vault-btn-ghost" onClick={handleInternetEnrichment} disabled={enrichingMachineData}>{enrichingMachineData ? 'Researching…' : 'Approve internet enrichment'}</button>}
                    </div>
                    {machineData?.missing_sections?.length > 0 && <div style={{ color: '#FBBF24', fontSize: '0.78rem', marginTop: '10px' }}>Missing: {machineData.missing_sections.join(', ')}. TurboFix will only use internet data after your approval.</div>}
                    {machineData?.internet && <div style={{ color: '#25D366', fontSize: '0.78rem', marginTop: '10px' }}>Internet-enriched file created with approved reference data.</div>}
                  </div>
                  <form onSubmit={handleUploadDoc} style={{ display: 'flex', gap: '12px', marginBottom: '16px', background: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                    <div style={{ width: '190px' }}>
                      <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 'bold', marginBottom: '6px', color: 'var(--slate)' }}>Document type</label>
                      <select value={uploadCategory} onChange={(e) => setUploadCategory(e.target.value)} style={{ width: '100%' }}>
                        <option value="manual">Machine manual</option>
                        <option value="circuit_diagram">Wiring diagram</option>
                        <option value="hydraulic_diagram">Hydraulic diagram</option>
                        <option value="spare_parts_catalog">BOM / spare list</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 'bold', marginBottom: '6px', color: 'var(--slate)' }}>Upload Manual / Schematic (PDF/Images)</label>
                      <input type="file" onChange={(e) => setUploadFile(e.target.files[0])} required />
                    </div>
                    <button type="submit" className="vault-btn vault-btn-primary" style={{ alignSelf: 'flex-end', height: '38px', padding: '0 20px', background: 'var(--brand)', color: '#000' }}>Upload Doc</button>
                  </form>

                  {docsLoading ? (
                    <div style={{ textAlign: 'center', padding: '20px', color: 'var(--slate)' }}>Loading documents...</div>
                  ) : docs.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '20px', color: 'var(--slate)' }}>No documents uploaded.</div>
                  ) : (
                    <table className="vault-table">
                      <thead>
                        <tr>
                          <th>Document Name</th>
                          <th>Uploaded</th>
                          <th style={{ textAlign: 'right' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {docs.map((d) => (
                          <tr key={d.document_id || d.doc_id}>
                            <td style={{ fontWeight: 'bold', color: 'white' }}>{d.file_name || d.filename}</td>
                            <td style={{ color: 'var(--slate)' }}>{d.uploaded_at ? new Date(d.uploaded_at.replace(' ', 'T')).toLocaleString() : '—'}</td>
                            <td style={{ textAlign: 'right' }}>
                              <button className="vault-btn vault-btn-ghost" style={{ padding: '4px 10px', fontSize: '0.75rem', marginRight: '8px', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }} onClick={() => downloadDoc(d.document_id || d.doc_id, d.file_name || d.filename)}>
                                Download
                              </button>
                              <button className="vault-btn vault-btn-danger" style={{ padding: '4px 10px', fontSize: '0.75rem' }} onClick={() => handleDeleteDoc(d.document_id || d.doc_id)}>
                                Delete
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}

              {/* TAB 3: SPARE PARTS (BOM) */}
              {wsTab === 'parts' && (
                <div>
                  <div className="machine-workspace-section-intro"><span><PackageSearch /></span><div><h3>Spare parts and reorder levels</h3><p>Add critical BOM items and set the minimum stock that should trigger replenishment.</p></div><strong>{parts.length} part{parts.length === 1 ? '' : 's'} tracked</strong></div>
                  <form onSubmit={handleAddPart} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px', marginBottom: '16px', background: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                    <div className="vault-field">
                      <label>Part Name</label>
                      <input type="text" value={newPartName} onChange={(e) => setNewPartName(e.target.value)} placeholder="e.g. Servo Motor" required />
                    </div>
                    <div className="vault-field">
                      <label>Part Number</label>
                      <input type="text" value={newPartNum} onChange={(e) => setNewPartNum(e.target.value)} placeholder="e.g. SN-4819" required />
                    </div>
                    <div className="vault-field">
                      <label>Stock Qty</label>
                      <input type="number" value={newPartQty} onChange={(e) => setNewPartQty(e.target.value)} placeholder="e.g. 5" required />
                    </div>
                    <div className="vault-field">
                      <label>Reorder Threshold</label>
                      <input type="number" value={newPartReorder} onChange={(e) => setNewPartReorder(e.target.value)} placeholder="e.g. 2" required />
                    </div>
                    <button type="submit" className="vault-btn vault-btn-primary" style={{ height: '38px', marginTop: '22px', background: 'var(--brand)', color: '#000' }}>Add Part</button>
                  </form>

                  {partsLoading ? (
                    <div style={{ textAlign: 'center', padding: '20px', color: 'var(--slate)' }}>Loading spare parts...</div>
                  ) : parts.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '20px', color: 'var(--slate)' }}>No spare parts listed in Bill of Materials.</div>
                  ) : (
                    <table className="vault-table">
                      <thead>
                        <tr>
                          <th>Part Name</th>
                          <th>Part Number</th>
                          <th>Stock Level</th>
                          <th>Reorder Level</th>
                          <th style={{ textAlign: 'right' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {parts.map((p) => (
                          <tr key={p.part_id}>
                            <td style={{ fontWeight: 'bold', color: 'white' }}>{p.part_name}</td>
                            <td style={{ fontFamily: 'monospace', color: 'var(--brand)' }}>{p.part_number}</td>
                            <td>
                              <span className={`vault-role-badge ${p.quantity_on_hand <= p.reorder_level ? 'read-only' : ''}`} style={p.quantity_on_hand <= p.reorder_level ? {} : { background: 'rgba(37,211,102,0.12)', color: '#25D366', border: '1px solid rgba(37,211,102,0.2)' }}>
                                {p.quantity_on_hand} {p.unit}
                              </span>
                            </td>
                            <td style={{ color: 'var(--slate)' }}>{p.reorder_level} {p.unit}</td>
                            <td style={{ textAlign: 'right' }}>
                              <button className="vault-btn vault-btn-danger" style={{ padding: '4px 10px', fontSize: '0.75rem' }} onClick={() => handleDeletePart(p.part_id)}>
                                Delete
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}

              {/* TAB 4: CONSUMABLES */}
              {wsTab === 'consumables' && (
                <div>
                  <div className="machine-workspace-section-intro"><span><Droplets /></span><div><h3>Consumable usage and coverage</h3><p>Enter actual consumption and supplier lead time so TurboFix can calculate order-by dates.</p></div><strong>{consumables.length} item{consumables.length === 1 ? '' : 's'} tracked</strong></div>
                  <form onSubmit={handleAddConsumable} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px', marginBottom: '16px', background: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                    <div className="vault-field" style={{ gridColumn: 'span 2' }}>
                      <label>Consumable Name</label>
                      <input type="text" value={newConsName} onChange={(e) => setNewConsName(e.target.value)} placeholder="e.g. Hydraulic Lubricant Oil" required />
                    </div>
                    <div className="vault-field">
                      <label>Stock Qty</label>
                      <input type="number" value={newConsQty} onChange={(e) => setNewConsQty(e.target.value)} placeholder="e.g. 100" required />
                    </div>
                    <div className="vault-field">
                      <label>Unit</label>
                      <input type="text" value={newConsUnit} onChange={(e) => setNewConsUnit(e.target.value)} placeholder="e.g. L" required />
                    </div>
                    <div className="vault-field">
                      <label>Daily Burn Rate</label>
                      <input type="number" value={newConsBurn} onChange={(e) => setNewConsBurn(e.target.value)} placeholder="e.g. 5" required />
                    </div>
                    <div className="vault-field">
                      <label>Lead Time (days)</label>
                      <input type="number" value={newConsLead} onChange={(e) => setNewConsLead(e.target.value)} placeholder="e.g. 7" required />
                    </div>
                    <div className="vault-field">
                      <label>Buffer Days</label>
                      <input type="number" value={newConsBuffer} onChange={(e) => setNewConsBuffer(e.target.value)} placeholder="e.g. 3" required />
                    </div>
                    <div className="vault-field">
                      <label>Cadence (days)</label>
                      <input type="number" value={newConsFreq} onChange={(e) => setNewConsFreq(e.target.value)} placeholder="e.g. 30" required />
                    </div>
                    <div className="vault-field">
                      <label>Last Replaced Date</label>
                      <input type="date" value={newConsLastRep} onChange={(e) => setNewConsLastRep(e.target.value)} required />
                    </div>
                    <button type="submit" className="vault-btn vault-btn-primary" style={{ height: '38px', gridColumn: 'span 2', marginTop: '22px', background: 'var(--brand)', color: '#000' }}>Add Consumable</button>
                  </form>

                  {consumablesLoading ? (
                    <div style={{ textAlign: 'center', padding: '20px', color: 'var(--slate)' }}>Loading consumables...</div>
                  ) : consumables.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '20px', color: 'var(--slate)' }}>No consumables registered for this machine.</div>
                  ) : (
                    <table className="vault-table">
                      <thead>
                        <tr>
                          <th>Consumable Name</th>
                          <th>Stock Level</th>
                          <th>Daily Burn</th>
                          <th>Days Cover</th>
                          <th>Order-By</th>
                          <th>Replace-Due</th>
                          <th>Status</th>
                          <th style={{ textAlign: 'right' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {consumables.map((c) => {
                          const metrics = getConsumableMetrics(c);
                          return (
                            <tr key={c.consumable_id}>
                              <td style={{ fontWeight: 'bold', color: 'white' }}>{c.name}</td>
                              <td style={{ color: 'white' }}>{c.quantity_on_hand} {c.unit}</td>
                              <td style={{ color: '#cbd5e1' }}>{metrics.meta.burn_rate} {c.unit}/day</td>
                              <td style={{ fontFamily: 'monospace', color: 'white' }}>{metrics.coverDays} days</td>
                              <td style={{ fontFamily: 'monospace', color: 'var(--brand)' }}>{metrics.orderByDate}</td>
                              <td style={{ fontFamily: 'monospace', color: '#60A5FA' }}>{metrics.replaceDueDate}</td>
                              <td>
                                <span className={`pill ${metrics.status === 'OVERDUE' ? 'crit' : metrics.status === 'ORDER SOON' ? 'warn' : 'ok'}`}>
                                  {metrics.status}
                                </span>
                              </td>
                              <td style={{ textAlign: 'right' }}>
                                <button className="vault-btn vault-btn-danger" style={{ padding: '4px 10px', fontSize: '0.75rem' }} onClick={() => handleDeleteConsumable(c.consumable_id)}>
                                  Delete
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              )}

              {/* TAB 5: CONSUMABLE REPLENISHMENT CALENDAR */}
              {wsTab === 'calendar' && (
                <div>
                  <div className="cal">
                    <div className="cal-bar">
                      <button className="vault-btn vault-btn-ghost" style={{ padding: '4px 12px', fontSize: '12px', border: '1px solid rgba(255,255,255,0.12)', color: 'white' }} onClick={() => {
                        if (currentMonth === 0) {
                          setCurrentMonth(11);
                          setCurrentYear(y => y - 1);
                        } else {
                          setCurrentMonth(m => m - 1);
                        }
                      }}>← Prev</button>
                      
                      <span className="m">{monthNames[currentMonth]} {currentYear}</span>
                      
                      <button className="vault-btn vault-btn-ghost" style={{ padding: '4px 12px', fontSize: '12px', border: '1px solid rgba(255,255,255,0.12)', color: 'white' }} onClick={() => {
                        if (currentMonth === 11) {
                          setCurrentMonth(0);
                          setCurrentYear(y => y + 1);
                        } else {
                          setCurrentMonth(m => m + 1);
                        }
                      }}>Next →</button>
                      
                      <div className="leg">
                        <span className="chip warn"><span className="dot"></span>Order-by</span>
                        <span className="chip" style={{ color: '#60A5FA' }}><span className="dot" style={{ background: '#60A5FA' }}></span>Replace-due</span>
                        <span className="chip crit"><span className="dot"></span>Overdue</span>
                      </div>
                    </div>
                    
                    <div className="cal-grid">
                      <div className="cal-dow">Mon</div>
                      <div className="cal-dow">Tue</div>
                      <div className="cal-dow">Wed</div>
                      <div className="cal-dow">Thu</div>
                      <div className="cal-dow">Fri</div>
                      <div className="cal-dow">Sat</div>
                      <div className="cal-dow">Sun</div>
                      {renderCalendarCells()}
                    </div>
                  </div>
                  <p className="cal-cap" style={{ color: 'var(--slate)', fontSize: '0.8rem', marginTop: '12px' }}>Replenishment markers are dynamically computed based on stock levels, daily burn rates, lead times, and cycle counts.</p>
                </div>
              )}

              {/* TAB 6: QR CODE */}
              {wsTab === 'qr' && (
                <div style={{ textAlign: 'center', padding: '20px 0' }}>
                  <h3 style={{ margin: '0 0 10px', fontFamily: 'Rajdhani, sans-serif', fontSize: '1.25rem', textTransform: 'uppercase', color: 'white' }}>{selectedMachine.machine_name} Tag</h3>
                  <p style={{ fontSize: '0.85rem', color: 'var(--slate)', marginBottom: '16px' }}>Scan with WhatsApp to report breakdown events directly.</p>
                  
                  <div style={{ background: 'white', padding: '14px', borderRadius: '8px', display: 'inline-block', margin: '0 auto 16px', boxShadow: '0 4px 20px rgba(0,0,0,0.5)' }}>
                    <QRCodeSVG
                      value={selectedMachine.wa_link || `https://wa.me/?text=Issue with ${selectedMachine.machine_id}: `}
                      size={180}
                    />
                  </div>

                  <div style={{ fontSize: '0.95rem', fontWeight: 'bold', color: 'white', letterSpacing: '1px', fontFamily: 'monospace' }}>
                    {selectedMachine.machine_id}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--slate)', marginTop: '4px' }}>
                    Location: {selectedMachine.location || '—'}
                  </div>

                  <button className="vault-btn vault-btn-primary" style={{ marginTop: '18px', maxWidth: '200px', margin: '18px auto 0', background: 'var(--brand)', color: '#000' }} onClick={() => window.print()}>
                    Print Tag
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
