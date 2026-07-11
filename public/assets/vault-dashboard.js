var BACKEND_URL = new URLSearchParams(window.location.search).get("backend") || localStorage.getItem("tf_api_base") || "https://turbofix-backend-ehxb.onrender.com";

function isOwner() {
  const u = JSON.parse(localStorage.getItem("tf_user") || "null");
  return u && u.role === "owner";
}

function isTokenExpired(token) {
  if (!token) return true;
  try {
    const payload = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    if (!payload.exp) return false;
    return Date.now() >= payload.exp * 1000;
  } catch (_) { return false; }
}

function requireAuth() {
  const token = localStorage.getItem("tf_token");
  if (!token || isTokenExpired(token)) {
    localStorage.removeItem("tf_token");
    localStorage.removeItem("tf_user");
    window.location.href = "#/vault.html";
    return false;
  }
  return true;
}

var dashFirstLoad = true;

async function loadDashboard() {
  const token = localStorage.getItem("tf_token");
  if (!token) { requireAuth(); return; }

  if (dashFirstLoad) {
    document.querySelectorAll(".kpi-number").forEach(el => {
      if (el.textContent === "—") el.innerHTML = '<span class="dash-spinner"></span>';
    });
    const attList = document.getElementById("attentionList");
    if (attList) attList.innerHTML = '<p class="placeholder"><span class="dash-spinner"></span> Loading dashboard…</p>';
  }

  try {
    const resp = await fetch(`${BACKEND_URL}/vault/dashboard`, {
      headers: {"Authorization": `Bearer ${token}`},
    });

    if (resp.status === 403) {
      alert("Your company registration is pending admin approval.");
      localStorage.removeItem("tf_token");
      localStorage.removeItem("tf_user");
      window.location.href = "vault.html";
      return;
    }
    if (!resp.ok) {
      localStorage.removeItem("tf_token");
      localStorage.removeItem("tf_user");
      window.location.href = "vault.html";
      return;
    }

    const data = await resp.json();
    document.getElementById("companyName").textContent = data.company_name;

    const user = JSON.parse(localStorage.getItem("tf_user") || "{}");
    const roleText = user.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : "";
    document.getElementById("userRole").textContent = `${user.name} (${roleText})`;

    document.getElementById("openTickets").textContent = data.kpis.open_tickets;
    document.getElementById("closedToday").textContent = data.kpis.closed_today;
    document.getElementById("totalTickets").textContent = data.kpis.total_tickets;
    document.getElementById("avgHours").textContent = data.kpis.avg_hours_to_fix;
    document.getElementById("plantHealth").textContent = data.kpis.plant_health_pct + "%";

    const downEl = document.getElementById("machinesDown");
    downEl.textContent = `${data.kpis.machines_down} of ${data.kpis.total_machines}`;
    downEl.classList.toggle("kpi-danger", data.kpis.machines_down > 0);

    const urgentEl = document.getElementById("urgentOpen");
    urgentEl.textContent = data.kpis.urgent_open ?? "—";
    urgentEl.classList.toggle("kpi-warning", (data.kpis.urgent_open || 0) > 0);

    // Stale machines KPI
    const staleEl = document.getElementById("staleMachines");
    if (staleEl) {
      const stale = data.kpis.stale_machines || 0;
      staleEl.textContent = stale;
      staleEl.classList.toggle("kpi-warning", stale > 0);
    }

    dashFirstLoad = false;
    renderAutoInsights(data.auto_insights || {});
    renderCustomKpis(data.custom_kpis || []);

    renderAttention(data.needs_attention || []);
    renderTrend(data.weekly_trend || []);
    renderSupervisorGrid(data);

    const list = document.getElementById("activityList");
    if (data.recent_activity.length === 0) {
      list.innerHTML = `<p class="placeholder">No recent tickets</p>`;
    } else {
      list.innerHTML = data.recent_activity.map(r => `
        <div class="activity-row">
          <div class="activity-main">
            <div class="ticket-id">${escapeHtml(r.ticket_id)}</div>
            <div class="ticket-machine">${escapeHtml(r.machine_name)}</div>
          </div>
          <div class="activity-status">
            <span class="status-badge status-${escapeHtml(r.status || '').toLowerCase()}">${escapeHtml(r.status)}</span>
            <span class="urgency-${r.urgency ? escapeHtml(r.urgency).toLowerCase() : ""}">${escapeHtml(r.urgency || "—")}</span>
          </div>
        </div>
      `).join("");
    }
  } catch (e) {
    console.error("Dashboard fetch error:", e);
    if (dashFirstLoad) {
      const attList = document.getElementById("attentionList");
      if (attList) attList.innerHTML = '<p class="placeholder" style="color:#ef4444;">Failed to connect — the server may be starting up. Retrying…</p>';
    }
    throw e;
  }
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
}

