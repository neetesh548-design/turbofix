import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  X, MapPin, Upload, Pencil, ChevronRight, TriangleAlert,
  CalendarClock, User, Wrench, CheckCircle2,
} from 'lucide-react';
import MachineHealthIndicator from './MachineHealthIndicator';
import { machineDisplayStatus, formatDate, describeDayOffset, daysSince } from '@/utils/machineHealth';

const URGENCY_TONE = { low: 'low', medium: 'medium', high: 'high', critical: 'critical' };

/**
 * MachineDetailDrawer — the one-click-deeper view.
 *
 * Answers the follow-up questions a card cannot fit: what exactly is open,
 * what was done recently, who owns it. Anything heavier (documents, spare
 * parts, PM scheduling, reliability, kaizen, QR) lives behind "Open full
 * workspace" rather than being flattened into this panel.
 *
 * Edit here is deliberately three fields. The full asset profile stays in the
 * workspace so the common case — a wrong location or a reassigned technician —
 * is a ten-second fix.
 *
 * Props:
 * - machine (object, required)
 * - technicians (array): team members selectable as primary technician
 * - canEdit (bool): whether to surface the quick-edit affordance
 * - quickEdit (object | null): in-flight edit draft, or null when closed
 * - quickEditSaving (bool)
 * - onClose, onReportIssue, onViewDetails, onOpenTickets, onUploadPhoto
 * - onQuickEditOpen, onQuickEditChange(patch), onQuickEditCancel, onQuickEditSave
 */
