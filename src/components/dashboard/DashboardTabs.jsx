/**
 * DashboardTabs — Power BI-style report tabs for a single role's dashboard.
 *
 * Panels stay mounted and are toggled with `hidden` rather than conditional
 * rendering, so local state living elsewhere in the same board (Engineer's
 * CAPA filter, Technician's "show all machines" toggle) survives switching
 * tabs away and back.
 */
import React, { useState } from 'react';

export default function DashboardTabs({ tabs, defaultTabId, ariaLabel, className = '' }) {
  const [active, setActive] = useState(defaultTabId || tabs[0]?.id);

  return (
    <div className={`dashboard-role-tabs ${className}`.trim()}>
      <div className="dashboard-role-tab-list" role="tablist" aria-label={ariaLabel}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={active === tab.id}
            className={`dashboard-role-tab ${active === tab.id ? 'is-active' : ''}`}
            onClick={() => setActive(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {tabs.map((tab) => (
        <div key={tab.id} role="tabpanel" className="rd-role-tab-panel" hidden={active !== tab.id}>
          {tab.content}
        </div>
      ))}
    </div>
  );
}
