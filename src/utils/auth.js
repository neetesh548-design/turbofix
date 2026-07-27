export function isTokenExpired(token, now = Date.now()) {
  if (!token) return true;
  if (token.startsWith('demo:')) return !['owner', 'supervisor', 'maintenance_technician'].includes(token.slice(5));
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
