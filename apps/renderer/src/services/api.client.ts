/**
 * api.client.ts
 * T-07.3: Cliente HTTP con soporte offline
 * - Inyecta JWT en cada request
 * - Detecta 401 y limpia sesión
 * - En modo offline, rechaza con error tipado para que la UI lo maneje
 */
import axios from 'axios';
import { useAuthStore } from '../store/authStore';

// DT-22: constantes de timeout reutilizables; pasar como { timeout: TIMEOUTS.long }
// en requests que pueden tardar más (exports, snapshot, reportes)
export const TIMEOUTS = {
  quick:   5_000,   // ping / health
  default: 10_000,  // operaciones normales
  long:    60_000,  // exports, reportes, snapshot manual
} as const;

export const api = axios.create({
  baseURL: '/api',
  timeout: TIMEOUTS.default,
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