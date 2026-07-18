/* ===========================================================
   TurboFix Document Vault — staff portal client
   Auth via Supabase; data via Supabase PostgREST.
   =========================================================== */

var SUPABASE_URL = (window.supabaseConfig && window.supabaseConfig.url) || "https://wcqgbleppiaddgfjrnpq.supabase.co";
var SUPABASE_ANON_KEY = (window.supabaseConfig && window.supabaseConfig.key) || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndjcWdibGVwcGlhZGRnZmpybnBxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM3Njg0NTAsImV4cCI6MjA5OTM0NDQ1MH0.FAOQMRMjOXrw4YsDf_wv4IhaUiXGoGB1q8Ye-ty2j7c";
var _sbClient = null;

function getSb() {
  if (_sbClient) return _sbClient;
  if (typeof window.supabase !== "undefined" && window.supabase.createClient) {
    _sbClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    return _sbClient;
  }
  throw new Error("Supabase client not loaded yet.");
}

var DEFAULT_API_BASE = SUPABASE_URL;

var state = {
  apiBase: SUPABASE_URL,
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
  try { getSb().auth.signOut(); } catch (_) {}
  $("vaultShell").style.display = "none";
  $("loginCard").style.display = "block";
  try { window.dispatchEvent(new Event("authChanged")); } catch (_) {}
}

function setSession(body) {
  state.token = body.access_token;
  state.user = body.user;
  localStorage.setItem("tf_token", state.token);
  localStorage.setItem("tf_user", JSON.stringify(state.user));
  try { window.dispatchEvent(new Event("authChanged")); } catch (_) {}
}

async function login(identifier, password) {
  var sb = getSb();
  var email = identifier.includes("@") ? identifier : identifier + "@phone.turbofix.co.in";
  var { data, error } = await sb.auth.signInWithPassword({ email: email, password: password });
  if (error) throw new Error(error.message || "Invalid credentials.");

  var session = data.session;
  var authUser = data.user;
  var meta = authUser.user_metadata || {};
  var appUser = {
    user_id: meta.user_id || authUser.id,
    name: meta.name || meta.full_name || email.split("@")[0],
    role: meta.role || "owner",
    company_code: meta.company_code || "",
  };

  if (!meta.role) {
    var { data: profileRows } = await sb.from("users").select("id,name,role,company_id").eq("email", identifier.includes("@") ? identifier : null).limit(1);
    if (profileRows && profileRows.length > 0) {
      var p = profileRows[0];
      appUser.name = p.name || appUser.name;
      appUser.role = p.role || appUser.role;
      appUser.user_id = p.id || appUser.user_id;
    }
  }

  setSession({ access_token: session.access_token, user: appUser });
}

async function registerCompany(formData) {
  var sb = getSb();
  var email = formData.get("owner_email");
  var password = formData.get("owner_password");
  var companyCode = formData.get("company_code").toUpperCase();
  var companyName = formData.get("company_name");
  var ownerName = formData.get("owner_name");
  var phone = formData.get("admin_contact_phone");

  if (!email || !password) throw new Error("Email and password are required.");
  if (password.length < 8) throw new Error("Password must be at least 8 characters.");

  var { data, error } = await sb.auth.signUp({
    email: email,
    password: password,
    options: {
      data: {
        name: ownerName,
        role: "owner",
        company_code: companyCode,
        company_name: companyName,
        phone: phone,
      }
    }
  });
  if (error) throw new Error(error.message || "Registration failed.");

  var userId = data.user ? data.user.id : null;
  if (userId) {
    await sb.from("companies").insert({
      name: companyName,
      domain: companyCode.toLowerCase(),
      status: "pending",
    });
  }

  return {
    status: "pending_approval",
    message: "Your company has been registered. A TurboFix admin will review and approve your account. Please check your email to verify your account.",
  };
}

async function addSupervisor(payload) {
  var sb = getSb();
  var { data, error } = await sb.auth.admin;
  // For now, insert directly into users table with supervisor role
  var { data: result, error: err } = await sb.from("users").insert({
    company_id: state.user.company_id || null,
    name: payload.name,
    phone: payload.phone,
    email: payload.email,
    role: "supervisor",
  }).select().single();
  if (err) throw new Error(err.message);
  return { name: result.name, user_id: result.id };
}

