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
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const statusRef = useRef(status);
  const pingTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  // Tolerancia: solo mostramos "sin conexión" tras varios pings fallidos seguidos,
  // así un timeout puntual no hace parpadear la UI a offline cuando sí hay red.
  const failCountRef = useRef(0);
  const FAILS_BEFORE_OFFLINE = 2;
  const PING_TIMEOUT = 8000;

  // Ping real al servidor
  const checkServer = useCallback(async () => {
    try {
      if (!isAuthenticated) {
        await api.get('/health', {
          timeout: PING_TIMEOUT,
          baseURL: '',
        });
        failCountRef.current = 0;
        setStatus('online');
        return;
      }

      const { data } = await api.get('/inventario/status', { timeout: PING_TIMEOUT });
      failCountRef.current = 0;
      // El backend ya aplica su propia tolerancia antes de reportar offline.
      setStatus(data.online ? 'online' : 'offline');
    } catch (err: unknown) {
      // BUG-M01: loguear para trazabilidad.
      const msg = (err as { message?: string })?.message ?? String(err);
      console.warn('[useNetworkStatus] ping fallido:', msg);
      failCountRef.current += 1;
      // Recién marcamos offline tras varios fallos consecutivos.
      if (failCountRef.current >= FAILS_BEFORE_OFFLINE) setStatus('offline');
    }
  }, [isAuthenticated]);

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
      const [pendientesRes, snapshotRes] = await Promise.all([
        api.get('/inventario/sync-pendientes', { timeout: 4000 }),
        api.get('/sync/snapshot/status', { timeout: 4000 }),
      ]);
      const lastSyncAt = snapshotRes.data.lastSyncAt
        ? new Date(snapshotRes.data.lastSyncAt)
        : null;

      setSyncState({
        pendientes:    pendientesRes.data.pendientes,
        sincronizados: pendientesRes.data.sincronizados ?? 0,
        errores:       pendientesRes.data.errores,
        lastSync:      lastSyncAt,
      });
    } catch (err) {
      console.error('[useNetworkStatus] Error al obtener estado de sincronizacion:', err);
      // Si falla, conservamos el ultimo estado conocido.
    }
  }, [isAuthenticated]);

  const syncNow = useCallback(async () => {
    if (!isAuthenticated || statusRef.current !== 'online' || isSyncing) return null;

    setIsSyncing(true);
    setSyncError(null);

    try {
      const { data } = await api.post('/sync/snapshot', undefined, { timeout: 30_000 });
      const lastSyncAt = data.lastSyncAt ? new Date(data.lastSyncAt) : new Date();

      setSyncState(prev => ({
        ...prev,
        lastSync: lastSyncAt,
      }));
      await fetchSyncState();
      return data;
    } catch (err: any) {
      const message = err?.response?.data?.error ?? 'No se pudo sincronizar ahora';
      setSyncError(message);
      throw err;
    } finally {
      setIsSyncing(false);
    }
  }, [fetchSyncState, isAuthenticated, isSyncing]);

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  useEffect(() => {
    // Escuchar eventos del browser
    const onOnline  = () => { setStatus('checking'); checkServer(); fetchSyncState(); };
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
    isSyncing,
    syncError,
    checkNow:   checkServer,
    refreshSync: fetchSyncState,
    syncNow,
  };
}