function daysAgo(reportedAt) {
  if (!reportedAt) return "";
  const d = new Date(String(reportedAt).replace(" ", "T"));
  if (isNaN(d)) return "";
  const days = Math.floor((Date.now() - d.getTime()) / 86400000);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  return `open ${days} days`;
}

function renderAttention(items) {
  const list = document.getElementById("attentionList");
  if (items.length === 0) {
    list.innerHTML = `<p class="placeholder">Nothing open — plant is healthy</p>`;
    return;
  }
  list.innerHTML = items.map(t => `
    <div class="activity-row attention-${(t.urgency || "low").toLowerCase()}">
      <div class="activity-main">
        <div class="ticket-id">${escapeHtml(t.machine_name || "")}</div>
        <div class="ticket-machine">${escapeHtml(t.description || "")}
          ${daysAgo(t.reported_at) ? " · " + daysAgo(t.reported_at) : ""}</div>
      </div>
      <div class="activity-status">
        <span class="urgency-${(t.urgency || "low").toLowerCase()}">${escapeHtml(t.urgency || "—")}</span>
      </div>
    </div>
  `).join("");
}

function renderTrend(weeks) {
  const chart = document.getElementById("trendChart");
  if (weeks.length === 0) {
    chart.innerHTML = `<p class="placeholder">No data yet</p>`;
    return;
  }
  const max = Math.max(1, ...weeks.map(w => w.count));
  chart.innerHTML = weeks.map(w => `
    <div class="trend-col">
      <div class="trend-count">${w.count}</div>
      <div class="trend-bar" style="height:${Math.round(w.count / max * 100)}%;"></div>
      <div class="trend-week">${escapeHtml(w.week_start)}</div>
    </div>
  `).join("");
}

function showDashboard() {
  document.getElementById("dashScreen").style.display = "block";
  loadDashboard();

  if (window.tfDashPollingStarted) return;
  window.tfDashPollingStarted = true;

  let pollInterval = 5000;
  let pollTimer = null;
  let failures = 0;

  function schedulePoll() {
    pollTimer = setTimeout(async () => {
      if (document.hidden) { schedulePoll(); return; }
      try {
        await loadDashboard();
        failures = 0;
        pollInterval = 5000;
      } catch (e) {
        failures++;
        pollInterval = Math.min(5000 * Math.pow(2, failures), 60000);
      }
      schedulePoll();
    }, pollInterval);
  }

  document.addEventListener("visibilitychange", () => {
    if (!document.hidden && pollTimer) {
      clearTimeout(pollTimer);
      loadDashboard();
      schedulePoll();
    }
  });

  schedulePoll();
}

document.getElementById("logoutBtn").addEventListener("click", () => {
  localStorage.removeItem("tf_token");
  localStorage.removeItem("tf_user");
  window.location.href = "vault.html";
});

// ===== Auto Insights =====
function renderAutoInsights(insights) {
  document.getElementById("mtbfHours").textContent = insights.mtbf_hours || "—";
  document.getElementById("mttrHours").textContent = insights.mttr_hours || "—";

  const rpEl = document.getElementById("repeatPct");
  rpEl.textContent = (insights.repeat_breakdown_pct ?? "—") + (insights.repeat_breakdown_pct != null ? "%" : "");
  rpEl.classList.toggle("kpi-danger", (insights.repeat_breakdown_pct || 0) > 15);
  rpEl.classList.toggle("kpi-warning", (insights.repeat_breakdown_pct || 0) > 5 && (insights.repeat_breakdown_pct || 0) <= 15);

  const topEl = document.getElementById("topProblem");
  if (insights.top_problem_machines && insights.top_problem_machines.length > 0) {
    const top = insights.top_problem_machines[0];
    topEl.textContent = top.machine_name || top.machine_id;
    topEl.title = `${top.ticket_count} tickets in last 30 days`;
  } else {
    topEl.textContent = "—";
  }
}

