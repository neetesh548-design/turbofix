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

const TAB_CONFIG = [
  { id: 'kanban', label: 'Work Orders', icon: Wrench, detail: 'Critical repairs and closure queue' },
  { id: 'hierarchy', label: 'Asset Health', icon: Layers, detail: 'Tree view, telemetry, and diagnostics' },
  { id: 'pm', label: 'PM Schedule', icon: Calendar, detail: 'Recurring tasks, due dates, and owners' },
  { id: 'spares', label: 'Spares', icon: Package, detail: 'Reorder risks and supplier coverage' },
];

const KANBAN_LANES = [
  {
    id: 'emergency',
    title: 'Emergency Queue',
    accent: 'orange',
    helper: 'Respond first. Safety and line-stop risks.',
    badge: 'P0 / P1',
    ctaLabel: 'Verify LOTO',
  },
  {
    id: 'in_progress',
    title: 'In Repair',
    accent: 'cyan',
    helper: 'Active work orders with SLA running.',
    badge: 'Active SLA',
    ctaLabel: 'Open Job',
  },
  {
    id: 'verification',
    title: 'Supervisor Sign-Off',
    accent: 'amber',
    helper: 'Proof uploaded and waiting for closeout.',
    badge: 'Ready',
    ctaLabel: 'Verify & Close',
  },
  {
    id: 'completed',
    title: 'Closed',
    accent: 'emerald',
    helper: 'Recently completed and verified.',
    badge: 'Verified',
    ctaLabel: 'View Summary',
  },
];

