const BASE = import.meta.env.BASE_URL || '/';

export function getApiBase() {
  return import.meta.env.VITE_API_URL || 'https://turbofix-backend-ehxb.onrender.com';
}

export async function apiFetch(path, options = {}) {
  const token = localStorage.getItem('tf_token');
  const headers = { ...options.headers };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const apiBase = getApiBase();
  const resp = await fetch(`${apiBase}${path}`, { ...options, headers });

  if (resp.status === 401) {
    localStorage.removeItem('tf_token');
    localStorage.removeItem('tf_user');
    window.dispatchEvent(new Event('authChanged'));
    window.location.href = BASE + 'vault.html';
    throw new Error('Session expired');
  }

  return resp;
}
