/**
 * HistorySuggestion — what this machine has been saying lately.
 *
 * Shown once a machine is picked, before the report is written. The
 * point is not decoration: an operator who reads "3 spindle reports in
 * 90 days — last time the bearing was replaced" writes a better
 * sentence than one staring at an empty box, and the technician gets
 * the repeat-failure context without opening a second page.
 *
 * Renders nothing when there is nothing to say. A card reading "no
 * history" costs a scroll and teaches nobody anything.
 *
 * Props:
 * - insight (object|null)  from machineHistoryInsight()
 * - machineId (string)     for the "see full history" link
 */

import React from 'react';
import { History, Repeat, Wrench } from 'lucide-react';

const BASE = import.meta.env.BASE_URL;

export default function HistorySuggestion({ insight, machineId }) {
  if (!insight) return null;

  const { theme, themeCount, note, lastRepair, windowDays } = insight;

  return (
    <aside className="brk-history" data-testid="breakdown-history">
      <header>
        <span className="brk-history-icon" aria-hidden="true">
          {theme ? <Repeat size={14} /> : <History size={14} />}
        </span>
        <strong>{theme ? 'Seen before on this machine' : 'Recent history'}</strong>
      </header>

      <p className="brk-history-note">
        {theme
          ? `${themeCount} ${theme} reports in the last ${windowDays} days.`
          : note}
      </p>

      {lastRepair && (lastRepair.resolution_note || lastRepair.repair_note) && (
        <p className="brk-history-repair">
          <Wrench size={12} aria-hidden="true" />
          <span>
            <em>Last repair:</em> {lastRepair.resolution_note || lastRepair.repair_note}
          </span>
        </p>
      )}

      {machineId && (
        <a className="brk-link-btn" href={`${BASE}machines.html?machine=${encodeURIComponent(machineId)}`}>
          See the full record
        </a>
      )}
    </aside>
  );
}
