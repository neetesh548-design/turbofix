/* ===========================================================
   TurboFix Document Vault — staff portal client
   Talks directly to the TurboFix backend's Phase 5 vault API
   (POST /auth/login, /vault/documents, /vault/spare-parts,
   /vault/consumables). This page has no build step, same as
   the rest of demo-site.
   =========================================================== */

var storedApiBase = localStorage.getItem("tf_api_base");
var defaultApiBase = "https://turbofix-backend-ehxb.onrender.com";
var isLocal = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1" || window.location.protocol === "file:";
if (isLocal) {
  defaultApiBase = "http://127.0.0.1:8000";
}
var DEFAULT_API_BASE = defaultApiBase;

var state = {
  apiBase: (isLocal && storedApiBase === "https://turbofix-backend-ehxb.onrender.com") ? defaultApiBase : (storedApiBase || defaultApiBase),
  token: localStorage.getItem("tf_token") || null,
  user: JSON.parse(localStorage.getItem("tf_user") || "null"),
  machines: [],
  supervisors: [],
  currentMachineId: null,
};

function showConnecting(show) {
  let overlay = document.getElementById("connectingOverlay");
  if (show && !overlay) {
    overlay = document.createElement("div");
    overlay.id = "connectingOverlay";
    overlay.className = "vault-connecting-overlay";
    overlay.innerHTML = '<div class="vault-connecting-card"><span class="vault-spinner"></span><div><strong>Connecting to server…</strong><br><span style="font-size:0.82rem;color:var(--slate)">The backend may be waking up. This usually takes 15–30 seconds.</span></div></div>';
    document.body.appendChild(overlay);
  } else if (!show && overlay) {
    overlay.remove();
  }
}

async function safeFetch(url, options, _retried = false) {
  try {
    return await fetch(url, options);
  } catch (err) {
    console.error("Fetch error:", err);
    if (!_retried) {
      showConnecting(true);
      try {
        await fetch(state.apiBase.replace(/\/$/, "") + "/health");
      } catch (_) { /* ignore */ }
      await new Promise(r => setTimeout(r, 3000));
      try {
        const result = await safeFetch(url, options, true);
        showConnecting(false);
        return result;
      } catch (e) {
        showConnecting(false);
        throw e;
      }
    }
    throw new Error("Connection failed — the backend may be starting up. Please wait a moment and try again.");
  }
}

var $ = (id) => document.getElementById(id);

function showLoading(container, message = "Loading…") {
  if (typeof container === "string") container = $(container);
  if (!container) return;
  container.innerHTML = `<div class="vault-loading"><span class="vault-spinner"></span> ${message}</div>`;
}

function apiUrl(path) {
  return state.apiBase.replace(/\/$/, "") + path;
}

async function apiFetch(path, options = {}) {
  if (isTokenExpired(state.token)) {
    logout();
    throw new Error("Your session has expired — please sign in again.");
  }
  const headers = options.headers || {};
  if (state.token) headers["Authorization"] = "Bearer " + state.token;
  const resp = await safeFetch(apiUrl(path), { ...options, headers });
  if (resp.status === 401) {
    logout();
    throw new Error("Session expired — please log in again.");
  }
  if (!resp.ok) {
    let detail = resp.statusText;
    try {
      const body = await resp.json();
      detail = body.detail || detail;
    } catch (_) { /* not JSON */ }
    throw new Error(detail);
  }
  return resp;
}

function showError(el, message) {
  el.textContent = message;
  el.classList.add("show");
}
function clearError(el) {
  el.textContent = "";
  el.classList.remove("show");
}

function showToast(message, type = "success") {
  let container = document.getElementById("vaultToastContainer");
  if (!container) {
    container = document.createElement("div");
    container.id = "vaultToastContainer";
    container.className = "vault-toast-container";
    document.body.appendChild(container);
  }
  const toast = document.createElement("div");
  toast.className = "vault-toast vault-toast-" + type;
  toast.textContent = message;
  container.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add("show"));
  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// ---------------------------------------------------------------
// Auth
// ---------------------------------------------------------------

