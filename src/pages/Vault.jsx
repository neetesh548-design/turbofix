import React, { useEffect, useState } from 'react';
import MainLayout from '../layouts/MainLayout';
import { useLanguage } from '../LanguageContext';

export default function Vault() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { t } = useLanguage();

  useEffect(() => {
    // Scroll to top on mount
    window.scrollTo(0, 0);
    const script = document.createElement('script');
    script.src = `${import.meta.env.BASE_URL}assets/vault.js`;
    document.body.appendChild(script);

    const style = document.createElement('link');
    style.rel = 'stylesheet';
    style.href = `${import.meta.env.BASE_URL}assets/vault.css`;
    document.head.appendChild(style);
    
    return () => {
      script.remove();
      style.remove();
    };
  }, []);

  return (
    <MainLayout>
      <div dangerouslySetInnerHTML={{ __html: `
<section style="padding: 80px 0;">
  <div class="container vault-wrap">


  <!-- ============ LOGIN SCREEN ============ -->
  <div class="vault-login-card" id="loginCard">
    <h1>Staff sign-in</h1>
    <p class="sub">Manuals, circuit/hydraulic diagrams, spare parts (BOM) and consumables — for owner, supervisor, and maintenance head accounts only.</p>

    <div class="vault-error" id="loginError"></div>

    <form id="loginForm">
      <div class="vault-field">
        <label for="loginIdentifier">Phone or email</label>
        <input type="text" id="loginIdentifier" autocomplete="username" required>
      </div>
      <div class="vault-field">
        <label for="loginPassword">Password</label>
        <input type="password" id="loginPassword" autocomplete="current-password" required>
      </div>
      <button type="submit" class="vault-btn vault-btn-primary" id="loginSubmit">Log in</button>
    </form>

    <div style="text-align:center; margin-top:10px">
      <a href="reset-password.html" style="color:var(--slate-light); font-size:13px">Forgot password?</a>
    </div>

    <details class="vault-advanced" style="display:none">
      <summary>Advanced: backend URL</summary>
      <div class="vault-field" style="margin-top:10px">
        <label for="apiBaseInput">API base URL</label>
        <input type="text" id="apiBaseInput" placeholder="https://turbofix-backend-ehxb.onrender.com">
      </div>
    </details>

    <div style="text-align:center; margin-top:14px">
      <button type="button" class="vault-btn vault-btn-ghost" id="showRegisterBtn" style="width:100%">New here? Register your company</button>
    </div>
  </div>

  <!-- ============ COMPANY REGISTRATION (owner self-service, pending admin approval) ============ -->
  <div class="vault-login-card" id="registerCard" style="display:none">
    <h1>Register your company</h1>
    <p class="sub">Create your company account and owner login. A TurboFix admin will review and approve your registration before you can sign in.</p>

    <div class="vault-error" id="registerError"></div>
    <div class="vault-success" id="registerSuccess" style="display:none; background:#065f46; color:#d1fae5; padding:12px 16px; border-radius:8px; margin-bottom:12px; font-size:14px;"></div>

    <form id="registerForm">
      <div class="vault-field">
        <label for="regCompanyCode">Company code</label>
        <input type="text" id="regCompanyCode" placeholder="e.g. ACME (2+ characters, uppercase)" required>
      </div>
      <div class="vault-field">
        <label for="regCompanyName">Company name</label>
        <input type="text" id="regCompanyName" placeholder="e.g. Acme Industries Pvt. Ltd." required>
      </div>
      <div class="vault-field">
        <label for="regAdminPhone">Contact phone</label>
        <input type="text" id="regAdminPhone" placeholder="+91..." required>
      </div>
      <div class="vault-field">
        <label for="regOwnerName">Owner name</label>
        <input type="text" id="regOwnerName" required>
      </div>
      <div class="vault-field">
        <label for="regOwnerEmail">Owner email</label>
        <input type="email" id="regOwnerEmail" required>
      </div>
      <div class="vault-field">
        <label for="regOwnerPassword">Password</label>
        <input type="password" id="regOwnerPassword" autocomplete="new-password" minlength="8" required>
      </div>
      <div class="vault-field">
        <label for="regPaymentScreenshot">Payment screenshot confirmation</label>
        <input type="file" id="regPaymentScreenshot" accept="image/*" required>
      </div>
      <button type="submit" class="vault-btn vault-btn-primary" id="registerSubmit">Register</button>
    </form>

    <button type="button" class="vault-btn vault-btn-ghost" id="backToLoginBtn" style="width:100%; margin-top:10px">Back to sign in</button>
  </div>

  <!-- ============ AUTHENTICATED SHELL ============ -->
  <div id="vaultShell" style="display:none">

    <div class="vault-userbar">
      <div class="who">
        <b id="whoName">—</b>
        <span id="whoCompany"></span>
        <span class="vault-role-badge" id="whoRole"></span>
      </div>
      <button class="vault-btn vault-btn-ghost" id="logoutBtn">Log out</button>
    </div>

    <div class="vault-error" id="vaultError"></div>

    <!-- Owner-only: Manage Supervisors -->
    <div class="vault-upload-toggle" id="addSupervisorToggleWrap" style="display:none">
      <button class="vault-btn vault-btn-ghost" id="addSupervisorToggleBtn">+ Manage Supervisors</button>
    </div>
    <div class="vault-card" id="addSupervisorCard" style="display:none">
      <h3 style="margin:0 0 10px; font-size:15px; color:var(--slate-light);" id="manageSupervisorTitle">Manage Supervisor Accounts</h3>
      <div class="vault-error" id="addSupervisorError"></div>
      <div class="vault-success" id="addSupervisorSuccess" style="display:none; background:#065f46; color:#d1fae5; padding:10px 14px; border-radius:8px; margin-bottom:10px; font-size:13px;"></div>
      
      <div class="vault-field" style="margin-bottom:14px;">
        <label for="selectSupervisorAction">Select supervisor</label>
        <select id="selectSupervisorAction" style="width:100%; padding:8px; border-radius:6px; background:#1e293b; color:#fff; border:1px solid #334155;">
          <option value="new">-- Create New Supervisor --</option>
        </select>
      </div>

      <form id="addSupervisorForm">
        <div class="vault-form-grid">
          <div class="vault-field"><label>Name</label><input type="text" id="supName" required></div>
          <div class="vault-field"><label>Phone</label><input type="text" id="supPhone" placeholder="+91..."></div>
          <div class="vault-field"><label>Email</label><input type="email" id="supEmail"></div>
          <div class="vault-field"><label id="supPasswordLabel">Password</label><input type="password" id="supPassword" minlength="8" required></div>
        </div>
        <div style="display:flex; gap:10px; margin-top:10px;">
          <button type="submit" class="vault-btn vault-btn-primary" id="addSupervisorSubmit" style="flex:1">Create supervisor</button>
          <button type="button" class="vault-btn vault-btn-danger" id="deleteSupervisorBtn" style="display:none; flex:1">Delete supervisor</button>
        </div>
      </form>
    </div>

    <div class="vault-upload-toggle" id="addMachineToggleWrap" style="display:none">
      <button class="vault-btn vault-btn-ghost" id="addMachineToggleBtn">+ Add machine</button>
    </div>

    <div class="vault-card" id="addMachineCard" style="display:none">
      <form id="addMachineForm">
        <div class="vault-form-grid">
          <div class="vault-field" style="grid-column: span 2">
            <label for="newMachineName">Machine name</label>
            <input type="text" id="newMachineName" placeholder="e.g. Milling Machine 2" required>
          </div>
          <div class="vault-field"><label for="newMachineLocation">Location</label><input type="text" id="newMachineLocation" placeholder="e.g. Shop Floor A"></div>
          <div class="vault-field"><label for="newMachineTechPhone">Assigned technician phone</label><input type="text" id="newMachineTechPhone" placeholder="+91..." required></div>
          <div class="vault-field"><label for="newMachineInformed1">Informed phone (optional)</label><input type="text" id="newMachineInformed1" placeholder="+91..."></div>
          <div class="vault-field" id="newMachineSupervisorGroup" style="display:none; grid-column: span 2">
            <label for="newMachineSupervisor">Assign Supervisor</label>
            <select id="newMachineSupervisor">
              <option value="">-- Select Supervisor (Optional) --</option>
            </select>
          </div>
        </div>
        <button type="submit" class="vault-btn vault-btn-primary" style="margin-top:10px">Create machine + generate QR tag</button>
      </form>
    </div>

    <div class="vault-card" id="newMachineResult" style="display:none">
      <div class="vault-doc-title" id="newMachineTitle"></div>
      <div class="vault-doc-meta" id="newMachineMeta"></div>
      <div id="qrCanvas" style="margin:14px 0"></div>
      <div class="vault-doc-actions">
        <button class="vault-btn vault-btn-primary" id="printTagBtn">Print Tag</button>
        <button class="vault-btn vault-btn-ghost" id="dismissNewMachineBtn">Done</button>
      </div>
    </div>

    <div class="vault-picker-row" style="display: flex; align-items: flex-end; gap: 10px;">
      <div class="vault-field" style="flex: 1; margin-bottom: 0;">
        <label for="machinePicker">Machine</label>
        <select id="machinePicker" style="width: 100%;"></select>
      </div>
      <button class="vault-btn vault-btn-ghost" id="printExistingTagBtn" style="height: 42px; margin-bottom: 6px;">Print QR Tag</button>
      <button class="vault-btn vault-btn-ghost" id="editMachineToggleBtn" style="height: 42px; margin-bottom: 6px; display: none;">Edit Machine</button>
    </div>

    <!-- Owner-only: Edit Machine Details -->
    <div class="vault-card" id="editMachineCard" style="display:none; margin-top: 14px; margin-bottom: 14px;">
      <h3 style="margin:0 0 10px; font-size:15px; color:var(--slate-light);">Edit Machine Details</h3>
      <div class="vault-error" id="editMachineError"></div>
      <div class="vault-success" id="editMachineSuccess" style="display:none; background:#065f46; color:#d1fae5; padding:10px 14px; border-radius:8px; margin-bottom:10px; font-size:13px;"></div>
      <form id="editMachineForm">
        <div class="vault-form-grid">
          <div class="vault-field" style="grid-column: span 2">
            <label for="editMachineName">Machine name</label>
            <input type="text" id="editMachineName" required>
          </div>
          <div class="vault-field"><label for="editMachineLocation">Location</label><input type="text" id="editMachineLocation"></div>
          <div class="vault-field"><label for="editMachineTechPhone">Assigned technician phone</label><input type="text" id="editMachineTechPhone" required></div>
          <div class="vault-field"><label for="editMachineInformed1">Informed phone (optional)</label><input type="text" id="editMachineInformed1"></div>
          <div class="vault-field">
            <label for="editMachineSupervisor">Assign Supervisor</label>
            <select id="editMachineSupervisor">
              <option value="">-- Select Supervisor (Optional) --</option>
            </select>
          </div>
        </div>
        <button type="submit" class="vault-btn vault-btn-primary" style="margin-top:10px">Save machine changes</button>
      </form>
    </div>

    <div class="vault-tabs">
      <div class="vault-tab active" data-panel="documents">Documents</div>
      <div class="vault-tab" data-panel="spare-parts">Spare Parts (BOM)</div>
      <div class="vault-tab" data-panel="consumables">Consumables</div>
    </div>

    <!-- ---------- Documents panel ---------- -->
    <div class="vault-panel active" id="panel-documents">
      <div class="vault-upload-toggle" id="uploadToggleWrap" style="display:none">
        <button class="vault-btn vault-btn-ghost" id="uploadToggleBtn">+ Upload document</button>
      </div>

      <div class="vault-card" id="uploadCard" style="display:none">
        <form id="uploadForm">
          <div class="vault-form-grid">
            <div class="vault-field">
              <label for="uploadCategory">Category</label>
              <select id="uploadCategory">
                <option value="manual">Manual</option>
                <option value="circuit_diagram">Circuit diagram</option>
                <option value="hydraulic_diagram">Hydraulic diagram</option>
                <option value="spare_parts_catalog">Spare parts catalog</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div class="vault-field" style="grid-column: span 2">
              <label for="uploadTitle">Title</label>
              <input type="text" id="uploadTitle" placeholder="e.g. CNC Lathe 1 — Operation Manual" required>
            </div>
            <div class="vault-field" style="grid-column: span 2">
              <label for="uploadFile">File (PDF, image, DWG/DXF, XLSX, CSV — max 50MB)</label>
              <input type="file" id="uploadFile" required>
            </div>
          </div>
          <button type="submit" class="vault-btn vault-btn-primary" style="margin-top:10px">Upload</button>
        </form>
      </div>

      <div id="documentsList"></div>
    </div>

    <!-- ---------- Spare parts panel ---------- -->
    <div class="vault-panel" id="panel-spare-parts">
      <div class="vault-upload-toggle" id="addPartToggleWrap" style="display:none">
        <button class="vault-btn vault-btn-ghost" id="addPartToggleBtn">+ Add spare part</button>
      </div>
      <div class="vault-card" id="addPartCard" style="display:none">
        <form id="addPartForm">
          <div class="vault-form-grid">
            <div class="vault-field"><label>Part name</label><input type="text" id="partName" required></div>
            <div class="vault-field"><label>Part number</label><input type="text" id="partNumber"></div>
            <div class="vault-field"><label>Qty on hand</label><input type="number" id="partQty" value="0"></div>
            <div class="vault-field"><label>Unit</label><input type="text" id="partUnit" placeholder="pcs"></div>
            <div class="vault-field"><label>Reorder level</label><input type="number" id="partReorder" value="0"></div>
            <div class="vault-field"><label>Supplier</label><input type="text" id="partSupplier"></div>
          </div>
          <button type="submit" class="vault-btn vault-btn-primary" style="margin-top:10px">Add part</button>
        </form>
      </div>
      <div class="vault-card">
        <table class="vault-table" id="partsTable">
          <thead><tr><th>Part</th><th>Number</th><th>Qty</th><th>Reorder at</th><th>Supplier</th><th></th></tr></thead>
          <tbody></tbody>
        </table>
        <div class="vault-empty" id="partsEmpty" style="display:none">No spare parts logged for this machine yet.</div>
      </div>
    </div>

    <!-- ---------- Consumables panel ---------- -->
    <div class="vault-panel" id="panel-consumables">
      <div class="vault-upload-toggle" id="addConsToggleWrap" style="display:none">
        <button class="vault-btn vault-btn-ghost" id="addConsToggleBtn">+ Add consumable</button>
      </div>
      <div class="vault-card" id="addConsCard" style="display:none">
        <form id="addConsForm">
          <div class="vault-form-grid">
            <div class="vault-field"><label>Name</label><input type="text" id="consName" required></div>
            <div class="vault-field"><label>Qty on hand</label><input type="number" id="consQty" value="0"></div>
            <div class="vault-field"><label>Unit</label><input type="text" id="consUnit" placeholder="litres"></div>
            <div class="vault-field"><label>Reorder level</label><input type="number" id="consReorder" value="0"></div>
          </div>
          <button type="submit" class="vault-btn vault-btn-primary" style="margin-top:10px">Add consumable</button>
        </form>
      </div>
      <div class="vault-card">
        <table class="vault-table" id="consTable">
          <thead><tr><th>Name</th><th>Qty</th><th>Reorder at</th><th>Notes</th><th></th></tr></thead>
          <tbody></tbody>
        </table>
        <div class="vault-empty" id="consEmpty" style="display:none">No consumables logged for this machine yet.</div>
      </div>
    </div>

  </div>
</div>
</section>

<div id="printTag" class="print-only"></div>

` }} />
    </MainLayout>
  );
}
