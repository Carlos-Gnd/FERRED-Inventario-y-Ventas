/**
 * useNetworkStatus
 * T-07.3: Detecta conexión a internet y sincroniza con el backend.
 * - Escucha eventos online/offline del navegador
 * - Hace ping real al /health del servidor cada 30s para confirmación
 * - Expone estado, conteo de pendientes y función de sync manual
 */
import { useEffect, useState, useCallback, useRef } from 'react';
import { api } from '../services/api.client';
import { useAuthStore } from '../store/authStore';

export type NetworkStatus = 'online' | 'offline' | 'checking';

export interface SyncState {
  pendientes:    number;
  sincronizados: number;
  errores:       number;
  lastSync:      Date | null;
}

export function useNetworkStatus() {
  const isAuthenticated = useAuthStore(s => s.isAuthenticated);
  const [status,    setStatus]    = useState<NetworkStatus>('checking');
  const [syncState, setSyncState] = useState<SyncState>({ pendientes: 0, sincronizados: 0, errores: 0, lastSync: null });
  const statusRef = useRef(status);
  const pingTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  // Ping real al servidor
  const checkServer = useCallback(async () => {
    try {
      await api.get('/health', {
        timeout: 4000,
        baseURL: '',
      });
      setStatus('online');
    } catch {
      setStatus('offline');
    }
  }, []);

  // Obtener conteo de pendientes
  const fetchSyncState = useCallback(async () => {
    if (!isAuthenticated) {
      setSyncState(prev => (
        prev.pendientes === 0 && prev.sincronizados === 0 && prev.errores === 0 && prev.lastSync === null
          ? prev
          : { pendientes: 0, sincronizados: 0, errores: 0, lastSync: null }
      ));
      return;
    }

    try {
      const { data } = await api.get('/inventario/sync-pendientes', { timeout: 4000 });
      setSyncState({ pendientes: data.pendientes, sincronizados: data.sincronizados ?? 0, errores: data.errores, lastSync: new Date() });
    } catch {
      // Si falla, no actualizar
    }
  }, [isAuthenticated]);

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  useEffect(() => {
    // Escuchar eventos del browser
    const onOnline  = () => { setStatus('online');  checkServer(); fetchSyncState(); };
    const onOffline = () => setStatus('offline');

    window.addEventListener('online',  onOnline);
    window.addEventListener('offline', onOffline);

    // Chequeo inicial
    checkServer();
    fetchSyncState();

    // Ping cada 30 segundos
    pingTimer.current = setInterval(() => {
      checkServer();
      if (statusRef.current === 'online') fetchSyncState();
    }, 30_000);

    return () => {
      window.removeEventListener('online',  onOnline);
      window.removeEventListener('offline', onOffline);
      if (pingTimer.current) clearInterval(pingTimer.current);
    };
  }, [checkServer, fetchSyncState]);

  return {
    status,
    isOnline:   status === 'online',
    isOffline:  status === 'offline',
    isChecking: status === 'checking',
    syncState,
    checkNow:   checkServer,
    refreshSync: fetchSyncState,
  };
}
