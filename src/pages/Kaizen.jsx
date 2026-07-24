import React, { useState, useEffect } from 'react';
import {
  Activity, BookOpen, Bot, CalendarDays, ChevronRight, CircleAlert,
  ClipboardList, Droplets, FileCheck2, MessageSquare, Mic,
  Play, Plus, ShieldCheck, TrendingUp, Trash2, CheckCircle2, User,
  Coins, ArrowRight, ShieldAlert, Sparkles, CheckSquare, Eye, RefreshCw
} from 'lucide-react';
import AppShell from '../components/AppShell';
import { supabase } from '@/supabaseClient';

const KAIZEN_CATEGORIES = [
  { value: 'safety', label: 'Safety' },
  { value: 'quality', label: 'Quality' },
  { value: 'productivity', label: 'Productivity' },
  { value: 'cost_reduction', label: 'Cost Reduction' },
  { value: 'energy_saving', label: 'Energy Saving' },
  { value: 'material_saving', label: 'Material Saving' },
  { value: 'breakdown_prevention', label: 'Breakdown Prevention' },
  { value: 'ergonomics', label: 'Ergonomics' },
  { value: '5s', label: '5S' },
  { value: 'simplification', label: 'Process Simplification' }
];

const LEAN_WASTES = [
  { value: 'transportation', label: 'Transportation' },
  { value: 'inventory', label: 'Inventory' },
  { value: 'motion', label: 'Motion' },
  { value: 'waiting', label: 'Waiting' },
  { value: 'overproduction', label: 'Overproduction' },
  { value: 'overprocessing', label: 'Over-processing' },
  { value: 'defects', label: 'Defects' },
  { value: 'talent', label: 'Unutilised Human Talent' }
];

const KAIZEN_STATUSES = [
  { value: 'submitted', label: 'Submitted' },
  { value: 'need_information', label: 'Need Info' },
  { value: 'approved', label: 'Approved' },
  { value: 'planned', label: 'Planned' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'implemented', label: 'Implemented' },
  { value: 'verified', label: 'Verified' },
  { value: 'standardisation_pending', label: 'SOP Pending' },
  { value: 'closed', label: 'Closed' }
];

const PRE_SEEDED_KAIZENS = [
  {
    id: 'KZN-2026-001',
    title: 'Relocate Scrap Bin to Unloading Table',
    proposal: 'Operator currently walks 5 meters with metal punch residue to reach the main scrap yard after every 15 cycles. Move a small scrap bin directly next to the unloading table to eliminate motion waste.',
    machine_id: 'M001',
    category: 'simplification',
    waste_category: 'motion',
    estimated_impact: 'medium',
    estimated_cost: 1500,
    actual_saving: 24000,
    status: 'closed',
    standardisation_status: 'checklist',
    created_by_name: 'Anil Kumar',
    created_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
    due_date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    verified_by_name: 'S. Patil',
    verified_at: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
    trial_duration_shifts: 6,
    before_photo_url: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=200&auto=format&fit=crop',
    after_photo_url: 'https://images.unsplash.com/photo-1581092162613-f54843a91034?w=200&auto=format&fit=crop'
  },
  {
    id: 'KZN-2026-002',
    title: 'Install Guard over Limit Switch LS-2',
    proposal: 'LS-2 switch regularly gets hit by falling metal blanks causing sensor damage, leading to breakdown tickets. Install a sheet metal guard over it to shield it.',
    machine_id: 'M002',
    category: 'breakdown_prevention',
    waste_category: 'defects',
    estimated_impact: 'high',
    estimated_cost: 800,
    actual_saving: 85000,
    status: 'verified',
    standardisation_status: 'pm_checklist',
    created_by_name: 'Ramesh Sawant',
    created_at: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
    due_date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    verified_by_name: 'S. Patil',
    verified_at: new Date().toISOString(),
    trial_duration_shifts: 4,
    before_photo_url: 'https://images.unsplash.com/photo-1504917595217-d4dc5ebe6122?w=200&auto=format&fit=crop',
    after_photo_url: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=200&auto=format&fit=crop'
  },
  {
    id: 'KZN-2026-003',
    title: 'Air Compressor Solenoid Timer Switch',
    proposal: 'Soleneoid valve stays active and vents air during lunch hours wasting compressor power. Add a timer to cut air feed automatically when production stops for over 15 minutes.',
    machine_id: 'M001',
    category: 'energy_saving',
    waste_category: 'waiting',
    estimated_impact: 'high',
    estimated_cost: 3200,
    actual_saving: 0,
    status: 'in_progress',
    standardisation_status: 'no_update_required',
    created_by_name: 'Vijay Deshmukh',
    created_at: new Date().toISOString(),
    due_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    before_photo_url: 'https://images.unsplash.com/photo-1597491853414-998fe05c56c2?w=200&auto=format&fit=crop'
  }
];

