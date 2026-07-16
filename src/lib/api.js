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

export async function apiFetch(path, options = {}) {
  const token = localStorage.getItem('tf_token');
  const headers = { ...options.headers };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const resp = await fetch(`${getApiBase()}${path}`, { ...options, headers });

  if (resp.status === 401) {
    localStorage.removeItem('tf_token');
    localStorage.removeItem('tf_user');
    window.dispatchEvent(new Event('authChanged'));
    window.location.href = BASE + 'vault.html';
    throw new Error('Session expired');
  }

  return resp;
}
