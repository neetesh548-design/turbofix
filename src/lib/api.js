const BASE = import.meta.env.BASE_URL || '/';

export function getApiBase() {
  const storedApiBase = localStorage.getItem('tf_api_base');
  const isLocal = ['localhost', '127.0.0.1'].includes(window.location.hostname);
  const defaultApiBase = isLocal
    ? 'http://127.0.0.1:8000'
    : 'https://turbofix-backend-ehxb.onrender.com';
  const pointsToLocalServer = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?\b/i.test(storedApiBase || '');
  return storedApiBase && (isLocal || !pointsToLocalServer) ? storedApiBase : defaultApiBase;
}

const RETRYABLE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const RETRYABLE_STATUS_CODES = new Set([500, 502, 503, 504]);

const wait = (milliseconds) => new Promise((resolve) => window.setTimeout(resolve, milliseconds));

async function wakeBackend(apiBase) {
  try {
    await fetch(`${apiBase.replace(/\/$/, '')}/health`, { cache: 'no-store' });
  } catch {
    // The retry below provides the user-facing error if the service is unavailable.
  }
}

export async function apiFetch(path, options = {}) {
  const token = localStorage.getItem('tf_token');
  const headers = { ...options.headers };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const apiBase = getApiBase();
  const method = (options.method || 'GET').toUpperCase();
  const canRetry = RETRYABLE_METHODS.has(method) && path !== '/health';
  let resp;
  let lastError;

  for (let attempt = 0; attempt < (canRetry ? 2 : 1); attempt += 1) {
    try {
      resp = await fetch(`${apiBase}${path}`, { ...options, headers });
      if (!canRetry || !RETRYABLE_STATUS_CODES.has(resp.status) || attempt === 1) break;
    } catch (error) {
      lastError = error;
      if (!canRetry || attempt === 1) throw error;
    }

    await wakeBackend(apiBase);
    await wait(1500);
  }

  if (!resp) throw lastError || new Error('The backend did not respond.');

  if (resp.status === 401) {
    localStorage.removeItem('tf_token');
    localStorage.removeItem('tf_user');
    window.dispatchEvent(new Event('authChanged'));
    window.location.href = BASE + 'vault.html';
    throw new Error('Session expired');
  }

  return resp;
}
