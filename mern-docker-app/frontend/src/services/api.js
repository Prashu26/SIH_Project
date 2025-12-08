// Prefer relative /api for Docker (nginx proxies to backend).
// Override via environment variable `REACT_APP_API_URL` when needed.
const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8080';

export async function apiFetch(path, options = {}) {
  const headers = { ...(options.headers || {}) };

  // Use token provided in options first, else fallback to localStorage
  const token = options.token || (typeof window !== 'undefined' && localStorage.getItem('token'));
  if (token) headers['Authorization'] = `Bearer ${token}`;

  // Set content-type for JSON bodies (skip for FormData)
  if (options.body && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
    options.body = typeof options.body === 'string' ? options.body : JSON.stringify(options.body);
  }

  let res;
  try {
    res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  } catch (fetchErr) {
    // Network-level error (DNS, refused connection, CORS preflight failure, etc.)
    return { ok: false, status: 0, data: {}, networkError: true, error: fetchErr.message };
  }

  // Try parse JSON; if not JSON return empty object
  const data = await res.json().catch(() => ({}));

  // Auto-handle unauthorized: clear session and redirect to login
  if (res.status === 401 || res.status === 403) {
    try {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        // Redirect to login page so user can re-authenticate
        window.location.href = '/login';
      }
    } catch (e) {
      // ignore
    }
  }

  return { ok: res.ok, status: res.status, data };
}

export default API_BASE;
