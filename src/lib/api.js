const BASE = import.meta.env.BASE_URL || '/';

export function getApiBase() {
  return localStorage.getItem('tf_api_base')
    || (['localhost', '127.0.0.1'].includes(window.location.hostname)
        ? 'http://127.0.0.1:8000'
        : 'https://turbofix-backend-ehxb.onrender.com');
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
