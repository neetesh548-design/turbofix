import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import AppShell from '../components/AppShell';
import AdvancedFeaturesDrilldown from '../components/AdvancedFeaturesDrilldown';
import EmptyState from '../components/EmptyState';
import {
  Package, Plus, Search, AlertTriangle, CheckCircle2, Clock, Factory, Loader2,
  ArrowRight, DollarSign, Filter, ChevronRight, LayoutGrid, List, Wrench,
  ShieldAlert, Sparkles, SlidersHorizontal, Layers, Building2, TrendingUp, Edit3, Shield, Info
} from 'lucide-react';

const initialMockParts = [
  {
    id: 'p-1',
    name: 'CNC Spindle High-Precision Bearing',
    part_number: 'SB-4410-X',
    associated_machine: 'CNC Milling Center #01',
    machine_priority: 'Critical',
    lead_time_days: 21,
    stock_qty: 0,
    reserved_qty: 0,
    reorder_level: 2,
    unit_cost: 14500,
    supplier: 'SKF Precision Ltd',
    location: 'Bin A-04 (High Security)',
    store_manager_note: 'Imported from Germany. Must maintain min 2 units buffer.',
  },
  {
    id: 'p-2',
    name: 'Hydraulic High-Pressure Seal Kit',
    part_number: 'HS-9021-HP',
    associated_machine: '50-Ton Hydraulic Press',
    machine_priority: 'Critical',
    lead_time_days: 14,
    stock_qty: 2,
    reserved_qty: 1,
    reorder_level: 5,
    unit_cost: 3200,
    supplier: 'Bosch Rexroth',
    location: 'Bin H-12',
    store_manager_note: 'Prone to blowout under high tonnage continuous shifts.',
  },
  {
    id: 'p-3',
    name: 'Proximity Optical Sensor 24V',
    part_number: 'PS-24V-OPT',
    associated_machine: 'Main Automated Conveyor',
    machine_priority: 'High',
    lead_time_days: 7,
    stock_qty: 1,
    reserved_qty: 0,
    reorder_level: 4,
    unit_cost: 2100,
    supplier: 'Omron Automation',
    location: 'Bin E-02',
    store_manager_note: 'Used across Line 1 & Line 2 conveyor interlocks.',
  },
  {
    id: 'p-4',
    name: 'Heavy-Duty Reinforced V-Belt 45-B',
    part_number: 'VB-45B-HD',
    associated_machine: 'Air Compressor Unit #02',
    machine_priority: 'Medium',
    lead_time_days: 3,
    stock_qty: 14,
    reserved_qty: 2,
    reorder_level: 6,
    unit_cost: 550,
    supplier: 'Fenner Drives',
    location: 'Bin B-18',
    store_manager_note: 'Standard wear item. Local supplier delivers within 72 hrs.',
  },
  {
    id: 'p-5',
    name: 'PLC I/O Digital Extension Module',
    part_number: 'PLC-IO-32X',
    associated_machine: 'Robotic Welding Cell B',
    machine_priority: 'Critical',
    lead_time_days: 30,
    stock_qty: 1,
    reserved_qty: 1,
    reorder_level: 2,
    unit_cost: 28000,
    supplier: 'Siemens Industrial',
    location: 'Bin E-01 (ESD Safe)',
    store_manager_note: 'Longest lead time in factory. Auto-trigger PO when stock = 1.',
  },
];

const initialMockConsumables = [
  {
    id: 'c-1',
    name: 'Synthetic Hydro-Gear Oil ISO VG 68',
    part_number: 'OIL-VG68-SYN',
    associated_machine: '50-Ton Hydraulic Press',
    machine_priority: 'Critical',
    lead_time_days: 5,
    stock_qty: 15,
    reserved_qty: 8,
    reorder_level: 25,
    unit_cost: 4200,
    supplier: 'Castrol Industrial',
    location: 'Drum Bay D-01',
    store_manager_note: '200L Barrels. Required for monthly PM shutdown oil change.',
  },
  {
    id: 'c-2',
    name: 'High-Temp Lithium Complex Grease EP2',
    part_number: 'GR-EP2-HT',
    associated_machine: 'Heat Treatment Furnace',
    machine_priority: 'High',
    lead_time_days: 4,
    stock_qty: 6,
    reserved_qty: 2,
    reorder_level: 12,
    unit_cost: 850,
    supplier: 'Mobil Grease',
    location: 'Shelf G-03',
    store_manager_note: 'Daily lubrication consumable for furnace conveyor bearings.',
  },
];