// ===== Custom KPIs =====
function renderCustomKpis(kpis) {
  const grid = document.getElementById("customKpiGrid");
  const placeholder = document.getElementById("addKpiPlaceholder");

  grid.querySelectorAll(".custom-kpi-card").forEach(el => el.remove());

  kpis.forEach(kpi => {
    const card = document.createElement("div");
    card.className = `kpi-card custom-kpi-card kpi-status-${kpi.status || "normal"}`;
    card.innerHTML = `
      <span class="custom-kpi-tag">${escapeHtml(kpi.kpi_type)}</span>
      <div class="kpi-number">${escapeHtml(kpi.value)}</div>
      <div class="kpi-label">${escapeHtml(kpi.kpi_name)}${kpi.target ? ' (target: ' + escapeHtml(kpi.target) + ')' : ''}</div>
    `;
    grid.insertBefore(card, placeholder);
  });

  // Show manual entry form for manual-type KPIs
  const manualKpis = kpis.filter(k => k.kpi_type === "manual" && k.value === "—");
  const entrySection = document.getElementById("manualEntrySection");
  const entryForm = document.getElementById("manualEntryForm");
  if (manualKpis.length > 0) {
    entrySection.style.display = "block";
    entryForm.innerHTML = manualKpis.map(k => `
      <div class="manual-entry-item">
        <label>${escapeHtml(k.kpi_name)} ${k.unit ? '(' + escapeHtml(k.unit) + ')' : ''}</label>
        <input type="text" id="entry-${k.kpi_id}" placeholder="Value">
        <button onclick="submitManualEntry('${k.kpi_id}')">Save</button>
      </div>
    `).join("");
  } else {
    entrySection.style.display = "none";
  }
}

async function submitManualEntry(kpiId) {
  const input = document.getElementById("entry-" + kpiId);
  if (!input || !input.value.trim()) return;
  const token = localStorage.getItem("tf_token");
  try {
    await fetch(`${BACKEND_URL}/vault/kpis/data`, {
      method: "POST",
      headers: {"Authorization": `Bearer ${token}`, "Content-Type": "application/json"},
      body: JSON.stringify({kpi_id: kpiId, value: input.value.trim()}),
    });
    input.value = "";
    loadDashboard();
  } catch(e) { console.error("Manual entry error:", e); }
}

// ===== KPI Settings Modal =====
document.getElementById("openKpiSettings").addEventListener("click", () => {
  document.getElementById("kpiModal").style.display = "flex";
  loadKpiConfigs();
});

document.getElementById("closeKpiModal").addEventListener("click", () => {
  document.getElementById("kpiModal").style.display = "none";
});

document.getElementById("kpiModal").addEventListener("click", (e) => {
  if (e.target === document.getElementById("kpiModal")) {
    document.getElementById("kpiModal").style.display = "none";
  }
});

async function loadKpiConfigs() {
  const token = localStorage.getItem("tf_token");
  try {
    const resp = await fetch(`${BACKEND_URL}/vault/kpis`, {
      headers: {"Authorization": `Bearer ${token}`},
    });
    if (!resp.ok) return;
    const data = await resp.json();
    renderKpiConfigList(data.configs || []);
  } catch(e) { console.error("KPI config load error:", e); }
}

function renderKpiConfigList(configs) {
  const list = document.getElementById("kpiConfigList");
  if (configs.length === 0) {
    list.innerHTML = `<p class="placeholder" style="padding:16px;">No custom KPIs configured yet. Add one below.</p>`;
    return;
  }
  list.innerHTML = configs.map(c => `
    <div class="kpi-config-row">
      <div class="kpi-config-info">
        <div class="kpi-config-name">${escapeHtml(c.kpi_name)}</div>
        <div class="kpi-config-meta">${c.unit ? escapeHtml(c.unit) : '—'} · Target: ${c.target_value || '—'} · Warning: ${c.warning_threshold || '—'} · Critical: ${c.critical_threshold || '—'}</div>
      </div>
      <span class="kpi-type-badge kpi-type-${c.kpi_type}">${escapeHtml(c.kpi_type)}</span>
      ${isOwner() ? `<button class="btn-delete" onclick="deleteKpi('${c.kpi_id}')">Delete</button>` : ''}
    </div>
  `).join("");
}

document.getElementById("saveNewKpi").addEventListener("click", async () => {
  const name = document.getElementById("newKpiName").value.trim();
  const errDiv = document.getElementById("kpiFormError");
  if (!name) { errDiv.textContent = "KPI name is required."; return; }

  const token = localStorage.getItem("tf_token");
  const body = {
    kpi_name: name,
    kpi_type: document.getElementById("newKpiType").value,
    unit: document.getElementById("newKpiUnit").value.trim(),
    target_value: document.getElementById("newKpiTarget").value.trim(),
    cost_per_hour: document.getElementById("newKpiCost").value.trim(),
    warning_threshold: document.getElementById("newKpiWarning").value.trim(),
    critical_threshold: document.getElementById("newKpiCritical").value.trim(),
  };

  try {
    const resp = await fetch(`${BACKEND_URL}/vault/kpis`, {
      method: "POST",
      headers: {"Authorization": `Bearer ${token}`, "Content-Type": "application/json"},
      body: JSON.stringify(body),
    });
    if (!resp.ok) {
      const err = await resp.json();
      errDiv.textContent = err.detail || "Failed to add KPI.";
      return;
    }
    errDiv.textContent = "";
    document.getElementById("newKpiName").value = "";
    document.getElementById("newKpiUnit").value = "";
    document.getElementById("newKpiTarget").value = "";
    document.getElementById("newKpiCost").value = "";
    document.getElementById("newKpiWarning").value = "";
    document.getElementById("newKpiCritical").value = "";
    loadKpiConfigs();
    loadDashboard();
  } catch(e) { errDiv.textContent = "Error: " + e.message; }
});

