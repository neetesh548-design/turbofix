/**
 * OperationsBoard — the "everything that needs a decision, in one screen"
 * view, restored after removing the old Dashboard "Command Center" tab
 * (which was a fixed mock: hardcoded WO numbers, fake technician names,
 * fake stock levels, unrelated to the plant's real data).
 *
 * Same shape as that mock — a stat row plus Work Orders / Asset Health /
 * PM Schedule / Spares tabs — but every number here comes from the tickets,
 * machines, pm_schedules and parts this session already fetched. Nothing
 * is invented: a factory with no low-stock parts shows "0 spares to watch",
 * not a plausible-looking fake row.
 */

import React, { useState } from 'react';
import { AlertTriangle, Boxes, CalendarClock, ShieldAlert, Wrench } from 'lucide-react';
import ActionBoard from './ActionBoard.jsx';
import { computeSla, isTicketClosed, normalizeUrgency } from '../../utils/ticketSla.js';

const DUE_SOON_DAYS = 7;
const MS_PER_DAY = 86_400_000;

function machineName(machines, machineId) {
  const row = machines.find((m) => (m.id || m.machine_id) === machineId);
  return row?.name || row?.machine_name || machineId || 'Machine';
}

function criticalTicketCount(tickets, now) {
  return tickets.filter((t) => {
    if (isTicketClosed(t)) return false;
    const sla = computeSla(t, now);
    return sla.breached || normalizeUrgency(t) === 'critical';
  }).length;
}

function pmDueRows(pmSchedules, now) {
  const horizon = now.getTime() + DUE_SOON_DAYS * MS_PER_DAY;
  return pmSchedules
    .filter((pm) => pm.active !== false && pm.next_due_at && new Date(pm.next_due_at).getTime() <= horizon)
    .sort((a, b) => new Date(a.next_due_at) - new Date(b.next_due_at));
}

function lowStockRows(parts) {
  return parts
    .filter((p) => Number(p.stock_qty) <= Number(p.reorder_level ?? 0))
    .sort((a, b) => Number(a.stock_qty) - Number(b.stock_qty));
}

function machineAlertRows(machines) {
  return machines.filter((m) => !['running', 'ok', 'healthy'].includes(String(m.status || '').toLowerCase()));
}

const TABS = [
  { key: 'work-orders', label: 'Work Orders', icon: Wrench, detail: 'Critical repairs and closure queue' },
  { key: 'asset-health', label: 'Asset Health', icon: AlertTriangle, detail: 'Machines outside a running state' },
  { key: 'pm-schedule', label: 'PM Schedule', icon: CalendarClock, detail: 'Due and overdue preventive tasks' },
  { key: 'spares', label: 'Spares', icon: Boxes, detail: 'At or below reorder level' },
];

export default function OperationsBoard({ tickets = [], machines = [], pmSchedules = [], parts = [], loading = false }) {
  const [tab, setTab] = useState('work-orders');
  const now = new Date();

  const critical = criticalTicketCount(tickets, now);
  const pmDue = pmDueRows(pmSchedules, now);
  const alerts = machineAlertRows(machines);
  const lowStock = lowStockRows(parts);

  const stats = [
    { key: 'critical', label: 'Critical tickets', value: critical, tone: critical ? 'danger' : 'ok', icon: ShieldAlert },
    { key: 'pm', label: 'PM due soon', value: pmDue.length, tone: pmDue.length ? 'warning' : 'ok', icon: CalendarClock },
    { key: 'alerts', label: 'Machine alerts', value: alerts.length, tone: alerts.length ? 'warning' : 'ok', icon: AlertTriangle },
    { key: 'spares', label: 'Spares to watch', value: lowStock.length, tone: lowStock.length ? 'warning' : 'ok', icon: Boxes },
  ];

  return (
    <div className="rd-ops-board" data-testid="operations-board">
      <section className="rd-ops-stats" aria-label="Plant-wide action summary">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.key} className={`rd-ops-stat tone-${stat.tone}`}>
              <Icon size={14} aria-hidden="true" />
              <strong>{loading ? '—' : stat.value}</strong>
              <span>{stat.label}</span>
            </div>
          );
        })}
      </section>

      <nav className="rd-ops-tabs" role="tablist" aria-label="Operations board sections">
        {TABS.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={tab === t.key}
              className={`rd-ops-tab ${tab === t.key ? 'is-active' : ''}`}
              onClick={() => setTab(t.key)}
            >
              <Icon size={14} aria-hidden="true" />
              <span>
                <strong>{t.label}</strong>
                <small>{t.detail}</small>
              </span>
            </button>
          );
        })}
      </nav>

      {tab === 'work-orders' && <ActionBoard tickets={tickets} loading={loading} />}

      {tab === 'asset-health' && (
        <div className="rd-ops-list" data-testid="asset-health-list">
          {!loading && alerts.length === 0 && <p className="rd-empty">Every machine is running. Nothing outside normal state.</p>}
          {alerts.map((m) => (
            <a key={m.id || m.machine_id} className="rd-ops-row" href={`machines.html?machine=${encodeURIComponent(m.id || m.machine_id || '')}`}>
              <strong>{m.name || m.machine_name}</strong>
              <span className="rd-ops-row-meta">{m.location || 'Location unknown'} · {String(m.criticality || 'standard').toUpperCase()} criticality</span>
              <span className={`rd-ops-badge tone-${String(m.status || '').toLowerCase() === 'breakdown' ? 'danger' : 'warning'}`}>
                {String(m.status || 'unknown').replaceAll('_', ' ')}
              </span>
            </a>
          ))}
        </div>
      )}

      {tab === 'pm-schedule' && (
        <div className="rd-ops-list" data-testid="pm-schedule-list">
          {!loading && pmDue.length === 0 && <p className="rd-empty">No preventive task is due within {DUE_SOON_DAYS} days.</p>}
          {pmDue.map((pm) => {
            const overdue = new Date(pm.next_due_at).getTime() < now.getTime();
            return (
              <a key={pm.id} className="rd-ops-row" href={`machines.html?machine=${encodeURIComponent(pm.machine_id || '')}`}>
                <strong>{pm.title || 'Preventive task'}</strong>
                <span className="rd-ops-row-meta">{machineName(machines, pm.machine_id)}</span>
                <span className={`rd-ops-badge tone-${overdue ? 'danger' : 'warning'}`}>
                  {overdue ? 'Overdue' : `Due ${new Date(pm.next_due_at).toLocaleDateString()}`}
                </span>
              </a>
            );
          })}
        </div>
      )}

      {tab === 'spares' && (
        <div className="rd-ops-list" data-testid="spares-list">
          {!loading && lowStock.length === 0 && <p className="rd-empty">No part is at or below its reorder level.</p>}
          {lowStock.map((p) => (
            <a key={p.id} className="rd-ops-row" href="inventory.html">
              <strong>{p.part_name}</strong>
              <span className="rd-ops-row-meta">{machineName(machines, p.machine_id)}</span>
              <span className={`rd-ops-badge tone-${Number(p.stock_qty) <= 0 ? 'danger' : 'warning'}`}>
                {p.stock_qty} {p.unit || 'pcs'} left · reorder at {p.reorder_level}
              </span>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
