/**
 * api.client.ts
 * T-07.3: Cliente HTTP con soporte offline
 * - Inyecta JWT en cada request
 * - Detecta 401 y limpia sesión
 * - En modo offline, rechaza con error tipado para que la UI lo maneje
 */
import axios from 'axios';
import { useAuthStore } from '../store/authStore';

export const api = axios.create({
  baseURL: '/api',
  timeout: 10_000,
});

// Inyecta el token JWT en cada request
api.interceptors.request.use(config => {
  const token = useAuthStore.getState().token;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Manejo de errores global
api.interceptors.response.use(
  res => res,
  err => {
    // 401 → cerrar sesión
    if (err.response?.status === 401) {
      useAuthStore.getState().logout();
    }
    // Sin conexión → etiquetar el error para que la UI muestre modo offline
    if (!err.response && (err.code === 'ERR_NETWORK' || err.code === 'ECONNABORTED')) {
      err.isOffline = true;
    }
    return Promise.reject(err);
  }
);

// Helper para saber si un error es de conectividad
export function isOfflineError(err: any): boolean {
  return !!(err?.isOffline || err?.code === 'ERR_NETWORK' || !navigator.onLine);
}