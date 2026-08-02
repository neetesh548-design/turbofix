import React from 'react';
import { Factory, ShieldCheck, Users, Wrench, ArrowUpRight } from 'lucide-react';
import { normalizeRole } from '../../lib/roles';

const CARDS = [
  {
    key: 'owner',
    roles: ['owner'],
    icon: Factory,
    title: 'Owner',
    body: 'See downtime, cost, and repeat exposure first.',
    hint: 'Focus on business risk and plant direction.',
    href: 'machines.html',
  },
  {
    key: 'maintenance_head',
    roles: ['maintenance_head', 'maintenance_manager', 'maintenance_lead'],
    icon: ShieldCheck,
    title: 'Maintenance Head',
    body: 'Watch approvals, ownership gaps, and trusted history.',
    hint: 'Keep exceptions and verification under control.',
    href: 'records.html',
  },
  {
    key: 'supervisor',
    roles: ['supervisor', 'maintenance_supervisor'],
    icon: Users,
    title: 'Supervisor',
    body: 'Balance workload, SLA drift, and blocked jobs.',
    hint: 'Reassign before the queue starts slipping.',
    href: 'team.html',
  },
  {
    key: 'floor',
    roles: ['maintenance_technician', 'technician', 'operator', 'plant_operator', 'machine_operator'],
    icon: Wrench,
    title: 'Technician / Operator',
    body: 'See the next action, spares, and proof to close.',
    hint: 'Keep the floor moving with one clear next step.',
    href: 'tickets.html',
  },
];

export default function StakeholderLens({ role }) {
  const activeRole = normalizeRole(role);

  return (
    <section className="dashboard-stakeholder-section" aria-label="Stakeholder pointers">
      <div className="dashboard-stakeholder-header">
        <span className="dashboard-role-label">Stakeholder lens</span>
        <strong>One board, four simple readings.</strong>
        <p>Each card shows what matters most to that person, without repeating the whole dashboard story.</p>
      </div>

      <div className="dashboard-stakeholder-grid">
        {CARDS.map((card) => {
          const Icon = card.icon;
          const isActive = card.roles.includes(activeRole);
          return (
            <a
              key={card.key}
              className={`dashboard-stakeholder-card ${isActive ? 'active' : ''}`}
              href={card.href}
            >
              <div className="dashboard-stakeholder-icon" aria-hidden="true">
                <Icon size={14} />
              </div>
              <div className="dashboard-stakeholder-copy">
                <span>{card.title}</span>
                <strong>{card.body}</strong>
                <small>{card.hint}</small>
              </div>
              <ArrowUpRight size={14} className="dashboard-stakeholder-arrow" aria-hidden="true" />
            </a>
          );
        })}
      </div>
    </section>
  );
}
