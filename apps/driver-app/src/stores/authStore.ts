import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '@RideForge/shared';
import { api } from '../lib/axios';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isLoading: boolean;
  error: string | null;

  login: (phone: string, password: string) => Promise<void>;
  register: (data: { name: string; phone: string; password: string; email?: string; role?: string }) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
  setUser: (user: User | null) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isLoading: false,
      error: null,

      login: async (phone, password) => {
        set({ isLoading: true, error: null });
        try {
          const res = await api.post('/auth/login', { phone, password });
          const { accessToken, refreshToken, user } = res.data.data;
          set({ accessToken, refreshToken, user, isLoading: false });
        } catch (err: any) {
          const msg: string =
            err?.response?.data?.error?.message ||
            err?.response?.data?.message ||
            'Login failed. Please check your credentials.';
          set({ isLoading: false, error: msg });
          throw err;
        }
      },

      register: async ({ name, phone, password, email, role }) => {
        set({ isLoading: true, error: null });
        try {
          const res = await api.post('/auth/register', {
            name,
            phone,
            password,
            email: email || undefined,
            role: role || 'DRIVER',
          });
          const { accessToken, refreshToken, user } = res.data.data;
          set({ accessToken, refreshToken, user, isLoading: false });
        } catch (err: any) {
          const msg: string =
            err?.response?.data?.error?.message ||
            err?.response?.data?.message ||
            'Registration failed. Please try again.';
          set({ isLoading: false, error: msg });
          throw err;
        }
      },

      logout: async () => {
        try {
          const { refreshToken } = get();
          if (refreshToken) {
            await api.post('/auth/logout', { refreshToken }).catch(() => { /* best-effort */ });
          }
        } finally {
          set({ user: null, accessToken: null, refreshToken: null, error: null });
        }
      },

      clearError: () => set({ error: null }),
      setUser: (user) => set({ user }),
    }),
    {
      name: 'driver-auth',
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
      }),
    }
  )
);