export default function DreamzCMMSFeatureSuite() {
  const [activeTab, setActiveTab] = useState('kanban'); // 'kanban', 'hierarchy', 'pm', 'spares'
  const [kanbanState, setKanbanState] = useState(INITIAL_KANBAN);
  const [selectedAsset, setSelectedAsset] = useState(ASSET_HIERARCHY[0].children[0].children[0]);
  const [showLotoModal, setShowLotoModal] = useState(false);
  const [reservedKits, setReservedKits] = useState({});
  const criticalCount = kanbanState.emergency.length;
  const activeRepairCount = kanbanState.in_progress.length;
  const verificationCount = kanbanState.verification.length;
  const completedCount = kanbanState.completed.length;
  const pmDueCount = PREVENTIVE_SCHEDULE.filter((task) => task.status === 'Overdue' || task.status === 'Upcoming').length;
  const machineAlertCount = ASSET_HIERARCHY.flatMap((plant) =>
    plant.children.flatMap((line) => line.children.filter((asset) => asset.status !== 'Optimal'))
  ).length;
  const todayPriority = criticalCount > 0 ? 'Contain emergency backlog' : 'Keep PM and verification flowing';

  const summaryCards = [
    { label: 'Critical Tickets', value: criticalCount, tone: 'text-red-800 dark:text-orange-300 border-red-200 dark:border-orange-500/30 bg-red-50 dark:bg-orange-500/10', note: 'Needs immediate triage' },
    { label: 'PM Due Soon', value: pmDueCount, tone: 'text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10', note: 'Upcoming or overdue tasks' },
    { label: 'Machine Alerts', value: machineAlertCount, tone: 'text-cyan-800 dark:text-cyan-300 border-cyan-200 dark:border-cyan-500/30 bg-cyan-50 dark:bg-cyan-500/10', note: 'Assets outside optimal state' },
    { label: 'Stock Risks', value: stockRiskCount, tone: 'text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10', note: 'Parts below reorder point' },
  ];

  const laneStyles = {
    orange: {
      lane: 'border-orange-200 dark:border-orange-500/25 bg-orange-50/70 dark:bg-orange-500/[0.04]',
      title: 'text-orange-900 dark:text-orange-300',
      dot: 'bg-orange-500 dark:bg-orange-400',
      badge: 'border-orange-300 dark:border-orange-500/30 bg-orange-100 dark:bg-orange-500/10 text-orange-900 dark:text-orange-300',
      card: 'border-orange-200 dark:border-orange-500/25 bg-white dark:bg-slate-950/85 hover:border-orange-400',
      cta: 'border-orange-400/60 bg-orange-600 text-white dark:bg-orange-500/15 dark:text-orange-200 dark:hover:bg-orange-500/25',
      machine: 'bg-orange-100 dark:bg-orange-400 text-orange-950 dark:text-slate-950',
    },
    cyan: {
      lane: 'border-cyan-200 dark:border-cyan-500/25 bg-cyan-50/70 dark:bg-cyan-500/[0.04]',
      title: 'text-cyan-900 dark:text-cyan-300',
      dot: 'bg-cyan-500 dark:bg-cyan-400',
      badge: 'border-cyan-300 dark:border-cyan-500/30 bg-cyan-100 dark:bg-cyan-500/10 text-cyan-900 dark:text-cyan-300',
      card: 'border-cyan-200 dark:border-cyan-500/25 bg-white dark:bg-slate-950/85 hover:border-cyan-400',
      cta: 'border-cyan-400/60 bg-cyan-600 text-white dark:bg-cyan-500/15 dark:text-cyan-100 dark:hover:bg-cyan-500/25',
      machine: 'bg-cyan-100 dark:bg-cyan-400 text-cyan-950 dark:text-slate-950',
    },
    amber: {
      lane: 'border-amber-200 dark:border-amber-500/25 bg-amber-50/70 dark:bg-amber-500/[0.04]',
      title: 'text-amber-900 dark:text-amber-300',
      dot: 'bg-amber-500 dark:bg-amber-400',
      badge: 'border-amber-300 dark:border-amber-500/30 bg-amber-100 dark:bg-amber-500/10 text-amber-900 dark:text-amber-300',
      card: 'border-amber-200 dark:border-amber-500/25 bg-white dark:bg-slate-950/85 hover:border-amber-400',
      cta: 'border-amber-400/60 bg-amber-600 text-white dark:bg-amber-500/15 dark:text-amber-100 dark:hover:bg-amber-500/25',
      machine: 'bg-amber-100 dark:bg-amber-300 text-amber-950 dark:text-slate-950',
    },
    emerald: {
      lane: 'border-emerald-200 dark:border-emerald-500/25 bg-emerald-50/70 dark:bg-emerald-500/[0.04]',
      title: 'text-emerald-900 dark:text-emerald-300',
      dot: 'bg-emerald-500 dark:bg-emerald-400',
      badge: 'border-emerald-300 dark:border-emerald-500/30 bg-emerald-100 dark:bg-emerald-500/10 text-emerald-900 dark:text-emerald-300',
      card: 'border-emerald-200 dark:border-emerald-500/25 bg-white dark:bg-slate-950/85 hover:border-emerald-400',
      cta: 'border-emerald-400/60 bg-emerald-600 text-white dark:bg-emerald-500/15 dark:text-emerald-100 dark:hover:bg-emerald-500/25',
      machine: 'bg-emerald-100 dark:bg-emerald-300 text-emerald-950 dark:text-slate-950',
    },
  };

  return (
    <div className="dreamz-cmms-suite my-8 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#080d1a] p-6 md:p-8 shadow-md dark:shadow-2xl text-slate-900 dark:text-slate-100 transition-colors overflow-hidden">
      {/* Header Banner */}
      <div className="grid gap-6 border-b border-slate-200 dark:border-slate-800 pb-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-700 dark:text-cyan-400 text-xs font-bold uppercase tracking-widest mb-2">
            <Cpu className="w-3.5 h-3.5 animate-pulse text-cyan-600 dark:text-cyan-400" />
            Advanced CMMS Operations Suite
          </div>
          <h2 className="max-w-3xl text-3xl font-black text-slate-900 dark:text-white tracking-tight sm:text-4xl">
            Enterprise Asset &amp; Maintenance Command Center
          </h2>
          <p className="max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-300 sm:text-base font-medium">
            A maintenance control room for triage, repair execution, preventive planning, and spare-risk monitoring across the plant.
          </p>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {summaryCards.map((card) => (
              <div key={card.label} className={`rounded-2xl border p-3.5 ${card.tone}`}>
                <div className="text-[10px] font-extrabold uppercase tracking-widest text-slate-700 dark:text-slate-200">{card.label}</div>
                <div className="mt-1 text-2xl font-black text-slate-900 dark:text-white">{card.value}</div>
                <div className="mt-0.5 text-[11px] text-slate-600 dark:text-slate-300 font-medium">{card.note}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/90 p-4 shadow-sm dark:shadow-lg transition-colors">
          <div className="flex items-start justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
            <div>
              <div className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-cyan-700 dark:text-cyan-400">Operator Focus</div>
              <div className="mt-1 text-lg font-bold text-slate-900 dark:text-white leading-snug">{todayPriority}</div>
              <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-300">Keep the highest-risk work visible, reduce click depth, and make the next action obvious.</p>
            </div>
            <div className="rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-right flex-shrink-0 shadow-sm">
              <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 font-bold">Board Flow</div>
              <div className="mt-1 text-sm font-extrabold text-slate-900 dark:text-white">{criticalCount + activeRepairCount + verificationCount} open</div>
              <div className="text-xs text-slate-600 dark:text-slate-400">{completedCount} closed today</div>
            </div>
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {TAB_CONFIG.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`rounded-2xl border p-3 text-left transition-all ${
                    isActive
                      ? 'border-cyan-600 bg-cyan-600 text-white dark:border-cyan-500/60 dark:bg-cyan-500 dark:text-slate-950 shadow-md font-bold'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/70 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-900'
                  }`}
                >
                  <div className="flex items-center gap-2 text-sm font-bold">
                    <Icon className="h-4 w-4" />
                    {tab.label}
                  </div>
                  <div className={`mt-1 text-xs ${isActive ? 'text-white/90 dark:text-slate-950 font-semibold' : 'text-slate-500 dark:text-slate-400'}`}>{tab.detail}</div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* TAB 1: WORK ORDER KANBAN */}
      {activeTab === 'kanban' && (
        <div className="mt-6">
          <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 p-4 lg:flex-row lg:items-center lg:justify-between shadow-sm">
            <div>
              <div className="text-sm font-bold text-slate-900 dark:text-white">Work order board</div>
              <div className="text-xs text-slate-600 dark:text-slate-300">Each lane highlights why the ticket is here and what the operator should do next.</div>
            </div>
            <div className="flex flex-wrap gap-2 text-xs text-slate-700 dark:text-slate-200 font-semibold">
              <span className="rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-1 shadow-sm">Open repairs: {criticalCount + activeRepairCount + verificationCount}</span>
              <span className="rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-1 shadow-sm">Awaiting closeout: {verificationCount}</span>
              <span className="rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-1 shadow-sm">Completed today: {completedCount}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-4">
            {KANBAN_LANES.map((lane) => {
              const items = kanbanState[lane.id];
              const styles = laneStyles[lane.accent];

              return (
                <div key={lane.id} className={`stitch-glass-tile rounded-3xl border p-4 transition-colors ${styles.lane}`}>
                  <div className="flex items-start justify-between gap-2 border-b border-slate-200 dark:border-slate-800/80 pb-3 min-h-[54px]">
                    <div className="min-w-0 flex-1">
                      <div className={`flex items-center gap-1.5 text-xs font-extrabold uppercase ${styles.title}`}>
                        <span className={`h-2.5 w-2.5 rounded-full flex-shrink-0 ${styles.dot}`} />
                        <span className="truncate">{lane.title}</span>
                      </div>
                      <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 leading-tight">{lane.helper}</div>
                    </div>
                    <div className="flex flex-col items-end flex-shrink-0">
                      <span className={`rounded-full border px-2 py-0.5 text-[9px] font-mono whitespace-nowrap ${styles.badge}`}>{lane.badge}</span>
                      <span className="mt-1 text-base font-black text-slate-900 dark:text-white">{items.length}</span>
                    </div>
                  </div>

                  <div className="mt-4 space-y-3">
                    {items.map((wo) => (
                      <div key={wo.id} className={`rounded-2xl border p-3.5 transition-all shadow-sm dark:shadow-md ${styles.card}`}>
                        <div className="flex items-start justify-between gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                          <div>
                            <div className={`font-mono font-extrabold text-xs ${styles.title}`}>{wo.id}</div>
                            <div className="mt-0.5 text-[10px] font-extrabold uppercase tracking-widest text-slate-500 dark:text-slate-400">{wo.priority} priority</div>
                          </div>
                          <div className="text-right flex-shrink-0">
                            {wo.slaLeft ? (
                              <span className="inline-flex items-center gap-1 font-mono text-amber-700 dark:text-amber-300 font-bold text-xs">
                                <Clock className="h-3 w-3" />
                                {wo.slaLeft}
                              </span>
                            ) : (
                              <span className="text-[10px] text-slate-600 dark:text-slate-300 font-semibold">{wo.completedAt}</span>
                            )}
                          </div>
                        </div>

                        <h4 className="mt-2.5 text-xs sm:text-sm font-bold leading-snug text-slate-900 dark:text-slate-100">{wo.title}</h4>

                        <div className="mt-3 flex items-center justify-between border-t border-slate-200 dark:border-slate-800/80 pt-2.5 text-[11px] flex-wrap gap-1.5">
                          <span className="text-slate-600 dark:text-slate-400 truncate">
                            Owner: <strong className="text-slate-900 dark:text-slate-200 font-bold">{wo.tech}</strong>
                          </span>
                          <span className={`rounded-md px-2 py-0.5 text-[10px] font-extrabold whitespace-nowrap flex-shrink-0 ${styles.machine}`}>{wo.machine}</span>
                        </div>

                        {lane.id === 'emergency' && (
                          <button
                            type="button"
                            onClick={() => setShowLotoModal(true)}
                            className={`mt-3 flex w-full items-center justify-center gap-2 rounded-xl border px-3 py-2 text-xs font-bold transition-all cursor-pointer ${styles.cta}`}
                          >
                            <Lock className="h-3.5 w-3.5" />
                            {lane.ctaLabel}
                          </button>
                        )}

                        {lane.id === 'in_progress' && (
                          <button
                            type="button"
                            className={`mt-3 flex w-full items-center justify-center gap-2 rounded-xl border px-3 py-2 text-xs font-bold transition-all cursor-pointer ${styles.cta}`}
                          >
                            <Wrench className="h-3.5 w-3.5" />
                            {lane.ctaLabel}
                          </button>
                        )}

                        {lane.id === 'verification' && (
                          <button
                            type="button"
                            className={`mt-3 flex w-full items-center justify-center gap-2 rounded-xl border px-3 py-2 text-xs font-bold transition-all cursor-pointer ${styles.cta}`}
                          >
                            <ShieldCheck className="h-3.5 w-3.5" />
                            {lane.ctaLabel}
                          </button>
                        )}

                        {lane.id === 'completed' && (
                          <div className="mt-3 inline-flex rounded-full border border-emerald-300 dark:border-emerald-500/30 bg-emerald-100 dark:bg-emerald-500/10 px-2.5 py-1 text-[10px] font-bold text-emerald-800 dark:text-emerald-300">
                            Verified closed
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: ASSET HIERARCHY & IOT TELEMETRY */}
      {activeTab === 'hierarchy' && (
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Tree View */}
          <div className="lg:col-span-5 stitch-glass-tile p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60">
            <h3 className="text-sm font-extrabold uppercase tracking-wider text-cyan-700 dark:text-cyan-400 mb-4 flex items-center gap-2">
              <Layers className="w-4 h-4" /> Plant Asset Hierarchy Tree
            </h3>

            <div className="space-y-3">
              {ASSET_HIERARCHY.map((plant) => (
                <div key={plant.id} className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/70 shadow-sm">
                  <div className="flex items-center justify-between font-bold text-xs text-slate-800 dark:text-slate-200 mb-2">
                    <span>🏢 {plant.name}</span>
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono">{plant.status}</span>
                  </div>
                  {plant.children.map((line) => (
                    <div key={line.id} className="ml-4 pl-3 border-l border-slate-200 dark:border-slate-800 my-2 space-y-2">
                      <div className="text-[11px] font-semibold text-cyan-700 dark:text-cyan-400">⚡ {line.name}</div>
                      {line.children.map((asset) => {
                        const isSelected = selectedAsset.id === asset.id;
                        return (
                          <button
                            key={asset.id}
                            type="button"
                            onClick={() => setSelectedAsset(asset)}
                            className={`w-full text-left p-2.5 rounded-lg text-xs transition-all flex items-center justify-between cursor-pointer ${
                              isSelected
                                ? 'bg-cyan-600 text-white dark:bg-cyan-500/20 dark:border dark:border-cyan-500/50 dark:text-white font-bold'
                                : 'bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-300'
                            }`}
                          >
                            <span>⚙️ {asset.name}</span>
                            <span className={`text-[10px] px-2 py-0.5 rounded font-mono ${
                              asset.status === 'Optimal' ? 'bg-emerald-100 dark:bg-emerald-500/10 text-emerald-800 dark:text-emerald-400' :
                              asset.status === 'Warning' ? 'bg-amber-100 dark:bg-amber-500/10 text-amber-800 dark:text-amber-400' : 'bg-orange-100 dark:bg-orange-500/10 text-orange-800 dark:text-orange-400'
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
          <div className="lg:col-span-7 stitch-glass-tile p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-200 dark:border-slate-800">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-widest text-slate-500 dark:text-slate-400">Selected Machine Telemetry</span>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">{selectedAsset.name}</h3>
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-cyan-100 dark:bg-cyan-500/10 text-cyan-800 dark:text-cyan-400 border border-cyan-200 dark:border-cyan-500/30">
                  IoT Sensor Live Stream
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 my-6">
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-center shadow-sm">
                  <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">Thermal Temp</span>
                  <div className="text-2xl font-mono font-black text-amber-600 dark:text-amber-400 mt-1">{selectedAsset.temp}</div>
                  <span className="text-[10px] text-slate-500">Threshold: 80.0°C</span>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-center shadow-sm">
                  <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">Vibration (FFT)</span>
                  <div className="text-2xl font-mono font-black text-cyan-700 dark:text-cyan-400 mt-1">{selectedAsset.vib}</div>
                  <span className="text-[10px] text-slate-500">Threshold: 5.0 mm/s</span>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-center col-span-2 sm:col-span-1 shadow-sm">
                  <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">Preventive Due</span>
                  <div className="text-2xl font-mono font-black text-emerald-600 dark:text-emerald-400 mt-1">{selectedAsset.pmDue}</div>
                  <span className="text-[10px] text-slate-500">Auto-Work Order</span>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-xl border border-cyan-200 dark:border-cyan-500/30 bg-cyan-50 dark:bg-cyan-500/10 text-xs text-cyan-900 dark:text-cyan-300 flex items-center justify-between flex-wrap gap-2">
              <span className="font-medium">Predictive AI Insight: No anomalous bearing wear detected in last 24h cycle.</span>
              <button type="button" className="px-3 py-1 rounded bg-cyan-600 hover:bg-cyan-700 dark:bg-cyan-500 dark:hover:bg-cyan-400 text-white dark:text-slate-950 font-extrabold text-[11px] cursor-pointer">
                Run Diagnostics
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: NESTED PM MATRIX */}
      {activeTab === 'pm' && (
        <div className="mt-6 stitch-glass-tile p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <h3 className="text-sm font-extrabold uppercase tracking-wider text-cyan-800 dark:text-cyan-400 flex items-center gap-2">
              <Calendar className="w-4 h-4" /> Recurring Preventive Maintenance Schedule
            </h3>
            <button type="button" className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 text-white dark:text-slate-950 text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-sm">
              <Plus className="w-3.5 h-3.5" /> Schedule New PM Task
            </button>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 uppercase text-[10px] font-bold bg-slate-50 dark:bg-slate-900">
                  <th className="p-3">PM Task ID</th>
                  <th className="p-3">Target Asset</th>
                  <th className="p-3">Work Routine</th>
                  <th className="p-3">Frequency</th>
                  <th className="p-3">Next Due Date</th>
                  <th className="p-3">Assigned Lead</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60 font-sans">
                {PREVENTIVE_SCHEDULE.map((pm) => (
                  <tr key={pm.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/80 transition-colors">
                    <td className="p-3 font-mono font-bold text-cyan-700 dark:text-cyan-400">{pm.id}</td>
                    <td className="p-3 font-bold text-slate-900 dark:text-white">{pm.asset}</td>
                    <td className="p-3 text-slate-700 dark:text-slate-300">{pm.task}</td>
                    <td className="p-3 font-mono text-slate-500 dark:text-slate-400">{pm.frequency}</td>
                    <td className="p-3 font-mono font-bold text-amber-600 dark:text-amber-400">{pm.nextDue}</td>
                    <td className="p-3 text-slate-700 dark:text-slate-300">{pm.assignedTo}</td>
                    <td className="p-3">
                      <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold ${
                        pm.status === 'Overdue' ? 'bg-orange-100 dark:bg-orange-500/20 text-orange-800 dark:text-orange-400 border border-orange-200 dark:border-orange-500/40' :
                        pm.status === 'Upcoming' ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-400 border border-amber-200 dark:border-amber-500/40' :
                        'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/40'
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
        <div className="mt-6 stitch-glass-tile p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <h3 className="text-sm font-extrabold uppercase tracking-wider text-amber-700 dark:text-amber-400 flex items-center gap-2">
              <Package className="w-4 h-4 text-amber-600 dark:text-amber-400" /> Reorder Threshold &amp; Low Stock Spare Parts
            </h3>
            <span className="text-xs text-orange-800 dark:text-orange-400 font-bold bg-orange-100 dark:bg-orange-500/10 px-3 py-1 rounded-full border border-orange-200 dark:border-orange-500/30">
              3 Critical Items Below Minimum Reorder Point
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {LOW_STOCK_SPARES.map((sp) => (
              <div key={sp.id} className="p-4 rounded-xl border border-amber-200 dark:border-amber-500/30 bg-white dark:bg-slate-950/90 hover:border-amber-400 transition-all shadow-sm">
                <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mb-1">
                  <span className="font-mono text-amber-700 dark:text-amber-400 font-bold">{sp.sku}</span>
                  <span className="text-slate-500 dark:text-slate-400 font-mono">Unit: {sp.unitCost}</span>
                </div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-3">{sp.part}</h4>

                <div className="flex items-center justify-between mb-3 text-xs">
                  <span className="text-slate-600 dark:text-slate-400">Current Stock:</span>
                  <span className={`font-mono font-extrabold px-2.5 py-0.5 rounded ${
                    sp.stock === 0 ? 'bg-orange-600 text-white dark:bg-orange-500 dark:text-slate-950' : 'bg-amber-100 text-amber-900 dark:bg-amber-500/20 dark:text-amber-300'
                  }`}>
                    {sp.stock} units (Min: {sp.minRequired})
                  </span>
                </div>

                <button
                  type="button"
                  className="w-full py-2 rounded-lg bg-cyan-600 hover:bg-cyan-700 dark:bg-cyan-500 dark:hover:bg-cyan-400 text-white dark:text-slate-950 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
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
              className="absolute top-4 right-4 z-10 p-2 rounded-full bg-slate-200 dark:bg-slate-900 text-slate-700 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-300 dark:border-slate-700 cursor-pointer"
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