function MachineDetailDrawer({
  machine,
  technicians = [],
  canEdit = false,
  quickEdit = null,
  quickEditSaving = false,
  photoSaving = false,
  onClose,
  onReportIssue,
  onViewDetails,
  onOpenTickets,
  onUploadPhoto,
  onQuickEditOpen,
  onQuickEditChange,
  onQuickEditCancel,
  onQuickEditSave,
}) {
  const panelRef = useRef(null);

  // Move focus into the panel so keyboard and screen-reader users land here
  // rather than staying behind on the card they just activated. `preventScroll`
  // matters: without it the browser scrolls the board behind the drawer, so
  // closing it would dump the reader somewhere they never navigated to.
  useEffect(() => {
    panelRef.current?.focus({ preventScroll: true });
  }, [machine?.machine_id]);

  // Freeze the board while the drawer is over it, otherwise a scroll gesture
  // that runs past the end of the panel starts moving the page underneath.
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previous; };
  }, []);

  if (!machine) return null;

  const record = machine.track_record || {};
  const openTickets = Array.isArray(record.open_list) ? record.open_list : [];
  const health = machineDisplayStatus(machine, openTickets);
  const { pm, service, openCount } = health;
  const recentWork = (Array.isArray(record.recent_closed) ? record.recent_closed : []).slice(0, 3);
  const technician = machine.assignments?.technician;

  const photo = machine.image_url
    || (typeof window !== 'undefined' ? window.localStorage.getItem(`tf_machine_photo_${machine.machine_id}`) : null);

  return createPortal(
    <div className="machine-drawer-scrim" onClick={onClose} data-testid="machine-drawer-scrim">
      <aside
        className="machine-drawer"
        data-testid="machine-drawer"
        role="dialog"
        aria-modal="true"
        aria-label={`${machine.machine_name} details`}
        tabIndex={-1}
        ref={panelRef}
        onClick={(event) => event.stopPropagation()}
      >
        <header className="machine-drawer-head">
          <div>
            <MachineHealthIndicator machine={machine} health={health} size="md" />
            <h2>{machine.machine_name || machine.machine_id}</h2>
            <p><MapPin size={14} aria-hidden="true" />{machine.location || 'Location not set'}</p>
          </div>
          <button type="button" className="machine-drawer-close" onClick={onClose} aria-label="Close details">
            <X size={18} aria-hidden="true" />
          </button>
        </header>

        <div className="machine-drawer-body">
          {/* Why the card is this colour — stated, never implied. */}
          <ul className="machine-drawer-reasons">
            {health.reasons.map((reason) => <li key={reason}>{reason}</li>)}
          </ul>

          <section className="machine-drawer-photo-row">
            {photo ? (
              <img src={photo} alt={`${machine.machine_name}`} className="machine-drawer-photo" />
            ) : (
              <div className="machine-drawer-photo machine-drawer-photo-empty"><span>No photo yet</span></div>
            )}
            <div className="machine-drawer-facts">
              <div><small>Machine ID</small><strong>{machine.machine_id}</strong></div>
              {machine.asset_code && <div><small>Asset tag</small><strong>{machine.asset_code}</strong></div>}
              {machine.criticality && <div><small>Criticality</small><strong className={`crit-${machine.criticality}`}>{machine.criticality}</strong></div>}
              <label className="machine-drawer-upload">
                <Upload size={13} aria-hidden="true" />
                {photoSaving ? 'Uploading…' : photo ? 'Change photo' : 'Add photo'}
                <input
                  type="file"
                  accept="image/*"
                  disabled={photoSaving}
                  onChange={(event) => { if (event.target.files?.[0]) onUploadPhoto?.(event.target.files[0], machine); }}
                />
              </label>
            </div>
          </section>

          {/* ---- Quick edit: three fields, nothing more ---- */}
          {canEdit && (quickEdit ? (
            <form className="machine-quick-edit" onSubmit={onQuickEditSave} data-testid="machine-quick-edit">
              <h3>Quick edit</h3>
              <label>
                <span>Machine name</span>
                <input
                  value={quickEdit.name}
                  onChange={(event) => onQuickEditChange({ name: event.target.value })}
                  required
                />
              </label>
              <label>
                <span>Location</span>
                <input
                  value={quickEdit.location}
                  onChange={(event) => onQuickEditChange({ location: event.target.value })}
                  placeholder="Example: Bay 2"
                />
              </label>
              <label>
                <span>Primary technician</span>
                <select
                  value={quickEdit.technician_user_id}
                  onChange={(event) => onQuickEditChange({ technician_user_id: event.target.value })}
                >
                  <option value="">{technicians.length ? 'Not assigned' : 'No technician found — add in Team'}</option>
                  {technicians.map((member) => (
                    <option key={member.user_id} value={member.user_id}>{member.name}</option>
                  ))}
                </select>
              </label>
              <div className="machine-quick-edit-actions">
                <button type="button" onClick={onQuickEditCancel} disabled={quickEditSaving}>Cancel</button>
                <button type="submit" className="primary" disabled={quickEditSaving}>
                  {quickEditSaving ? 'Saving…' : 'Save'}
                </button>
              </div>
              <p className="machine-quick-edit-note">
                Manufacturer, warranty, vendor and cost fields live in the full workspace.
              </p>
            </form>
          ) : (
            <button type="button" className="machine-drawer-edit" onClick={() => onQuickEditOpen?.(machine)} data-testid="machine-quick-edit-open">
              <Pencil size={14} aria-hidden="true" /> Edit name, location or technician
            </button>
          ))}

          {/* ---- Open work ---- */}
          <section className="machine-drawer-section">
            <h3><Wrench size={15} aria-hidden="true" />Open tickets <b>{openCount}</b></h3>
            {openTickets.length === 0 ? (
              <p className="machine-drawer-empty">
                {openCount > 0
                  ? `${openCount} open ticket${openCount === 1 ? '' : 's'} on this machine.`
                  : 'Nothing open. This machine is clear.'}
              </p>
            ) : (
              <ul className="machine-ticket-list">
                {openTickets.map((ticket) => {
                  const age = daysSince(ticket.created_at);
                  return (
                    <li key={ticket.id}>
                      <button type="button" onClick={() => onOpenTickets?.(machine, ticket)}>
                        <span className={`machine-urgency u-${URGENCY_TONE[String(ticket.urgency || '').toLowerCase()] || 'medium'}`}>
                          {ticket.urgency || 'medium'}
                        </span>
                        <span className="machine-ticket-text">{ticket.issue_text || 'Maintenance issue'}</span>
                        <span className="machine-ticket-age">{describeDayOffset(age === null ? null : -age) || ''}</span>
                        <ChevronRight size={14} aria-hidden="true" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
            {openCount > 0 && (
              <button type="button" className="machine-drawer-link" onClick={() => onOpenTickets?.(machine)}>
                Open all in Tickets <ChevronRight size={13} aria-hidden="true" />
              </button>
            )}
          </section>

          {/* ---- Maintenance history ---- */}
          <section className="machine-drawer-section">
            <h3><CheckCircle2 size={15} aria-hidden="true" />Recent maintenance</h3>
            {recentWork.length === 0 ? (
              <p className="machine-drawer-empty">
                {service.date ? `Last serviced ${formatDate(service.date)}.` : 'No maintenance logged yet.'}
              </p>
            ) : (
              <ul className="machine-log-list">
                {recentWork.map((log) => (
                  <li key={log.id}>
                    <strong>{log.issue_text || 'Maintenance work'}</strong>
                    <small>{formatDate(log.closed_at || log.created_at) || '—'}</small>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* ---- Schedule & people ---- */}
          <section className="machine-drawer-section machine-drawer-split">
            <div className={`machine-drawer-stat tone-${pm.tone}`}>
              <CalendarClock size={15} aria-hidden="true" />
              <div>
                <small>Next preventive maintenance</small>
                <strong>{pm.label}</strong>
                {pm.date && <span>{formatDate(pm.date)}</span>}
              </div>
            </div>
            <div className={`machine-drawer-stat tone-${service.tone}`}>
              <CalendarClock size={15} aria-hidden="true" />
              <div>
                <small>Last serviced</small>
                <strong>{service.label}</strong>
                {service.date && <span>{formatDate(service.date)}</span>}
              </div>
            </div>
            <div className={`machine-drawer-stat ${technician ? '' : 'tone-overdue'}`}>
              <User size={15} aria-hidden="true" />
              <div>
                <small>Assigned technician</small>
                <strong>{technician?.name || 'Not assigned'}</strong>
                {machine.assignments?.supervisor?.name && <span>Supervisor: {machine.assignments.supervisor.name}</span>}
              </div>
            </div>
          </section>
        </div>

        <footer className="machine-drawer-foot">
          <button type="button" className="machine-drawer-btn danger" onClick={() => onReportIssue?.(machine)}>
            <TriangleAlert size={15} aria-hidden="true" /> Report issue
          </button>
          <button type="button" className="machine-drawer-btn primary" data-testid="machine-open-workspace" onClick={() => onViewDetails?.(machine)}>
            Open full workspace <ChevronRight size={15} aria-hidden="true" />
          </button>
        </footer>
      </aside>
    </div>,
    document.body
  );
}

export default MachineDetailDrawer;
