import axios from 'axios';
import type { AxiosInstance } from 'axios';

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (err: unknown) => void;
}> = [];

function processQueue(error: unknown, token: string | null) {
  failedQueue.forEach(p => error ? p.reject(error) : p.resolve(token!));
  failedQueue = [];
}

export const api: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:4000/api',
  timeout: 10000,
});

api.interceptors.request.use((config) => {
  try {
    const raw = localStorage.getItem('rider-auth');
    const state = raw ? JSON.parse(raw) : null;
    const token = state?.state?.accessToken;
    if (token) config.headers.Authorization = `Bearer ${token}`;
  } catch { /* ignore */ }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status !== 401 || original._retry) {
      return Promise.reject(error);
    }

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      }).then(token => {
        original.headers.Authorization = `Bearer ${token}`;
        return api(original);
      });
    }

    original._retry = true;
    isRefreshing = true;

    try {
      const raw = localStorage.getItem('rider-auth');
      const state = raw ? JSON.parse(raw) : null;
      const refreshToken = state?.state?.refreshToken;

      if (!refreshToken) throw new Error('No refresh token');

      const res = await axios.post(
        `${api.defaults.baseURL}/auth/refresh`,
        { refreshToken }
      );

      const newToken = res.data.data.accessToken;
      const newRefresh = res.data.data.refreshToken;

      if (raw) {
        const parsed = JSON.parse(raw);
        parsed.state.accessToken = newToken;
        parsed.state.refreshToken = newRefresh;
        localStorage.setItem('rider-auth', JSON.stringify(parsed));
      }

      processQueue(null, newToken);
      original.headers.Authorization = `Bearer ${newToken}`;
      return api(original);
    } catch (err) {
      processQueue(err, null);
      localStorage.removeItem('rider-auth');
      window.location.href = '/login';
      return Promise.reject(err);
    } finally {
      isRefreshing = false;
    }
  }
);