async function loadSupervisorsDropdown() {
  var select = $("newMachineSupervisor");
  var editSelect = $("editMachineSupervisor");
  var manageSelect = $("selectSupervisorAction");
  if (!select) return;
  select.innerHTML = '<option value="">-- Select Supervisor (Optional) --</option>';
  if (editSelect) {
    editSelect.innerHTML = '<option value="">-- Select Supervisor (Optional) --</option>';
  }
  if (manageSelect) {
    manageSelect.innerHTML = '<option value="new">-- Create New Supervisor --</option>';
  }
  try {
    var sb = getSb();
    var { data: directory, error } = await sb.functions.invoke("onboard_team_member", { body: { action: "list" } });
    if (error || directory?.error) throw new Error(directory?.error || error?.message || "Team directory could not be loaded.");
    state.supervisors = (directory?.members || []).filter(function(s) { return s.role === "supervisor"; });
    state.supervisors.forEach(function(s) {
      var opt = document.createElement("option");
      opt.value = s.user_id;
      opt.textContent = s.name + " (" + (s.email_masked || s.phone_masked || "contact not added") + ")";
      select.appendChild(opt);

      if (editSelect) {
        var opt3 = document.createElement("option");
        opt3.value = s.user_id;
        opt3.textContent = s.name + " (" + (s.email_masked || s.phone_masked || "contact not added") + ")";
        editSelect.appendChild(opt3);
      }

      if (manageSelect) {
        var opt2 = document.createElement("option");
        opt2.value = s.user_id;
        opt2.textContent = s.name + " (" + (s.email_masked || s.phone_masked || "contact not added") + ")";
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
  var sb = getSb();
  var { data: rows, error } = await sb.from("machines").select("id,name,location,assigned_technician_phone,informed_phone_1,supervisor_id,status,company_id,factory_id");
  if (error) throw new Error(error.message);
  state.machines = (rows || []).map(function(m) {
    return { machine_id: m.id, machine_name: m.name, location: m.location, assigned_technician_phone: m.assigned_technician_phone, informed_phones: [m.informed_phone_1], supervisor_id: m.supervisor_id, company_id: m.company_id, factory_id: m.factory_id };
  });
  var picker = $("machinePicker");
  picker.innerHTML = "";
  if (state.machines.length === 0) {
    picker.innerHTML = "<option>No machines registered</option>";
    return;
  }
  for (var i = 0; i < state.machines.length; i++) {
    var m = state.machines[i];
    var opt = document.createElement("option");
    opt.value = m.machine_id;
    opt.textContent = m.machine_name + " (" + m.machine_id.substring(0, 8) + ")";
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
  var sb = getSb();
  var profile = state.machines.length > 0 ? { company_id: state.machines[0].company_id, factory_id: state.machines[0].factory_id } : {};
  var { data, error } = await sb.from("machines").insert({
    company_id: profile.company_id,
    factory_id: profile.factory_id,
    name: body.machine_name,
    location: body.location,
    assigned_technician_phone: body.assigned_technician_phone,
    informed_phone_1: body.informed_phone_1,
    supervisor_id: body.supervisor_id || null,
    status: "healthy",
  }).select().single();
  if (error) throw new Error(error.message);
  return { machine_id: data.id, machine_name: data.name, location: data.location, wa_link: null };
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
  var list = $("documentsList");
  showLoading(list, "Loading documents…");
  var sb = getSb();
  var { data: docs, error } = await sb.from("documents").select("id,title,category,file_url,created_at").eq("machine_id", state.currentMachineId);
  if (error) throw new Error(error.message);
  docs = docs || [];
  list.innerHTML = "";
  if (docs.length === 0) {
    list.innerHTML = '<div class="vault-empty">No documents uploaded for this machine yet.</div>';
    return;
  }
  for (var i = 0; i < docs.length; i++) {
    var doc = docs[i];
    var card = document.createElement("div");
    card.className = "vault-card vault-doc-row";
    var fileName = doc.file_url ? doc.file_url.split("/").pop() : "";
    var dateStr = doc.created_at ? new Date(doc.created_at).toLocaleDateString() : "";
    card.innerHTML =
      '<div class="vault-doc-info">' +
        '<div class="vault-doc-title">' + escapeHtml(doc.title) + '</div>' +
        '<div class="vault-doc-meta">' +
          '<span class="vault-category-badge">' + (CATEGORY_LABELS[doc.category] || doc.category) + '</span> ' +
          escapeHtml(fileName) + ' · ' + escapeHtml(dateStr) +
        '</div>' +
      '</div>' +
      '<div class="vault-doc-actions">' +
        '<button class="vault-btn vault-btn-ghost" data-download="' + doc.id + '">Download</button>' +
        (canDelete() ? '<button class="vault-btn vault-btn-danger" data-delete="' + doc.id + '">Delete</button>' : '') +
      '</div>';
    list.appendChild(card);
  }

  list.querySelectorAll("[data-download]").forEach(function(btn) {
    btn.addEventListener("click", function() { downloadDocument(btn.dataset.download); });
  });
  list.querySelectorAll("[data-delete]").forEach(function(btn) {
    btn.addEventListener("click", function() { deleteDocument(btn.dataset.delete); });
  });
}

async function downloadDocument(documentId) {
  var sb = getSb();
  var { data: doc, error } = await sb.from("documents").select("file_url,title").eq("id", documentId).single();
  if (error || !doc) { showToast("Document not found.", "error"); return; }
  if (doc.file_url && doc.file_url.startsWith("http")) {
    window.open(doc.file_url, "_blank");
  } else if (doc.file_url) {
    var { data: signedData } = await sb.storage.from("machine-documents").createSignedUrl(doc.file_url, 300);
    if (signedData && signedData.signedUrl) {
      window.open(signedData.signedUrl, "_blank");
    } else {
      showToast("Could not generate download link.", "error");
    }
  }
}

async function deleteDocument(documentId) {
  if (!confirm("Delete this document? This cannot be undone.")) return;
  var sb = getSb();
  var { error } = await sb.from("documents").delete().eq("id", documentId);
  if (error) { showToast("Delete failed: " + error.message, "error"); return; }
  await loadDocuments();
}

async function uploadDocument(formData) {
  var sb = getSb();
  var file = formData.get("file");
  var machineId = formData.get("machine_id");
  var category = formData.get("category");
  var title = formData.get("title");
  var filePath = machineId + "/" + Date.now() + "_" + file.name;

  var { data: uploadData, error: uploadErr } = await sb.storage.from("machine-documents").upload(filePath, file);
  if (uploadErr) throw new Error(uploadErr.message);

  var fileUrl = uploadData.path || filePath;
  var { error: insertErr } = await sb.from("documents").insert({
    machine_id: machineId,
    title: title,
    category: category,
    file_url: fileUrl,
  });
  if (insertErr) throw new Error(insertErr.message);
  await loadDocuments();
}

// ---------------------------------------------------------------
// Spare parts + Consumables (same shape, thin wrappers)
// ---------------------------------------------------------------

async function loadParts(tableName, tbodySelector, emptyId, rowRenderer, deleteTable) {
  var tbody = document.querySelector(tbodySelector);
  tbody.innerHTML = '<tr><td colspan="6" class="vault-loading"><span class="vault-spinner"></span> Loading…</td></tr>';
  var sb = getSb();
  var { data: items, error } = await sb.from(tableName).select("*").eq("machine_id", state.currentMachineId);
  if (error) throw new Error(error.message);
  items = items || [];
  tbody.innerHTML = "";
  $(emptyId).style.display = items.length === 0 ? "block" : "none";
  for (var i = 0; i < items.length; i++) {
    var tr = document.createElement("tr");
    tr.innerHTML = rowRenderer(items[i]);
    tbody.appendChild(tr);
  }
  tbody.querySelectorAll("[data-delete-item]").forEach(function(btn) {
    btn.addEventListener("click", async function() {
      if (!confirm("Delete this item?")) return;
      await sb.from(deleteTable || tableName).delete().eq("id", btn.dataset.deleteItem);
      loadParts(tableName, tbodySelector, emptyId, rowRenderer, deleteTable);
    });
  });
}

function loadSpareParts() {
  return loadParts("parts", "#partsTable tbody", "partsEmpty", function(p) {
    return '<td>' + escapeHtml(p.part_name) + '</td>' +
      '<td>' + escapeHtml(p.part_number || "") + '</td>' +
      '<td>' + (p.stock_qty || 0) + ' ' + escapeHtml(p.unit || "") + '</td>' +
      '<td>' + (p.reorder_level || 0) + '</td>' +
      '<td>' + escapeHtml(p.supplier || "") + '</td>' +
      '<td>' + (canDelete() ? '<button class="vault-btn vault-btn-danger" data-delete-item="' + p.id + '">Delete</button>' : '') + '</td>';
  });
}

function loadConsumables() {
  return loadParts("consumables", "#consTable tbody", "consEmpty", function(c) {
    return '<td>' + escapeHtml(c.name) + '</td>' +
      '<td>' + (c.stock_qty || 0) + ' ' + escapeHtml(c.unit || "") + '</td>' +
      '<td>' + (c.reorder_level || 0) + '</td>' +
      '<td></td>' +
      '<td>' + (canDelete() ? '<button class="vault-btn vault-btn-danger" data-delete-item="' + c.id + '">Delete</button>' : '') + '</td>';
  });
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
      window.location.replace(new URL("dashboard.html", window.location.href).href);
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
      var sb = getSb();
      var { error: delErr } = await sb.from("users").delete().eq("id", supervisorId);
      if (delErr) throw new Error(delErr.message);
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
        var sb = getSb();
        var { error: updateErr } = await sb.from("users").update(payload).eq("id", supervisorId);
        if (updateErr) throw new Error(updateErr.message);
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
      var sb = getSb();
      var profile = state.machines.length > 0 ? { factory_id: state.machines[0].factory_id } : {};
      var { error: partErr } = await sb.from("parts").insert({
        machine_id: state.currentMachineId,
        factory_id: profile.factory_id,
        part_name: $("partName").value,
        part_number: $("partNumber").value,
        stock_qty: Number($("partQty").value) || 0,
        unit: $("partUnit").value,
        reorder_level: Number($("partReorder") ? $("partReorder").value : 0) || 0,
        supplier: $("partSupplier").value,
        lead_time_days: Number($("partLeadTime") ? $("partLeadTime").value : 7) || 7,
      });
      if (partErr) throw new Error(partErr.message);
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
      var sb = getSb();
      var profile = state.machines.length > 0 ? { factory_id: state.machines[0].factory_id } : {};
      var { error: consErr } = await sb.from("consumables").insert({
        machine_id: state.currentMachineId,
        factory_id: profile.factory_id,
        name: $("consName").value,
        stock_qty: Number($("consQty").value) || 0,
        unit: $("consUnit").value,
        reorder_level: Number($("consReorder") ? $("consReorder").value : 0) || 0,
        lead_time_days: Number($("consLeadTime") ? $("consLeadTime").value : 7) || 7,
        buffer_days: Number($("consBuffer") ? $("consBuffer").value : 3) || 3,
        frequency_days: Number($("consFrequency") ? $("consFrequency").value : 90) || null,
        last_replaced_at: $("consLastReplaced") && $("consLastReplaced").value ? $("consLastReplaced").value : null,
      });
      if (consErr) throw new Error(consErr.message);
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

      var sb = getSb();
      var { error: machErr } = await sb.from("machines").update({
        name: payload.machine_name,
        location: payload.location,
        assigned_technician_phone: payload.assigned_technician_phone,
        informed_phone_1: payload.informed_phone_1,
        supervisor_id: payload.supervisor_id || null,
      }).eq("id", state.currentMachineId);
      if (machErr) throw new Error(machErr.message);
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
      window.location.replace(new URL("dashboard.html", window.location.href).href);
    }
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initVault);
} else {
  initVault();
}