function isTokenExpired(token) {
  if (!token) return true;
  try {
    const payload = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    if (!payload.exp) return false;
    return Date.now() >= payload.exp * 1000;
  } catch (_) {
    return false;
  }
}

function canWrite() {
  return state.user && (state.user.role === "owner" || state.user.role === "maintenance_head" || state.user.role === "supervisor");
}

function canDelete() {
  return state.user && state.user.role === "owner";
}

function logout() {
  state.token = null;
  state.user = null;
  localStorage.removeItem("tf_token");
  localStorage.removeItem("tf_user");
  localStorage.removeItem("dashToken");
  localStorage.removeItem("dashUser");
  $("vaultShell").style.display = "none";
  $("loginCard").style.display = "block";
}

function setSession(body) {
  state.token = body.access_token;
  state.user = body.user;
  localStorage.setItem("tf_token", state.token);
  localStorage.setItem("tf_user", JSON.stringify(state.user));
}

async function login(identifier, password) {
  const resp = await safeFetch(apiUrl("/auth/login"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identifier, password }),
  });
  if (!resp.ok) {
    let detail = "Invalid credentials.";
    try { detail = (await resp.json()).detail || detail; } catch (_) {}
    if (resp.status === 403) throw new Error(detail);
    throw new Error(detail);
  }
  setSession(await resp.json());
}

async function registerCompany(formData) {
  const resp = await safeFetch(apiUrl("/auth/register"), {
    method: "POST",
    body: formData,
  });
  if (!resp.ok) {
    let detail = "Registration failed.";
    try { detail = (await resp.json()).detail || detail; } catch (_) {}
    throw new Error(detail);
  }
  return resp.json();
}

