import React from 'react';
import { computeMachineHealth, HEALTH } from '@/utils/machineHealth';

/**
 * MachineHealthIndicator — the traffic light on a machine card.
 *
 * The whole point of the board is that this dot answers "is it OK?" before
 * the reader has parsed a single word, so the colour carries the message and
 * the label repeats it in text (colour alone is never the only signal).
 *
 * Props:
 * - machine (object, required): machine row from the Machines page
 * - health (object, optional): precomputed `computeMachineHealth` result;
 *   pass it when the parent already derived it to avoid recomputing
 * - size ('sm' | 'md' | 'lg'): dot size, default 'md'
 * - showLabel (bool): render the text label beside the dot, default true
 */
function MachineHealthIndicator({ machine, health, size = 'md', showLabel = true }) {
  const verdict = health || computeMachineHealth(machine);
  const tooltip = verdict.reasons.join(' · ');

  return (
    <span
      className={`machine-health machine-health-${verdict.status} machine-health-${size}`}
      title={tooltip}
      role="status"
      aria-label={`${verdict.label}. ${tooltip}`}
    >
      <span className="machine-health-dot" aria-hidden="true" />
      {showLabel && <span className="machine-health-label">{verdict.label}</span>}
    </span>
  );
}

MachineHealthIndicator.HEALTH = HEALTH;

export default React.memo(MachineHealthIndicator);