async function deleteKpi(kpiId) {
  if (!confirm("Delete this KPI?")) return;
  const token = localStorage.getItem("tf_token");
  try {
    await fetch(`${BACKEND_URL}/vault/kpis/${kpiId}`, {
      method: "DELETE",
      headers: {"Authorization": `Bearer ${token}`},
    });
    loadKpiConfigs();
    loadDashboard();
  } catch(e) { console.error("Delete KPI error:", e); }
}

function renderSupervisorGrid(data) {
  const section = document.getElementById("supervisorOwnershipSection");
  const grid = document.getElementById("supervisorListGrid");
  if (!section || !grid) return;

  if (!isOwner()) {
    section.style.display = "none";
    return;
  }

  section.style.display = "block";
  const supervisors = data.supervisors || [];
  const unassigned = data.unassigned_machines || [];

  if (supervisors.length === 0 && unassigned.length === 0) {
    grid.innerHTML = '<p class="placeholder" style="grid-column: span 3; text-align: center; padding: 20px;">No supervisors or machines onboarded yet.</p>';
    return;
  }

  let html = "";

  supervisors.forEach(sup => {
    const riskMap = data.machine_risk_map || {};
    const machinesHtml = sup.machines.length === 0
      ? '<p class="placeholder" style="margin:8px 0; font-size:12px;">No machines assigned</p>'
      : sup.machines.map(m => {
          const risk = riskMap[m.machine_id] || "stale";
          const riskLabel = risk === "stale" ? "No data" : risk.charAt(0).toUpperCase() + risk.slice(1);
          return `
          <div class="supervisor-machine-row">
            <div class="machine-info">
              <span class="machine-name">${escapeHtml(m.machine_name)}</span>
              <span class="machine-id-loc">${escapeHtml(m.machine_id)} ${m.location ? '· ' + escapeHtml(m.location) : ''}</span>
            </div>
            <span class="risk-badge risk-${risk}">${riskLabel}</span>
          </div>`;
        }).join("");

    html += `
      <div class="supervisor-card">
        <div>
          <h3>${escapeHtml(sup.name)}</h3>
          <div class="supervisor-meta">
            ${sup.email ? '📧 ' + escapeHtml(sup.email) : ''} 
            ${sup.phone ? '<br>📱 ' + escapeHtml(sup.phone) : ''}
          </div>
        </div>
        <div class="supervisor-machines-list">
          <h4 style="margin: 8px 0 4px; font-size: 11px; text-transform: uppercase; color: var(--slate); letter-spacing: 0.05em;">Assigned Machines (${sup.machines.length})</h4>
          ${machinesHtml}
        </div>
      </div>
    `;
  });

  if (unassigned.length > 0) {
    const riskMap = data.machine_risk_map || {};
    const unassignedHtml = unassigned.map(m => {
      const risk = riskMap[m.machine_id] || "stale";
      const riskLabel = risk === "stale" ? "No data" : risk.charAt(0).toUpperCase() + risk.slice(1);
      return `
      <div class="supervisor-machine-row">
        <div class="machine-info">
          <span class="machine-name">${escapeHtml(m.machine_name)}</span>
          <span class="machine-id-loc">${escapeHtml(m.machine_id)} ${m.location ? '· ' + escapeHtml(m.location) : ''}</span>
        </div>
        <span class="risk-badge risk-${risk}">${riskLabel}</span>
      </div>`;
    }).join("");

    html += `
      <div class="supervisor-card" style="border-style: dashed; border-color: var(--slate-lt);">
        <div>
          <h3>Unassigned Assets</h3>
          <div class="supervisor-meta">Machines not linked to any supervisor profile</div>
        </div>
        <div class="supervisor-machines-list">
          <h4 style="margin: 8px 0 4px; font-size: 11px; text-transform: uppercase; color: var(--slate); letter-spacing: 0.05em;">Unlinked Machines (${unassigned.length})</h4>
          ${unassignedHtml}
        </div>
      </div>
    `;
  }

  grid.innerHTML = html;
}

// Auth gate — redirect to vault.html staff login if no token
if (requireAuth()) {
  showDashboard();
}
