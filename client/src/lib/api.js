/**
 * Admin API client.
 *
 * Thin wrapper over fetch that centralises three things every admin request
 * needs: same-origin credentials, the CSRF header on unsafe methods, and
 * uniform error shaping.
 *
 * The CSRF token is held in a module variable rather than in localStorage. It
 * is session-scoped and worthless after logout, and keeping it out of storage
 * means it cannot be read back by a script running later on the same origin.
 */

let csrfToken = null;

export function setCsrfToken(token) {
  csrfToken = token ?? null;
}

export class ApiError extends Error {
  constructor(message, status, code) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

async function request(path, { method = "GET", body } = {}) {
  const headers = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  // Safe methods carry no token: they change nothing, so there is nothing to
  // protect, and the server exempts them.
  if (method !== "GET" && method !== "HEAD" && csrfToken) {
    headers["X-CSRF-Token"] = csrfToken;
  }

  const response = await fetch(path, {
    method,
    credentials: "same-origin",
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (response.status === 204) return null;

  let payload = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    throw new ApiError(
      payload?.error?.message ?? "Request failed.",
      response.status,
      payload?.error?.code ?? "unknown"
    );
  }

  return payload;
}

export const api = {
  get: (path) => request(path),
  post: (path, body) => request(path, { method: "POST", body }),

  auth: {
    session: () => request("/api/admin/auth/session"),
    login: (username, password) =>
      request("/api/admin/auth/login", { method: "POST", body: { username, password } }),
    logout: () => request("/api/admin/auth/logout", { method: "POST" }),
  },

  analytics: {
    overview: (days) => request(`/api/admin/analytics/overview?days=${days}`),
    traffic: (days) => request(`/api/admin/analytics/traffic?days=${days}`),
    pages: (days, limit = 10) => request(`/api/admin/analytics/pages?days=${days}&limit=${limit}`),
    sources: (days, limit = 10) => request(`/api/admin/analytics/sources?days=${days}&limit=${limit}`),
    devices: (days) => request(`/api/admin/analytics/devices?days=${days}`),
    flows: (days, limit = 15) => request(`/api/admin/analytics/flows?days=${days}&limit=${limit}`),
    events: (days, limit = 15) => request(`/api/admin/analytics/events?days=${days}&limit=${limit}`),
    activity: (limit = 20) => request(`/api/admin/analytics/activity?limit=${limit}`),
    insights: (days, refresh = false) =>
      request(`/api/admin/analytics/insights?days=${days}${refresh ? "&refresh=1" : ""}`),
    snapshot: (days) => request(`/api/admin/analytics/insights/snapshot?days=${days}`),
  },
};