export default function Kaizen() {
  const [kaizens, setKaizens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeSubTab, setActiveSubTab] = useState('dashboard'); // 'dashboard' | 'list' | 'add'
  const [machines, setMachines] = useState([]);
  const [users, setUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);

  // Form State
  const [machineId, setMachineId] = useState('');
  const [kaizenType, setKaizenType] = useState('productivity');
  const [urgency, setUrgency] = useState('normal');
  const [title, setTitle] = useState('');
  const [proposal, setProposal] = useState('');
  const [savingType, setSavingType] = useState('none');
  const [savingValue, setSavingValue] = useState('');
  const [isVoiceRecording, setIsVoiceRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState(null);
  const [photoUrl, setPhotoUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Action Panel Filter
  const [dashboardFilter, setDashboardFilter] = useState('all');

  useEffect(() => {
    // Read local auth info
    const storedUser = localStorage.getItem('tf_user');
    if (storedUser) {
      try { setCurrentUser(JSON.parse(storedUser)); } catch {}
    }

    const loadData = async () => {
      setLoading(true);
      try {
        const { data: machs } = await supabase.from('machines').select('id, machine_id, machine_name, location');
        setMachines(machs || []);

        const { data: usrList } = await supabase.from('users').select('id, name, role');
        setUsers(usrList || []);

        const { data: kzList } = await supabase.from('kaizen_opportunities').select('*').order('created_at', { ascending: false });
        if (kzList && kzList.length > 0) {
          setKaizens(kzList);
        } else {
          // Use pre-seeded data if Supabase table is empty
          setKaizens(PRE_SEEDED_KAIZENS);
        }
      } catch (err) {
        console.error('Error fetching data:', err);
        setKaizens(PRE_SEEDED_KAIZENS);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // Voice updates simulator
  const simulateVoiceRecording = () => {
    setIsVoiceRecording(true);
    setTimeout(() => {
      setIsVoiceRecording(false);
      setTitle('Trolley Relocation for unloading');
      setProposal('Keep an empty parts trolley right next to the unloading frame to eliminate constant walking to fetch one.');
      setKaizenType('simplification');
      setAudioUrl(true);
    }, 3500);
  };

  const handleCreateKaizen = async (e) => {
    e.preventDefault();
    if (!machineId || !title || !proposal) {
      setError('Please fill in all required fields.');
      return;
    }
    setSubmitting(true);
    setError('');

    const newKzn = {
      id: `KZN-2026-00${kaizens.length + 1}`,
      machine_id: machineId,
      title,
      proposal,
      category: kaizenType,
      estimated_impact: urgency === 'safety' ? 'high' : 'medium',
      estimated_cost: 0,
      actual_saving: 0,
      status: 'submitted',
      standardisation_status: 'no_update_required',
      created_by_name: currentUser?.name || 'Operator',
      created_at: new Date().toISOString(),
      before_photo_url: photoUrl || 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=200&auto=format&fit=crop'
    };

    try {
      const { data, error: err } = await supabase.from('kaizen_opportunities').insert(newKzn).select();
      if (err) throw err;
      setKaizens([data[0], ...kaizens]);
    } catch {
      // Local fallback
      setKaizens([newKzn, ...kaizens]);
    } finally {
      setSubmitting(false);
      setActiveSubTab('list');
      // Reset
      setTitle('');
      setProposal('');
      setMachineId('');
      setAudioUrl(null);
      setPhotoUrl('');
    }
  };

  const handleUpdateStatus = async (kznId, newStatus) => {
    const updated = kaizens.map((k) => {
      if (k.id === kznId) {
        let actual_saving = k.actual_saving;
        let standardisation_status = k.standardisation_status;
        if (newStatus === 'verified') {
          actual_saving = k.category === 'energy_saving' ? 12000 : 45000; // Simulated calculator
        }
        if (newStatus === 'closed') {
          standardisation_status = 'sop';
        }
        return {
          ...k,
          status: newStatus,
          actual_saving,
          standardisation_status,
          verified_by_name: currentUser?.name || 'Supervisor',
          verified_at: newStatus === 'verified' || newStatus === 'closed' ? new Date().toISOString() : k.verified_at
        };
      }
      return k;
    });
    setKaizens(updated);

    try {
      await supabase.from('kaizen_opportunities').update({
        status: newStatus,
        verified_by_name: currentUser?.name || 'Supervisor',
        verified_at: new Date().toISOString()
      }).eq('id', kznId);
    } catch {}
  };

  const handleDeleteKaizen = async (kznId) => {
    setKaizens(kaizens.filter((k) => k.id !== kznId));
    try {
      await supabase.from('kaizen_opportunities').delete().eq('id', kznId);
    } catch {}
  };

  // Math KPI counts
  const openKaizens = kaizens.filter(k => k.status !== 'closed' && k.status !== 'rejected').length;
  const overdueKaizens = kaizens.filter(k => k.due_date && new Date(k.due_date) < new Date() && k.status !== 'closed').length;
  const completedThisMonth = kaizens.filter(k => k.status === 'implemented' || k.status === 'verified' || k.status === 'closed').length;
  const verifiedKaizens = kaizens.filter(k => k.status === 'verified' || k.status === 'closed').length;
  const estimatedSavings = kaizens.reduce((sum, k) => sum + (k.status !== 'rejected' ? (k.estimated_cost * 4) : 0), 0);
  const validatedSavings = kaizens.reduce((sum, k) => sum + k.actual_saving, 0);

  // Action filter filtering
  const filteredKaizens = kaizens.filter((k) => {
    if (dashboardFilter === 'all') return true;
    if (dashboardFilter === 'safety') return k.category === 'safety';
    if (dashboardFilter === 'overdue') return k.due_date && new Date(k.due_date) < new Date() && k.status !== 'closed';
    if (dashboardFilter === 'pending_verify') return k.status === 'implemented';
    if (dashboardFilter === 'pending_approve') return k.status === 'submitted';
    return true;
  });

  return (
    <AppShell active="overview">
      <main className="workspace-page kaizen-page" style={{ padding: '24px', color: '#e2e8f0', minHeight: '100vh', background: 'radial-gradient(circle at 10% 20%, #0b0f19 0%, #070a10 90%)' }}>
        
        {/* Header Section */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px', marginBottom: '24px', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Bot style={{ color: 'var(--brand)', filter: 'drop-shadow(0 0 4px rgba(74,222,128,0.5))' }} />
              <h2 style={{ margin: 0, fontFamily: 'Rajdhani, sans-serif', fontSize: '1.8rem', textTransform: 'uppercase', letterSpacing: '1px', color: 'white' }}>Kaizen Improvement portal</h2>
            </div>
            <p style={{ margin: '4px 0 0', color: 'var(--slate)', fontSize: '0.86rem' }}>Voice-first, closed-loop continuous improvement dashboard with zero unnecessary documentation.</p>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button className={`vault-btn ${activeSubTab === 'dashboard' ? 'vault-btn-primary' : 'vault-btn-ghost'}`} onClick={() => setActiveSubTab('dashboard')} style={{ background: activeSubTab === 'dashboard' ? 'var(--brand)' : 'transparent', color: activeSubTab === 'dashboard' ? '#000' : 'var(--slate)' }}>
              <TrendingUp size={16} /> Summary
            </button>
            <button className={`vault-btn ${activeSubTab === 'list' ? 'vault-btn-primary' : 'vault-btn-ghost'}`} onClick={() => setActiveSubTab('list')} style={{ background: activeSubTab === 'list' ? 'var(--brand)' : 'transparent', color: activeSubTab === 'list' ? '#000' : 'var(--slate)' }}>
              <ClipboardList size={16} /> All Kaizens
            </button>
            <button className={`vault-btn ${activeSubTab === 'add' ? 'vault-btn-primary' : 'vault-btn-ghost'}`} onClick={() => setActiveSubTab('add')} style={{ background: activeSubTab === 'add' ? 'var(--brand)' : 'transparent', color: activeSubTab === 'add' ? '#000' : 'var(--slate)' }}>
              <Plus size={16} /> Submit Kaizen
            </button>
          </div>
        </div>

        {/* SUBTAB 1: DASHBOARD SUMMARY */}
        {activeSubTab === 'dashboard' && (
          <div>
            {/* Top summary cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px', marginBottom: '24px' }}>
              {[
                { title: 'Open Kaizens', val: openKaizens, color: '#60A5FA', icon: ClipboardList, desc: 'Improvement workload' },
                { title: 'Overdue Kaizens', val: overdueKaizens, color: '#F87171', icon: ShieldAlert, desc: 'Attention required' },
                { title: 'Completed Month', val: completedThisMonth, color: '#34D399', icon: CheckSquare, desc: 'Improvements implemented' },
                { title: 'Verified Kaizens', val: verifiedKaizens, color: '#25D366', icon: CheckCircle2, desc: 'Confirmed results' },
                { title: 'Estimated Annual Saving', val: `₹${estimatedSavings.toLocaleString('en-IN')}`, color: '#FBBF24', icon: Coins, desc: 'Financial opportunity' },
                { title: 'Validated Saving', val: `₹${validatedSavings.toLocaleString('en-IN')}`, color: '#A78BFA', icon: Sparkles, desc: 'Audited financial benefit' }
              ].map((c, i) => (
                <div key={i} style={{ background: 'rgba(15,23,42,0.6)', border: `1px solid rgba(255,255,255,0.06)`, borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', boxShadow: '0 4px 10px rgba(0,0,0,0.2)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <small style={{ color: 'var(--slate)', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase' }}>{c.title}</small>
                    <c.icon size={16} style={{ color: c.color }} />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 800, color: '#fff', fontFamily: 'Rajdhani, sans-serif' }}>{c.val}</h3>
                    <small style={{ color: 'var(--slate)', fontSize: '0.68rem' }}>{c.desc}</small>
                  </div>
                </div>
              ))}
            </div>

            {/* Middle Section: Funnel & Wastes */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px', marginBottom: '24px' }}>
              {/* Funnel */}
              <div style={{ background: 'rgba(0,0,0,0.18)', border: '1px solid var(--border)', borderRadius: '12px', padding: '20px' }}>
                <h4 style={{ margin: '0 0 14px', fontFamily: 'Rajdhani, sans-serif', textTransform: 'uppercase', color: 'white' }}>Kaizen Pipeline Funnel</h4>
                <div style={{ display: 'grid', gap: '8px' }}>
                  {[
                    { label: 'Submitted / Review', count: kaizens.filter(k => k.status === 'submitted').length, color: '#94A3B8' },
                    { label: 'Approved & Planned', count: kaizens.filter(k => k.status === 'approved' || k.status === 'planned').length, color: '#60A5FA' },
                    { label: 'In Progress / Open', count: kaizens.filter(k => k.status === 'in_progress').length, color: '#FBBF24' },
                    { label: 'Awaiting Verification', count: kaizens.filter(k => k.status === 'implemented').length, color: '#F87171' },
                    { label: 'Closed / SOP Update', count: kaizens.filter(k => k.status === 'closed' || k.status === 'verified').length, color: '#25D366' }
                  ].map((s, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ width: '130px', fontSize: '0.78rem', color: 'var(--slate)' }}>{s.label}</div>
                      <div style={{ flex: 1, height: '10px', background: 'rgba(255,255,255,0.05)', borderRadius: '999px', overflow: 'hidden' }}>
                        <div style={{ width: `${Math.min(100, (s.count / (kaizens.length || 1)) * 100)}%`, height: '100%', background: s.color, borderRadius: '999px' }}></div>
                      </div>
                      <b style={{ color: '#fff', fontSize: '0.8rem', width: '20px', textAlign: 'right' }}>{s.count}</b>
                    </div>
                  ))}
                </div>
              </div>

              {/* Lean Waste analysis */}
              <div style={{ background: 'rgba(0,0,0,0.18)', border: '1px solid var(--border)', borderRadius: '12px', padding: '20px' }}>
                <h4 style={{ margin: '0 0 14px', fontFamily: 'Rajdhani, sans-serif', textTransform: 'uppercase', color: 'white' }}>Seven Wastes Addressed</h4>
                <div style={{ display: 'grid', gap: '6px' }}>
                  {LEAN_WASTES.map((w) => {
                    const cnt = kaizens.filter((k) => k.waste_category === w.value).length;
                    return (
                      <div key={w.value} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem', padding: '4px 0', borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                        <span style={{ color: '#cbd5e1' }}>{w.label}</span>
                        <span style={{ color: 'var(--brand)', fontWeight: 'bold' }}>{cnt} opportunity{cnt === 1 ? '' : 'ies'}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Bottom Section: Priority Action Panel */}
            <div style={{ background: 'rgba(0,0,0,0.18)', border: '1px solid var(--border)', borderRadius: '12px', padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '14px' }}>
                <h4 style={{ margin: 0, fontFamily: 'Rajdhani, sans-serif', textTransform: 'uppercase', color: 'white' }}>Priority Action Panel</h4>
                <select aria-label="Filter action items" value={dashboardFilter} onChange={(e) => setDashboardFilter(e.target.value)} style={{ width: '180px', padding: '4px' }}>
                  <option value="all">Show All Items</option>
                  <option value="safety">Safety-Critical Opportunities</option>
                  <option value="overdue">Overdue Actions</option>
                  <option value="pending_verify">Awaiting Verification</option>
                  <option value="pending_approve">Awaiting Approval</option>
                </select>
              </div>

              {filteredKaizens.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--slate)', padding: '20px' }}>No items match current priority filter.</div>
              ) : (
                <div style={{ display: 'grid', gap: '10px' }}>
                  {filteredKaizens.map((k) => (
                    <div key={k.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', flexWrap: 'wrap', padding: '10px 14px', background: 'rgba(15,23,42,0.4)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '8px' }}>
                      <div>
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                          <b style={{ color: '#fff', fontSize: '0.85rem' }}>{k.id}</b>
                          <span style={{ background: k.category === 'safety' ? 'rgba(239,68,68,0.2)' : 'rgba(96,165,250,0.15)', color: k.category === 'safety' ? '#f87171' : '#60a5fa', fontSize: '0.66rem', fontWeight: 'bold', padding: '1px 8px', borderRadius: '999px' }}>{k.category.toUpperCase()}</span>
                          <span style={{ color: 'var(--slate)', fontSize: '0.72rem' }}>Machine: {k.machine_id}</span>
                        </div>
                        <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: '#cbd5e1' }}>{k.title}</p>
                      </div>

                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#fbbf24', fontWeight: 650 }}>{k.status}</span>
                        <button className="vault-btn vault-btn-ghost" style={{ padding: '4px 10px', fontSize: '0.72rem' }} onClick={() => { setActiveSubTab('list'); setTimeout(() => { document.getElementById(k.id)?.scrollIntoView({ behavior: 'smooth' }) }, 100); }}>View details</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* SUBTAB 2: ALL KAIZENS LIST */}
        {activeSubTab === 'list' && (
          <div style={{ display: 'grid', gap: '16px' }}>
            {kaizens.map((k) => (
              <div id={k.id} key={k.id} style={{ background: 'rgba(0,0,0,0.18)', border: '1px solid var(--border)', borderRadius: '12px', padding: '20px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
                {/* Left Side: Meta & Before/After Images */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <h3 style={{ margin: 0, color: 'white', fontFamily: 'Rajdhani, sans-serif', fontSize: '1.25rem' }}>{k.id}: {k.title}</h3>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <span style={{ background: '#1e293b', color: '#94a3b8', fontSize: '0.68rem', fontWeight: 700, padding: '2px 8px', borderRadius: '4px' }}>{k.waste_category.toUpperCase()}</span>
                      <span style={{ background: k.status === 'closed' ? '#064e3b' : '#311005', color: k.status === 'closed' ? '#34d399' : '#f97316', fontSize: '0.68rem', fontWeight: 700, padding: '2px 8px', borderRadius: '4px' }}>{k.status.toUpperCase()}</span>
                    </div>
                  </div>

                  <p style={{ margin: '0 0 12px', fontSize: '0.8rem', color: '#cbd5e1', lineHeight: '1.4' }}>{k.proposal}</p>
                  
                  {/* Photo displays before/after */}
                  <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
                    <div style={{ flex: 1 }}>
                      <small style={{ display: 'block', color: 'var(--slate)', fontSize: '0.65rem', textTransform: 'uppercase', marginBottom: '4px' }}>Before Condition</small>
                      <img src={k.before_photo_url} alt="Before improvement" style={{ width: '100%', height: '110px', objectFit: 'cover', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.06)' }} />
                    </div>
                    {k.after_photo_url && (
                      <div style={{ flex: 1 }}>
                        <small style={{ display: 'block', color: 'var(--slate)', fontSize: '0.65rem', textTransform: 'uppercase', marginBottom: '4px' }}>After Condition</small>
                        <img src={k.after_photo_url} alt="After improvement" style={{ width: '100%', height: '110px', objectFit: 'cover', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.06)' }} />
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Side: Implementations & Actions */}
                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', borderLeft: '1px solid rgba(255,255,255,0.06)', paddingLeft: '20px' }}>
                  <div style={{ display: 'grid', gap: '6px', fontSize: '0.8rem' }}>
                    <div><span style={{ color: 'var(--slate)' }}>Submitted by:</span> <strong style={{ color: 'white' }}>{k.created_by_name}</strong> <small style={{ color: 'var(--slate)' }}>({new Date(k.created_at).toLocaleDateString('en-IN')})</small></div>
                    {k.due_date && <div><span style={{ color: 'var(--slate)' }}>Target implementation date:</span> <strong style={{ color: 'white' }}>{k.due_date}</strong></div>}
                    {k.verified_by_name && <div><span style={{ color: 'var(--slate)' }}>Verified by:</span> <strong style={{ color: 'white' }}>{k.verified_by_name}</strong> <small style={{ color: 'var(--slate)' }}>({new Date(k.verified_at).toLocaleDateString('en-IN')})</small></div>}
                    {k.actual_saving > 0 && <div><span style={{ color: 'var(--slate)' }}>Validated annual savings:</span> <strong style={{ color: '#25D366' }}>₹{k.actual_saving.toLocaleString('en-IN')} / year</strong></div>}
                    {k.status === 'closed' && <div><span style={{ color: 'var(--slate)' }}>Standardisation status:</span> <strong style={{ color: 'var(--brand)' }}>Checklist & SOP updated</strong></div>}
                  </div>

                  {/* Actions depending on status */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '16px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '12px' }}>
                    {k.status === 'submitted' && (
                      <>
                        <button className="vault-btn vault-btn-primary" style={{ background: '#3b82f6', color: '#fff', padding: '4px 12px', fontSize: '0.78rem' }} onClick={() => handleUpdateStatus(k.id, 'approved')}>Approve Review</button>
                        <button className="vault-btn vault-btn-ghost" style={{ padding: '4px 12px', fontSize: '0.78rem' }} onClick={() => handleUpdateStatus(k.id, 'need_information')}>Request Info</button>
                      </>
                    )}
                    {k.status === 'approved' && (
                      <button className="vault-btn vault-btn-primary" style={{ background: '#f59e0b', color: '#000', padding: '4px 12px', fontSize: '0.78rem' }} onClick={() => handleUpdateStatus(k.id, 'in_progress')}>Start Implementation</button>
                    )}
                    {k.status === 'in_progress' && (
                      <button className="vault-btn vault-btn-primary" style={{ background: '#10b981', color: '#fff', padding: '4px 12px', fontSize: '0.78rem' }} onClick={() => {
                        // Simulate submitting evidence
                        const updated = kaizens.map((x) => x.id === k.id ? { ...x, status: 'implemented', after_photo_url: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=200&auto=format&fit=crop' } : x);
                        setKaizens(updated);
                      }}>Submit Completion Evidence</button>
                    )}
                    {k.status === 'implemented' && (
                      <button className="vault-btn vault-btn-primary" style={{ background: '#10b981', color: '#fff', padding: '4px 12px', fontSize: '0.78rem' }} onClick={() => handleUpdateStatus(k.id, 'verified')}>Verify Effectiveness</button>
                    )}
                    {k.status === 'verified' && (
                      <button className="vault-btn vault-btn-primary" style={{ background: 'var(--brand)', color: '#000', padding: '4px 12px', fontSize: '0.78rem' }} onClick={() => handleUpdateStatus(k.id, 'closed')}>Complete Standardisation</button>
                    )}

                    <button className="vault-btn vault-btn-ghost" style={{ padding: '4px 10px', fontSize: '0.78rem', marginLeft: 'auto' }} onClick={() => handleDeleteKaizen(k.id)}><Trash2 size={14} /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* SUBTAB 3: ADD NEW KAIZEN FORM */}
        {activeSubTab === 'add' && (
          <div style={{ maxWidth: '520px', margin: '0 auto', background: 'rgba(0,0,0,0.18)', border: '1px solid var(--border)', borderRadius: '12px', padding: '24px' }}>
            <h3 style={{ margin: '0 0 16px', fontFamily: 'Rajdhani, sans-serif', textTransform: 'uppercase', color: 'white' }}>Suggest New Kaizen Opportunity</h3>
            
            {/* Voice suggestion helper */}
            <div style={{ background: 'rgba(74,222,128,0.06)', border: '1px dashed rgba(74,222,128,0.25)', borderRadius: '8px', padding: '14px', marginBottom: '18px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
              <div style={{ fontSize: '0.78rem', color: '#cbd5e1', textAlign: 'center' }}>AI Voice Interpreter: Speak the problem and solution naturally in Hindi/English</div>
              <button type="button" className={`vault-btn ${isVoiceRecording ? 'vault-btn-primary animate-pulse' : 'vault-btn-ghost'}`} onClick={simulateVoiceRecording} style={{ background: isVoiceRecording ? '#ef4444' : 'transparent', color: isVoiceRecording ? 'white' : 'var(--brand)', minWidth: '160px' }}>
                <Mic size={16} /> {isVoiceRecording ? 'Listening...' : 'Record Voice'}
              </button>
              {audioUrl && <span style={{ fontSize: '0.72rem', color: '#25D366' }}>Voice successfully parsed! Form filled automatically.</span>}
            </div>

            <form onSubmit={handleCreateKaizen} style={{ display: 'grid', gap: '14px' }}>
              <div className="vault-field">
                <label htmlFor="kzn-machine-select">Related machine <strong aria-hidden="true">*</strong></label>
                <select id="kzn-machine-select" value={machineId} onChange={(e) => setMachineId(e.target.value)} required>
                  <option value="">Select Machine</option>
                  {machines.map((m) => <option key={m.id} value={m.machine_id}>{m.machine_id} — {m.machine_name}</option>)}
                </select>
              </div>

              <div className="vault-field">
                <label htmlFor="kzn-cat-select">Kaizen category</label>
                <select id="kzn-cat-select" value={kaizenType} onChange={(e) => setKaizenType(e.target.value)}>
                  {KAIZEN_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>

              <div className="vault-field">
                <label htmlFor="kzn-urg-select">Urgency level</label>
                <select id="kzn-urg-select" value={urgency} onChange={(e) => setUrgency(e.target.value)}>
                  <option value="normal">Normal (Routine)</option>
                  <option value="urgent">Urgent (Breakdown prevention)</option>
                  <option value="safety">Safety Critical</option>
                </select>
              </div>

              <div className="vault-field">
                <label>Idea title <strong aria-hidden="true">*</strong></label>
                <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Relocate unloading trolley" required />
              </div>

              <div className="vault-field">
                <label>Proposal details <strong aria-hidden="true">*</strong></label>
                <textarea value={proposal} onChange={(e) => setProposal(e.target.value)} rows={3} placeholder="Describe the current problem and how your change improves the operation..." required />
              </div>

              <div className="vault-field">
                <label>Before photo URL (optional)</label>
                <input value={photoUrl} onChange={(e) => setPhotoUrl(e.target.value)} placeholder="https://unsplash.com/... or upload link" />
              </div>

              {error && <div style={{ color: '#F87171', fontSize: '0.8rem' }}>{error}</div>}

              <button type="submit" className="vault-btn vault-btn-primary" disabled={submitting} style={{ background: 'var(--brand)', color: '#000', marginTop: '8px' }}>
                {submitting ? 'Saving idea...' : 'Submit Kaizen Idea'}
              </button>
            </form>
          </div>
        )}

      </main>
    </AppShell>
  );
}
