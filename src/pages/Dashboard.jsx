
import React, { useEffect } from 'react';

export default function Dashboard() {
  useEffect(() => {
    // Basic script execution simulation can go here
  }, []);

  return (
    <div dangerouslySetInnerHTML={{ __html: `

<div class="dash-topbar">
  <a href="index.html" class="brand">
    <svg class="brand-logo-svg" viewBox="0 0 100 100" width="36" height="36">
      <path d="M 50 10 C 50 10, 85 20, 85 50 C 85 75, 50 90, 50 90 C 50 90, 15 75, 15 50 C 15 20, 50 10, 50 10 Z" fill="#1e293b" stroke="#94a3b8" stroke-width="4" stroke-linejoin="round" />
      <path d="M 50 15 C 50 15, 80 24, 80 50 C 80 72, 50 85, 50 85 C 50 85, 20 72, 20 50 C 20 24, 50 15, 50 15 Z" fill="#0f172a" />
      <g transform="translate(50,50)" fill="#475569">
        <circle cx="0" cy="0" r="18" fill="none" stroke="#475569" stroke-width="4" />
        <rect x="-4" y="-22" width="8" height="6" rx="2" transform="rotate(0)" />
        <rect x="-4" y="-22" width="8" height="6" rx="2" transform="rotate(45)" />
        <rect x="-4" y="-22" width="8" height="6" rx="2" transform="rotate(90)" />
        <rect x="-4" y="-22" width="8" height="6" rx="2" transform="rotate(135)" />
        <rect x="-4" y="-22" width="8" height="6" rx="2" transform="rotate(180)" />
        <rect x="-4" y="-22" width="8" height="6" rx="2" transform="rotate(225)" />
        <rect x="-4" y="-22" width="8" height="6" rx="2" transform="rotate(270)" />
        <rect x="-4" y="-22" width="8" height="6" rx="2" transform="rotate(315)" />
      </g>
      <circle cx="50" cy="50" r="12" fill="#0f172a" />
      <path d="M 53 32 L 38 52 L 48 52 L 44 68 L 62 46 L 50 46 Z" fill="#f59e0b" />
    </svg>
    <span class="brand-name"><span class="brand-turbo">TURBO</span><span class="brand-fix">FIX</span></span>
    <span class="brand-section">Dashboard</span>
  </a>
  <div class="topbar-nav">
    <a href="vault.html">Document Vault</a>
    <a href="index.html">← Back to site</a>
    <button id="logoutBtn" class="btn-signout">Sign Out</button>
  </div>
</div>

<div class="container">
  <!-- Dashboard screen (auth via shared token from vault.html staff login) -->
  <div id="dashScreen" class="screen">
    <div class="dash-header" style="display: flex; align-items: center; gap: 12px; margin-bottom: 32px;">
      <div>
        <h1 id="companyName" style="font-family: 'Rajdhani', sans-serif; font-weight: 800; font-size: 26px; text-transform: uppercase; color: white; margin: 0;">Loading...</h1>
        <p id="userRole" class="user-role" style="margin: 4px 0 0;"></p>
      </div>
    </div>

    <div class="kpis-grid">
      <div class="kpi-card">
        <div class="kpi-number" id="machinesDown">—</div>
        <div class="kpi-label">Machines Down</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-number" id="urgentOpen">—</div>
        <div class="kpi-label">Urgent Issues</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-number" id="staleMachines">—</div>
        <div class="kpi-label">No Data / Stale</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-number" id="openTickets">—</div>
        <div class="kpi-label">Open Tickets</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-number" id="closedToday">—</div>
        <div class="kpi-label">Closed Today</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-number" id="totalTickets">—</div>
        <div class="kpi-label">Total Tickets</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-number" id="avgHours">—</div>
        <div class="kpi-label">Avg Hours to Fix</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-number" id="plantHealth">—</div>
        <div class="kpi-label">Plant Health</div>
      </div>
    </div>

    <!-- Auto-Derived Insights -->
    <div class="section-divider">
      <span class="section-divider-label">Auto-Derived Insights</span>
    </div>
    <div class="kpis-grid" id="autoInsights">
      <div class="kpi-card insight-card">
        <div class="kpi-number" id="mtbfHours">—</div>
        <div class="kpi-label">MTBF (hrs)</div>
      </div>
      <div class="kpi-card insight-card">
        <div class="kpi-number" id="mttrHours">—</div>
        <div class="kpi-label">MTTR (hrs)</div>
      </div>
      <div class="kpi-card insight-card">
        <div class="kpi-number" id="repeatPct">—</div>
        <div class="kpi-label">Repeat Breakdown %</div>
      </div>
      <div class="kpi-card insight-card">
        <div class="kpi-number" id="topProblem" style="font-size:18px;">—</div>
        <div class="kpi-label">#1 Problem Machine</div>
      </div>
    </div>

    <!-- Custom KPIs (Owner-Defined) -->
    <div class="section-divider">
      <span class="section-divider-label">Your Custom KPIs</span>
      <button class="btn-icon" id="openKpiSettings" title="Configure KPIs">⚙</button>
    </div>
    <div class="kpis-grid" id="customKpiGrid">
      <div class="kpi-card kpi-add-card" id="addKpiPlaceholder">
        <div class="kpi-number" style="font-size:24px; cursor:pointer;" onclick="document.getElementById('openKpiSettings').click()">+</div>
        <div class="kpi-label">Add Custom KPI</div>
      </div>
    </div>

    <!-- Manual Data Entry -->
    <div class="activity-section" id="manualEntrySection" style="margin-top:24px; display:none;">
      <h2>Log Daily Data</h2>
      <div class="manual-entry-form" id="manualEntryForm"></div>
    </div>

    <!-- Supervisor Ownership (Owner-Only) -->
    <div class="activity-section" id="supervisorOwnershipSection" style="margin-top:24px; display:none;">
      <h2>Supervisor Machine Ownership</h2>
      <div id="supervisorListGrid" class="supervisor-list-grid"></div>
    </div>

    <div class="activity-section">
      <h2>Needs Attention Now</h2>
      <div id="attentionList" class="activity-list">
        <p class="placeholder">Nothing open — plant is healthy</p>
      </div>
    </div>

    <div class="activity-section" style="margin-top:24px;">
      <h2>Breakdowns Per Week</h2>
      <div id="trendChart" class="trend-chart"></div>
    </div>

    <div class="activity-section" style="margin-top:24px;">
      <h2>Recent Tickets</h2>
      <div id="activityList" class="activity-list">
        <p class="placeholder">No recent tickets</p>
      </div>
    </div>

    <div class="footer-link">
      <a href="vault.html">Manage Documents & Spare Parts →</a>
    </div>

    <!-- KPI Settings Modal -->
    <div class="modal-overlay" id="kpiModal" style="display:none;">
      <div class="modal-card">
        <div class="modal-header">
          <h2>Configure Custom KPIs</h2>
          <button class="btn-icon" id="closeKpiModal">&times;</button>
        </div>
        <div class="modal-body">
          <div id="kpiConfigList"></div>
          <div class="kpi-add-form" id="kpiAddForm">
            <h3 style="margin:20px 0 12px; font-size:15px; color:var(--brand);">Add New KPI</h3>
            <div class="form-row">
              <div class="form-group" style="flex:2;">
                <label for="newKpiName">KPI Name</label>
                <input type="text" id="newKpiName" placeholder="e.g. Production Units/Shift">
              </div>
              <div class="form-group" style="flex:1;">
                <label for="newKpiType">Type</label>
                <select id="newKpiType">
                  <option value="manual">Manual Input</option>
                  <option value="auto">Auto-Tracked</option>
                  <option value="calc">Calculated</option>
                </select>
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label for="newKpiUnit">Unit</label>
                <input type="text" id="newKpiUnit" placeholder="e.g. units, kWh, Rs, %">
              </div>
              <div class="form-group">
                <label for="newKpiTarget">Target Value</label>
                <input type="text" id="newKpiTarget" placeholder="e.g. 450">
              </div>
              <div class="form-group">
                <label for="newKpiCost">Cost/Hour (if calc)</label>
                <input type="text" id="newKpiCost" placeholder="e.g. 5000">
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label for="newKpiWarning">Warning Threshold</label>
                <input type="text" id="newKpiWarning" placeholder="e.g. 400">
              </div>
              <div class="form-group">
                <label for="newKpiCritical">Critical Threshold</label>
                <input type="text" id="newKpiCritical" placeholder="e.g. 300">
              </div>
            </div>
            <button class="btn-primary" id="saveNewKpi" style="margin-top:12px;">Add KPI</button>
            <div id="kpiFormError" class="error-msg"></div>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>


` }} />
  );
}
