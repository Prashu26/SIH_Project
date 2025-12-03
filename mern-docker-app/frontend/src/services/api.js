// Prefer relative /api for Docker (nginx proxies to backend). Override via REACT_APP_API_URL when needed.
const API_BASE = "http://localhost:8080";

export async function apiFetch(path, options = {}) {
  const headers = options.headers || {};
  if (options.token) headers["Authorization"] = `Bearer ${options.token}`;
  if (options.body && !(options.body instanceof FormData))
    headers["Content-Type"] = "application/json";
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

export default API_BASE;