const initialMockPOs = [
  { id: 'po-101', po_number: 'PO-2026-001', vendor: 'SKF Precision Ltd', items_count: 2, total_amount: 29000, status: 'pending', machine: 'CNC Milling Center #01', created_at: new Date().toISOString() },
  { id: 'po-102', po_number: 'PO-2026-002', vendor: 'Bosch Rexroth', items_count: 5, total_amount: 16000, status: 'approved', machine: '50-Ton Hydraulic Press', created_at: new Date().toISOString() },
  { id: 'po-103', po_number: 'PO-2026-003', vendor: 'Siemens Industrial', items_count: 1, total_amount: 28000, status: 'ordered', machine: 'Robotic Welding Cell B', created_at: new Date().toISOString() },
];

export function computePartCriticality(item) {
  const machinePriority = item.machine_priority || 'Medium';
  const leadTime = item.lead_time_days || 0;

  if (machinePriority === 'Critical' || leadTime >= 14) {
    return {
      level: 'Critical',
      badgeClass: 'bg-red-500/20 text-red-300 border-red-500/40',
      reason: machinePriority === 'Critical' && leadTime >= 14
        ? 'Critical Machine + 14+ Days Lead Time'
        : machinePriority === 'Critical'
        ? 'Inherited from Critical Machine'
        : 'High Lead Time Risk (14+ Days)',
    };
  }

  if (machinePriority === 'High' || leadTime >= 7) {
    return {
      level: 'High',
      badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
      reason: machinePriority === 'High' ? 'Inherited from High Priority Machine' : 'Lead Time Risk (7+ Days)',
    };
  }

  return {
    level: machinePriority === 'Low' ? 'Low' : 'Medium',
    badgeClass: 'bg-slate-500/20 text-slate-300 border-slate-500/40',
    reason: 'Standard Replenishment Schedule',
  };
}

