import React, { useState } from 'react';
import LockoutTagoutModule from './LockoutTagoutModule';
import {
  Activity,
  AlertTriangle,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock,
  Cpu,
  Database,
  Filter,
  Layers,
  Lock,
  Package,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  User,
  Wrench,
  Zap,
  ArrowUpRight,
  ShieldAlert,
  Boxes
} from 'lucide-react';

const ASSET_HIERARCHY = [
  {
    id: 'plant-01',
    name: 'Plant Floor Alpha (Automotive Line)',
    type: 'Facility Zone',
    status: 'Operational',
    children: [
      {
        id: 'line-a',
        name: 'Stamping & Press Line A',
        type: 'Production Line',
        status: 'Operational',
        children: [
          { id: 'press-04', name: 'Hydraulic Press 400T (PRESS-04)', type: 'Machine Asset', status: 'Warning', temp: '74.2°C', vib: '4.8 mm/s', pmDue: '2 Days' },
          { id: 'cnc-01', name: '5-Axis CNC Milling Center (CNC-01)', type: 'Machine Asset', status: 'Optimal', temp: '52.1°C', vib: '1.2 mm/s', pmDue: '14 Days' },
        ]
      },
      {
        id: 'line-b',
        name: 'Robotic Welding Line B',
        type: 'Assembly Line',
        status: 'Operational',
        children: [
          { id: 'rob-02', name: 'ABB Robotic Welder Unit (ROB-02)', type: 'Robotic Cell', status: 'Optimal', temp: '48.6°C', vib: '0.9 mm/s', pmDue: '7 Days' },
          { id: 'conv-03', name: 'Heavy Load Conveyor System (CONV-03)', type: 'Conveyor', status: 'Critical', temp: '88.9°C', vib: '8.4 mm/s', pmDue: 'OVERDUE' },
        ]
      }
    ]
  }
];

const PREVENTIVE_SCHEDULE = [
  { id: 'pm-101', asset: 'PRESS-04', task: 'Hydraulic Seal Inspection & Fluid Flush', frequency: 'Bi-Weekly', nextDue: '2026-08-02', assignedTo: 'Rajesh Kumar', status: 'Upcoming', priority: 'High' },
  { id: 'pm-102', asset: 'CNC-01', task: 'Spindle Calibration & Coolant Replacement', frequency: 'Monthly', nextDue: '2026-08-14', assignedTo: 'Amit Verma', status: 'Scheduled', priority: 'Medium' },
  { id: 'pm-103', asset: 'CONV-03', task: 'Gearbox Lubrication & Belt Tensioning', frequency: 'Weekly', nextDue: '2026-07-30', assignedTo: 'Vikram Singh', status: 'Overdue', priority: 'Critical' },
  { id: 'pm-104', asset: 'ROB-02', task: 'Servo Drive Thermal Scan & Software Backup', frequency: 'Quarterly', nextDue: '2026-08-28', assignedTo: 'Priya Sharma', status: 'Scheduled', priority: 'Normal' },
];

const INITIAL_KANBAN = {
  emergency: [
    { id: 'WO-8041', title: 'CONV-03 Motor Overheating & Belt Slip', machine: 'CONV-03', priority: 'Critical', slaLeft: '00:18:42', tech: 'Vikram Singh' },
    { id: 'WO-8043', title: 'PRESS-04 Valve Leakage Alert', machine: 'PRESS-04', priority: 'High', slaLeft: '01:45:10', tech: 'Rajesh Kumar' },
  ],
  in_progress: [
    { id: 'WO-8038', title: 'CNC-01 Tool Changer Sensor Recalibration', machine: 'CNC-01', priority: 'Medium', slaLeft: '03:12:00', tech: 'Amit Verma' },
  ],
  verification: [
    { id: 'WO-8035', title: 'ROB-02 Arm Joint Greasing & Alignment', machine: 'ROB-02', priority: 'Normal', slaLeft: 'Verification Ready', tech: 'Priya Sharma' },
  ],
  completed: [
    { id: 'WO-8029', title: 'Air Compressor Filter Replacement', machine: 'COMP-01', priority: 'Low', completedAt: 'Today 14:30', tech: 'Suresh Patel' },
  ]
};

