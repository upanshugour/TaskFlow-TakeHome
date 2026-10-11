const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'
).replace(/\/+$/, '');

const TOKEN_KEY = 'taskflow.sessionToken';

export function getToken() {
  return window.sessionStorage.getItem(TOKEN_KEY);
}

export function saveToken(token) {
  window.sessionStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  window.sessionStorage.removeItem(TOKEN_KEY);
}

export async function apiRequest(path, { method = 'GET', body, token = getToken() } = {}) {
  const headers = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;

  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new Error('Unable to reach TaskFlow. Check that the API server is running.');
  }

  const payload = await response.json().catch(() => null);
  if (response.status === 401 && token) {
    clearToken();
    window.dispatchEvent(new Event('taskflow:unauthorized'));
  }

  if (!response.ok) {
    throw new Error(payload?.error?.message || 'The request could not be completed.');
  }

  return payload?.data;
}
