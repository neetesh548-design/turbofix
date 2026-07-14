import React, { useState, useEffect, useCallback } from 'react';

/**
 * AppShell — the unified authenticated layout (Redesign P1).
 * Persistent left rail + top bar wrapping Dashboard & Vault.
 * Auth-aware: pre-auth it renders children bare (login/register);
 * once a valid token exists it renders the full shell chrome.
 */

const BASE = import.meta.env.BASE_URL;

function isTokenExpired(token) {
  if (!token) return true;
  try {
    const payload = JSON.parse(
      atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))
    );
    if (!payload.exp) return false;
    return Date.now() >= payload.exp * 1000;
  } catch (_) {
    return false;
  }
}

function readAuth() {
  const token = localStorage.getItem('tf_token');
  if (!token || isTokenExpired(token)) return { authed: false, user: null };
  let user = null;
  try { user = JSON.parse(localStorage.getItem('tf_user') || 'null'); } catch (_) {}
  return { authed: true, user };
}
const NAV_LIVE = [
  { id: 'overview', label: 'Overview', href: BASE + 'dashboard.html', icon: 'M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z' },
  { id: 'machines', label: 'Machines', href: BASE + 'machines.html', icon: 'M12 2l7 4v6c0 5-3 8-7 10-4-2-7-5-7-10V6l7-4z' },
  { id: 'tickets', label: 'Tickets', href: BASE + 'tickets.html', icon: 'M4 5h16v5a2 2 0 000 4v5H4v-5a2 2 0 000-4V5z' },
  { id: 'assistant', label: 'AI Assistant', href: BASE + 'assistant.html', icon: 'M12 2a7 7 0 017 7v2a7 7 0 01-5 6.7V21H10v-3.3A7 7 0 015 11V9a7 7 0 017-7zm-3 20h6' },
  { id: 'shutdown', label: 'Shutdown Planner', href: BASE + 'shutdown-planner.html', icon: 'M12 3v9l6 3M12 21a9 9 0 100-18 9 9 0 000 18z' },
  { id: 'team', label: 'Team', href: BASE + 'team.html', icon: 'M16 11a4 4 0 10-8 0 4 4 0 008 0zm-8 2a6 6 0 00-6 6v1h20v-1a6 6 0 00-6-6H8z' },
  { id: 'settings', label: 'Settings', href: BASE + 'settings.html', icon: 'M12 8a4 4 0 100 8 4 4 0 000-8zm9 4l-2 3 .5 3-3 .5L14 24l-2-2-2 2-2.5-2-3-.5.5-3-2-3 2-3-.5-3 3-.5L10 0l2 2 2-2 2.5 2 3 .5-.5 3 2 3z' },
];

const NAV_SOON = [];

export default function AppShell({ children, active }) {
  const [{ authed, user }, setAuth] = useState(readAuth);
  const [railOpen, setRailOpen] = useState(false);

  const refresh = useCallback(() => setAuth(readAuth()), []);

  useEffect(() => {
    window.addEventListener('authChanged', refresh);
    window.addEventListener('storage', refresh);

    // Dynamic injection of vault.css
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = `${import.meta.env.BASE_URL}assets/vault.css`;
    document.head.appendChild(link);

    return () => {
      window.removeEventListener('authChanged', refresh);
      window.removeEventListener('storage', refresh);
      link.remove();
    };
  }, [refresh]);

  const logout = () => {
    localStorage.removeItem('tf_token');
    localStorage.removeItem('tf_user');
    window.dispatchEvent(new Event('authChanged'));
    window.location.href = BASE + 'vault.html';
  };

  // Pre-auth: protected pages redirect to login; vault/bare pages render children.
  if (!authed) {
    if (active && active !== 'vault') {
      window.location.href = BASE + 'vault.html';
      return null;
    }
    return <div className="app-bare">{children}</div>;
  }

  const roleLabel = user?.role
    ? user.role.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase())
    : '';
  const company = user?.company_name || user?.company_code || 'TurboFix';
  const initial = (user?.name || 'S').charAt(0).toUpperCase();

  return (
    <div className={`app-shell${railOpen ? ' rail-open' : ''}`}>
      <a className="skip-link" href="#main-content">Skip to main content</a>
      {railOpen && <div className="app-scrim" onClick={() => setRailOpen(false)} />}

      <aside className="app-rail">
        <a href={BASE} className="app-rail-brand" aria-label="TurboFix home">
          <span className="app-logo">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M13 2L4.5 13.5H11l-1 8.5L19.5 10H12l1-8z" fill="#f59e0b" /></svg>
          </span>
          <span className="app-brand-name"><b>TURBO</b>FIX</span>
        </a>

        <nav className="app-nav" aria-label="Main navigation">
          <div className="app-nav-group">Workspace</div>
          {NAV_LIVE.map((item) => (
            <a
              key={item.id}
              href={item.href}
              className={`app-nav-item${active === item.id ? ' active' : ''}`}
              onClick={() => setRailOpen(false)}
            >
              <svg className="nav-ic" width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d={item.icon} /></svg>
              <span>{item.label}</span>
            </a>
          ))}

          {NAV_SOON.length > 0 && (
            <>
              <div className="app-nav-group">Coming soon</div>
              {NAV_SOON.map((item) => (
                <span key={item.id} className="app-nav-item soon" aria-disabled="true">
                  <svg className="nav-ic" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d={item.icon} /></svg>
                  <span>{item.label}</span>
                  <span className="nav-soon-tag">soon</span>
                </span>
              ))}
            </>
          )}
        </nav>

        <div className="app-rail-foot">
          <button type="button" className="app-logout" onClick={logout}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M16 17l5-5-5-5M21 12H9M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" /></svg>
            <span>Log out</span>
          </button>
        </div>
      </aside>

      <div className="app-body">
        <header className="app-topbar">
          <button type="button" className="app-hamburger" aria-label="Menu" onClick={() => setRailOpen((v) => !v)}>
            <span></span><span></span><span></span>
          </button>
          <div className="app-company">
            <span className="app-company-name">{company}</span>
            <span className="app-live"><span className="app-live-dot" />Live</span>
          </div>
          <div className="app-topbar-right">
            {roleLabel && <span className="app-role-badge">{roleLabel}</span>}
            <div className="app-user" title={user?.name || ''}>
              <span className="app-avatar">{initial}</span>
              <span className="app-user-name">{user?.name || 'Staff'}</span>
            </div>
          </div>
        </header>

        <div className="app-content" id="main-content" tabIndex="-1">{children}</div>
      </div>
    </div>
  );
}