const Inventory = () => {
  const [activeTab, setActiveTab] = useState('parts');
  const [parts, setParts] = useState(initialMockParts);
  const [consumables, setConsumables] = useState(initialMockConsumables);
  const [purchaseOrders, setPurchaseOrders] = useState(initialMockPOs);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [filterMachinePriority, setFilterMachinePriority] = useState('all');
  const [viewMode, setViewMode] = useState('kanban');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [editingPart, setEditingPart] = useState(null);

  useEffect(() => {
    fetchInventory();
  }, []);

  const fetchInventory = async () => {
    setLoading(true);
    setError(null);
    try {
      const [partsRes, consumablesRes, poRes] = await Promise.all([
        supabase.from('parts').select('*').order('name'),
        supabase.from('consumables').select('*').order('name'),
        supabase.from('purchase_orders').select('*, factories(name)').order('created_at', { ascending: false })
      ]);

      if (partsRes.data && partsRes.data.length > 0) setParts(partsRes.data);
      if (consumablesRes.data && consumablesRes.data.length > 0) setConsumables(consumablesRes.data);
      if (poRes.data && poRes.data.length > 0) setPurchaseOrders(poRes.data);
    } catch (err) {
      console.warn('Using Store Manager mock inventory data:', err);
    } finally {
      setLoading(false);
    }
  };

  const updatePOStatus = async (poId, newStatus) => {
    try {
      const { error } = await supabase
        .from('purchase_orders')
        .update({ status: newStatus, ...(newStatus === 'approved' ? { approved_at: new Date().toISOString() } : {}) })
        .eq('id', poId);

      if (error) throw error;
      setPurchaseOrders(purchaseOrders.map(po => po.id === poId ? { ...po, status: newStatus } : po));
    } catch (err) {
      console.error('Error updating PO status:', err);
    }
  };

  const savePartEdit = (e) => {
    e.preventDefault();
    if (!editingPart) return;
    setParts(parts.map(p => p.id === editingPart.id ? editingPart : p));
    setConsumables(consumables.map(c => c.id === editingPart.id ? editingPart : c));
    setEditingPart(null);
  };

  // Combine items for Store Manager Criticality Dashboard
  const allStoreItems = [
    ...parts.map(p => ({ ...p, item_type: 'Part' })),
    ...consumables.map(c => ({ ...c, item_type: 'Consumable' })),
  ];

  const criticalStockoutItems = allStoreItems.filter(item => {
    const available = item.stock_qty - (item.reserved_qty || 0);
    const crit = computePartCriticality(item);
    return available <= (item.reorder_level || 0) && (crit.level === 'Critical' || crit.level === 'High');
  });

  const totalStoreValue = allStoreItems.reduce((acc, item) => acc + (item.stock_qty * (item.unit_cost || 0)), 0);
  const criticalMachineCount = new Set(allStoreItems.filter(i => i.machine_priority === 'Critical').map(i => i.associated_machine)).size;
  const longLeadTimeCount = allStoreItems.filter(i => (i.lead_time_days || 0) >= 14).length;

  const filterItemMatches = (item) => {
    const matchesSearch = !search.trim() ||
      item.name?.toLowerCase().includes(search.toLowerCase()) ||
      item.part_number?.toLowerCase().includes(search.toLowerCase()) ||
      item.associated_machine?.toLowerCase().includes(search.toLowerCase());

    const matchesPriority = filterMachinePriority === 'all' ||
      (filterMachinePriority === 'critical_machine' && item.machine_priority === 'Critical') ||
      (filterMachinePriority === 'high_lead' && (item.lead_time_days || 0) >= 14);

    return matchesSearch && matchesPriority;
  };

  const filteredParts = parts.filter(filterItemMatches);
  const filteredConsumables = consumables.filter(filterItemMatches);

  const filteredPOs = purchaseOrders.map(po => ({
    id: po.id,
    po_code: po.po_number || `PO-${String(po.id).slice(0, 6)}`,
    item_name: po.vendor || 'Spare Parts Order',
    item_number: po.vendor ? `Vendor: ${po.vendor}` : '',
    machine: po.machine || 'Plant General',
    qty: po.items_count || 1,
    estimated_cost: po.total_amount,
    status: po.status || 'pending',
    auto_generated: true,
    created_at: po.created_at || new Date().toISOString()
  }));

  const poStatuses = ['pending', 'approved', 'ordered', 'received'];

  const renderStockStatus = (available, reorderLevel) => {
    if (available <= 0) {
      return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-500/20 text-red-400 border border-red-500/40">OUT OF STOCK</span>;
    }
    if (available <= reorderLevel) {
      return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-400 border border-amber-500/40">LOW STOCK</span>;
    }
    return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">HEALTHY</span>;
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: 'border-amber-500/40 bg-amber-500/10 text-amber-300',
      approved: 'border-blue-500/40 bg-blue-500/10 text-blue-300',
      ordered: 'border-indigo-500/40 bg-indigo-500/10 text-indigo-300',
      received: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300',
      rejected: 'border-red-500/40 bg-red-500/10 text-red-300',
      cancelled: 'border-slate-500/40 bg-slate-500/10 text-slate-300'
    };
    return colors[status] || colors.pending;
  };

  return (
    <AppShell active="inventory">
      <div className="inventory-page max-w-7xl mx-auto space-y-6" style={{ padding: '20px 24px 80px' }}>
        {/* STORE MANAGER HEADER */}
        <header className="inventory-page-heading" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/30 text-xs font-bold mb-2">
              <Shield size={14} /> STORE MANAGER CONTROL CENTER
            </div>
            <h1 className="text-2xl font-bold text-white tracking-wide" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
              Machine-Associated Inventory & Stockout Risk
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Bottom-Up Store Intelligence: Machine Priority Inheritance &amp; Lead Time Risk Management.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="inventory-live-chip"><i />Store Live</div>
          </div>
        </header>

        {/* STORE MANAGER KPI CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-slate-900/80 backdrop-blur-xl p-4 rounded-xl border border-red-500/30 shadow-lg relative overflow-hidden">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Critical Stockout Risk</p>
                <h3 className="text-2xl font-bold text-red-400 mt-1">{criticalStockoutItems.length} Items</h3>
                <p className="text-[11px] text-red-300/80 mt-1">Critical Machine Spares &lt; Reorder Level</p>
              </div>
              <div className="p-2.5 bg-red-500/20 text-red-400 rounded-lg border border-red-500/30">
                <ShieldAlert size={22} />
              </div>
            </div>
          </div>

          <div className="bg-slate-900/80 backdrop-blur-xl p-4 rounded-xl border border-amber-500/30 shadow-lg">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">High Lead Time Spares</p>
                <h3 className="text-2xl font-bold text-amber-400 mt-1">{longLeadTimeCount} Parts</h3>
                <p className="text-[11px] text-amber-300/80 mt-1">14+ Days Procurement Lead Time</p>
              </div>
              <div className="p-2.5 bg-amber-500/20 text-amber-400 rounded-lg border border-amber-500/30">
                <Clock size={22} />
              </div>
            </div>
          </div>

          <div className="bg-slate-900/80 backdrop-blur-xl p-4 rounded-xl border border-blue-500/30 shadow-lg">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Critical Machines Backed</p>
                <h3 className="text-2xl font-bold text-blue-400 mt-1">{criticalMachineCount} Machines</h3>
                <p className="text-[11px] text-blue-300/80 mt-1">Backed by Ready Spare Buffer</p>
              </div>
              <div className="p-2.5 bg-blue-500/20 text-blue-400 rounded-lg border border-blue-500/30">
                <Factory size={22} />
              </div>
            </div>
          </div>

          <div className="bg-slate-900/80 backdrop-blur-xl p-4 rounded-xl border border-emerald-500/30 shadow-lg">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Store Valuation</p>
                <h3 className="text-2xl font-bold text-emerald-400 mt-1">₹{totalStoreValue.toLocaleString('en-IN')}</h3>
                <p className="text-[11px] text-emerald-300/80 mt-1">Active Stock Capitalization</p>
              </div>
              <div className="p-2.5 bg-emerald-500/20 text-emerald-400 rounded-lg border border-emerald-500/30">
                <TrendingUp size={22} />
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="flex flex-col items-center justify-center h-32 text-red-400 gap-3 p-8 text-center bg-slate-900/80 backdrop-blur-xl rounded-2xl border border-red-500/30 shadow-sm">
            <AlertTriangle size={48} className="opacity-50" />
            <p className="font-semibold">{error}</p>
            <button onClick={fetchInventory} className="px-6 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-xl text-sm font-semibold transition-colors">Retry</button>
          </div>
        )}

        {/* STORE MANAGER BOTTOM-UP CRITICAL STOCK TABLE */}
        <div className="bg-slate-900/90 backdrop-blur-xl rounded-2xl border border-slate-800 shadow-xl overflow-hidden">
          <div className="p-4 bg-slate-800/60 border-b border-slate-700/80 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
                <ShieldAlert className="text-red-400" size={20} />
                CRITICAL STOCKOUT RISK &amp; MACHINE PRIORITY ALERTS
              </h2>
              <p className="text-xs text-slate-400">Items requiring immediate reorder based on inherited machine criticality &amp; lead time.</p>
            </div>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center h-48 text-slate-400 gap-3">
              <Loader2 className="animate-spin text-blue-500" size={32} />
              <p className="font-medium">Evaluating machine priorities &amp; lead times...</p>
            </div>
          ) : criticalStockoutItems.length === 0 ? (
            <div className="p-8 text-center text-slate-400">
              <CheckCircle2 size={40} className="mx-auto mb-2 text-emerald-400 opacity-80" />
              <p className="font-semibold text-slate-200">No Critical Machine Stockouts</p>
              <p className="text-xs text-slate-400 mt-1">All spares for critical machines are above reorder thresholds.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-800/90 border-b border-slate-700 text-xs uppercase tracking-wider text-slate-400 font-bold">
                    <th className="px-6 py-3">Part &amp; Associated Machine</th>
                    <th className="px-6 py-3">Inherited Machine Priority</th>
                    <th className="px-6 py-3">Lead Time &amp; Location</th>
                    <th className="px-6 py-3">Stock Buffer</th>
                    <th className="px-6 py-3">Derived Part Criticality</th>
                    <th className="px-6 py-3 text-right">Store Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80 text-slate-200">
                  {criticalStockoutItems.map(item => {
                    const available = item.stock_qty - (item.reserved_qty || 0);
                    const crit = computePartCriticality(item);
                    return (
                      <tr key={item.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400">
                              <Wrench size={18} />
                            </div>
                            <div>
                              <div className="font-semibold text-white">{item.name}</div>
                              <div className="text-xs text-slate-400 font-mono mt-0.5 flex items-center gap-2">
                                <span>{item.part_number}</span>
                                <span>•</span>
                                <span className="text-blue-400 font-sans flex items-center gap-1">
                                  <Factory size={12} /> {item.associated_machine}
                                </span>
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold border ${
                            item.machine_priority === 'Critical' ? 'bg-red-500/20 text-red-400 border-red-500/40' :
                            item.machine_priority === 'High' ? 'bg-amber-500/20 text-amber-400 border-amber-500/40' :
                            'bg-slate-500/20 text-slate-300 border-slate-500/40'
                          }`}>
                            <ShieldAlert size={12} /> {item.machine_priority || 'Medium'} Machine
                          </span>
                        </td>

                        <td className="px-6 py-4">
                          <div className="text-xs font-semibold text-amber-400 flex items-center gap-1">
                            <Clock size={13} /> {item.lead_time_days || 0} Days Lead Time
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5">{item.location || 'Main Store'}</div>
                        </td>

                        <td className="px-6 py-4">
                          <div className="flex items-baseline gap-1">
                            <span className="text-lg font-bold text-white">{available}</span>
                            <span className="text-xs text-slate-400">/ min {item.reorder_level || 0}</span>
                          </div>
                          {renderStockStatus(available, item.reorder_level || 0)}
                        </td>

                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold border ${crit.badgeClass}`}>
                            <Sparkles size={12} /> {crit.level} Priority
                          </span>
                          <div className="text-[10px] text-slate-400 mt-1 max-w-[180px]">{crit.reason}</div>
                        </td>

                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => setEditingPart(item)}
                            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition-colors inline-flex items-center gap-1"
                          >
                            <Edit3 size={12} /> Manage Store Priority
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* STORE MANAGER ADVANCED INVENTORY DRILL-DOWN */}
        <AdvancedFeaturesDrilldown isOpen={showAdvanced} onToggle={() => setShowAdvanced(!showAdvanced)}>
          <div className="space-y-6">
            {/* Filter & Search Bar */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-900/80 p-4 rounded-xl border border-slate-800">
              <div className="flex flex-wrap gap-2">
                <div className="flex bg-slate-800 p-1 rounded-lg border border-slate-700">
                  {['parts', 'consumables'].map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`px-4 py-1.5 rounded-md text-xs font-bold uppercase transition-all ${
                        activeTab === tab ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {tab} ({tab === 'parts' ? parts.length : consumables.length})
                    </button>
                  ))}
                </div>

                <select
                  value={filterMachinePriority}
                  onChange={(e) => setFilterMachinePriority(e.target.value)}
                  className="px-3 py-1.5 bg-slate-800 border border-slate-700 text-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:border-blue-500"
                >
                  <option value="all">All Machines &amp; Lead Times</option>
                  <option value="critical_machine">Critical Machines Only</option>
                  <option value="high_lead">High Lead Time (&ge;14 Days)</option>
                </select>
              </div>

              <div className="relative w-full md:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  type="text"
                  placeholder="Search part or machine..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-1.5 bg-slate-800 border border-slate-700 text-slate-200 rounded-lg text-xs focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            {/* Complete Store Register */}
            <div className="bg-slate-900/90 rounded-2xl border border-slate-800 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-slate-800/90 border-b border-slate-700 text-xs uppercase tracking-wider text-slate-400 font-bold">
                      <th className="px-6 py-3">Item Details</th>
                      <th className="px-6 py-3">Machine &amp; Priority</th>
                      <th className="px-6 py-3">Lead Time &amp; Supplier</th>
                      <th className="px-6 py-3">Bin Location</th>
                      <th className="px-6 py-3">Stock Level</th>
                      <th className="px-6 py-3">Store Priority</th>
                      <th className="px-6 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80 text-slate-200">
                    {(activeTab === 'parts' ? filteredParts : filteredConsumables).length === 0 ? (
                      <tr>
                        <td colSpan="7" className="px-6 py-12 text-center text-slate-400">
                          <Package size={40} className="mx-auto mb-2 opacity-30" />
                          <p>No matching spare parts or consumables found.</p>
                        </td>
                      </tr>
                    ) : (
                      (activeTab === 'parts' ? filteredParts : filteredConsumables).map(item => {
                        const available = item.stock_qty - (item.reserved_qty || 0);
                        const crit = computePartCriticality(item);
                        return (
                          <tr key={item.id} className="hover:bg-slate-800/40 transition-colors">
                            <td className="px-6 py-4">
                              <div className="font-semibold text-white">{item.name}</div>
                              <div className="text-xs text-slate-400 font-mono mt-0.5">{item.part_number}</div>
                            </td>

                            <td className="px-6 py-4">
                              <div className="text-xs font-semibold text-blue-400 flex items-center gap-1">
                                <Factory size={13} /> {item.associated_machine}
                              </div>
                              <span className={`inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded mt-1 border ${
                                item.machine_priority === 'Critical' ? 'bg-red-500/20 text-red-400 border-red-500/30' :
                                item.machine_priority === 'High' ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' :
                                'bg-slate-500/20 text-slate-400 border-slate-500/30'
                              }`}>
                                {item.machine_priority} Machine
                              </span>
                            </td>

                            <td className="px-6 py-4">
                              <div className="text-xs font-semibold text-amber-400 flex items-center gap-1">
                                <Clock size={12} /> {item.lead_time_days || 0} Days
                              </div>
                              <div className="text-[11px] text-slate-400 mt-0.5">{item.supplier || 'Vendor N/A'}</div>
                            </td>

                            <td className="px-6 py-4 text-xs font-mono text-slate-300">
                              {item.location || 'General Bay'}
                            </td>

                            <td className="px-6 py-4">
                              <div className="font-bold text-white">{available} available</div>
                              <div className="text-[11px] text-slate-400">Total: {item.stock_qty} | Reorder: {item.reorder_level}</div>
                            </td>

                            <td className="px-6 py-4">
                              <span className={`inline-flex items-center text-xs font-bold px-2.5 py-1 rounded-md border ${crit.badgeClass}`}>
                                {crit.level} Priority
                              </span>
                            </td>

                            <td className="px-6 py-4 text-right">
                              <button
                                onClick={() => setEditingPart(item)}
                                className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-semibold transition-colors"
                              >
                                Edit Priority
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Purchase Orders Kanban & List View */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-900/80 p-4 rounded-xl border border-slate-800 mt-8">
              <div>
                <h3 className="text-lg font-bold text-white" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
                  Store Purchase Orders &amp; Supplier Tracking
                </h3>
                <p className="text-xs text-slate-400">Manage orders triggered by machine criticality &amp; lead time risks.</p>
              </div>
              <div className="flex bg-slate-800 p-1 rounded-lg border border-slate-700">
                <button onClick={() => setViewMode('kanban')} className={`p-1.5 rounded-md transition-colors ${viewMode === 'kanban' ? 'bg-blue-600 text-white' : 'text-slate-400'}`}><LayoutGrid size={16} /></button>
                <button onClick={() => setViewMode('list')} className={`p-1.5 rounded-md transition-colors ${viewMode === 'list' ? 'bg-blue-600 text-white' : 'text-slate-400'}`}><List size={16} /></button>
              </div>
            </div>

            {viewMode === 'list' ? (
              <div className="bg-slate-900/90 rounded-2xl border border-slate-800 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-sm">
                    <thead>
                      <tr className="bg-slate-800/90 border-b border-slate-700 text-xs uppercase tracking-wider text-slate-400 font-bold">
                        <th className="px-6 py-3">PO Code</th>
                        <th className="px-6 py-3">Vendor / Machine</th>
                        <th className="px-6 py-3">Quantity</th>
                        <th className="px-6 py-3">Est. Cost</th>
                        <th className="px-6 py-3">Status</th>
                        <th className="px-6 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/80 text-slate-200">
                      {filteredPOs.length === 0 ? (
                        <tr><td colSpan="6" className="px-6 py-12 text-center text-slate-400">No purchase orders found.</td></tr>
                      ) : filteredPOs.map(po => (
                        <tr key={po.id} className="hover:bg-slate-800/40 transition-colors">
                          <td className="px-6 py-4">
                            <div className="font-mono font-bold text-white">{po.po_code}</div>
                            <div className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                              <Clock size={12} /> {new Date(po.created_at).toLocaleDateString()}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="font-semibold text-white">{po.item_name}</div>
                            <div className="text-xs text-blue-400 flex items-center gap-1 mt-0.5">
                              <Factory size={12} /> {po.machine}
                            </div>
                          </td>
                          <td className="px-6 py-4 font-bold text-white">{po.qty}</td>
                          <td className="px-6 py-4 text-emerald-400 font-semibold">₹{(po.estimated_cost || 0).toLocaleString('en-IN')}</td>
                          <td className="px-6 py-4">
                            <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider border ${getStatusColor(po.status)}`}>
                              {po.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right space-x-2">
                            {po.status === 'pending' && (
                              <button onClick={() => updatePOStatus(po.id, 'approved')} className="px-3 py-1 bg-blue-600/30 hover:bg-blue-600/50 text-blue-300 border border-blue-500/40 text-xs font-bold rounded-lg transition-colors">Approve</button>
                            )}
                            {po.status === 'approved' && (
                              <button onClick={() => updatePOStatus(po.id, 'ordered')} className="px-3 py-1 bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 border border-indigo-500/40 text-xs font-bold rounded-lg transition-colors">Mark Ordered</button>
                            )}
                            {po.status === 'ordered' && (
                              <button onClick={() => updatePOStatus(po.id, 'received')} className="px-3 py-1 bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-300 border border-emerald-500/40 text-xs font-bold rounded-lg transition-colors">Receive Stock</button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="flex gap-6 overflow-x-auto pb-4 snap-x">
                {poStatuses.map(status => {
                  const columnPOs = filteredPOs.filter(po => po.status === status);
                  return (
                    <div key={status} className="flex-shrink-0 w-80 bg-slate-900/90 rounded-2xl border border-slate-800 flex flex-col snap-start">
                      <div className="p-3 border-b border-slate-800 flex justify-between items-center bg-slate-800/50 rounded-t-2xl">
                        <h3 className="font-bold text-slate-300 uppercase tracking-wider text-xs">{status}</h3>
                        <span className="bg-slate-800 text-slate-300 text-xs font-bold px-2 py-0.5 rounded-full border border-slate-700">{columnPOs.length}</span>
                      </div>
                      <div className="p-3 flex-1 overflow-y-auto space-y-3 min-h-[250px]">
                        {columnPOs.map(po => (
                          <div key={po.id} className="bg-slate-800/80 p-4 rounded-xl border border-slate-700/80 hover:border-blue-500/50 transition-all">
                            <div className="flex justify-between items-start mb-2">
                              <span className="font-mono text-xs font-bold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/30">{po.po_code}</span>
                              <span className="text-xs text-slate-400 flex items-center gap-1"><Clock size={12}/>{new Date(po.created_at).toLocaleDateString(undefined, {month:'short', day:'numeric'})}</span>
                            </div>
                            <h4 className="font-bold text-white text-sm mb-1">{po.item_name}</h4>
                            <div className="text-xs text-slate-400 flex items-center gap-1 mb-3">
                              <Factory size={12} className="text-blue-400" /> {po.machine}
                            </div>
                            <div className="flex items-center justify-between text-xs border-t border-slate-700/60 pt-2">
                              <span className="text-slate-400">Qty: <strong className="text-white">{po.qty}</strong></span>
                              <span className="text-emerald-400 font-bold">₹{(po.estimated_cost || 0).toLocaleString('en-IN')}</span>
                            </div>
                            <div className="mt-3 pt-2 flex justify-end gap-2">
                              {status === 'pending' && <button onClick={() => updatePOStatus(po.id, 'approved')} className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg w-full">Approve PO</button>}
                              {status === 'approved' && <button onClick={() => updatePOStatus(po.id, 'ordered')} className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg w-full">Mark Ordered</button>}
                              {status === 'ordered' && <button onClick={() => updatePOStatus(po.id, 'received')} className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg w-full">Receive Stock</button>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </AdvancedFeaturesDrilldown>

        {/* STORE MANAGER EDIT MODAL */}
        {editingPart && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl text-slate-200">
              <div className="flex justify-between items-start border-b border-slate-800 pb-3">
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
                    <Shield className="text-blue-400" size={18} /> Store Manager Priority Controls
                  </h3>
                  <p className="text-xs text-slate-400">{editingPart.name} ({editingPart.part_number})</p>
                </div>
                <button onClick={() => setEditingPart(null)} className="text-slate-400 hover:text-white text-sm font-bold">✕</button>
              </div>

              <form onSubmit={savePartEdit} className="space-y-4 text-xs">
                <div>
                  <label className="block text-slate-400 font-bold mb-1">Associated Machine</label>
                  <input
                    type="text"
                    value={editingPart.associated_machine || ''}
                    onChange={(e) => setEditingPart({ ...editingPart, associated_machine: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-blue-500"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-400 font-bold mb-1">Machine Priority</label>
                    <select
                      value={editingPart.machine_priority || 'Medium'}
                      onChange={(e) => setEditingPart({ ...editingPart, machine_priority: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-blue-500"
                    >
                      <option value="Critical">Critical Machine</option>
                      <option value="High">High Priority</option>
                      <option value="Medium">Medium Priority</option>
                      <option value="Low">Low Priority</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-400 font-bold mb-1">Procurement Lead Time (Days)</label>
                    <input
                      type="number"
                      min="1"
                      value={editingPart.lead_time_days || 0}
                      onChange={(e) => setEditingPart({ ...editingPart, lead_time_days: Number(e.target.value) })}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-blue-500"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-400 font-bold mb-1">In Stock</label>
                    <input
                      type="number"
                      value={editingPart.stock_qty || 0}
                      onChange={(e) => setEditingPart({ ...editingPart, stock_qty: Number(e.target.value) })}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 font-bold mb-1">Reserved</label>
                    <input
                      type="number"
                      value={editingPart.reserved_qty || 0}
                      onChange={(e) => setEditingPart({ ...editingPart, reserved_qty: Number(e.target.value) })}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 font-bold mb-1">Reorder Level</label>
                    <input
                      type="number"
                      value={editingPart.reorder_level || 0}
                      onChange={(e) => setEditingPart({ ...editingPart, reorder_level: Number(e.target.value) })}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-400 font-bold mb-1">Store Manager Notes &amp; Lead Time Instructions</label>
                  <textarea
                    rows="2"
                    value={editingPart.store_manager_note || ''}
                    onChange={(e) => setEditingPart({ ...editingPart, store_manager_note: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-blue-500"
                    placeholder="e.g. Imported part, order 2 weeks ahead."
                  />
                </div>

                <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
                  <button type="button" onClick={() => setEditingPart(null)} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-bold">Cancel</button>
                  <button type="submit" className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold">Save Priority Settings</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
};

export default Inventory;
