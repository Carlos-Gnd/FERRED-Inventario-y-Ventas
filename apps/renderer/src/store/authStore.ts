import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AuthUser } from '../types';

interface AuthState {
  token:           string | null;
  usuario:         AuthUser | null;
  isAuthenticated: boolean;

  // Acción unificada — nunca más setToken + setUser por separado
  setAuth:  (usuario: AuthUser, token: string) => void;
  logout:   () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token:           null,
      usuario:         null,
      isAuthenticated: false,

      setAuth: (usuario, token) =>
        set({ usuario, token, isAuthenticated: true }),

      logout: () =>
        set({ usuario: null, token: null, isAuthenticated: false }),
    }),
    {
      name:    'ferred-auth',      // clave en localStorage
      version: 1,
    }
  )
);