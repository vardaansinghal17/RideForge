import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api } from '../lib/axios';

interface User {
  id: string;
  name: string;
  email: string | null;
  phone: string;
  role: string;
}

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: User | null;
  isLoading: boolean;
  error: string | null;
  login: (phone: string, password: string) => Promise<void>;
  logout: () => void;
  setTokens: (accessToken: string, refreshToken: string) => void;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      isLoading: false,
      error: null,

      login: async (phone, password) => {
        set({ isLoading: true, error: null });
        try {
          const res = await api.post('/auth/login', { phone, password });
          const { accessToken, refreshToken, user } = res.data.data;
          if (user.role !== 'ADMIN') {
            set({ isLoading: false, error: 'Access denied. Admin credentials required.' });
            return;
          }
          set({ accessToken, refreshToken, user, isLoading: false, error: null });
        } catch (err: any) {
          set({
            isLoading: false,
            error: err.response?.data?.message || 'Login failed. Please check your credentials.',
          });
          throw err;
        }
      },

      logout: () => {
        set({ accessToken: null, refreshToken: null, user: null, error: null });
      },

      setTokens: (accessToken, refreshToken) => {
        set({ accessToken, refreshToken });
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'rf-admin-auth',
      partialState: (state: AuthState) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        user: state.user,
      }),
    }
  )
);
