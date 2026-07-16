"""Self-contained internal TurboFix platform administration console."""

ADMIN_HTML = r"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>TurboFix — Platform Control</title>
<style>
  :root {
    color-scheme: dark;
    --ink: #f5f7fb;
    --muted: #aab6c8;
    --subtle: #7f8ba0;
    --canvas: #0d121a;
    --surface: #151d28;
    --surface-2: #1b2533;
    --line: #2c394b;
    --accent: #ff7a1a;
    --accent-soft: #422916;
    --green: #33d17a;
    --green-soft: #123b2a;
    --amber: #ffbf47;
    --amber-soft: #403217;
    --red: #ff7676;
    --red-soft: #482128;
    --blue: #80b7ff;
    --shadow: 0 18px 50px rgba(0, 0, 0, .24);
  }
  * { box-sizing: border-box; }
  body {
    min-width: 320px;
    margin: 0;
    font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    color: var(--ink);
    background: radial-gradient(circle at 7% 0, #1d2a3c 0, transparent 32rem), var(--canvas);
  }
  button, input, select { font: inherit; }
  button { cursor: pointer; }
  button:focus-visible, input:focus-visible, select:focus-visible { outline: 3px solid var(--blue); outline-offset: 2px; }
  .shell { min-height: 100vh; }
  .login-shell { max-width: 1040px; min-height: 100vh; margin: 0 auto; padding: 32px 20px; display: grid; place-items: center; }
  .login-layout { width: min(100%, 920px); display: grid; grid-template-columns: 1.08fr .92fr; overflow: hidden; border: 1px solid var(--line); border-radius: 22px; background: var(--surface); box-shadow: var(--shadow); }
  .login-intro { padding: 48px; background: linear-gradient(145deg, #1d2a39, #121923 70%); }
  .brand { display: flex; align-items: center; gap: 10px; font-weight: 800; letter-spacing: .03em; }
  .brand-mark { width: 32px; height: 32px; display: grid; place-items: center; border-radius: 9px; color: #211405; background: var(--accent); font-size: 19px; }
  .eyebrow { margin: 26px 0 10px; color: var(--accent); font-weight: 800; font-size: 12px; letter-spacing: .13em; text-transform: uppercase; }
  h1, h2, h3, p { margin: 0; }
  .login-intro h1 { max-width: 480px; font-size: clamp(31px, 4vw, 46px); line-height: 1.08; }
  .lead { max-width: 490px; margin-top: 16px; color: var(--muted); font-size: 17px; line-height: 1.6; }
  .value-list { display: grid; gap: 12px; margin: 32px 0 0; padding: 0; list-style: none; color: var(--muted); }
  .value-list li { display: flex; gap: 10px; align-items: center; }
  .value-list b { color: var(--green); }
  .login-card { padding: 48px; align-self: center; }
  .login-card h2 { font-size: 25px; }
  .login-card p { margin-top: 8px; color: var(--muted); line-height: 1.5; }
  label { display: block; margin-bottom: 7px; color: var(--muted); font-size: 13px; font-weight: 700; }
  input, select { width: 100%; border: 1px solid var(--line); border-radius: 10px; padding: 12px 13px; background: #101722; color: var(--ink); }
  input::placeholder { color: #748197; }
  .field { margin-top: 24px; }
  .field + .field { margin-top: 16px; }
  .btn { display: inline-flex; min-height: 42px; align-items: center; justify-content: center; gap: 8px; border: 1px solid transparent; border-radius: 10px; padding: 10px 14px; color: var(--ink); background: var(--surface-2); font-size: 14px; font-weight: 800; }
  .btn:hover { filter: brightness(1.1); }
  .btn-primary { color: #231507; background: var(--accent); }
  .btn-positive { color: #052414; background: var(--green); }
  .btn-danger { color: #fff; background: #a53d47; }
  .btn-outline { border-color: var(--line); background: transparent; }
  .btn-quiet { border-color: transparent; background: transparent; color: var(--muted); }
  .btn-full { width: 100%; }
  .err, .status { min-height: 20px; margin-top: 12px; font-size: 13px; }
  .err { color: #ff9b9b; }
  .status { color: var(--muted); }
  .status.success { color: var(--green); }
  .admin-shell { display: none; min-height: 100vh; }
  .app-sidebar { position: fixed; z-index: 10; inset: 0 auto 0 0; width: 250px; padding: 24px 16px; border-right: 1px solid var(--line); background: #101720; display: flex; flex-direction: column; }
  .sidebar-title { margin: 34px 10px 12px; color: var(--subtle); font-size: 11px; font-weight: 800; letter-spacing: .12em; text-transform: uppercase; }
  .nav-item { width: 100%; display: flex; align-items: center; gap: 10px; padding: 12px; border: 0; border-radius: 10px; color: var(--muted); background: transparent; text-align: left; font-weight: 750; }
  .nav-item:hover, .nav-item.active { color: var(--ink); background: #202b39; }
  .nav-item.active { box-shadow: inset 3px 0 0 var(--accent); }
  .nav-icon { width: 22px; text-align: center; color: var(--accent); }
  .sidebar-health { margin-top: auto; padding: 14px; border: 1px solid var(--line); border-radius: 13px; background: #151e29; }
  .sidebar-health strong { display: block; font-size: 13px; }
  .sidebar-health span { display: block; margin-top: 5px; color: var(--muted); font-size: 12px; line-height: 1.45; }
  .sidebar-health .live { color: var(--green); font-weight: 800; }
  .app-main { min-height: 100vh; margin-left: 250px; }
  .topbar { min-height: 72px; display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 14px 34px; border-bottom: 1px solid var(--line); background: rgba(13, 18, 26, .88); backdrop-filter: blur(12px); position: sticky; top: 0; z-index: 5; }
  .topbar-left { display: flex; align-items: center; gap: 12px; }
  .topbar-title { font-size: 14px; font-weight: 800; }
  .internal-tag { display: inline-flex; align-items: center; gap: 5px; padding: 4px 8px; border-radius: 99px; color: #ffd3ab; background: var(--accent-soft); font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: .07em; }
  .admin-id { display: flex; align-items: center; gap: 10px; color: var(--muted); font-size: 13px; }
  .avatar { width: 30px; height: 30px; display: grid; place-items: center; border-radius: 50%; color: #201607; background: var(--accent); font-weight: 900; }
  .page { max-width: 1440px; margin: 0 auto; padding: 34px; }
  .page-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 20px; }
  .page-heading h1 { font-size: clamp(28px, 3vw, 38px); letter-spacing: -.04em; }
  .page-heading p { max-width: 700px; margin-top: 8px; color: var(--muted); line-height: 1.55; }
  .metrics { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 14px; margin-top: 26px; }
  .metric { min-height: 134px; padding: 19px; border: 1px solid var(--line); border-radius: 14px; background: var(--surface); }
  .metric-label { color: var(--muted); font-size: 12px; font-weight: 800; letter-spacing: .06em; text-transform: uppercase; }
  .metric-value { display: block; margin-top: 14px; font-size: 31px; font-weight: 850; letter-spacing: -.04em; }
  .metric-note { display: block; margin-top: 6px; color: var(--subtle); font-size: 12px; }
  .metric.attention .metric-value { color: var(--amber); }
  .metric.pending .metric-value { color: var(--accent); }
  .panel-grid { display: grid; grid-template-columns: minmax(0, 1.55fr) minmax(270px, .75fr); gap: 16px; margin-top: 28px; }
  .panel { border: 1px solid var(--line); border-radius: 14px; background: var(--surface); }
  .panel-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; padding: 20px 20px 15px; }
  .panel-head h2 { font-size: 18px; }
  .panel-head p { margin-top: 5px; color: var(--muted); font-size: 13px; line-height: 1.45; }
  .attention-list { display: grid; gap: 1px; border-top: 1px solid var(--line); }
  .attention-row { width: 100%; display: grid; grid-template-columns: 10px 1fr auto; align-items: center; gap: 12px; padding: 15px 20px; border: 0; color: var(--ink); background: transparent; text-align: left; }
  .attention-row:hover { background: #1c2634; }
  .attention-mark { width: 8px; height: 8px; border-radius: 50%; background: var(--amber); }
  .attention-row strong { display: block; font-size: 14px; }
  .attention-row span { display: block; margin-top: 3px; color: var(--muted); font-size: 12px; }
  .attention-arrow { color: var(--subtle); font-size: 19px; }
  .empty { padding: 24px 20px; color: var(--muted); font-size: 14px; }
  .quick-actions { display: grid; gap: 10px; padding: 0 20px 20px; }
  .quick-action { width: 100%; display: flex; align-items: center; justify-content: space-between; border: 1px solid var(--line); border-radius: 11px; padding: 13px; color: var(--ink); background: #182331; text-align: left; }
  .quick-action strong { display: block; font-size: 14px; }
  .quick-action span { display: block; margin-top: 3px; color: var(--muted); font-size: 12px; }
  .directory { margin-top: 28px; }
  .directory-controls { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 0 0 14px; }
  .directory-controls h2 { font-size: 20px; }
  .directory-controls p { margin-top: 5px; color: var(--muted); font-size: 13px; }
  .filters { display: flex; align-items: center; gap: 8px; }
  .search { width: min(260px, 35vw); }
  .filter-select { width: 144px; }
  .company-table-wrap { overflow-x: auto; border: 1px solid var(--line); border-radius: 14px; background: var(--surface); }
  table { width: 100%; min-width: 920px; border-collapse: collapse; }
  th, td { padding: 15px 16px; border-bottom: 1px solid #263244; text-align: left; vertical-align: middle; }
  th { color: var(--subtle); background: #182230; font-size: 11px; font-weight: 850; letter-spacing: .08em; text-transform: uppercase; }
  tr:last-child td { border-bottom: 0; }
  tbody tr:hover { background: #1a2533; }
  .company-name { display: flex; align-items: center; gap: 10px; font-weight: 850; }
  .company-initial { width: 31px; height: 31px; display: grid; place-items: center; border-radius: 9px; color: #231407; background: #f3aa70; font-size: 12px; }
  .cell-muted { display: block; margin-top: 4px; color: var(--subtle); font-size: 12px; }
  .badge { display: inline-flex; align-items: center; gap: 5px; border-radius: 999px; padding: 4px 8px; font-size: 11px; font-weight: 850; white-space: nowrap; }
  .badge.good { color: #9df2c1; background: var(--green-soft); }
  .badge.waiting { color: #ffd58d; background: var(--amber-soft); }
  .badge.warn { color: #ffd58d; background: var(--amber-soft); }
  .badge.risk { color: #ffb3b3; background: var(--red-soft); }
  .usage { min-width: 135px; }
  .usage-line { display: flex; justify-content: space-between; gap: 10px; color: var(--muted); font-size: 12px; }
  .progress { height: 6px; overflow: hidden; margin-top: 7px; border-radius: 99px; background: #2e3b4e; }
  .progress > span { display: block; height: 100%; border-radius: inherit; background: var(--green); }
  .progress.warn > span { background: var(--amber); }
  .progress.risk > span { background: var(--red); }
  .quiet-link { border: 0; padding: 7px 9px; border-radius: 7px; color: var(--blue); background: transparent; font-weight: 800; }
  .quiet-link:hover { background: #21334b; }
  .drawer-backdrop { position: fixed; z-index: 19; inset: 0; background: rgba(2, 5, 9, .55); opacity: 0; pointer-events: none; transition: opacity .18s ease; }
  .drawer-backdrop.open { opacity: 1; pointer-events: auto; }
  .drawer { position: fixed; z-index: 20; inset: 0 0 0 auto; width: min(480px, 100vw); overflow-y: auto; padding: 22px; border-left: 1px solid var(--line); background: #111924; box-shadow: -20px 0 50px rgba(0, 0, 0, .28); transform: translateX(100%); transition: transform .2s ease; }
  .drawer.open { transform: translateX(0); }
  .drawer-top { display: flex; justify-content: space-between; gap: 16px; }
  .drawer-top h2 { margin-top: 9px; font-size: 27px; letter-spacing: -.03em; }
  .drawer-top p { margin-top: 7px; color: var(--muted); font-size: 13px; }
  .icon-button { width: 36px; height: 36px; border: 1px solid var(--line); border-radius: 9px; color: var(--muted); background: transparent; font-size: 20px; }
  .detail-status { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 16px; }
  .detail-metrics { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; margin-top: 22px; }
  .detail-metric { padding: 12px; border: 1px solid var(--line); border-radius: 11px; background: var(--surface); }
  .detail-metric strong { display: block; font-size: 20px; }
  .detail-metric span { display: block; margin-top: 4px; color: var(--subtle); font-size: 11px; }
  .detail-section { margin-top: 20px; padding-top: 20px; border-top: 1px solid var(--line); }
  .detail-section h3 { font-size: 15px; }
  .detail-section p { margin-top: 5px; color: var(--muted); font-size: 13px; line-height: 1.5; }
  .quota-editor { display: grid; grid-template-columns: 1fr auto; gap: 9px; margin-top: 12px; }
  .detail-actions { display: grid; gap: 9px; margin-top: 12px; }
  .tool-grid { display: grid; gap: 9px; margin-top: 12px; }
  .modal-backdrop { position: fixed; z-index: 30; inset: 0; display: none; place-items: center; padding: 20px; background: rgba(2, 5, 9, .7); }
  .modal-backdrop.open { display: grid; }
  .modal { width: min(780px, 100%); max-height: min(820px, 92vh); overflow-y: auto; padding: 24px; border: 1px solid var(--line); border-radius: 16px; background: #151f2c; box-shadow: var(--shadow); }
  .modal.wide { width: min(980px, 100%); }
  .modal-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }
  .modal-head h2 { font-size: 23px; }
  .modal-head p { max-width: 540px; margin-top: 6px; color: var(--muted); font-size: 13px; line-height: 1.5; }
  .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-top: 22px; }
  .form-grid .full { grid-column: 1 / -1; }
  .form-footer { display: flex; justify-content: flex-end; gap: 10px; margin-top: 22px; }
  .dashboard-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; margin-top: 22px; }
  .dashboard-kpi { padding: 14px; border: 1px solid var(--line); border-radius: 11px; background: var(--surface); }
  .dashboard-kpi strong { display: block; font-size: 24px; letter-spacing: -.03em; }
  .dashboard-kpi span { display: block; margin-top: 4px; color: var(--subtle); font-size: 11px; }
  .modal-section { margin-top: 20px; padding-top: 20px; border-top: 1px solid var(--line); }
  .modal-section h3 { font-size: 16px; }
  .modal-section p { margin-top: 5px; color: var(--muted); font-size: 13px; line-height: 1.5; }
  .dashboard-columns { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; }
  .stack-list { display: grid; gap: 8px; margin-top: 12px; }
  .stack-row { padding: 11px 12px; border: 1px solid var(--line); border-radius: 10px; background: #182331; }
  .stack-row strong { display: block; font-size: 13px; }
  .stack-row span { display: block; margin-top: 3px; color: var(--muted); font-size: 12px; line-height: 1.4; }
  .trend-row { display: grid; grid-template-columns: 66px 1fr 28px; align-items: center; gap: 9px; color: var(--muted); font-size: 12px; }
  .trend-bar { height: 8px; overflow: hidden; border-radius: 99px; background: #2e3b4e; }
  .trend-bar span { display: block; height: 100%; border-radius: inherit; background: var(--accent); }
  .team-list { display: grid; gap: 9px; margin-top: 18px; }
  .team-row { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 13px; border: 1px solid var(--line); border-radius: 11px; background: #182331; }
  .team-person { min-width: 0; }
  .team-person strong { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 14px; }
  .team-person span { display: block; overflow: hidden; margin-top: 4px; color: var(--muted); text-overflow: ellipsis; white-space: nowrap; font-size: 12px; }
  .role-label { display: inline-flex; margin-top: 7px; border-radius: 999px; padding: 3px 7px; color: #c7dcff; background: #21334b; font-size: 10px; font-weight: 850; text-transform: capitalize; }
  @media (max-width: 1060px) {
    .metrics { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .panel-grid { grid-template-columns: 1fr; }
  }
  @media (max-width: 760px) {
    .login-shell { padding: 16px; }
    .login-layout { grid-template-columns: 1fr; }
    .login-intro, .login-card { padding: 30px 24px; }
    .login-intro { display: none; }
    .app-sidebar { position: static; width: auto; min-height: auto; padding: 14px 16px; border-right: 0; border-bottom: 1px solid var(--line); }
    .app-sidebar .sidebar-title, .app-sidebar .sidebar-health { display: none; }
    .app-sidebar nav { display: flex; gap: 6px; overflow-x: auto; }
    .nav-item { width: auto; flex: 0 0 auto; padding: 9px 11px; }
    .app-main { margin-left: 0; }
    .topbar { padding: 12px 16px; }
    .topbar-title, .admin-id span { display: none; }
    .page { padding: 24px 16px; }
    .page-heading { display: block; }
    .page-heading .btn { width: 100%; margin-top: 16px; }
    .metrics { grid-template-columns: 1fr 1fr; }
    .directory-controls { display: block; }
    .filters { margin-top: 14px; }
    .search { width: 100%; }
    .filter-select { width: 140px; }
    .form-grid { grid-template-columns: 1fr; }
    .form-grid .full { grid-column: auto; }
    .dashboard-grid { grid-template-columns: 1fr 1fr; }
    .dashboard-columns { grid-template-columns: 1fr; }
  }
  @media (max-width: 420px) {
    .metrics { grid-template-columns: 1fr; }
    .detail-metrics { grid-template-columns: 1fr 1fr; }
  }
</style>
</head>
<body>
<div class="shell">
  <main class="login-shell" id="loginBox">
    <div class="login-layout">
      <section class="login-intro" aria-label="TurboFix platform administration">
        <div class="brand"><span class="brand-mark">ϟ</span> TURBOFIX</div>
        <p class="eyebrow">Platform operations</p>
        <h1>Keep every customer workspace moving forward.</h1>
        <p class="lead">Approve new companies, monitor capacity and operational risk, and support the teams building reliable factories.</p>
        <ul class="value-list">
          <li><b>●</b> Review onboarding requests quickly</li>
          <li><b>●</b> Spot quota and ticket pressure early</li>
          <li><b>●</b> See AI knowledge readiness across customers</li>
        </ul>
      </section>
      <section class="login-card">
        <div class="brand"><span class="brand-mark">ϟ</span> TURBOFIX</div>
        <h2>Platform sign in</h2>
        <p>For TurboFix operations staff only. Your session is kept separate from customer accounts.</p>
        <div class="field">
          <label for="pw">Admin password</label>
          <input type="password" id="pw" placeholder="Enter your platform password" autocomplete="current-password">
        </div>
        <div class="field"><button class="btn btn-primary btn-full" id="loginBtn">Open control room</button></div>
        <div class="err" id="loginErr" role="alert"></div>
      </section>
    </div>
  </main>

  <div class="admin-shell" id="adminApp">
    <aside class="app-sidebar">
      <div class="brand"><span class="brand-mark">ϟ</span> TURBOFIX</div>
      <p class="sidebar-title">Platform control</p>
      <nav aria-label="Platform navigation">
        <button class="nav-item active" data-nav="overview"><span class="nav-icon">◫</span> Overview</button>
        <button class="nav-item" data-nav="companies"><span class="nav-icon">▣</span> Companies</button>
        <button class="nav-item" data-nav="onboard"><span class="nav-icon">＋</span> Onboard company</button>
      </nav>
      <div class="sidebar-health">
        <strong><span class="live">●</span> Platform status</strong>
        <span>Portfolio data refreshes whenever you open this control room.</span>
      </div>
    </aside>

    <div class="app-main">
      <header class="topbar">
        <div class="topbar-left"><span class="topbar-title">TurboFix platform</span><span class="internal-tag">Internal access</span></div>
        <div class="admin-id"><span>Platform administrator</span><span class="avatar">T</span><button class="btn btn-quiet" id="logout">Sign out</button></div>
      </header>

      <main class="page">
        <section class="page-heading">
          <div>
            <p class="eyebrow" style="margin:0 0 8px">Portfolio overview</p>
            <h1>Good morning, platform team.</h1>
            <p>Start with the work that needs your attention. Approvals, capacity risk, and customer knowledge readiness are all in one place.</p>
          </div>
          <button class="btn btn-primary" id="openOnboard">＋ Onboard company</button>
        </section>

        <section class="metrics" aria-label="Portfolio metrics">
          <article class="metric"><span class="metric-label">Active companies</span><strong class="metric-value" id="activeCompanies">—</strong><span class="metric-note" id="activeCompaniesNote">Loading portfolio…</span></article>
          <article class="metric pending"><span class="metric-label">Awaiting approval</span><strong class="metric-value" id="pendingCompanies">—</strong><span class="metric-note">Customer workspaces not yet live</span></article>
          <article class="metric attention"><span class="metric-label">Need attention</span><strong class="metric-value" id="attentionCompanies">—</strong><span class="metric-note">Capacity, tickets, or data review</span></article>
          <article class="metric"><span class="metric-label">Machines in use</span><strong class="metric-value" id="portfolioMachines">—</strong><span class="metric-note" id="portfolioCapacity">Across approved customer plans</span></article>
        </section>

        <section class="panel-grid">
          <article class="panel">
            <div class="panel-head"><div><h2>Priority attention</h2><p>These accounts have an approval, capacity, ticket, or AI-record review signal.</p></div><button class="btn btn-outline" id="showAttention">View all</button></div>
            <div class="attention-list" id="attentionList"><div class="empty">Loading priority accounts…</div></div>
          </article>
          <article class="panel">
            <div class="panel-head"><div><h2>Quick actions</h2><p>Common platform tasks, kept close at hand.</p></div></div>
            <div class="quick-actions">
              <button class="quick-action" id="quickOnboard"><span><strong>Onboard a company</strong><span>Create the owner account and plan</span></span><b>→</b></button>
              <button class="quick-action" id="quickApprovals"><span><strong>Review approvals</strong><span>See workspaces waiting to go live</span></span><b>→</b></button>
              <button class="quick-action" id="quickCapacity"><span><strong>Review capacity</strong><span>Find accounts near their machine limit</span></span><b>→</b></button>
            </div>
          </article>
        </section>

        <section class="directory" id="companyDirectory">
          <div class="directory-controls">
            <div><h2>Company directory</h2><p id="directorySummary">Loading customer workspaces…</p></div>
            <div class="filters">
              <input class="search" id="companySearch" type="search" placeholder="Search company or code" aria-label="Search companies">
              <select class="filter-select" id="companyFilter" aria-label="Filter companies">
                <option value="all">All companies</option>
                <option value="pending">Awaiting approval</option>
                <option value="attention">Need attention</option>
                <option value="capacity">Near capacity</option>
              </select>
            </div>
          </div>
          <div class="company-table-wrap">
            <table>
              <thead><tr><th>Company</th><th>Status</th><th>Machine capacity</th><th>Operations</th><th>AI knowledge</th><th>Last activity</th><th></th></tr></thead>
              <tbody id="companyRows"></tbody>
            </table>
          </div>
          <p class="status" id="statusMsg" role="status"></p>
        </section>
      </main>
    </div>
  </div>

  <div class="drawer-backdrop" id="drawerBackdrop"></div>
  <aside class="drawer" id="companyDrawer" aria-label="Company details" aria-hidden="true">
    <div id="companyDrawerContent"></div>
  </aside>

  <div class="modal-backdrop" id="onboardModal" aria-hidden="true">
    <section class="modal" role="dialog" aria-modal="true" aria-labelledby="onboardTitle">
      <div class="modal-head"><div><h2 id="onboardTitle">Onboard a company</h2><p>Create the customer workspace, owner account, and initial machine plan. The company is approved immediately after a successful onboarding.</p></div><button class="icon-button" id="closeOnboard" aria-label="Close onboarding form">×</button></div>
      <form id="onboardForm">
        <div class="form-grid">
          <div><label for="onboardCode">Company code</label><input type="text" id="onboardCode" placeholder="Example: ACME3" maxlength="20" required></div>
          <div><label for="onboardName">Company name</label><input type="text" id="onboardName" placeholder="Example: Acme Forge Pvt Ltd" required></div>
          <div><label for="onboardOwnerName">Owner name</label><input type="text" id="onboardOwnerName" placeholder="Example: Rakesh Shah" required></div>
          <div><label for="onboardPhone">Owner phone</label><input type="tel" id="onboardPhone" placeholder="Example: +919820012345" required></div>
          <div><label for="onboardEmail">Owner email</label><input type="email" id="onboardEmail" placeholder="owner@company.example" required></div>
          <div><label for="onboardQuota">Initial machine plan</label><input type="number" id="onboardQuota" value="5" min="1" required></div>
          <div class="full"><label for="onboardPassword">Temporary owner password</label><input type="password" id="onboardPassword" minlength="8" autocomplete="new-password" placeholder="Minimum 8 characters" required></div>
        </div>
        <div class="err" id="onboardErr" role="alert"></div>
        <div class="form-footer"><button type="button" class="btn btn-outline" id="cancelOnboard">Cancel</button><button type="submit" class="btn btn-primary" id="onboardSubmitBtn">Create and approve workspace</button></div>
      </form>
    </section>
  </div>

  <div class="modal-backdrop" id="dashboardModal" aria-hidden="true">
    <section class="modal wide" role="dialog" aria-modal="true" aria-labelledby="companyDashboardTitle">
      <div class="modal-head"><div><h2 id="companyDashboardTitle">Company dashboard</h2><p id="companyDashboardSubtitle">Loading live operational data…</p></div><button class="icon-button" id="closeDashboard" aria-label="Close company dashboard">×</button></div>
      <div id="companyDashboardContent"></div>
    </section>
  </div>

  <div class="modal-backdrop" id="teamModal" aria-hidden="true">
    <section class="modal" role="dialog" aria-modal="true" aria-labelledby="teamTitle">
      <div class="modal-head"><div><h2 id="teamTitle">Team access</h2><p id="teamSubtitle">Loading company users…</p></div><button class="icon-button" id="closeTeam" aria-label="Close team access">×</button></div>
      <div class="team-list" id="teamList"></div>
    </section>
  </div>

  <div class="modal-backdrop" id="passwordModal" aria-hidden="true">
    <section class="modal" role="dialog" aria-modal="true" aria-labelledby="passwordTitle">
      <div class="modal-head"><div><h2 id="passwordTitle">Set temporary password</h2><p id="passwordSubtitle">The user must receive this password through your approved support channel.</p></div><button class="icon-button" id="closePassword" aria-label="Close password reset">×</button></div>
      <form id="passwordForm">
        <div class="field"><label for="newUserPassword">New temporary password</label><input type="password" id="newUserPassword" autocomplete="new-password" placeholder="At least 8 characters, one uppercase letter and one number" required></div>
        <div class="field"><label for="confirmUserPassword">Confirm temporary password</label><input type="password" id="confirmUserPassword" autocomplete="new-password" placeholder="Enter the password again" required></div>
        <div class="err" id="passwordErr" role="alert"></div>
        <div class="form-footer"><button type="button" class="btn btn-outline" id="cancelPassword">Cancel</button><button type="submit" class="btn btn-primary" id="savePassword">Reset password</button></div>
      </form>
    </section>
  </div>
</div>

<script>
const API = location.origin;
let token = sessionStorage.getItem("tfAdminToken") || "";
let companies = [];
let selectedCompanyCode = "";
let teamUsers = [];
let selectedUser = null;

const $ = (id) => document.getElementById(id);
const esc = (value) => String(value == null ? "" : value).replace(/[&<>"']/g, (character) => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[character]));
const plural = (count, word) => `${count} ${word}${count === 1 ? "" : "s"}`;

async function api(path, options = {}) {
  options.headers = Object.assign({"Content-Type": "application/json"}, options.headers || {}, token ? {"Authorization": "Bearer " + token} : {});
  const response = await fetch(API + path, options);
  if (response.status === 401) { showLogin(); throw new Error("Your session has ended. Please sign in again."); }
  return response;
}

function setStatus(message, success = false) {
  const status = $("statusMsg");
  status.textContent = message;
  status.classList.toggle("success", success);
}

function showLogin() {
  token = "";
  sessionStorage.removeItem("tfAdminToken");
  $("adminApp").style.display = "none";
  $("loginBox").style.display = "grid";
  closeDrawer();
  closeOnboard();
  closeModal("dashboardModal");
  closeModal("teamModal");
  closePasswordReset();
}

function showApp() {
  $("loginBox").style.display = "none";
  $("adminApp").style.display = "block";
  loadCompanies();
}

async function login() {
  $("loginErr").textContent = "";
  const button = $("loginBtn");
  button.disabled = true;
  button.textContent = "Opening control room…";
  try {
    const response = await fetch(API + "/admin/login", { method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify({password: $("pw").value}) });
    if (!response.ok) { $("loginErr").textContent = "That password was not accepted. Please try again."; return; }
    token = (await response.json()).access_token;
    sessionStorage.setItem("tfAdminToken", token);
    $("pw").value = "";
    showApp();
  } catch (error) {
    $("loginErr").textContent = "We could not reach the platform service. Please try again.";
  } finally {
    button.disabled = false;
    button.textContent = "Open control room";
  }
}

function companyAttention(company) {
  const items = [];
  if (!company.approved) items.push("Waiting for approval");
  if (company.machines_used > company.machine_quota) items.push("Over machine plan");
  else if (company.machine_quota > 0 && company.capacity_percent >= 80) items.push("Near machine plan");
  if (company.critical_tickets) items.push(plural(company.critical_tickets, "urgent open ticket"));
  if (company.pending_records) items.push(plural(company.pending_records, "AI record awaiting review"));
  return items;
}

function capacityClass(company) {
  if (company.machines_used > company.machine_quota) return "risk";
  if (company.machine_quota > 0 && company.capacity_percent >= 80) return "warn";
  return "";
}

function capacityBar(company) {
  const percentage = Math.min(company.capacity_percent || 0, 100);
  const usageClass = capacityClass(company);
  return `<div class="usage"><div class="usage-line"><span>${company.machines_used} of ${company.machine_quota}</span><span>${company.capacity_percent || 0}%</span></div><div class="progress ${usageClass}"><span style="width:${percentage}%"></span></div></div>`;
}

function activityText(value) {
  if (!value) return "No activity yet";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? esc(value) : date.toLocaleDateString(undefined, {day: "numeric", month: "short", year: "numeric"});
}

function renderOverview() {
  const approved = companies.filter((company) => company.approved);
  const pending = companies.filter((company) => !company.approved);
  const attention = companies.filter((company) => company.needs_attention);
  const used = approved.reduce((sum, company) => sum + company.machines_used, 0);
  const quota = approved.reduce((sum, company) => sum + company.machine_quota, 0);
  $("activeCompanies").textContent = approved.length;
  $("activeCompaniesNote").textContent = `${companies.length} customer workspaces total`;
  $("pendingCompanies").textContent = pending.length;
  $("attentionCompanies").textContent = attention.length;
  $("portfolioMachines").textContent = used;
  $("portfolioCapacity").textContent = `${used} of ${quota || 0} planned machine slots`;
  const priority = attention.slice(0, 5);
  $("attentionList").innerHTML = priority.length ? priority.map((company) => {
    const reasons = companyAttention(company);
    return `<button class="attention-row" data-company="${esc(company.company_code)}"><span class="attention-mark"></span><span><strong>${esc(company.company_name)}</strong><span>${esc(reasons.join(" · ") || "Review account health")}</span></span><span class="attention-arrow">›</span></button>`;
  }).join("") : `<div class="empty">No account needs immediate action. Your portfolio is in good shape.</div>`;
  bindCompanyButtons($("attentionList"));
}

function filteredCompanies() {
  const search = $("companySearch").value.trim().toLowerCase();
  const filter = $("companyFilter").value;
  return companies.filter((company) => {
    const matchesSearch = !search || [company.company_name, company.company_code, company.admin_contact_phone].join(" ").toLowerCase().includes(search);
    const matchesFilter = filter === "all"
      || (filter === "pending" && !company.approved)
      || (filter === "attention" && company.needs_attention)
      || (filter === "capacity" && company.machine_quota > 0 && company.capacity_percent >= 80);
    return matchesSearch && matchesFilter;
  });
}

function companyStatus(company) {
  if (!company.approved) return `<span class="badge waiting">● Awaiting approval</span>`;
  if (company.machines_used > company.machine_quota) return `<span class="badge risk">● Over capacity</span>`;
  if (company.needs_attention) return `<span class="badge warn">● Needs review</span>`;
  return `<span class="badge good">● Active</span>`;
}

function renderCompanies() {
  const visible = filteredCompanies();
  $("directorySummary").textContent = `${plural(visible.length, "workspace")} shown${visible.length !== companies.length ? ` of ${companies.length}` : ""}`;
  $("companyRows").innerHTML = visible.length ? visible.map((company) => {
    const initial = esc((company.company_name || company.company_code || "?").trim().charAt(0).toUpperCase());
    const ticketText = company.open_tickets ? `${plural(company.open_tickets, "open ticket")}${company.critical_tickets ? ` · ${company.critical_tickets} urgent` : ""}` : "No open tickets";
    const knowledge = company.pending_records ? `${plural(company.pending_records, "awaiting review")}` : `${plural(company.approved_records, "approved record")}`;
    return `<tr><td><span class="company-name"><span class="company-initial">${initial}</span><span>${esc(company.company_name)}<span class="cell-muted">${esc(company.company_code)} · ${esc(company.admin_contact_phone || "No phone")}</span></span></span></td><td>${companyStatus(company)}</td><td>${capacityBar(company)}</td><td>${esc(ticketText)}<span class="cell-muted">${plural(company.user_count, "user")} · ${plural(company.document_count, "document")}</span></td><td>${esc(knowledge)}<span class="cell-muted">${company.approved_records ? "Knowledge available to AI" : "No approved AI data yet"}</span></td><td>${activityText(company.last_activity)}</td><td><button class="quiet-link" data-company="${esc(company.company_code)}">Manage</button></td></tr>`;
  }).join("") : `<tr><td colspan="7"><div class="empty">No companies match this view. Try clearing the search or choosing another filter.</div></td></tr>`;
  bindCompanyButtons($("companyRows"));
}

function bindCompanyButtons(container) {
  container.querySelectorAll("[data-company]").forEach((button) => {
    button.addEventListener("click", () => openDrawer(button.dataset.company));
  });
}

function renderDetail(company) {
  const attention = companyAttention(company);
  const approvalButton = company.approved
    ? `<button class="btn btn-danger btn-full" id="approvalAction">Pause company access</button>`
    : `<button class="btn btn-positive btn-full" id="approvalAction">Approve and activate workspace</button>`;
  $("companyDrawerContent").innerHTML = `<div class="drawer-top"><div><span class="internal-tag">${company.approved ? "Active workspace" : "Approval required"}</span><h2>${esc(company.company_name)}</h2><p>${esc(company.company_code)} · Onboarded ${activityText(company.onboarded_date)}</p></div><button class="icon-button" id="closeDrawer" aria-label="Close company details">×</button></div><div class="detail-status">${companyStatus(company)}${attention.map((item) => `<span class="badge warn">${esc(item)}</span>`).join("")}</div><div class="detail-metrics"><div class="detail-metric"><strong>${company.machines_used}/${company.machine_quota}</strong><span>Machines in plan</span></div><div class="detail-metric"><strong>${company.open_tickets}</strong><span>Open tickets</span></div><div class="detail-metric"><strong>${company.pending_records}</strong><span>AI records awaiting review</span></div></div><section class="detail-section"><h3>Owner and access</h3><p>${esc(company.admin_contact_phone || "No owner phone saved")} · ${plural(company.user_count, "user")} in this workspace</p></section><section class="detail-section"><h3>Machine plan</h3><p>${company.machines_used > company.machine_quota ? "This account is over its approved machine plan." : `This account is using ${company.capacity_percent || 0}% of its machine plan.`}</p><div class="quota-editor"><input type="number" id="drawerQuota" value="${company.machine_quota}" min="0" aria-label="Machine quota"><button class="btn btn-primary" id="saveQuota">Save plan</button></div></section><section class="detail-section"><h3>Knowledge readiness</h3><p>${plural(company.document_count, "document")} stored · ${plural(company.approved_records, "AI-approved record")} · ${plural(company.pending_records, "record awaiting maintenance-head review")}</p></section><section class="detail-section"><h3>Workspace access</h3><p>${company.approved ? "Pausing access prevents customer users from signing in until you reactivate the company." : "Approve this company after you have verified the onboarding details and plan."}</p><div class="detail-actions">${approvalButton}</div></section>`;
  const tools = document.createElement("section");
  tools.className = "detail-section";
  tools.innerHTML = `<h3>Platform admin tools</h3><p>See the customer’s live operational dashboard or support their team without entering their account.</p><div class="tool-grid"><button class="btn btn-outline btn-full" id="openCompanyDashboard">View company dashboard</button><button class="btn btn-outline btn-full" id="openCompanyUsers">Manage team and reset passwords</button></div>`;
  $("companyDrawerContent").appendChild(tools);
  $("closeDrawer").addEventListener("click", closeDrawer);
  $("saveQuota").addEventListener("click", () => {
    const quota = Number.parseInt($("drawerQuota").value, 10);
    if (!Number.isInteger(quota) || quota < 0) { setStatus("Enter a machine plan of zero or more."); return; }
    patchCompany(company.company_code, {machine_quota: quota});
  });
  $("approvalAction").addEventListener("click", () => {
    const action = company.approved ? "pause this customer workspace" : "approve and activate this customer workspace";
    if (window.confirm(`Are you sure you want to ${action}?`)) patchCompany(company.company_code, {approved: !company.approved});
  });
  $("openCompanyDashboard").addEventListener("click", () => openCompanyDashboard(company));
  $("openCompanyUsers").addEventListener("click", () => openCompanyUsers(company));
}

function openDrawer(code) {
  const company = companies.find((item) => item.company_code === code);
  if (!company) return;
  selectedCompanyCode = code;
  renderDetail(company);
  $("drawerBackdrop").classList.add("open");
  $("companyDrawer").classList.add("open");
  $("companyDrawer").setAttribute("aria-hidden", "false");
}

function closeDrawer() {
  selectedCompanyCode = "";
  $("drawerBackdrop").classList.remove("open");
  $("companyDrawer").classList.remove("open");
  $("companyDrawer").setAttribute("aria-hidden", "true");
}

async function patchCompany(code, body) {
  setStatus("Saving company changes…");
  try {
    const response = await api(`/admin/companies/${encodeURIComponent(code)}`, {method: "POST", body: JSON.stringify(body)});
    if (!response.ok) { const data = await response.json().catch(() => ({})); throw new Error(data.detail || "We could not save the company changes."); }
    setStatus(`Saved changes for ${code}.`, true);
    await loadCompanies();
  } catch (error) {
    setStatus(error.message || "We could not save the company changes.");
  }
}

async function loadCompanies() {
  setStatus("Refreshing portfolio data…");
  try {
    const response = await api("/admin/companies");
    if (!response.ok) throw new Error("We could not load the company directory.");
    companies = await response.json();
    renderOverview();
    renderCompanies();
    if (selectedCompanyCode) openDrawer(selectedCompanyCode);
    setStatus(`Portfolio refreshed at ${new Date().toLocaleTimeString()}.`, true);
  } catch (error) {
    setStatus(error.message || "We could not load the company directory.");
  }
}

function openOnboard() {
  $("onboardErr").textContent = "";
  $("onboardModal").classList.add("open");
  $("onboardModal").setAttribute("aria-hidden", "false");
  $("onboardCode").focus();
}

function closeOnboard() {
  $("onboardModal").classList.remove("open");
  $("onboardModal").setAttribute("aria-hidden", "true");
}

function openModal(id) {
  $(id).classList.add("open");
  $(id).setAttribute("aria-hidden", "false");
}

function closeModal(id) {
  $(id).classList.remove("open");
  $(id).setAttribute("aria-hidden", "true");
}

function displayRole(role) {
  return String(role || "member").replace(/_/g, " ");
}

function dashboardMetric(value, label) {
  return `<div class="dashboard-kpi"><strong>${esc(value)}</strong><span>${esc(label)}</span></div>`;
}

function stackItem(title, detail) {
  return `<div class="stack-row"><strong>${esc(title)}</strong><span>${esc(detail)}</span></div>`;
}

async function openCompanyDashboard(company) {
  $("companyDashboardTitle").textContent = `${company.company_name} dashboard`;
  $("companyDashboardSubtitle").textContent = "Loading the same live operational information available to this customer.";
  $("companyDashboardContent").innerHTML = `<div class="empty">Loading company dashboard…</div>`;
  openModal("dashboardModal");
  try {
    const response = await api(`/admin/companies/${encodeURIComponent(company.company_code)}/dashboard`);
    if (!response.ok) throw new Error("We could not load this company dashboard.");
    const dashboard = await response.json();
    const kpis = dashboard.kpis || {};
    const insights = dashboard.auto_insights || {};
    const attention = dashboard.needs_attention || [];
    const activity = dashboard.recent_activity || [];
    const trend = dashboard.weekly_trend || [];
    const maxTrend = Math.max(1, ...trend.map((item) => Number(item.count) || 0));
    const customKpis = dashboard.custom_kpis || [];
    $("companyDashboardSubtitle").textContent = "Read-only platform view. No customer session is created or used.";
    $("companyDashboardContent").innerHTML = `<div class="dashboard-grid">${dashboardMetric(`${kpis.plant_health_pct || 0}%`, "Plant health")}${dashboardMetric(kpis.open_tickets || 0, "Open tickets")}${dashboardMetric(kpis.machines_down || 0, "Machines currently down")}${dashboardMetric(`${insights.mttr_hours || 0} hrs`, "Average repair time")}</div><div class="dashboard-columns"><section class="modal-section"><h3>Live priorities</h3><p>Open work ordered by urgency and reported time.</p><div class="stack-list">${attention.length ? attention.map((item) => stackItem(`${item.machine_name || "Machine"} · ${item.urgency || "Unrated"}`, item.description || "No issue description recorded")).join("") : `<div class="empty">No open maintenance priorities.</div>`}</div></section><section class="modal-section"><h3>Recent activity</h3><p>Latest ticket activity from this customer workspace.</p><div class="stack-list">${activity.length ? activity.map((item) => stackItem(`${item.machine_name || "Machine"} · ${item.status || "Ticket"}`, `${item.urgency || "Unrated"} · ${activityText(item.reported_at)}`)).join("") : `<div class="empty">No ticket activity has been recorded yet.</div>`}</div></section></div><section class="modal-section"><h3>Breakdown trend</h3><p>Tickets reported over the last six weeks.</p><div class="stack-list">${trend.map((item) => `<div class="trend-row"><span>${esc(item.week_start)}</span><span class="trend-bar"><span style="width:${Math.round(((Number(item.count) || 0) / maxTrend) * 100)}%"></span></span><b>${esc(item.count)}</b></div>`).join("") || `<div class="empty">No weekly trend data is available.</div>`}</div></section>${customKpis.length ? `<section class="modal-section"><h3>Customer-defined KPIs</h3><p>Configured by the customer for their maintenance team.</p><div class="dashboard-grid">${customKpis.map((item) => dashboardMetric(item.value || "—", item.kpi_name || "KPI")).join("")}</div></section>` : ""}`;
  } catch (error) {
    $("companyDashboardContent").innerHTML = `<div class="empty">${esc(error.message || "We could not load this company dashboard.")}</div>`;
  }
}

async function openCompanyUsers(company) {
  $("teamTitle").textContent = `${company.company_name} team access`;
  $("teamSubtitle").textContent = "Loading the users who can access this customer workspace.";
  $("teamList").innerHTML = `<div class="empty">Loading team access…</div>`;
  openModal("teamModal");
  try {
    const response = await api(`/admin/companies/${encodeURIComponent(company.company_code)}/users`);
    if (!response.ok) throw new Error("We could not load this company team.");
    const payload = await response.json();
    teamUsers = payload.users || [];
    $("teamSubtitle").textContent = "Reset a password only after confirming the user’s identity. Passwords are never displayed here.";
    $("teamList").innerHTML = teamUsers.length ? teamUsers.map((user) => `<article class="team-row"><div class="team-person"><strong>${esc(user.name || "Unnamed user")}</strong><span>${esc(user.email || user.phone || "No contact saved")}</span><span class="role-label">${esc(displayRole(user.role))}</span></div><button class="btn btn-outline" data-reset-user="${esc(user.user_id)}">Reset password</button></article>`).join("") : `<div class="empty">This company has no user accounts yet.</div>`;
    $("teamList").querySelectorAll("[data-reset-user]").forEach((button) => button.addEventListener("click", () => openPasswordReset(button.dataset.resetUser)));
  } catch (error) {
    $("teamList").innerHTML = `<div class="empty">${esc(error.message || "We could not load this company team.")}</div>`;
  }
}

function openPasswordReset(userId) {
  selectedUser = teamUsers.find((user) => user.user_id === userId) || null;
  if (!selectedUser) return;
  $("passwordTitle").textContent = `Reset password for ${selectedUser.name || "user"}`;
  $("passwordSubtitle").textContent = "Set a temporary password, then share it using an approved support channel. The old password will stop working immediately.";
  $("passwordErr").textContent = "";
  $("passwordForm").reset();
  openModal("passwordModal");
  $("newUserPassword").focus();
}

function closePasswordReset() {
  selectedUser = null;
  $("passwordForm").reset();
  closeModal("passwordModal");
}

$("loginBtn").addEventListener("click", login);
$("pw").addEventListener("keydown", (event) => { if (event.key === "Enter") login(); });
$("logout").addEventListener("click", showLogin);
$("drawerBackdrop").addEventListener("click", closeDrawer);
$("openOnboard").addEventListener("click", openOnboard);
$("quickOnboard").addEventListener("click", openOnboard);
$("closeOnboard").addEventListener("click", closeOnboard);
$("cancelOnboard").addEventListener("click", closeOnboard);
$("closeDashboard").addEventListener("click", () => closeModal("dashboardModal"));
$("closeTeam").addEventListener("click", () => closeModal("teamModal"));
$("closePassword").addEventListener("click", closePasswordReset);
$("cancelPassword").addEventListener("click", closePasswordReset);
$("showAttention").addEventListener("click", () => { $("companyFilter").value = "attention"; renderCompanies(); $("companyDirectory").scrollIntoView({behavior: "smooth", block: "start"}); });
$("quickApprovals").addEventListener("click", () => { $("companyFilter").value = "pending"; renderCompanies(); $("companyDirectory").scrollIntoView({behavior: "smooth", block: "start"}); });
$("quickCapacity").addEventListener("click", () => { $("companyFilter").value = "capacity"; renderCompanies(); $("companyDirectory").scrollIntoView({behavior: "smooth", block: "start"}); });
$("companySearch").addEventListener("input", renderCompanies);
$("companyFilter").addEventListener("change", renderCompanies);
document.querySelectorAll("[data-nav]").forEach((button) => button.addEventListener("click", () => {
  document.querySelectorAll("[data-nav]").forEach((item) => item.classList.remove("active"));
  button.classList.add("active");
  if (button.dataset.nav === "onboard") openOnboard();
  else { $("companyFilter").value = "all"; renderCompanies(); $(button.dataset.nav === "companies" ? "companyDirectory" : "adminApp").scrollIntoView({behavior: "smooth", block: "start"}); }
}));

$("onboardForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const button = $("onboardSubmitBtn");
  const error = $("onboardErr");
  error.textContent = "";
  button.disabled = true;
  button.textContent = "Creating workspace…";
  try {
    const response = await api("/admin/companies", { method: "POST", body: JSON.stringify({ company_code: $("onboardCode").value.trim(), company_name: $("onboardName").value.trim(), admin_contact_phone: $("onboardPhone").value.trim(), owner_name: $("onboardOwnerName").value.trim(), owner_email: $("onboardEmail").value.trim(), owner_password: $("onboardPassword").value, machine_quota: Number.parseInt($("onboardQuota").value, 10) }) });
    if (!response.ok) { const data = await response.json().catch(() => ({})); throw new Error(data.detail || "Onboarding could not be completed."); }
    const result = await response.json();
    $("onboardForm").reset();
    $("onboardQuota").value = "5";
    closeOnboard();
    setStatus(`${result.company_code} was created and approved.`, true);
    await loadCompanies();
  } catch (exception) {
    error.textContent = exception.message || "Onboarding could not be completed.";
  } finally {
    button.disabled = false;
    button.textContent = "Create and approve workspace";
  }
});

$("passwordForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!selectedUser) return;
  const password = $("newUserPassword").value;
  const confirmation = $("confirmUserPassword").value;
  const error = $("passwordErr");
  const button = $("savePassword");
  error.textContent = "";
  if (password !== confirmation) { error.textContent = "The password confirmation does not match."; return; }
  button.disabled = true;
  button.textContent = "Resetting password…";
  try {
    const response = await api(`/admin/users/${encodeURIComponent(selectedUser.user_id)}/password`, {method: "POST", body: JSON.stringify({new_password: password})});
    if (!response.ok) { const data = await response.json().catch(() => ({})); throw new Error(data.detail || "The password could not be reset."); }
    const userName = selectedUser.name || "user";
    closePasswordReset();
    setStatus(`Password reset for ${userName}. Share the temporary password through an approved channel.`, true);
  } catch (exception) {
    error.textContent = exception.message || "The password could not be reset.";
  } finally {
    button.disabled = false;
    button.textContent = "Reset password";
  }
});

if (token) showApp(); else showLogin();
</script>
</body>
</html>
"""
