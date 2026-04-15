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

  const load = useCallback(async () => {
    if (rol === 'CAJERO') {
      setSummary([]);
      return;
    }

    setLoading(true);
    try {
      if (rol === 'ADMIN') {
        const { data } = await api.get<StockPorSucursalResumen[]>('/inventario/criticos-por-sucursal');
        setSummary(data);
      } else {
        const sucursalId = usuario?.sucursalId ?? 1;
        const { data } = await api.get<{ total: number }>(`/inventario/criticos/${sucursalId}`);
        setSummary([{
          sucursalId,
          sucursalNombre: usuario?.sucursalId ? `Sucursal ${usuario.sucursalId}` : 'Sin sucursal asignada',
          criticos: data.total ?? 0,
        }]);
      }
    } catch {
      // La navegación solo necesita señal visual; en error conservamos el último estado.
    } finally {
      setLoading(false);
    }
  }, [rol, usuario?.sucursalId]);

  useEffect(() => {
    load();

    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(load, REFRESH_MS);

    return () => {
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