async function addSupervisor(payload) {
  const resp = await apiFetch("/auth/supervisors", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return resp.json();
}

async function loadSupervisorsDropdown() {
  const select = $("newMachineSupervisor");
  const editSelect = $("editMachineSupervisor");
  const manageSelect = $("selectSupervisorAction");
  if (!select) return;
  select.innerHTML = '<option value="">-- Select Supervisor (Optional) --</option>';
  if (editSelect) {
    editSelect.innerHTML = '<option value="">-- Select Supervisor (Optional) --</option>';
  }
  if (manageSelect) {
    manageSelect.innerHTML = '<option value="new">-- Create New Supervisor --</option>';
  }
  try {
    const resp = await apiFetch("/vault/supervisors");
    if (!resp.ok) return;
    state.supervisors = await resp.json();
    state.supervisors.forEach(s => {
      const opt = document.createElement("option");
      opt.value = s.user_id;
      opt.textContent = `${s.name} (${s.email || s.phone || "no contact info"})`;
      select.appendChild(opt);

      if (editSelect) {
        const opt3 = document.createElement("option");
        opt3.value = s.user_id;
        opt3.textContent = `${s.name} (${s.email || s.phone || "no contact info"})`;
        editSelect.appendChild(opt3);
      }

      if (manageSelect) {
        const opt2 = document.createElement("option");
        opt2.value = s.user_id;
        opt2.textContent = `${s.name} (${s.email || s.phone || "no contact info"})`;
        manageSelect.appendChild(opt2);
      }
    });
  } catch (err) {
    console.error("Failed to load supervisors:", err);
  }
}

function renderUserBar() {
  $("whoName").textContent = state.user.name;
  $("whoCompany").textContent = " · " + state.user.company_code;
  const roleLabel = state.user.role.replace("_", " ");
  const badge = $("whoRole");
  badge.textContent = roleLabel + (canWrite() ? "" : " (read-only)");
  badge.classList.toggle("read-only", !canWrite());

  $("uploadToggleWrap").style.display = canWrite() ? "block" : "none";
  $("addPartToggleWrap").style.display = canWrite() ? "block" : "none";
  $("addConsToggleWrap").style.display = canWrite() ? "block" : "none";
  $("addMachineToggleWrap").style.display = canWrite() ? "block" : "none";
  $("addSupervisorToggleWrap").style.display = canDelete() ? "block" : "none";

  const isOwner = state.user && state.user.role === "owner";
  $("editMachineToggleBtn").style.display = isOwner ? "block" : "none";

  const supGroup = $("newMachineSupervisorGroup");
  if (supGroup) {
    supGroup.style.display = isOwner ? "block" : "none";
    if (isOwner) {
      loadSupervisorsDropdown();
    }
  }
}

// ---------------------------------------------------------------
// Machines
// ---------------------------------------------------------------

async function loadMachines() {
  const resp = await apiFetch("/vault/machines");
  state.machines = await resp.json();
  const picker = $("machinePicker");
  picker.innerHTML = "";
  if (state.machines.length === 0) {
    picker.innerHTML = "<option>No machines registered</option>";
    return;
  }
  for (const m of state.machines) {
    const opt = document.createElement("option");
    opt.value = m.machine_id;
    opt.textContent = `${m.machine_name} (${m.machine_id})`;
    picker.appendChild(opt);
  }
  state.currentMachineId = state.machines[0].machine_id;
  picker.value = state.currentMachineId;
}

// ---------------------------------------------------------------
// Add machine (self-service onboarding + QR tag)
// ---------------------------------------------------------------

function renderQrInto(container, text) {
  container.innerHTML = "";
  container.style.position = "relative";
  container.style.display = "inline-block";

  const qr = qrcode(0, "H"); // Use Level H to tolerate up to 30% coverage
  qr.addData(text);
  qr.make();

  const qrSvg = qr.createSvgTag({ cellSize: 5, margin: 4 });
  
  // Center logo overlay
  const logoHtml = `
    <div class="qr-brand-overlay" style="
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: white;
      border: 2px solid #22a35a;
      border-radius: 4px;
      padding: 2px 6px;
      font-size: 11px;
      font-weight: bold;
      color: #125c31;
      letter-spacing: 0.5px;
      box-shadow: 0 2px 5px rgba(0,0,0,0.15);
      user-select: none;
      white-space: nowrap;
    ">TurboFix</div>
  `;
  container.innerHTML = qrSvg + logoHtml;
}

async function createMachine(body) {
  const resp = await apiFetch("/vault/machines", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return resp.json();
}

function showNewMachineResult(machine) {
  $("newMachineTitle").textContent = `${machine.machine_name} (${machine.machine_id})`;
  $("newMachineMeta").textContent = machine.location
    ? `Location: ${machine.location}`
    : "";

  const qrText = machine.wa_link || `https://wa.me/?text=${encodeURIComponent(`Issue with ${machine.machine_id}: `)}`;
  renderQrInto($("qrCanvas"), qrText);
  if (!machine.wa_link) {
    showError($("vaultError"), "WhatsApp number isn't configured on the backend (WHATSAPP_DISPLAY_NUMBER) — the QR link won't include a destination number until it's set.");
  }

  // Print tag HTML layout including marketing / support details
  $("printTag").innerHTML = `
    <div class="print-card">
      <div id="printQr"></div>
      <div class="print-tag-title">TurboFix QR Tag</div>
      <div class="print-tag-name">${escapeHtml(machine.machine_name)}</div>
      <div class="print-tag-id">Machine ID: ${escapeHtml(machine.machine_id)}</div>
      ${machine.location ? `<div class="print-tag-location">Location: ${escapeHtml(machine.location)}</div>` : ""}
      
      <div class="print-tag-footer">
        <div class="print-tag-action">Report machine issues in 2 minutes!</div>
        <div class="print-tag-subaction">Scan to open WhatsApp and report a fault</div>
        <div class="print-tag-contact">
          Need support? Call TurboFix: +91-9876543210
        </div>
        <div class="print-tag-powered">Powered by TurboFix — Smart Maintenance Assistant</div>
      </div>
    </div>
  `;
  renderQrInto($("printQr"), qrText);

  $("newMachineResult").style.display = "block";
}

// ---------------------------------------------------------------
// Documents
// ---------------------------------------------------------------

var CATEGORY_LABELS = {
  manual: "Manual",
  circuit_diagram: "Circuit diagram",
  hydraulic_diagram: "Hydraulic diagram",
  spare_parts_catalog: "Spare parts catalog",
  other: "Other",
};

async function loadDocuments() {
  const list = $("documentsList");
  showLoading(list, "Loading documents…");
  const resp = await apiFetch(`/vault/documents?machine_id=${encodeURIComponent(state.currentMachineId)}`);
  const docs = await resp.json();
  list.innerHTML = "";
  if (docs.length === 0) {
    list.innerHTML = '<div class="vault-empty">No documents uploaded for this machine yet.</div>';
    return;
  }
  for (const doc of docs) {
    const card = document.createElement("div");
    card.className = "vault-card vault-doc-row";
    card.innerHTML = `
      <div class="vault-doc-info">
        <div class="vault-doc-title">${escapeHtml(doc.title)}</div>
        <div class="vault-doc-meta">
          <span class="vault-category-badge">${CATEGORY_LABELS[doc.category] || doc.category}</span>
          ${escapeHtml(doc.file_name)} · uploaded by ${escapeHtml(doc.uploaded_by)} on ${escapeHtml(doc.uploaded_at)}
        </div>
      </div>
      <div class="vault-doc-actions">
        <button class="vault-btn vault-btn-ghost" data-download="${doc.document_id}">Download</button>
        ${canDelete() ? `<button class="vault-btn vault-btn-danger" data-delete="${doc.document_id}">Delete</button>` : ""}
      </div>`;
    list.appendChild(card);
  }

  list.querySelectorAll("[data-download]").forEach((btn) => {
    btn.addEventListener("click", () => downloadDocument(btn.dataset.download));
  });
  list.querySelectorAll("[data-delete]").forEach((btn) => {
    btn.addEventListener("click", () => deleteDocument(btn.dataset.delete));
  });
}

async function downloadDocument(documentId) {
  const resp = await apiFetch(`/vault/documents/${documentId}/download`);
  const blob = await resp.blob();
  const disposition = resp.headers.get("Content-Disposition") || "";
  const match = disposition.match(/filename="(.+)"/);
  const filename = match ? match[1] : "document";
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

async function deleteDocument(documentId) {
  if (!confirm("Delete this document? This cannot be undone.")) return;
  await apiFetch(`/vault/documents/${documentId}`, { method: "DELETE" });
  await loadDocuments();
}

async function uploadDocument(formData) {
  const progressWrap = document.createElement("div");
  progressWrap.className = "vault-upload-progress";
  progressWrap.innerHTML = `<div class="vault-progress-bar"><div class="vault-progress-fill" id="uploadProgressFill"></div></div><span class="vault-progress-text" id="uploadProgressText">Uploading… 0%</span>`;
  $("uploadCard").appendChild(progressWrap);

  try {
    await new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", apiUrl("/vault/documents"));
      if (state.token) xhr.setRequestHeader("Authorization", "Bearer " + state.token);
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const pct = Math.round((e.loaded / e.total) * 100);
          const fill = document.getElementById("uploadProgressFill");
          const text = document.getElementById("uploadProgressText");
          if (fill) fill.style.width = pct + "%";
          if (text) text.textContent = `Uploading… ${pct}%`;
        }
      };
      xhr.onload = () => {
        if (xhr.status === 401) { logout(); reject(new Error("Session expired")); return; }
        if (xhr.status >= 400) {
          let detail = xhr.statusText;
          try { detail = JSON.parse(xhr.responseText).detail || detail; } catch (_) {}
          reject(new Error(detail));
          return;
        }
        resolve();
      };
      xhr.onerror = () => reject(new Error("Upload failed — check your connection."));
      xhr.send(formData);
    });
    await loadDocuments();
  } finally {
    progressWrap.remove();
  }
}

