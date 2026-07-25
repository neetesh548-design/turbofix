import React from 'react';
import { MapPin, TriangleAlert, Wrench, CalendarClock, User, ChevronRight } from 'lucide-react';
import MachineHealthIndicator from './MachineHealthIndicator';
import { computeMachineHealth } from '@/utils/machineHealth';

/**
 * MachineCard — one machine, readable in about five seconds.
 *
 * Reading order is deliberate: status light, then name and location, then the
 * three numbers that decide whether anyone needs to walk over there (open
 * tickets, last service, next PM), then the two actions.
 *
 * The card itself is the button that opens the drawer. The two action buttons
 * stop propagation so they never double-fire.
 *
 * Props:
 * - machine (object, required)
 * - onOpen (fn(machine)): card clicked — opens the detail drawer
 * - onReportIssue (fn(machine)): "Report issue" clicked
 * - onViewDetails (fn(machine)): "View details" clicked — full workspace
 */
function MachineCard({ machine, onOpen, onReportIssue, onViewDetails }) {
  const health = computeMachineHealth(machine);
  const { pm, service, openCount, critical } = health;

  const photo = machine.image_url
    || (typeof window !== 'undefined' ? window.localStorage.getItem(`tf_machine_photo_${machine.machine_id}`) : null);

  const technician = machine.assignments?.technician?.name;

  // Keyboard parity with the click target: the card is a div (it contains
  // buttons, so it cannot be a <button>) and therefore needs explicit keys.
  const handleKeyDown = (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onOpen?.(machine);
    }
  };

  return (
    <article
      className={`machine-card machine-card-${health.status}`}
      data-testid="machine-card"
      data-machine-id={machine.machine_id}
      data-health={health.status}
      role="button"
      tabIndex={0}
      onClick={() => onOpen?.(machine)}
      onKeyDown={handleKeyDown}
      aria-label={`${machine.machine_name}, ${health.label}`}
    >
      <header className="machine-card-head">
        <MachineHealthIndicator machine={machine} health={health} size="lg" />
        {critical && (
          <span className="machine-card-flag" title="A critical ticket is open on this machine">
            <TriangleAlert size={13} aria-hidden="true" /> Critical
          </span>
        )}
      </header>

      <div className="machine-card-identity">
        {photo && (
          <img className="machine-card-thumb" src={photo} alt="" loading="lazy" />
        )}
        <div className="machine-card-titles">
          <h3>{machine.machine_name || machine.machine_id}</h3>
          <p><MapPin size={14} aria-hidden="true" />{machine.location || 'Location not set'}</p>
        </div>
      </div>

      <dl className="machine-card-metrics">
        <div className={`machine-metric ${openCount > 0 ? (critical ? 'is-bad' : 'is-warn') : 'is-good'}`}>
          <dt><Wrench size={13} aria-hidden="true" />Open tickets</dt>
          <dd>
            <strong>{openCount}</strong>
            <small>{openCount === 0 ? 'Nothing pending' : critical ? 'One is critical' : 'Awaiting a fix'}</small>
          </dd>
        </div>

        <div className={`machine-metric tone-${service.tone}`}>
          <dt><CalendarClock size={13} aria-hidden="true" />Last service</dt>
          <dd>
            <strong>{service.daysAgo === null ? '—' : service.label}</strong>
            <small>{service.tone === 'stale' ? 'Overdue for a check' : service.tone === 'unknown' ? 'Never logged' : 'On record'}</small>
          </dd>
        </div>

        <div className={`machine-metric tone-${pm.tone}`}>
          <dt><CalendarClock size={13} aria-hidden="true" />Next PM</dt>
          <dd>
            <strong>{pm.label}</strong>
            <small>{pm.tone === 'overdue' ? 'Schedule it now' : pm.tone === 'unknown' ? 'No schedule set' : 'Preventive maintenance'}</small>
          </dd>
        </div>
      </dl>

      <footer className="machine-card-foot">
        <span className="machine-card-tech" title={technician ? `Assigned to ${technician}` : 'No technician assigned'}>
          <User size={13} aria-hidden="true" />
          {technician || 'Unassigned'}
        </span>
        <div className="machine-card-actions">
          <button
            type="button"
            className="machine-card-btn danger"
            data-testid="machine-report-issue"
            onClick={(event) => { event.stopPropagation(); onReportIssue?.(machine); }}
          >
            Report issue
          </button>
          <button
            type="button"
            className="machine-card-btn primary"
            data-testid="machine-view-details"
            onClick={(event) => { event.stopPropagation(); onViewDetails?.(machine); }}
          >
            View details <ChevronRight size={14} aria-hidden="true" />
          </button>
        </div>
      </footer>
    </article>
  );
}

export default React.memo(MachineCard);
