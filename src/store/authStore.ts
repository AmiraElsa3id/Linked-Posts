import { create } from 'zustand';
import { User } from '@/types/api';

interface AuthState {
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
  /** True once initAuth has read the saved session from localStorage. */
  hydrated: boolean;
  setAuth: (token: string, user: User) => void;
  updateUser: (user: Partial<User>) => void;
  logout: () => void;
  initAuth: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  user: null,
  isAuthenticated: false,
  hydrated: false,
  setAuth: (token, user) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('auth_token', token);
      localStorage.setItem('auth_user', JSON.stringify(user));
    }
    set({ token, user, isAuthenticated: true });
  },
  updateUser: (partialUser) => {
    set((state) => {
      if (!state.user) return state;
      const updatedUser = { ...state.user, ...partialUser };
      if (typeof window !== 'undefined') {
        localStorage.setItem('auth_user', JSON.stringify(updatedUser));
      }
      return { user: updatedUser };
    });
  },
  logout: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_user');
    }
    set({ token: null, user: null, isAuthenticated: false });
  },
  initAuth: () => {
    if (typeof window !== 'undefined') {
      const storedToken = localStorage.getItem('auth_token');
      const storedUser = localStorage.getItem('auth_user');
      if (storedToken && storedUser) {
        try {
          const user = JSON.parse(storedUser);
          set({ token: storedToken, user, isAuthenticated: true });
        } catch {
          localStorage.removeItem('auth_token');
          localStorage.removeItem('auth_user');
        }
      }
      set({ hydrated: true });
    }
  },
}));