// ---------------------------------------------------------------
// Spare parts + Consumables (same shape, thin wrappers)
// ---------------------------------------------------------------

async function loadParts(kindPath, tbodySelector, emptyId, rowRenderer) {
  const tbody = document.querySelector(tbodySelector);
  tbody.innerHTML = `<tr><td colspan="6" class="vault-loading"><span class="vault-spinner"></span> Loading…</td></tr>`;
  const resp = await apiFetch(`/vault/${kindPath}?machine_id=${encodeURIComponent(state.currentMachineId)}`);
  const items = await resp.json();
  tbody.innerHTML = "";
  $(emptyId).style.display = items.length === 0 ? "block" : "none";
  for (const item of items) {
    const tr = document.createElement("tr");
    tr.innerHTML = rowRenderer(item);
    tbody.appendChild(tr);
  }
  tbody.querySelectorAll("[data-delete-item]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      if (!confirm("Delete this item?")) return;
      await apiFetch(`/vault/${kindPath}/${btn.dataset.deleteItem}`, { method: "DELETE" });
      loadParts(kindPath, tbodySelector, emptyId, rowRenderer);
    });
  });
}

function loadSpareParts() {
  return loadParts("spare-parts", "#partsTable tbody", "partsEmpty", (p) => `
    <td>${escapeHtml(p.part_name)}</td>
    <td>${escapeHtml(p.part_number || "")}</td>
    <td>${p.quantity_on_hand} ${escapeHtml(p.unit || "")}</td>
    <td>${p.reorder_level}</td>
    <td>${escapeHtml(p.supplier || "")}</td>
    <td>${canDelete() ? `<button class="vault-btn vault-btn-danger" data-delete-item="${p.part_id}">Delete</button>` : ""}</td>
  `);
}

