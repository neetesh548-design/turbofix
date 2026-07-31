/**
 * Auth utilities
 *
 * IMPORTANT — SECURITY NOTE:
 * JWT expiry is checked here for UX convenience (avoiding expired-token
 * confusion). The cryptographic signature is NOT verified client-side;
 * that must be enforced server-side via Supabase RLS and edge function auth.
 * Demo tokens are UX-only. Server-side auth/RLS must still enforce real access.
 */

const VALID_DEMO_ROLES = new Set([
  'operator',
  'owner',
  'supervisor',
  'technician',
  'maintenance_technician',
  'maintenance_engineer',
  'quality_inspector',
  'maintenance_head',
  'safety_officer',
]);

export function isTokenExpired(token, now = Date.now()) {
  if (!token) return true;
  if (token.startsWith('demo:')) {
    const role = token.slice(5).trim();
    return !VALID_DEMO_ROLES.has(role);
  }
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return !payload.exp || now >= payload.exp * 1000;
  } catch {
    return true;
  }
}

export function safeRedirectPath(rawTarget, base = '/') {
  if (!rawTarget) return '/dashboard.html';
  let target;
  try {
    target = decodeURIComponent(rawTarget);
  } catch {
    target = rawTarget;
  }

  if (/^[a-z][a-z\d+.-]*:/i.test(target) || target.startsWith('//')) {
    return '/dashboard.html';
  }

  const normalizedBase = base && base !== '/' ? `/${base.replace(/^\/|\/$/g, '')}` : '';
  if (normalizedBase && target.startsWith(`${normalizedBase}/`)) {
    target = target.slice(normalizedBase.length);
  }

  const path = target.startsWith('/') ? target : `/${target}`;
  return path.startsWith('/login') ? '/dashboard.html' : path;
}

export function readAuth(storage = localStorage) {
  const token = storage.getItem('tf_token');
  if (isTokenExpired(token)) return { authed: false, user: null };
  try {
    const user = JSON.parse(storage.getItem('tf_user') || 'null');
    return user ? { authed: true, user } : { authed: false, user: null };
  } catch {
    return { authed: false, user: null };
  }
}
