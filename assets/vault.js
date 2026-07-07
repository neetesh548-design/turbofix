/* ===========================================================
   TurboFix Document Vault — staff portal client
   Talks directly to the TurboFix backend's Phase 5 vault API
   (POST /auth/login, /vault/documents, /vault/spare-parts,
   /vault/consumables). This page has no build step, same as
   the rest of demo-site.
   =========================================================== */

const DEFAULT_API_BASE = "http://localhost:8000";

const state = {
  apiBase: sessionStorage.getItem("tf_vault_api_base") || DEFAULT_API_BASE,
  token: sessionStorage.getItem("tf_vault_token") || null,
  user: JSON.parse(sessionStorage.getItem("tf_vault_user") || "null"),
  machines: [],
  currentMachineId: null,
};

const $ = (id) => document.getElementById(id);

function apiUrl(path) {
  return state.apiBase.replace(/\/$/, "") + path;
}

async function apiFetch(path, options = {}) {
  const headers = options.headers || {};
  if (state.token) headers["Authorization"] = "Bearer " + state.token;
  const resp = await fetch(apiUrl(path), { ...options, headers });
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

// ---------------------------------------------------------------
// Auth
// ---------------------------------------------------------------

function canWrite() {
  return state.user && (state.user.role === "owner" || state.user.role === "maintenance_head");
}

function logout() {
  state.token = null;
  state.user = null;
  sessionStorage.removeItem("tf_vault_token");
  sessionStorage.removeItem("tf_vault_user");
  $("vaultShell").style.display = "none";
  $("loginCard").style.display = "block";
}

async function login(identifier, password) {
  const resp = await fetch(apiUrl("/auth/login"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identifier, password }),
  });
  if (!resp.ok) {
    let detail = "Invalid credentials.";
    try { detail = (await resp.json()).detail || detail; } catch (_) {}
    throw new Error(detail);
  }
  const body = await resp.json();
  state.token = body.access_token;
  state.user = body.user;
  sessionStorage.setItem("tf_vault_token", state.token);
  sessionStorage.setItem("tf_vault_user", JSON.stringify(state.user));
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
  const qr = qrcode(0, "M");
  qr.addData(text);
  qr.make();
  container.innerHTML = qr.createSvgTag({ cellSize: 5, margin: 4 });
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

  $("printTag").innerHTML = `
    <div id="printQr"></div>
    <div class="print-tag-name">${escapeHtml(machine.machine_name)}</div>
    <div class="print-tag-id">${escapeHtml(machine.machine_id)}</div>
    ${machine.location ? `<div class="print-tag-location">${escapeHtml(machine.location)}</div>` : ""}
  `;
  renderQrInto($("printQr"), qrText);

  $("newMachineResult").style.display = "block";
}

// ---------------------------------------------------------------
// Documents
// ---------------------------------------------------------------

const CATEGORY_LABELS = {
  manual: "Manual",
  circuit_diagram: "Circuit diagram",
  hydraulic_diagram: "Hydraulic diagram",
  spare_parts_catalog: "Spare parts catalog",
  other: "Other",
};

async function loadDocuments() {
  const resp = await apiFetch(`/vault/documents?machine_id=${encodeURIComponent(state.currentMachineId)}`);
  const docs = await resp.json();
  const list = $("documentsList");
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
        ${canWrite() ? `<button class="vault-btn vault-btn-danger" data-delete="${doc.document_id}">Delete</button>` : ""}
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
  await apiFetch("/vault/documents", { method: "POST", body: formData });
  await loadDocuments();
}

// ---------------------------------------------------------------
// Spare parts + Consumables (same shape, thin wrappers)
// ---------------------------------------------------------------

async function loadParts(kindPath, tbodySelector, emptyId, rowRenderer) {
  const resp = await apiFetch(`/vault/${kindPath}?machine_id=${encodeURIComponent(state.currentMachineId)}`);
  const items = await resp.json();
  const tbody = document.querySelector(tbodySelector);
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
    <td>${canWrite() ? `<button class="vault-btn vault-btn-danger" data-delete-item="${p.part_id}">Delete</button>` : ""}</td>
  `);
}

function loadConsumables() {
  return loadParts("consumables", "#consTable tbody", "consEmpty", (c) => `
    <td>${escapeHtml(c.name)}</td>
    <td>${c.quantity_on_hand} ${escapeHtml(c.unit || "")}</td>
    <td>${c.reorder_level}</td>
    <td>${escapeHtml(c.notes || "")}</td>
    <td>${canWrite() ? `<button class="vault-btn vault-btn-danger" data-delete-item="${c.consumable_id}">Delete</button>` : ""}</td>
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
  $("vaultShell").style.display = "block";
  renderUserBar();
  try {
    await loadMachines();
    await refreshActivePanel();
  } catch (err) {
    showError($("vaultError"), err.message);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  $("apiBaseInput").value = state.apiBase;
  $("apiBaseInput").addEventListener("change", (e) => {
    state.apiBase = e.target.value.trim() || DEFAULT_API_BASE;
    sessionStorage.setItem("tf_vault_api_base", state.apiBase);
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

  $("machinePicker").addEventListener("change", async (e) => {
    state.currentMachineId = e.target.value;
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
    const formData = new FormData();
    formData.append("machine_id", state.currentMachineId);
    formData.append("category", $("uploadCategory").value);
    formData.append("title", $("uploadTitle").value);
    formData.append("file", fileInput.files[0]);
    try {
      await uploadDocument(formData);
      e.target.reset();
      $("uploadCard").style.display = "none";
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
      const machine = await createMachine({
        machine_name: $("newMachineName").value,
        location: $("newMachineLocation").value,
        assigned_technician_phone: $("newMachineTechPhone").value,
        informed_phone_1: $("newMachineInformed1").value,
      });
      e.target.reset();
      $("addMachineCard").style.display = "none";
      await loadMachines();
      state.currentMachineId = machine.machine_id;
      $("machinePicker").value = machine.machine_id;
      await refreshActivePanel();
      showNewMachineResult(machine);
    } catch (err) {
      showError($("vaultError"), err.message);
    }
  });

  $("printTagBtn").addEventListener("click", () => window.print());
  $("dismissNewMachineBtn").addEventListener("click", () => {
    $("newMachineResult").style.display = "none";
  });

  // Already-logged-in (token still in this tab's sessionStorage) — skip the login screen.
  if (state.token && state.user) {
    enterVault();
  }
});
