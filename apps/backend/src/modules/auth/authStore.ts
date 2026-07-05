import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AuthTokens, User } from '@RideForge/shared';
import { api } from '../../lib/axios';

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: Omit<User, 'created_at'> | null;
  isLoading: boolean;
  error: string | null;

  login: (phone: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  setTokens: (tokens: AuthTokens) => void;
  clearError: () => void;
}

interface RegisterData {
  name: string;
  phone: string;
  password: string;
  email?: string;
  role: 'RIDER';
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      isLoading: false,
      error: null,

      setTokens: ({ accessToken, refreshToken, user }: AuthTokens) => {
        set({ accessToken, refreshToken, user, error: null });
      },

      login: async (phone, password) => {
        set({ isLoading: true, error: null });
        try {
          const res = await api.post<{ success: boolean; data: AuthTokens }>(
            '/auth/login', { phone, password }
          );
          get().setTokens(res.data.data);
        } catch (err: any) {
          set({ error: err.response?.data?.error?.message || 'Login failed' });
          throw err;
        } finally {
          set({ isLoading: false });
        }
      },

      register: async (data) => {
        set({ isLoading: true, error: null });
        try {
          const res = await api.post<{ success: boolean; data: AuthTokens }>(
            '/auth/register', data
          );
          get().setTokens(res.data.data);
        } catch (err: any) {
          set({ error: err.response?.data?.error?.message || 'Registration failed' });
          throw err;
        } finally {
          set({ isLoading: false });
        }
      },

      logout: async () => {
        const { refreshToken } = get();
        try {
          if (refreshToken) {
            await api.post('/auth/logout', { refreshToken });
          }
        } finally {
          set({ accessToken: null, refreshToken: null, user: null });
        }
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'rider-auth',
      partialize: (s) => ({
        accessToken: s.accessToken,
        refreshToken: s.refreshToken,
        user: s.user,
      }),
    }
  )
);