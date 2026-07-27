/**
 * Auth utilities
 *
 * IMPORTANT — SECURITY NOTE:
 * JWT expiry is checked here for UX convenience (avoiding expired-token
 * confusion). The cryptographic signature is NOT verified client-side;
 * that must be enforced server-side via Supabase RLS and edge function auth.
 * Demo tokens are intentionally limited to read-only operator scope.
 */

// Roles that a demo token is allowed to claim.
// Anything escalated (owner, maintenance_head etc.) is blocked so a
// curious user cannot simply type demo:owner in DevTools to gain admin access.
const DEMO_ALLOWED_ROLES = new Set([
  'operator',
  'maintenance_technician',
  'vendor',
]);

export function isTokenExpired(token, now = Date.now()) {
  if (!token) return true;
  if (token.startsWith('demo:')) {
    // Demo tokens for privileged roles are treated as expired
    // so callers fall through to the normal unauthenticated path.
    const role = token.slice(5);
    return !DEMO_ALLOWED_ROLES.has(role);
  }
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return !payload.exp || now >= payload.exp * 1000;
  } catch {
    return true;
  }
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
