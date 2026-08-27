import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1',
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

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
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const requestUrl = String(err.config?.url || '');
    const isAuthRequest = ['/auth/login', '/auth/register', '/auth/refresh']
      .some((path) => requestUrl.includes(path));

    if (err.response?.status === 401 && !isAuthRequest) {
      const sentToken = Boolean(err.config?.headers?.Authorization);
      if (sentToken && !err.config?._retried) {
        err.config._retried = true;
        try {
          const newToken = await refreshAccessToken();
          err.config.headers.Authorization = `Bearer ${newToken}`;
          return api.request(err.config);
        } catch {
          // Token refresh failed
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