function loadConsumables() {
  return loadParts("consumables", "#consTable tbody", "consEmpty", (c) => `
    <td>${escapeHtml(c.name)}</td>
    <td>${c.quantity_on_hand} ${escapeHtml(c.unit || "")}</td>
    <td>${c.reorder_level}</td>
    <td>${escapeHtml(c.notes || "")}</td>
    <td>${canDelete() ? `<button class="vault-btn vault-btn-danger" data-delete-item="${c.consumable_id}">Delete</button>` : ""}</td>
  `);
}

// ---------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str == null ? "" : String(str);
  return div.innerHTML;
}

async function refreshActivePanel() {
  const active = document.querySelector(".vault-tab.active").dataset.panel;
  if (active === "documents") await loadDocuments();
  else if (active === "spare-parts") await loadSpareParts();
  else if (active === "consumables") await loadConsumables();
}

// ---------------------------------------------------------------
// Wiring
// ---------------------------------------------------------------

async function enterVault() {
  $("loginCard").style.display = "none";
  $("registerCard").style.display = "none";
  $("vaultShell").style.display = "block";
  renderUserBar();
  showLoading("documentsList", "Loading machines & documents…");
  try {
    await loadMachines();
    await refreshActivePanel();
  } catch (err) {
    showError($("vaultError"), err.message);
  }
}

