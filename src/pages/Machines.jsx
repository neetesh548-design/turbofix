import React, { useState, useEffect } from 'react';
import AppShell from '../components/AppShell';
import { apiFetch } from '@/lib/api';

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
  const [techPhone, setTechPhone] = useState('');
  const [supervisorPhone, setSupervisorPhone] = useState('');
  const [engineerPhone, setEngineerPhone] = useState('');
  const [headPhone, setHeadPhone] = useState('');

  // Sub-tabs State for Selected Machine
  const [docs, setDocs] = useState([]);
  const [parts, setParts] = useState([]);
  const [consumables, setConsumables] = useState([]);
  const [docsLoading, setDocsLoading] = useState(false);
  const [partsLoading, setPartsLoading] = useState(false);
  const [consumablesLoading, setConsumablesLoading] = useState(false);

  // Sub-tab Form inputs
  const [uploadFile, setUploadFile] = useState(null);
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
      // Load team
      const tResp = await apiFetch('/vault/team');
      let teamData = [];
      if (tResp.ok) {
        teamData = await tResp.json();
        setTeam(teamData);
      }

      // Load escalation path settings
      const escResp = await apiFetch('/vault/escalation');
      if (escResp.ok) {
        setEscalationPath(await escResp.json());
      }

      // Load machines
      const mResp = await apiFetch('/vault/machines');
      if (!mResp.ok) throw new Error('Failed to load machines');
      const mData = await mResp.json();
      setMachines(mData);
    } catch (err) {
      setError(err.message || 'An error occurred while loading data.');
    } finally {
      setLoading(false);
    }
  };

  const loadMachineAssets = async (machineId) => {
    // Load docs
    setDocsLoading(true);
    try {
      const r = await apiFetch(`/vault/documents?machine_id=${machineId}`);
      if (r.ok) setDocs(await r.json());
    } catch (_) {}
    setDocsLoading(false);

    // Load parts
    setPartsLoading(true);
    try {
      const r = await apiFetch(`/vault/spare-parts?machine_id=${machineId}`);
      if (r.ok) setParts(await r.json());
    } catch (_) {}
    setPartsLoading(false);

    // Load consumables
    setConsumablesLoading(true);
    try {
      const r = await apiFetch(`/vault/consumables?machine_id=${machineId}`);
      if (r.ok) setConsumables(await r.json());
    } catch (_) {}
    setConsumablesLoading(false);
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      const resp = await apiFetch('/vault/machines', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          machine_name: name,
          location,
          assigned_technician_phone: techPhone,
          informed_phone_1: supervisorPhone,
          informed_phone_2: engineerPhone,
          informed_phone_3: headPhone,
        }),
      });

      if (!resp.ok) {
        const errData = await resp.json();
        throw new Error(errData.detail || 'Failed to onboard machine');
      }

      const newMachine = await resp.json();
      setSuccess(`Machine ${newMachine.machine_id} successfully onboarded!`);
      setShowAddForm(false);
      
      // Reset form
      setName('');
      setLocation('');
      setTechPhone('');
      setSupervisorPhone('');
      setEngineerPhone('');
      setHeadPhone('');

      fetchData();
    } catch (err) {
      setError(err.message);
    }
  };

  // Helper: Get user name by phone
  const getNameByPhone = (phone) => {
    if (!phone) return '—';
    const found = team.find((u) => u.phone === phone);
    return found ? found.name : phone;
  };

  // Sub-tab handlers
  const handleUploadDoc = async (e) => {
    e.preventDefault();
    if (!uploadFile || !selectedMachine) return;
    setDocsLoading(true);
    try {
      const formData = new FormData();
      formData.append('machine_id', selectedMachine.machine_id);
      formData.append('file', uploadFile);

      const r = await apiFetch('/vault/documents', {
        method: 'POST',
        body: formData,
      });
      if (!r.ok) throw new Error('Upload failed');
      setUploadFile(null);
      loadMachineAssets(selectedMachine.machine_id);
    } catch (err) {
      alert(err.message);
    } finally {
      setDocsLoading(false);
    }
  };

  const downloadDoc = async (docId, filename) => {
    try {
      const resp = await apiFetch(`/vault/documents/${docId}/download`);
      if (!resp.ok) throw new Error('Download failed');
      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename || 'document';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert('Download failed: ' + err.message);
    }
  };

  const handleDeleteDoc = async (docId) => {
    if (!window.confirm('Delete this document?')) return;
    try {
      const r = await apiFetch(`/vault/documents/${docId}`, {
        method: 'DELETE',
      });
      if (r.ok) loadMachineAssets(selectedMachine.machine_id);
    } catch (_) {}
  };

  const handleAddPart = async (e) => {
    e.preventDefault();
    if (!selectedMachine) return;
    setPartsLoading(true);
    try {
      const r = await apiFetch('/vault/spare-parts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          machine_id: selectedMachine.machine_id,
          part_name: newPartName,
          part_number: newPartNum,
          quantity_on_hand: parseFloat(newPartQty) || 0,
          unit: 'pcs',
          reorder_level: parseFloat(newPartReorder) || 0,
          notes: '',
        }),
      });
      if (!r.ok) throw new Error('Failed to add part');
      setNewPartName('');
      setNewPartNum('');
      setNewPartQty('');
      setNewPartReorder('');
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
      const r = await apiFetch(`/vault/spare-parts/${partId}`, {
        method: 'DELETE',
      });
      if (r.ok) loadMachineAssets(selectedMachine.machine_id);
    } catch (_) {}
  };

  const handleAddConsumable = async (e) => {
    e.preventDefault();
    if (!selectedMachine) return;
    setConsumablesLoading(true);
    try {
      const meta = {
        burn_rate: parseFloat(newConsBurn) || 1,
        lead_days: parseFloat(newConsLead) || 7,
        buffer_days: parseFloat(newConsBuffer) || 3,
        replacement_schedule_days: parseInt(newConsFreq) || 30,
        last_replaced: newConsLastRep,
      };

      const r = await apiFetch('/vault/consumables', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          machine_id: selectedMachine.machine_id,
          name: newConsName,
          quantity_on_hand: parseFloat(newConsQty) || 0,
          unit: newConsUnit,
          reorder_level: (parseFloat(newConsBurn) || 1) * ((parseFloat(newConsLead) || 7) + (parseFloat(newConsBuffer) || 3)),
          notes: JSON.stringify(meta),
        }),
      });
      if (!r.ok) throw new Error('Failed to add consumable');
      setNewConsName('');
      setNewConsQty('');
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
      const r = await apiFetch(`/vault/consumables/${id}`, {
        method: 'DELETE',
      });
      if (r.ok) loadMachineAssets(selectedMachine.machine_id);
    } catch (_) {}
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
    } catch (_) {}
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
    if (step.role === 'owner') return 'All Owner Accounts';
    
    // Map standard roles first
    if (step.role === 'maintenance_technician' || step.role === 'technician') {
      return getNameByPhone(selectedMachine.assigned_technician_phone);
    }
    if (step.role === 'supervisor') {
      return getNameByPhone(selectedMachine.informed_phone_1);
    }
    if (step.role === 'maintenance_engineer') {
      return getNameByPhone(selectedMachine.informed_phone_2);
    }
    if (step.role === 'maintenance_head') {
      return getNameByPhone(selectedMachine.informed_phone_3);
    }
    
    // Fallback: index mapping
    if (idx === 0) return getNameByPhone(selectedMachine.assigned_technician_phone);
    if (idx === 1) return getNameByPhone(selectedMachine.informed_phone_1);
    if (idx === 2) return getNameByPhone(selectedMachine.informed_phone_2);
    if (idx === 3) return getNameByPhone(selectedMachine.informed_phone_3);

    return '—';
  };

  // Color borders for visual step timeline
  const borderColors = ['#25D366', '#FBBF24', '#A855F7', '#3B82F6', '#EF4444', '#EC4899'];
  const textColors = ['var(--brand)', '#FBBF24', '#C084FC', '#60A5FA', '#F87171', '#F472B6'];

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

      <div className="vault-wrap" style={{ maxWidth: '1100px', padding: '20px 24px 80px' }}>
        
        {/* VIEW 1: MACHINES DIRECTORY TABLE (when selectedMachine is null) */}
        {!selectedMachine ? (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <h1 style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '2rem', margin: 0, textTransform: 'uppercase' }}>Machines Directory</h1>
                <p style={{ color: 'var(--slate)', fontSize: '0.9rem', margin: '4px 0 0' }}>Click any machine to access its operational workspace (manuals, BOM, consumables, and replenishment calendar).</p>
              </div>
              <button className="vault-btn vault-btn-ghost" style={{ border: '1px solid rgba(255,255,255,0.12)', color: 'white' }} onClick={() => setShowAddForm(!showAddForm)}>
                {showAddForm ? 'Cancel' : '+ Onboard Machine'}
              </button>
            </div>

            {error && <div className="vault-error show" style={{ marginBottom: '16px' }}>{error}</div>}
            {success && <div className="vault-success" style={{ background: '#065f46', color: '#d1fae5', padding: '12px 16px', borderRadius: '8px', marginBottom: '16px', fontSize: '14px' }}>{success}</div>}

            {/* Onboard machine form */}
            {showAddForm && (
              <div className="vault-card" style={{ marginBottom: '20px', border: '1px solid rgba(255,255,255,0.1)' }}>
                <h3 style={{ margin: '0 0 16px', fontSize: '16px', color: 'white', fontFamily: 'Rajdhani, sans-serif', textTransform: 'uppercase' }}>Onboard New Machine Asset</h3>
                <form onSubmit={handleAddSubmit}>
                  <div className="vault-form-grid">
                    <div className="vault-field" style={{ gridColumn: 'span 2' }}>
                      <label htmlFor="machineName">Machine Name</label>
                      <input type="text" id="machineName" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. CNC Turning Center" required />
                    </div>
                    <div className="vault-field">
                      <label htmlFor="machineLoc">Location</label>
                      <input type="text" id="machineLoc" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Bay 2" />
                    </div>
                    <div className="vault-field">
                      <label htmlFor="techPhone">Assigned Maintenance Technician</label>
                      <select id="techPhone" value={techPhone} onChange={(e) => setTechPhone(e.target.value)} required>
                        <option value="">-- Select Technician --</option>
                        {team.map((u) => (
                          <option key={u.user_id} value={u.phone}>{u.name} ({u.role.replace('_', ' ')})</option>
                        ))}
                      </select>
                    </div>
                    <div className="vault-field">
                      <label htmlFor="supervisorPhone">Assigned Supervisor</label>
                      <select id="supervisorPhone" value={supervisorPhone} onChange={(e) => setSupervisorPhone(e.target.value)}>
                        <option value="">-- Select Supervisor --</option>
                        {team.map((u) => (
                          <option key={u.user_id} value={u.phone}>{u.name} ({u.role.replace('_', ' ')})</option>
                        ))}
                      </select>
                    </div>
                    <div className="vault-field">
                      <label htmlFor="engineerPhone">Assigned Maintenance Engineer</label>
                      <select id="engineerPhone" value={engineerPhone} onChange={(e) => setEngineerPhone(e.target.value)}>
                        <option value="">-- Select Engineer --</option>
                        {team.map((u) => (
                          <option key={u.user_id} value={u.phone}>{u.name} ({u.role.replace('_', ' ')})</option>
                        ))}
                      </select>
                    </div>
                    <div className="vault-field" style={{ gridColumn: 'span 2' }}>
                      <label htmlFor="headPhone">Assigned Maintenance Head</label>
                      <select id="headPhone" value={headPhone} onChange={(e) => setHeadPhone(e.target.value)}>
                        <option value="">-- Select Maintenance Head --</option>
                        {team.map((u) => (
                          <option key={u.user_id} value={u.phone}>{u.name} ({u.role.replace('_', ' ')})</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <button type="submit" className="vault-btn vault-btn-primary" style={{ marginTop: '14px', width: 'auto', padding: '10px 24px', background: 'var(--brand)', color: '#000' }}>Onboard Machine</button>
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
                            <span className="chip mnt" style={{ padding: '2px 8px', fontSize: '10.5px', color: '#e2e8f0', background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)' }}>Tech: {getNameByPhone(m.assigned_technician_phone)}</span>
                            {m.informed_phone_1 && <span className="chip sup" style={{ padding: '2px 8px', fontSize: '10.5px', color: '#e2e8f0', background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)' }}>Sup: {getNameByPhone(m.informed_phone_1)}</span>}
                            {m.informed_phone_2 && <span className="chip owner" style={{ padding: '2px 8px', fontSize: '10.5px', color: '#e2e8f0', background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)' }}>Eng: {getNameByPhone(m.informed_phone_2)}</span>}
                            {m.informed_phone_3 && <span className="chip ok" style={{ padding: '2px 8px', fontSize: '10.5px', color: '#e2e8f0', background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)' }}>Head: {getNameByPhone(m.informed_phone_3)}</span>}
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
          <div>
            {/* Navigation Header */}
            <button 
              className="vault-btn vault-btn-ghost" 
              style={{ border: '1px solid rgba(255,255,255,0.15)', color: 'white', marginBottom: '20px', padding: '8px 18px' }}
              onClick={() => setSelectedMachine(null)}
            >
              ← Back to Machines Directory
            </button>

            <div className="vault-card" style={{ border: '1px solid rgba(255, 255, 255, 0.1)', padding: '24px', position: 'relative' }}>
              
              {/* Workspace Header */}
              <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: '14px', marginBottom: '18px' }}>
                <span className="eyebrow eyebrow-light" style={{ padding: '4px 10px', fontSize: '0.75rem', fontWeight: 'bold' }}>{selectedMachine.machine_id}</span>
                <h2 style={{ margin: '6px 0 0', fontSize: '1.6rem', fontFamily: 'Rajdhani, sans-serif', textTransform: 'uppercase', color: 'white' }}>{selectedMachine.machine_name} Workspace</h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '6px', fontSize: '0.85rem', color: 'var(--slate)' }}>
                  <span>Location: {selectedMachine.location || '—'}</span>
                  <span>|</span>
                  <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                    Status: {selectedMachine.has_open_tickets ? (
                      <span style={{ color: '#F87171', fontWeight: '600', display: 'inline-flex', alignItems: 'center', marginLeft: '4px' }}><span className="glow-dot down" /> Breakdown</span>
                    ) : (
                      <span style={{ color: '#25D366', fontWeight: '600', display: 'inline-flex', alignItems: 'center', marginLeft: '4px' }}><span className="glow-dot healthy" /> Operational</span>
                    )}
                  </span>
                </div>
              </div>

              {/* Sub-tab Selectors */}
              <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border)', paddingBottom: '12px', marginBottom: '20px', overflowX: 'auto' }}>
                {['info', 'docs', 'parts', 'consumables', 'calendar', 'qr'].map((t) => (
                  <button key={t} 
                          className={`vault-btn ${wsTab === t ? 'vault-btn-primary' : 'vault-btn-ghost'}`} 
                          style={{ padding: '6px 14px', fontSize: '0.82rem', textTransform: 'uppercase' }}
                          onClick={() => setWsTab(t)}>
                    {t === 'info' ? 'Escalation Chain' : t === 'docs' ? 'Manuals & Docs' : t === 'parts' ? 'Spare Parts (BOM)' : t === 'consumables' ? 'Consumables' : t === 'calendar' ? 'Replenishment Calendar' : 'QR Tag'}
                  </button>
                ))}
              </div>

              {/* Workspace Contents */}
              
              {/* TAB 1: ESCALATION & ASSIGNEES (Dynamically loaded off escalationPath) */}
              {wsTab === 'info' && (
                <div>
                  <h3 style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '1.2rem', textTransform: 'uppercase', marginBottom: '12px', color: 'white' }}>Operational Escalation Chain</h3>
                  <p style={{ fontSize: '0.85rem', color: 'var(--slate)', marginBottom: '18px' }}>Tickets remaining open past the threshold time will cascade automatically up this chain of assignees.</p>
                  
                  <div className="flow" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {(() => {
                      let accumulatedHours = 0;
                      return escalationPath.map((step, idx) => {
                        const isLast = idx === escalationPath.length - 1;
                        const stepColor = borderColors[idx % borderColors.length];
                        const stepText = textColors[idx % textColors.length];
                        const tLabel = idx === 0 ? "T=0" : `T=${accumulatedHours}h`;
                        
                        const stepHtml = (
                          <div key={`${step.role}-${idx}`} className="step" style={{ display: 'flex', alignItems: 'center', gap: '14px', borderLeft: `3.5px solid ${stepColor}`, background: 'rgba(0,0,0,0.15)', padding: '12px 16px', borderRadius: '6px' }}>
                            <div className="num" style={{ width: '45px', background: stepColor, color: '#000', fontWeight: 'bold' }}>{tLabel}</div>
                            <div style={{ flex: 1 }}>
                              <div className="sn" style={{ color: stepText }}>{idx === 0 ? "Initial Response" : `Level ${idx} Escalation`}</div>
                              <div className="st" style={{ color: 'white', fontWeight: 'bold' }}>{step.label}</div>
                              <div className="sd" style={{ color: 'var(--slate)', fontSize: '0.82rem', marginTop: '2px' }}>Assigned: <b style={{ color: 'white' }}>{getAssigneeForStep(step, idx)}</b></div>
                            </div>
                            <div style={{ color: 'var(--slate)', fontSize: '0.8rem', fontWeight: '600' }}>
                              {isLast ? `Triggered at T = ${accumulatedHours}h` : `Duration: ${step.threshold_hours} Hours`}
                            </div>
                          </div>
                        );

                        accumulatedHours += (step.threshold_hours || 0);
                        return stepHtml;
                      });
                    })()}
                  </div>
                </div>
              )}

              {/* TAB 2: MANUALS & DOCUMENTS */}
              {wsTab === 'docs' && (
                <div>
                  <form onSubmit={handleUploadDoc} style={{ display: 'flex', gap: '12px', marginBottom: '16px', background: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border)' }}>
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
                          <tr key={d.doc_id}>
                            <td style={{ fontWeight: 'bold', color: 'white' }}>{d.filename}</td>
                            <td style={{ color: 'var(--slate)' }}>{d.uploaded_at ? new Date(d.uploaded_at.replace(' ', 'T')).toLocaleString() : '—'}</td>
                            <td style={{ textAlign: 'right' }}>
                              <button className="vault-btn vault-btn-ghost" style={{ padding: '4px 10px', fontSize: '0.75rem', marginRight: '8px', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }} onClick={() => downloadDoc(d.doc_id, d.filename)}>
                                Download
                              </button>
                              <button className="vault-btn vault-btn-danger" style={{ padding: '4px 10px', fontSize: '0.75rem' }} onClick={() => handleDeleteDoc(d.doc_id)}>
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
                    <img 
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
                        selectedMachine.wa_link || `https://wa.me/?text=Issue with ${selectedMachine.machine_id}: `
                      )}`} 
                      alt="Machine QR Code" 
                      style={{ display: 'block' }}
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