const LOW_STOCK_SPARES = [
  { id: 'SP-402', part: 'Hydraulic Seal Kit (PRESS-400T)', sku: 'SKU-HYD-994', stock: 2, minRequired: 5, unitCost: '₹4,850', vendor: 'Bosch Rexroth' },
  { id: 'SP-109', part: 'Optic Proximity Sensor 24V', sku: 'SKU-SEN-204', stock: 1, minRequired: 4, unitCost: '₹2,100', vendor: 'Omron Automation' },
  { id: 'SP-883', part: 'Heavy Duty Conveyor V-Belt B-105', sku: 'SKU-BLT-551', stock: 0, minRequired: 8, unitCost: '₹1,250', vendor: 'Fenner Drives' },
];

export default function DreamzCMMSFeatureSuite() {
  const [activeTab, setActiveTab] = useState('kanban'); // 'kanban', 'hierarchy', 'pm', 'spares'
  const [kanbanState, setKanbanState] = useState(INITIAL_KANBAN);
  const [selectedAsset, setSelectedAsset] = useState(ASSET_HIERARCHY[0].children[0].children[0]);
  const [showLotoModal, setShowLotoModal] = useState(false);
  const [reservedKits, setReservedKits] = useState({});

  return (
    <div className="dreamz-cmms-suite my-8 rounded-3xl border border-slate-800 bg-slate-950 p-6 md:p-8 shadow-2xl text-slate-100 overflow-hidden">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/10 border border-sky-500/30 text-sky-400 text-xs font-bold uppercase tracking-widest mb-2">
            <Cpu className="w-3.5 h-3.5 animate-pulse" />
            Advanced CMMS Operations Suite
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Enterprise Asset & Maintenance Command Center
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Inspired by industrial CMMS standards: Multi-Tier Asset Tree, Work Order Kanban, Condition Telemetry & Reorder Thresholds.
          </p>
        </div>

        {/* Feature Tab Navigation */}
        <div className="flex flex-wrap items-center gap-2 bg-slate-900/90 p-1.5 rounded-2xl border border-slate-800">
          <button
            type="button"
            onClick={() => setActiveTab('kanban')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'kanban'
                ? 'bg-sky-500 text-slate-950 font-extrabold shadow-lg shadow-sky-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Wrench className="w-3.5 h-3.5" />
            Work Order Kanban
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('hierarchy')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'hierarchy'
                ? 'bg-sky-500 text-slate-950 font-extrabold shadow-lg shadow-sky-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Asset Tree & IoT
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('pm')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'pm'
                ? 'bg-sky-500 text-slate-950 font-extrabold shadow-lg shadow-sky-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            Nested PM Matrix
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('spares')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'spares'
                ? 'bg-sky-500 text-slate-950 font-extrabold shadow-lg shadow-sky-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Package className="w-3.5 h-3.5" />
            Low Stock Alerts
          </button>
        </div>
      </div>

      {/* TAB 1: WORK ORDER KANBAN */}
      {activeTab === 'kanban' && (
        <div className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Emergency Column */}
            <div className="stitch-glass-tile p-4 rounded-2xl border border-red-500/30 bg-slate-900/50">
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-red-500/20">
                <span className="text-xs font-extrabold uppercase text-red-400 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                  Emergency Queue ({kanbanState.emergency.length})
                </span>
                <span className="text-[10px] font-mono text-red-400 bg-red-500/10 px-2 py-0.5 rounded border border-red-500/30">
                  P0 / P1
                </span>
              </div>
              <div className="space-y-3">
                {kanbanState.emergency.map((wo) => (
                  <div key={wo.id} className="p-3.5 rounded-xl border border-red-500/30 bg-slate-950/80 hover:border-red-400 transition-all">
                    <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                      <span className="font-mono font-bold text-red-400">{wo.id}</span>
                      <span className="font-mono text-amber-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {wo.slaLeft}
                      </span>
                    </div>
                    <h4 className="text-xs font-bold text-white mb-2">{wo.title}</h4>
                    <button
                      type="button"
                      onClick={() => setShowLotoModal(true)}
                      className="w-full mb-2.5 py-1 rounded-lg bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[10px] font-bold hover:bg-rose-500/30 transition-all flex items-center justify-center gap-1"
                    >
                      <Lock className="w-3 h-3 text-rose-400" /> Verify LOTO Safety Permit (PTW)
                    </button>
                    <div className="flex items-center justify-between text-[11px] pt-2 border-t border-slate-800">
                      <span className="text-slate-400">Tech: <strong className="text-slate-200">{wo.tech}</strong></span>
                      <span className="text-[10px] font-bold text-slate-950 bg-red-400 px-2 py-0.5 rounded">{wo.machine}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* In Progress Column */}
            <div className="stitch-glass-tile p-4 rounded-2xl border border-sky-500/30 bg-slate-900/50">
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-sky-500/20">
                <span className="text-xs font-extrabold uppercase text-sky-400 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse" />
                  In Repair ({kanbanState.in_progress.length})
                </span>
                <span className="text-[10px] font-mono text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded border border-sky-500/30">
                  Active SLA
                </span>
              </div>
              <div className="space-y-3">
                {kanbanState.in_progress.map((wo) => (
                  <div key={wo.id} className="p-3.5 rounded-xl border border-sky-500/30 bg-slate-950/80 hover:border-sky-400 transition-all">
                    <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                      <span className="font-mono font-bold text-sky-400">{wo.id}</span>
                      <span className="font-mono text-sky-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {wo.slaLeft}
                      </span>
                    </div>
                    <h4 className="text-xs font-bold text-white mb-2">{wo.title}</h4>
                    <div className="flex items-center justify-between text-[11px] pt-2 border-t border-slate-800">
                      <span className="text-slate-400">Tech: <strong className="text-slate-200">{wo.tech}</strong></span>
                      <span className="text-[10px] font-bold text-slate-950 bg-sky-400 px-2 py-0.5 rounded">{wo.machine}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Pending Verification Column */}
            <div className="stitch-glass-tile p-4 rounded-2xl border border-amber-500/30 bg-slate-900/50">
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-amber-500/20">
                <span className="text-xs font-extrabold uppercase text-amber-400 flex items-center gap-2">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Supervisor Sign-Off ({kanbanState.verification.length})
                </span>
              </div>
              <div className="space-y-3">
                {kanbanState.verification.map((wo) => (
                  <div key={wo.id} className="p-3.5 rounded-xl border border-amber-500/30 bg-slate-950/80 hover:border-amber-400 transition-all">
                    <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                      <span className="font-mono font-bold text-amber-400">{wo.id}</span>
                      <span className="text-emerald-400 text-[10px] font-bold">Proof Uploaded</span>
                    </div>
                    <h4 className="text-xs font-bold text-white mb-2">{wo.title}</h4>
                    <button
                      type="button"
                      className="w-full mt-2 py-1.5 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[11px] font-bold hover:bg-amber-500/30 transition-all"
                    >
                      Verify & Close Ticket
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Completed Column */}
            <div className="stitch-glass-tile p-4 rounded-2xl border border-emerald-500/30 bg-slate-900/50">
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-emerald-500/20">
                <span className="text-xs font-extrabold uppercase text-emerald-400 flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Closed ({kanbanState.completed.length})
                </span>
              </div>
              <div className="space-y-3">
                {kanbanState.completed.map((wo) => (
                  <div key={wo.id} className="p-3.5 rounded-xl border border-emerald-500/30 bg-slate-950/80 opacity-85 hover:opacity-100 transition-all">
                    <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                      <span className="font-mono font-bold text-emerald-400">{wo.id}</span>
                      <span className="text-[10px] text-slate-400">{wo.completedAt}</span>
                    </div>
                    <h4 className="text-xs font-bold text-slate-300 mb-2">{wo.title}</h4>
                    <span className="inline-block text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
                      Verified Closed
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: ASSET HIERARCHY & IOT TELEMETRY */}
      {activeTab === 'hierarchy' && (
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Tree View */}
          <div className="lg:col-span-5 stitch-glass-tile p-5 rounded-2xl border border-slate-800 bg-slate-900/60">
            <h3 className="text-sm font-extrabold uppercase tracking-wider text-sky-400 mb-4 flex items-center gap-2">
              <Layers className="w-4 h-4" /> Plant Asset Hierarchy Tree
            </h3>

            <div className="space-y-3">
              {ASSET_HIERARCHY.map((plant) => (
                <div key={plant.id} className="p-3 rounded-xl border border-slate-800 bg-slate-950/70">
                  <div className="flex items-center justify-between font-bold text-xs text-slate-200 mb-2">
                    <span>🏢 {plant.name}</span>
                    <span className="text-[10px] text-emerald-400 font-mono">{plant.status}</span>
                  </div>
                  {plant.children.map((line) => (
                    <div key={line.id} className="ml-4 pl-3 border-l border-slate-800 my-2 space-y-2">
                      <div className="text-[11px] font-semibold text-sky-400">⚡ {line.name}</div>
                      {line.children.map((asset) => {
                        const isSelected = selectedAsset.id === asset.id;
                        return (
                          <button
                            key={asset.id}
                            type="button"
                            onClick={() => setSelectedAsset(asset)}
                            className={`w-full text-left p-2.5 rounded-lg text-xs transition-all flex items-center justify-between ${
                              isSelected
                                ? 'bg-sky-500/20 border border-sky-500/50 text-white font-bold'
                                : 'bg-slate-900 hover:bg-slate-800 text-slate-300'
                            }`}
                          >
                            <span>⚙️ {asset.name}</span>
                            <span className={`text-[10px] px-2 py-0.5 rounded font-mono ${
                              asset.status === 'Optimal' ? 'bg-emerald-500/10 text-emerald-400' :
                              asset.status === 'Warning' ? 'bg-amber-500/10 text-amber-400' : 'bg-red-500/10 text-red-400'
                            }`}>
                              {asset.status}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>

          {/* IoT Telemetry Inspector */}
          <div className="lg:col-span-7 stitch-glass-tile p-6 rounded-2xl border border-slate-800 bg-slate-900/60 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400">Selected Machine Telemetry</span>
                  <h3 className="text-xl font-bold text-white">{selectedAsset.name}</h3>
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-sky-500/10 text-sky-400 border border-sky-500/30">
                  IoT Sensor Live Stream
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 my-6">
                <div className="p-4 rounded-xl border border-slate-800 bg-slate-950 text-center">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Thermal Temp</span>
                  <div className="text-2xl font-mono font-black text-amber-400 mt-1">{selectedAsset.temp}</div>
                  <span className="text-[10px] text-slate-500">Threshold: 80.0°C</span>
                </div>

                <div className="p-4 rounded-xl border border-slate-800 bg-slate-950 text-center">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Vibration (FFT)</span>
                  <div className="text-2xl font-mono font-black text-sky-400 mt-1">{selectedAsset.vib}</div>
                  <span className="text-[10px] text-slate-500">Threshold: 5.0 mm/s</span>
                </div>

                <div className="p-4 rounded-xl border border-slate-800 bg-slate-950 text-center col-span-2 sm:col-span-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Preventive Due</span>
                  <div className="text-2xl font-mono font-black text-emerald-400 mt-1">{selectedAsset.pmDue}</div>
                  <span className="text-[10px] text-slate-500">Auto-Work Order</span>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-xl border border-sky-500/30 bg-sky-500/10 text-xs text-sky-300 flex items-center justify-between">
              <span>Predictive AI Insight: No anomalous bearing wear detected in last 24h cycle.</span>
              <button type="button" className="px-3 py-1 rounded bg-sky-500 text-slate-950 font-extrabold text-[11px]">
                Run Diagnostics
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: NESTED PM MATRIX */}
      {activeTab === 'pm' && (
        <div className="mt-6 stitch-glass-tile p-5 rounded-2xl border border-slate-800 bg-slate-900/60">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-extrabold uppercase tracking-wider text-sky-400 flex items-center gap-2">
              <Calendar className="w-4 h-4" /> Recurring Preventive Maintenance Schedule
            </h3>
            <button type="button" className="px-3 py-1.5 rounded-xl bg-emerald-500 text-slate-950 text-xs font-bold flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5" /> Schedule New PM Task
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px] font-bold">
                  <th className="pb-3">PM Task ID</th>
                  <th className="pb-3">Target Asset</th>
                  <th className="pb-3">Work Routine</th>
                  <th className="pb-3">Frequency</th>
                  <th className="pb-3">Next Due Date</th>
                  <th className="pb-3">Assigned Lead</th>
                  <th className="pb-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-sans">
                {PREVENTIVE_SCHEDULE.map((pm) => (
                  <tr key={pm.id} className="hover:bg-slate-900/80 transition-colors">
                    <td className="py-3.5 font-mono font-bold text-sky-400">{pm.id}</td>
                    <td className="py-3.5 font-bold text-white">{pm.asset}</td>
                    <td className="py-3.5 text-slate-300">{pm.task}</td>
                    <td className="py-3.5 font-mono text-slate-400">{pm.frequency}</td>
                    <td className="py-3.5 font-mono font-bold text-amber-400">{pm.nextDue}</td>
                    <td className="py-3.5 text-slate-300">{pm.assignedTo}</td>
                    <td className="py-3.5">
                      <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold ${
                        pm.status === 'Overdue' ? 'bg-red-500/20 text-red-400 border border-red-500/40' :
                        pm.status === 'Upcoming' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40' :
                        'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                      }`}>
                        {pm.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: LOW STOCK SPARE PARTS */}
      {activeTab === 'spares' && (
        <div className="mt-6 stitch-glass-tile p-5 rounded-2xl border border-slate-800 bg-slate-900/60">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-extrabold uppercase tracking-wider text-amber-400 flex items-center gap-2">
              <Package className="w-4 h-4 text-amber-400" /> Reorder Threshold & Low Stock Spare Parts
            </h3>
            <span className="text-xs text-red-400 font-bold bg-red-500/10 px-3 py-1 rounded-full border border-red-500/30">
              3 Critical Items Below Minimum Reorder Point
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {LOW_STOCK_SPARES.map((sp) => (
              <div key={sp.id} className="p-4 rounded-xl border border-amber-500/30 bg-slate-950/90 hover:border-amber-400 transition-all">
                <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                  <span className="font-mono text-amber-400 font-bold">{sp.sku}</span>
                  <span className="text-slate-400 font-mono">Unit: {sp.unitCost}</span>
                </div>
                <h4 className="text-sm font-bold text-white mb-3">{sp.part}</h4>

                <div className="flex items-center justify-between mb-3 text-xs">
                  <span className="text-slate-400">Current Stock:</span>
                  <span className={`font-mono font-extrabold px-2.5 py-0.5 rounded ${
                    sp.stock === 0 ? 'bg-red-500 text-slate-950' : 'bg-amber-500/20 text-amber-300'
                  }`}>
                    {sp.stock} units (Min: {sp.minRequired})
                  </span>
                </div>

                <button
                  type="button"
                  className="w-full py-2 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                >
                  <ArrowUpRight className="w-3.5 h-3.5" /> Auto-Generate Purchase Order
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* LOTO Safety Permit Modal Overlay */}
      {showLotoModal && (
        <div className="fixed inset-0 z-[9999] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-2xl relative">
            <button
              type="button"
              onClick={() => setShowLotoModal(false)}
              className="absolute top-4 right-4 z-10 p-2 rounded-full bg-slate-900 text-slate-400 hover:text-white border border-slate-700"
            >
              ✕
            </button>
            <LockoutTagoutModule
              machineName="PRESS-04"
              ticketId="WO-8041"
              onComplete={() => {
                setTimeout(() => setShowLotoModal(false), 1500);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