function initVault() {
  $("apiBaseInput").value = state.apiBase;
  $("apiBaseInput").addEventListener("change", (e) => {
    state.apiBase = e.target.value.trim() || DEFAULT_API_BASE;
    localStorage.setItem("tf_api_base", state.apiBase);
  });

  $("loginForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const errEl = $("loginError");
    clearError(errEl);
    const btn = $("loginSubmit");
    btn.disabled = true;
    try {
      await login($("loginIdentifier").value.trim(), $("loginPassword").value);
      await enterVault();
    } catch (err) {
      showError(errEl, err.message);
    } finally {
      btn.disabled = false;
    }
  });

  $("logoutBtn").addEventListener("click", logout);

  $("showRegisterBtn").addEventListener("click", () => {
    $("loginCard").style.display = "none";
    $("registerCard").style.display = "block";
  });
  $("backToLoginBtn").addEventListener("click", () => {
    $("registerCard").style.display = "none";
    $("loginCard").style.display = "block";
  });
  $("registerForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const errEl = $("registerError");
    const successEl = $("registerSuccess");
    clearError(errEl);
    successEl.style.display = "none";
    const btn = $("registerSubmit");
    btn.disabled = true;
    try {
      const fileInput = $("regPaymentScreenshot");
      if (!fileInput.files || fileInput.files.length === 0) {
        throw new Error("Payment screenshot is required.");
      }
      
      const formData = new FormData();
      formData.append("company_code", $("regCompanyCode").value.trim());
      formData.append("company_name", $("regCompanyName").value.trim());
      formData.append("admin_contact_phone", $("regAdminPhone").value.trim());
      formData.append("owner_name", $("regOwnerName").value.trim());
      formData.append("owner_email", $("regOwnerEmail").value.trim());
      formData.append("owner_password", $("regOwnerPassword").value);
      formData.append("payment_screenshot", fileInput.files[0]);

      const result = await registerCompany(formData);
      e.target.reset();
      successEl.textContent = result.message || "Registration submitted! A TurboFix admin will review and approve your company.";
      successEl.style.display = "block";
    } catch (err) {
      showError(errEl, err.message);
    } finally {
      btn.disabled = false;
    }
  });

  $("addSupervisorToggleBtn").addEventListener("click", () => {
    const card = $("addSupervisorCard");
    card.style.display = card.style.display === "none" ? "block" : "none";
  });

  $("selectSupervisorAction").addEventListener("change", (e) => {
    const val = e.target.value;
    const titleEl = $("manageSupervisorTitle");
    const submitBtn = $("addSupervisorSubmit");
    const deleteBtn = $("deleteSupervisorBtn");
    const passwordLabel = $("supPasswordLabel");
    const passwordInput = $("supPassword");

    clearError($("addSupervisorError"));
    $("addSupervisorSuccess").style.display = "none";

    if (val === "new") {
      titleEl.textContent = "Manage Supervisor Accounts";
      submitBtn.textContent = "Create supervisor";
      deleteBtn.style.display = "none";
      passwordLabel.textContent = "Password";
      passwordInput.required = true;
      $("addSupervisorForm").reset();
    } else {
      const sup = state.supervisors.find(s => s.user_id === val);
      if (sup) {
        titleEl.textContent = `Edit Supervisor: ${sup.name}`;
        submitBtn.textContent = "Save changes";
        deleteBtn.style.display = "block";
        passwordLabel.textContent = "Password (leave blank to keep current)";
        passwordInput.required = false;

        $("supName").value = sup.name || "";
        $("supPhone").value = sup.phone || "";
        $("supEmail").value = sup.email || "";
        passwordInput.value = "";
      }
    }
  });

  $("deleteSupervisorBtn").addEventListener("click", async () => {
    const supervisorId = $("selectSupervisorAction").value;
    if (!supervisorId || supervisorId === "new") return;
    if (!confirm("Are you sure you want to delete this supervisor? This will also unassign them from any machines.")) return;

    const errEl = $("addSupervisorError");
    const successEl = $("addSupervisorSuccess");
    clearError(errEl);
    successEl.style.display = "none";

    try {
      const resp = await apiFetch(`/auth/supervisors/${supervisorId}`, {
        method: "DELETE"
      });
      if (!resp.ok) {
        throw new Error((await resp.json()).detail || "Failed to delete supervisor");
      }
      successEl.textContent = "Supervisor deleted successfully.";
      successEl.style.display = "block";
      
      $("selectSupervisorAction").value = "new";
      $("selectSupervisorAction").dispatchEvent(new Event("change"));
      
      await loadSupervisorsDropdown();
    } catch (err) {
      showError(errEl, err.message);
    }
  });

  $("addSupervisorForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const errEl = $("addSupervisorError");
    const successEl = $("addSupervisorSuccess");
    clearError(errEl);
    successEl.style.display = "none";

    const supervisorId = $("selectSupervisorAction").value;
    const isNew = supervisorId === "new";

    if (!$("supPhone").value.trim() && !$("supEmail").value.trim()) {
      showError(errEl, "Enter a phone or email so the supervisor can log in.");
      return;
    }

    const btn = $("addSupervisorSubmit");
    btn.disabled = true;
    try {
      if (isNew) {
        const result = await addSupervisor({
          name: $("supName").value.trim(),
          phone: $("supPhone").value.trim(),
          email: $("supEmail").value.trim(),
          password: $("supPassword").value,
        });
        e.target.reset();
        successEl.textContent = `Supervisor "${result.name}" created (${result.user_id}).`;
      } else {
        const payload = {
          name: $("supName").value.trim(),
          phone: $("supPhone").value.trim(),
          email: $("supEmail").value.trim(),
        };
        if ($("supPassword").value) {
          payload.password = $("supPassword").value;
        }
        const resp = await apiFetch(`/auth/supervisors/${supervisorId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        if (!resp.ok) {
          throw new Error((await resp.json()).detail || "Failed to update supervisor");
        }
        successEl.textContent = "Supervisor updated successfully.";

        $("selectSupervisorAction").value = "new";
        $("selectSupervisorAction").dispatchEvent(new Event("change"));
      }
      
      successEl.style.display = "block";
      await loadSupervisorsDropdown();
    } catch (err) {
      showError(errEl, err.message);
    } finally {
      btn.disabled = false;
    }
  });

  $("machinePicker").addEventListener("change", async (e) => {
    state.currentMachineId = e.target.value;
    
    // Refresh edit form if open
    const card = $("editMachineCard");
    if (card && card.style.display !== "none") {
      const machine = state.machines.find(m => m.machine_id === state.currentMachineId);
      if (machine) {
        $("editMachineName").value = machine.machine_name || "";
        $("editMachineLocation").value = machine.location || "";
        $("editMachineTechPhone").value = machine.assigned_technician_phone || "";
        $("editMachineInformed1").value = machine.informed_phones ? (machine.informed_phones[0] || "") : "";
        $("editMachineSupervisor").value = machine.supervisor_id || "";
      }
    }

    try {
      await refreshActivePanel();
    } catch (err) {
      showError($("vaultError"), err.message);
    }
  });

  document.querySelectorAll(".vault-tab").forEach((tab) => {
    tab.addEventListener("click", async () => {
      document.querySelectorAll(".vault-tab").forEach((t) => t.classList.remove("active"));
      document.querySelectorAll(".vault-panel").forEach((p) => p.classList.remove("active"));
      tab.classList.add("active");
      $("panel-" + tab.dataset.panel).classList.add("active");
      try {
        await refreshActivePanel();
      } catch (err) {
        showError($("vaultError"), err.message);
      }
    });
  });

  $("uploadToggleBtn").addEventListener("click", () => {
    const card = $("uploadCard");
    card.style.display = card.style.display === "none" ? "block" : "none";
  });
  $("uploadForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    clearError($("vaultError"));
    const fileInput = $("uploadFile");
    if (!fileInput.files.length) return;
    const file = fileInput.files[0];
    const MAX_SIZE_MB = 50;
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      showError($("vaultError"), `File is too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximum allowed size is ${MAX_SIZE_MB} MB.`);
      return;
    }
    const formData = new FormData();
    formData.append("machine_id", state.currentMachineId);
    formData.append("category", $("uploadCategory").value);
    formData.append("title", $("uploadTitle").value);
    formData.append("file", file);
    try {
      await uploadDocument(formData);
      e.target.reset();
      $("uploadCard").style.display = "none";
      showToast("Document uploaded successfully.");
    } catch (err) {
      showError($("vaultError"), err.message);
    }
  });

  $("addPartToggleBtn").addEventListener("click", () => {
    const card = $("addPartCard");
    card.style.display = card.style.display === "none" ? "block" : "none";
  });
  $("addPartForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    clearError($("vaultError"));
    try {
      await apiFetch("/vault/spare-parts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          machine_id: state.currentMachineId,
          part_name: $("partName").value,
          part_number: $("partNumber").value,
          quantity_on_hand: Number($("partQty").value) || 0,
          unit: $("partUnit").value,
          reorder_level: Number($("partReorder").value) || 0,
          supplier: $("partSupplier").value,
          notes: "",
        }),
      });
      e.target.reset();
      $("addPartCard").style.display = "none";
      await loadSpareParts();
      showToast("Spare part added.");
    } catch (err) {
      showError($("vaultError"), err.message);
    }
  });

  $("addConsToggleBtn").addEventListener("click", () => {
    const card = $("addConsCard");
    card.style.display = card.style.display === "none" ? "block" : "none";
  });
  $("addConsForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    clearError($("vaultError"));
    try {
      await apiFetch("/vault/consumables", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          machine_id: state.currentMachineId,
          name: $("consName").value,
          quantity_on_hand: Number($("consQty").value) || 0,
          unit: $("consUnit").value,
          reorder_level: Number($("consReorder").value) || 0,
          notes: "",
        }),
      });
      e.target.reset();
      $("addConsCard").style.display = "none";
      await loadConsumables();
      showToast("Consumable added.");
    } catch (err) {
      showError($("vaultError"), err.message);
    }
  });

  $("addMachineToggleBtn").addEventListener("click", () => {
    const card = $("addMachineCard");
    card.style.display = card.style.display === "none" ? "block" : "none";
  });
  $("addMachineForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    clearError($("vaultError"));
    try {
      const payload = {
        machine_name: $("newMachineName").value,
        location: $("newMachineLocation").value,
        assigned_technician_phone: $("newMachineTechPhone").value,
        informed_phone_1: $("newMachineInformed1").value,
      };
      if (state.user && state.user.role === "owner") {
        payload.supervisor_id = $("newMachineSupervisor").value;
      }
      const machine = await createMachine(payload);
      e.target.reset();
      $("addMachineCard").style.display = "none";
      await loadMachines();
      state.currentMachineId = machine.machine_id;
      $("machinePicker").value = machine.machine_id;
      await refreshActivePanel();
      showNewMachineResult(machine);
      showToast("Machine created — print the QR tag below.");
    } catch (err) {
      showError($("vaultError"), err.message);
    }
  });

  $("printTagBtn").addEventListener("click", () => window.print());
  $("dismissNewMachineBtn").addEventListener("click", () => {
    $("newMachineResult").style.display = "none";
  });

  $("printExistingTagBtn").addEventListener("click", () => {
    clearError($("vaultError"));
    const machine = state.machines.find(m => m.machine_id === state.currentMachineId);
    if (machine) {
      showNewMachineResult(machine);
    }
  });

  $("editMachineToggleBtn").addEventListener("click", () => {
    const card = $("editMachineCard");
    const isShowing = card.style.display !== "none";
    if (isShowing) {
      card.style.display = "none";
    } else {
      card.style.display = "block";
      const machine = state.machines.find(m => m.machine_id === state.currentMachineId);
      if (machine) {
        $("editMachineName").value = machine.machine_name || "";
        $("editMachineLocation").value = machine.location || "";
        $("editMachineTechPhone").value = machine.assigned_technician_phone || "";
        $("editMachineInformed1").value = machine.informed_phones ? (machine.informed_phones[0] || "") : "";
        $("editMachineSupervisor").value = machine.supervisor_id || "";
      }
    }
  });

  $("editMachineForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const errEl = $("editMachineError");
    const successEl = $("editMachineSuccess");
    clearError(errEl);
    successEl.style.display = "none";

    try {
      const payload = {
        machine_name: $("editMachineName").value.trim(),
        location: $("editMachineLocation").value.trim(),
        assigned_technician_phone: $("editMachineTechPhone").value.trim(),
        informed_phone_1: $("editMachineInformed1").value.trim(),
        supervisor_id: $("editMachineSupervisor").value,
      };

      const resp = await apiFetch(`/vault/machines/${state.currentMachineId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!resp.ok) {
        throw new Error((await resp.json()).detail || "Failed to update machine details");
      }
      successEl.textContent = "Machine details updated successfully.";
      successEl.style.display = "block";

      const currentSelected = state.currentMachineId;
      await loadMachines();
      state.currentMachineId = currentSelected;
      $("machinePicker").value = currentSelected;
      
      setTimeout(() => {
        successEl.style.display = "none";
        $("editMachineCard").style.display = "none";
      }, 1500);
    } catch (err) {
      showError(errEl, err.message);
    }
  });

  if (state.token && state.user) {
    if (isTokenExpired(state.token)) {
      logout();
      showError($("loginError"), "Your session has expired — please sign in again.");
    } else {
      enterVault();
    }
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initVault);
} else {
  initVault();
}
