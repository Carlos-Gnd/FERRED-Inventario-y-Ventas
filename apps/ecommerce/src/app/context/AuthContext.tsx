import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { getClienteActual, loginCliente, registerCliente } from '../services/ecommerceApi';
import type { ClienteEcommerce } from '../types';

type AuthContextType = {
  cliente: ClienteEcommerce | null;
  token: string | null;
  loadingAuth: boolean;
  isAuthenticated: boolean;
  login: (payload: { email: string; password: string }) => Promise<void>;
  register: (payload: {
    nombre: string;
    email: string;
    password: string;
    telefono?: string;
    direccion?: string;
  }) => Promise<void>;
  logout: () => void;
};

const TOKEN_STORAGE_KEY = 'ferred-ecommerce-token';
const CLIENTE_STORAGE_KEY = 'ferred-ecommerce-cliente';

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_STORAGE_KEY));
  const [cliente, setCliente] = useState<ClienteEcommerce | null>(() => {
    const raw = localStorage.getItem(CLIENTE_STORAGE_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as ClienteEcommerce;
    } catch {
      localStorage.removeItem(CLIENTE_STORAGE_KEY);
      return null;
    }
  });
  const [loadingAuth, setLoadingAuth] = useState(Boolean(token));

  const persistSession = (nextToken: string, nextCliente: ClienteEcommerce) => {
    setToken(nextToken);
    setCliente(nextCliente);
    localStorage.setItem(TOKEN_STORAGE_KEY, nextToken);
    localStorage.setItem(CLIENTE_STORAGE_KEY, JSON.stringify(nextCliente));
  };

  const logout = () => {
    setToken(null);
    setCliente(null);
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(CLIENTE_STORAGE_KEY);
  };

  useEffect(() => {
    if (!token) {
      setLoadingAuth(false);
      return;
    }

    let cancelled = false;
    setLoadingAuth(true);
    getClienteActual(token)
      .then(({ cliente: currentCliente }) => {
        if (!cancelled) persistSession(token, currentCliente);
      })
      .catch(() => {
        if (!cancelled) logout();
      })
      .finally(() => {
        if (!cancelled) setLoadingAuth(false);
      });

    return () => {
      cancelled = true;
    };
  }, [token]);

  const value = useMemo<AuthContextType>(() => ({
    cliente,
    token,
    loadingAuth,
    isAuthenticated: Boolean(token && cliente),
    login: async (payload) => {
      const response = await loginCliente(payload);
      persistSession(response.token, response.cliente);
    },
    register: async (payload) => {
      const response = await registerCliente(payload);
      persistSession(response.token, response.cliente);
    },
    logout,
  }), [cliente, token, loadingAuth]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
}
