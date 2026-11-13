import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1',
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

const newIdempotencyKey = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
};

let accessToken: string | null = null;
let refreshPromise: Promise<string> | null = null;
if (typeof window !== 'undefined') {
  try {
    accessToken = localStorage.getItem('token');
  } catch {
    accessToken = null;
  }
}

export const setAccessToken = (token: string | null) => {
  accessToken = token;
  if (typeof window !== 'undefined') {
    try {
      if (token) {
        localStorage.setItem('token', token);
      } else {
        localStorage.removeItem('token');
      }
    } catch {
      // Ignore storage errors in private/incognito mode
    }
  }
};

export const refreshAccessToken = () => {
  if (!refreshPromise) {
    refreshPromise = api.post('/auth/refresh')
      .then((response) => {
        const token = response.data?.data?.accessToken || response.data?.data?.token;
        if (!token) throw new Error('Refresh response did not include an access token');
        setAccessToken(token);
        return token as string;
      })
      .finally(() => { refreshPromise = null; });
  }
  return refreshPromise;
};

api.interceptors.request.use((config) => {
  const token = accessToken || (typeof window !== 'undefined' ? localStorage.getItem('token') : null);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  // The backend requires an Idempotency-Key on document and money POSTs (e.g. /platform/*) so a
  // double click or network retry can't create the same record twice. One key per request; a
  // retry of the same request (e.g. after a token refresh) reuses it because it reuses this config.
  if (config.method?.toLowerCase() === 'post' && !config.headers['Idempotency-Key']) {
    config.headers['Idempotency-Key'] = newIdempotencyKey();
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const requestUrl = String(err.config?.url || '');
    const isAuthRequest = ['/auth/login', '/auth/register', '/auth/refresh', '/auth/logout']
      .some((path) => requestUrl.includes(path));

    if (err.response?.status === 401 && !isAuthRequest) {
      const sentToken = Boolean(err.config?.headers?.Authorization);
      if (sentToken && !err.config?._retried) {
        err.config._retried = true;
        try {
          const newToken = await refreshAccessToken();
          err.config.headers.Authorization = `Bearer ${newToken}`;
          return api.request(err.config);
        } catch (refreshErr) {
          // Token refresh failed. If an administrator signed this user out (role change,
          // password reset, deactivation), keep the server's reason to show on the login page.
          const data = (refreshErr as { response?: { data?: { code?: string; message?: string } } })?.response?.data;
          if (data?.code === 'SESSION_REVOKED' && data?.message && typeof window !== 'undefined') {
            try { sessionStorage.setItem('signedOutReason', data.message); } catch {}
          }
        }
      }

      // If token wasn't provided or refresh failed: wipe storage and immediately navigate to /login
      setAccessToken(null);
      if (typeof window !== 'undefined') {
        try {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
        } catch {}
        if (!window.location.pathname.startsWith('/login')) {
          window.location.assign('/login');
        }
      }
    }
    return Promise.reject(err);
  }
);

export default api;
