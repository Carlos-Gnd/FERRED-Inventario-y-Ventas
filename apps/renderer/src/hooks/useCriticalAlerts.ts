import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../services/api.client';
import { useAuthStore } from '../store/authStore';
import type { UserRole } from '../types';

interface StockPorSucursalResumen {
  sucursalId: number;
  sucursalNombre: string;
  criticos: number;
}

const REFRESH_MS = 5 * 60 * 1000;

export function useCriticalAlerts() {
  const usuario = useAuthStore(s => s.usuario);
  const rol = (usuario?.rol ?? 'CAJERO') as UserRole;

  const [summary, setSummary] = useState<StockPorSucursalResumen[]>([]);
  const [loading, setLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async (isMounted: () => boolean = () => true) => {
    if (!isMounted()) return;

    if (rol === 'CAJERO') {
      if (isMounted()) {
        setSummary([]);
      }
      return;
    }

    if (isMounted()) {
      setLoading(true);
    }
    try {
      if (rol === 'ADMIN') {
        const { data } = await api.get<StockPorSucursalResumen[]>('/inventario/criticos-por-sucursal');
        if (isMounted()) {
          setSummary(data);
        }
      } else {
        const sucursalId = usuario?.sucursalId;
        if (!sucursalId) {
          if (isMounted()) {
            setSummary([]);
          }
          return;
        }
        const { data } = await api.get<{ total: number }>(`/inventario/criticos/${sucursalId}`);
        if (isMounted()) {
          setSummary([{
            sucursalId,
            sucursalNombre: `Sucursal ${sucursalId}`,
            criticos: data.total ?? 0,
          }]);
        }
      }
    } catch {
      // La navegación solo necesita señal visual; en error conservamos el último estado.
    } finally {
      if (isMounted()) {
        setLoading(false);
      }
    }
  }, [rol, usuario?.sucursalId]);

  useEffect(() => {
    let mounted = true;

    const safeLoad = async () => {
      if (!mounted) return;
      await load(() => mounted);
    };

    safeLoad();

    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(safeLoad, REFRESH_MS);

    return () => {
      mounted = false;
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [load]);

  return {
    summary,
    loading,
    totalAlerts: summary.reduce((acc, item) => acc + item.criticos, 0),
    hasActiveAlerts: summary.some(item => item.criticos > 0),
    refresh: load,
  };
}
