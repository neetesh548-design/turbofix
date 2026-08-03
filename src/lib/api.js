const BASE = import.meta.env.BASE_URL || '/';

export function getApiBase() {
  return import.meta.env.VITE_API_URL || 'https://turbofix-backend-ehxb.onrender.com';
}

// Keepalive: ping the backend every 8 minutes so the Render free-tier
// instance never goes to sleep during an active session.
let _keepaliveTimer = null;
export function startKeepalive() {
  if (_keepaliveTimer || typeof window === 'undefined') return;
  const ping = () => fetch(`${getApiBase()}/health`, { method: 'GET', signal: AbortSignal.timeout?.(5000) }).catch(() => {});
  ping(); // immediate first ping
  _keepaliveTimer = setInterval(ping, 8 * 60 * 1000); // every 8 minutes
}
export function stopKeepalive() {
  if (_keepaliveTimer) { clearInterval(_keepaliveTimer); _keepaliveTimer = null; }
}

export async function apiFetch(path, options = {}) {
  const token = localStorage.getItem('tf_token');
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000); // 15 s timeout

  try {
    const resp = await fetch(`${getApiBase()}${path}`, {
      ...options,
      headers,
      signal: controller.signal,
    });

    // Every thrown error below carries a `.status` so callers can branch on
    // the real HTTP status instead of matching against this generic message
    // text — Login.jsx used to string-match for "pending approval" against
    // whatever ended up here, which silently never matched the backend's
    // actual wording ("pending TurboFix admin approval") and let unapproved
    // companies log in anyway through the Supabase fallback path.
    if (resp.status === 401) {
      localStorage.removeItem('tf_token');
      localStorage.removeItem('tf_user');
      window.dispatchEvent(new Event('authChanged'));
      window.location.href = BASE + 'login.html';
      const err = new Error('Session expired. Please sign in again.');
      err.status = 401;
      throw err;
    }
    if (resp.status === 403) {
      const body = await resp.clone().json().catch(() => ({}));
      const err = new Error(body.detail || 'You do not have permission to perform this action.');
      err.status = 403;
      throw err;
    }
    if (resp.status === 404) {
      const err = new Error('Resource not found.');
      err.status = 404;
      throw err;
    }
    if (resp.status === 429) {
      const err = new Error('Too many requests. Please wait a moment and try again.');
      err.status = 429;
      throw err;
    }
    if (resp.status >= 500) {
      const err = new Error('Server error. Please try again shortly or contact turbofixsolution@gmail.com.');
      err.status = resp.status;
      throw err;
    }

    return resp;
  } catch (err) {
    if (err.name === 'AbortError') throw new Error('Request timed out. Check your connection and try again.');
    if (!navigator.onLine) throw new Error('You appear to be offline. Check your network and retry.');
    // Re-throw already-formatted errors
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}
