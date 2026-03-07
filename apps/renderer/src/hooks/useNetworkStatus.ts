/**
 * useNetworkStatus
 * T-07.3: Detecta conexión a internet y sincroniza con el backend.
 * - Escucha eventos online/offline del navegador
 * - Hace ping real al /health del servidor cada 30s para confirmación
 * - Expone estado, conteo de pendientes y función de sync manual
 */
import { useEffect, useState, useCallback, useRef } from 'react';
import { api } from '../services/api.client';

export type NetworkStatus = 'online' | 'offline' | 'checking';

interface SyncState {
  pendientes: number;
  errores:    number;
  lastSync:   Date | null;
}

export function useNetworkStatus() {
  const [status,    setStatus]    = useState<NetworkStatus>('checking');
  const [syncState, setSyncState] = useState<SyncState>({ pendientes: 0, errores: 0, lastSync: null });
  const pingTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  // Ping real al servidor
  const checkServer = useCallback(async () => {
    try {
      await api.get('/inventario/status', { timeout: 4000 });
      setStatus('online');
    } catch {
      setStatus('offline');
    }
  }, []);

  // Obtener conteo de pendientes
  const fetchSyncState = useCallback(async () => {
    try {
      const { data } = await api.get('/inventario/sync-pendientes', { timeout: 4000 });
      setSyncState({ pendientes: data.pendientes, errores: data.errores, lastSync: new Date() });
    } catch {
      // Si falla, no actualizar
    }
  }, []);

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
      if (status === 'online') fetchSyncState();
    }, 30_000);

    return () => {
      window.removeEventListener('online',  onOnline);
      window.removeEventListener('offline', onOffline);
      if (pingTimer.current) clearInterval(pingTimer.current);
    };
  }, []); // eslint-disable-line

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