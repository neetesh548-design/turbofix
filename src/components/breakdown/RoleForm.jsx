/**
 * RoleForm — the fields only one role is asked for.
 *
 * The three steps above this are identical for everyone, because
 * "which machine, what's wrong, photo?" is the whole report. What
 * differs is what each role *knows* that the others don't, and asking
 * everyone for all of it is how the form stops being fast:
 *
 *   operator    nothing extra. They are telling us something is wrong;
 *               they should not be asked who to assign it to.
 *   technician  their findings — what they saw, what should happen
 *               next, and who needs to be involved. Answering "needs
 *               supervisor" here is what stops the callback call.
 *   supervisor  why they are filing, who it goes to, and what an hour
 *               of downtime costs, which is what makes the queue
 *               sortable by something other than mood.
 *   vendor      who to call back. Pre-filled from their login; still
 *               editable, because the person on site is often not the
 *               person whose account it is.
 *
 * Props:
 * - role (string)       resolved breakdown role
 * - draft (object)      the whole draft; this reads only its own keys
 * - onChange (fn(patch))
 * - technicians (array) assignment options, supervisor only
 * - machine (object)    for the auto-filled downtime cost
 * - disabled (bool)
 */

import React from 'react';
import { IndianRupee, PhoneCall, UserCog } from 'lucide-react';
import {
  BREAKDOWN_ROLES,
  NEXT_ACTIONS,
  REPORT_REASONS,
  TECH_SEVERITY_OPTIONS,
  hourlyDowntimeCost,
} from '../../utils/breakdownRouter.js';
import { formatInr } from '../../utils/dashboardMetrics.js';

export default function RoleForm({
  role,
  draft = {},
  onChange,
  technicians = [],
  machine = null,
  disabled = false,
}) {
  const set = (key) => (event) => onChange?.({ [key]: event.target.value });

  if (role === BREAKDOWN_ROLES.OPERATOR) return null;

  if (role === BREAKDOWN_ROLES.TECHNICIAN) {
    return (
      <div className="brk-role-fields" data-testid="breakdown-role-technician">
        <fieldset className="brk-field" disabled={disabled}>
          <legend>Your call on it</legend>
          <div className="brk-severity-row" role="radiogroup" aria-label="Severity">
            {TECH_SEVERITY_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={draft.severity === option.value}
                className={`brk-severity-btn${draft.severity === option.value ? ' active' : ''}`}
                onClick={() => onChange?.({ severity: option.value })}
                data-testid={`breakdown-severity-${option.value}`}
              >
                <strong>{option.label}</strong>
                <small>{option.hint}</small>
              </button>
            ))}
          </div>
        </fieldset>

        <div className="brk-field">
          <label htmlFor="brk-next-action">What needs to happen next?</label>
          <select
            id="brk-next-action"
            value={draft.nextAction || ''}
            onChange={set('nextAction')}
            disabled={disabled}
            data-testid="breakdown-next-action"
          >
            <option value="">Use the suggestion above</option>
            {NEXT_ACTIONS.map((action) => (
              <option key={action.value} value={action.value}>{action.label}</option>
            ))}
          </select>
        </div>

        <div className="brk-field brk-field-wide">
          <label htmlFor="brk-finding">What you saw (optional)</label>
          <input
            id="brk-finding"
            value={draft.finding || ''}
            onChange={set('finding')}
            placeholder="e.g. Outer race pitted on the front bearing"
            disabled={disabled}
            maxLength={200}
          />
        </div>
      </div>
    );
  }

  if (role === BREAKDOWN_ROLES.SUPERVISOR) {
    const cost = hourlyDowntimeCost(machine);
    return (
      <div className="brk-role-fields" data-testid="breakdown-role-supervisor">
        <div className="brk-field">
          <label htmlFor="brk-reason">Why are you reporting?</label>
          <select
            id="brk-reason"
            value={draft.reason || 'breakdown'}
            onChange={set('reason')}
            disabled={disabled}
            data-testid="breakdown-reason"
          >
            {REPORT_REASONS.map((reason) => (
              <option key={reason.value} value={reason.value}>{reason.label}</option>
            ))}
          </select>
        </div>

        <div className="brk-field">
          <label htmlFor="brk-assign"><UserCog size={12} aria-hidden="true" /> Assign to</label>
          <select
            id="brk-assign"
            value={draft.assignTo?.userId || ''}
            onChange={(event) => {
              const picked = technicians.find((tech) => tech.user_id === event.target.value);
              onChange?.({
                assignTo: picked
                  ? { name: picked.name, role: picked.role, userId: picked.user_id }
                  : null,
              });
            }}
            disabled={disabled}
            data-testid="breakdown-assign"
          >
            <option value="">Whoever is assigned to the machine</option>
            {technicians.map((tech) => (
              <option key={tech.user_id} value={tech.user_id}>
                {tech.name}
                {Number.isFinite(tech.open_jobs) ? ` · ${tech.open_jobs} open` : ''}
              </option>
            ))}
          </select>
        </div>

        <p className="brk-cost" data-testid="breakdown-cost">
          <IndianRupee size={12} aria-hidden="true" />
          {cost > 0
            ? <>An hour down on this machine costs <strong>{formatInr(cost)}</strong> — the queue sorts on it.</>
            : <>No downtime cost recorded for this machine yet. Add one in Machines to sharpen prioritisation.</>}
        </p>
      </div>
    );
  }

  // Vendor
  return (
    <div className="brk-role-fields" data-testid="breakdown-role-vendor">
      <div className="brk-field">
        <label htmlFor="brk-contact-name"><PhoneCall size={12} aria-hidden="true" /> Who should we call back?</label>
        <input
          id="brk-contact-name"
          value={draft.contactName || ''}
          onChange={set('contactName')}
          placeholder="Your name"
          disabled={disabled}
          required
          data-testid="breakdown-contact-name"
        />
      </div>

      <div className="brk-field">
        <label htmlFor="brk-contact-phone">Phone</label>
        <input
          id="brk-contact-phone"
          type="tel"
          inputMode="tel"
          value={draft.contactPhone || ''}
          onChange={set('contactPhone')}
          placeholder="+91 …"
          disabled={disabled}
          data-testid="breakdown-contact-phone"
        />
      </div>

      <div className="brk-field brk-field-wide">
        <label htmlFor="brk-availability">When can you be on site?</label>
        <input
          id="brk-availability"
          value={draft.availability || ''}
          onChange={set('availability')}
          placeholder="e.g. Within 4 hours, Mon–Sat"
          disabled={disabled}
          maxLength={120}
        />
      </div>
    </div>
  );
}
