/**
 * CajaHistorialPage.tsx
 * T-10.3: Página /caja/historial
 * - Tabla de cortes históricos con filtros tipo / sucursal / fecha
 * - Modal de detalle al hacer clic en "Ver Detalle"
 * - Botón reimprimir en el detalle
 * - Admin ve todos los cortes, Cajero solo los suyos
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../../../services/api.client';
import { useAuthStore } from '../../../store/authStore';
import { useThemeStore } from '../../../store/themeStore';
import { Toast } from '../../../components/ui';
import type { ToastData } from '../../../components/ui';
import type { UserRole } from '../../../types';
import type { CorteCaja, TipoCorte } from '../caja.types';
import { CorteDetalleModal } from '../components/CorteDetalleModal';

const fmt = (n: number) =>
  new Intl.NumberFormat('es-SV', { style: 'currency', currency: 'USD' }).format(n);

const fmtFecha = (iso: string | Date) => {
  const d = iso instanceof Date ? iso : new Date(iso);
  return new Intl.DateTimeFormat('es-SV', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
  }).format(d);
};

const TIPO_BADGE: Record<TipoCorte, { label: string; bg: string; color: string }> = {
  X: { label: 'X — Lectura', bg: 'rgba(59,130,246,0.12)',  color: 'var(--accent)'  },
  Y: { label: 'Y — Cierre',  bg: 'rgba(16,185,129,0.12)',  color: 'var(--success)' },
  Z: { label: 'Z — Total',   bg: 'rgba(146,64,14,0.12)',   color: '#92400e'        },
};

const IcoSearch = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

const IcoFilter = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
  </svg>
);

const IcoRefresh = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <polyline points="23 4 23 10 17 10" />
    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
  </svg>
);

export default function CajaHistorialPage() {
  const { usuario } = useAuthStore();
  const { isDark } = useThemeStore();
  const rol = (usuario?.rol ?? 'CAJERO') as UserRole;
  const esAdmin = rol === 'ADMIN';

  const [historial, setHistorial]       = useState<CorteCaja[]>([]);
  const [loading, setLoading]           = useState(true);
  const [toast, setToast]               = useState<ToastData | null>(null);
  const [corteDetalle, setCorteDetalle] = useState<CorteCaja | null>(null);
  const [modalOpen, setModalOpen]       = useState(false);

  // Filtros
  const [filtroTipo, setFiltroTipo]         = useState('Todos');
  const [filtroSucursal, setFiltroSucursal] = useState('Todas');
  const [filtroFecha, setFiltroFecha]       = useState('');

  // Sucursales derivadas del historial (no necesita endpoint propio)
  const sucursales = useMemo(() => {
    const mapa = new Map<number, string>();
    historial.forEach((c) => {
      if (c.sucursal) mapa.set(c.sucursal.id, c.sucursal.nombre);
    });
    return Array.from(mapa.entries()).map(([id, nombre]) => ({ id, nombre }));
  }, [historial]);

  const showToast = useCallback((msg: string, type: ToastData['type']) => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }, []);

  const loadHistorial = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = {};
      if (filtroTipo !== 'Todos') params.tipo = filtroTipo;
      if (filtroSucursal !== 'Todas') params.sucursalId = parseInt(filtroSucursal);
      if (filtroFecha) params.fecha = filtroFecha;

      const { data } = await api.get('/caja/cortes', { params });
      setHistorial(data);
    } catch {
      showToast('Error al cargar el historial', 'error');
    } finally {
      setLoading(false);
    }
  }, [filtroTipo, filtroSucursal, filtroFecha, showToast]);

  useEffect(() => {
    loadHistorial();
  }, [loadHistorial]);

  function abrirDetalle(corte: CorteCaja) {
    setCorteDetalle(corte);
    setModalOpen(true);
  }

  function cerrarDetalle() {
    setModalOpen(false);
    setCorteDetalle(null);
  }

  function limpiarFiltros() {
    setFiltroTipo('Todos');
    setFiltroSucursal('Todas');
    setFiltroFecha('');
  }

  const hayFiltros = filtroTipo !== 'Todos' || filtroSucursal !== 'Todas' || filtroFecha !== '';

  const textPrimary = 'var(--text-primary)';
  const textMuted   = 'var(--text-muted)';
  const textSubtle  = 'var(--text-subtle)';
  const borderColor = 'var(--border)';
  const surfaceBg   = 'var(--bg-surface)';
  const elevatedBg  = 'var(--bg-elevated)';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', animation: 'fadeUp 0.4s ease' }}>

      {/* ── Encabezado ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '26px', fontWeight: 800, color: textPrimary, marginBottom: '6px' }}>
            Historial de Cortes
          </h1>
          <p style={{ fontSize: '13px', color: textMuted }}>
            {esAdmin ? 'Todos los cortes del establecimiento' : 'Tus cortes de caja registrados'}
          </p>
        </div>
        <button
          onClick={loadHistorial}
          style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            height: '36px', padding: '0 16px', borderRadius: '8px',
            border: `1px solid ${borderColor}`, background: elevatedBg,
            color: textMuted, fontSize: '12px', fontWeight: 600,
            cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          <IcoRefresh /> Actualizar
        </button>
      </div>

      {/* ── Panel de filtros ── */}
      <div style={{
        background: surfaceBg, border: `1px solid ${borderColor}`,
        borderRadius: '12px', padding: '18px 20px',
        display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'flex-end',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          color: textSubtle, fontSize: '12px', fontWeight: 700,
          letterSpacing: '0.08em', textTransform: 'uppercase',
          flexShrink: 0, marginRight: '4px',
        }}>
          <IcoFilter /> Filtros
        </div>

        {/* Tipo */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
          <label style={{ fontSize: '10px', fontWeight: 700, color: textSubtle, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            Tipo
          </label>
          <div style={{ position: 'relative' }}>
            <select
              value={filtroTipo}
              onChange={(e) => setFiltroTipo(e.target.value)}
              style={{
                height: '36px', padding: '0 28px 0 10px', borderRadius: '8px',
                border: `1px solid ${borderColor}`, background: elevatedBg,
                color: textPrimary, fontSize: '13px', fontFamily: 'inherit',
                outline: 'none', appearance: 'none', cursor: 'pointer', minWidth: '130px',
              }}
            >
              <option value="Todos">Todos</option>
              <option value="X">Corte X — Lectura</option>
              <option value="Y">Corte Y — Cierre</option>
              <option value="Z">Corte Z — Total</option>
            </select>
            <span style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: textSubtle, fontSize: '10px' }}>▼</span>
          </div>
        </div>

        {/* Sucursal — solo admin, derivada del historial */}
        {esAdmin && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <label style={{ fontSize: '10px', fontWeight: 700, color: textSubtle, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              Sucursal
            </label>
            <div style={{ position: 'relative' }}>
              <select
                value={filtroSucursal}
                onChange={(e) => setFiltroSucursal(e.target.value)}
                style={{
                  height: '36px', padding: '0 28px 0 10px', borderRadius: '8px',
                  border: `1px solid ${borderColor}`, background: elevatedBg,
                  color: textPrimary, fontSize: '13px', fontFamily: 'inherit',
                  outline: 'none', appearance: 'none', cursor: 'pointer', minWidth: '140px',
                }}
              >
                <option value="Todas">Todas</option>
                {sucursales.map((s) => (
                  <option key={s.id} value={String(s.id)}>{s.nombre}</option>
                ))}
              </select>
              <span style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: textSubtle, fontSize: '10px' }}>▼</span>
            </div>
          </div>
        )}

        {/* Fecha */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
          <label style={{ fontSize: '10px', fontWeight: 700, color: textSubtle, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            Fecha
          </label>
          <input
            type="date"
            value={filtroFecha}
            onChange={(e) => setFiltroFecha(e.target.value)}
            style={{
              height: '36px', padding: '0 10px', borderRadius: '8px',
              border: `1px solid ${borderColor}`, background: elevatedBg,
              color: textPrimary, fontSize: '13px', fontFamily: 'inherit',
              outline: 'none', cursor: 'pointer',
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: '8px', marginLeft: 'auto' }}>
          {hayFiltros && (
            <button
              onClick={limpiarFiltros}
              style={{
                height: '36px', padding: '0 14px', borderRadius: '8px',
                border: `1px solid ${borderColor}`, background: 'transparent',
                color: textMuted, fontSize: '12px', fontWeight: 600,
                cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              Limpiar
            </button>
          )}
          <button
            onClick={loadHistorial}
            style={{
              height: '36px', padding: '0 18px', borderRadius: '8px',
              border: 'none', background: 'var(--accent)',
              color: '#fff', fontSize: '13px', fontWeight: 700,
              cursor: 'pointer', fontFamily: 'inherit',
              display: 'flex', alignItems: 'center', gap: '6px',
            }}
          >
            <IcoSearch /> Buscar
          </button>
        </div>
      </div>

      {/* ── Tabla ── */}
      <div style={{ background: surfaceBg, border: `1px solid ${borderColor}`, borderRadius: '12px', overflow: 'hidden' }}>

        {/* Resumen rápido por tipo */}
        {!loading && historial.length > 0 && (
          <div style={{ display: 'flex', gap: '24px', padding: '14px 20px', borderBottom: `1px solid ${borderColor}`, flexWrap: 'wrap' }}>
            {(['X', 'Y', 'Z'] as TipoCorte[]).map((t) => {
              const count = historial.filter(c => c.tipo === t).length;
              const total = historial.filter(c => c.tipo === t).reduce((s, c) => s + c.totalGeneral, 0);
              if (count === 0) return null;
              const badge = TIPO_BADGE[t];
              return (
                <div key={t} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <span style={{ padding: '3px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 700, background: badge.bg, color: badge.color }}>
                    {badge.label}
                  </span>
                  <span style={{ fontSize: '12px', color: textMuted }}>{count} corte{count > 1 ? 's' : ''}</span>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: textPrimary, fontFamily: 'monospace' }}>{fmt(total)}</span>
                </div>
              );
            })}
          </div>
        )}

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '700px' }}>
            <thead>
              <tr>
                {[
                  'Tipo', 'Cajero',
                  ...(esAdmin ? ['Sucursal'] : []),
                  'Fecha', 'Nº Ventas', 'Efectivo', 'Total', 'Acciones',
                ].map((h) => (
                  <th key={h} style={{
                    padding: '12px 16px', textAlign: 'left',
                    fontSize: '10px', fontWeight: 700, color: textSubtle,
                    letterSpacing: '0.08em', textTransform: 'uppercase',
                    background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
                    whiteSpace: 'nowrap',
                  }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={esAdmin ? 8 : 7} style={{ padding: '64px', textAlign: 'center', color: textMuted }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                      <span style={{
                        display: 'inline-block', width: '20px', height: '20px',
                        border: '3px solid var(--border)', borderTopColor: 'var(--accent)',
                        borderRadius: '50%', animation: 'spin 0.7s linear infinite',
                      }} />
                      Cargando historial...
                    </div>
                  </td>
                </tr>
              ) : historial.length === 0 ? (
                <tr>
                  <td colSpan={esAdmin ? 8 : 7} style={{ padding: '64px', textAlign: 'center', color: textMuted }}>
                    No se encontraron cortes{hayFiltros ? ' con los filtros aplicados' : ''}
                  </td>
                </tr>
              ) : (
                historial.map((c, idx) => {
                  const badge = TIPO_BADGE[c.tipo];
                  const isLast = idx === historial.length - 1;
                  return (
                    <tr
                      key={c.id}
                      style={{ borderBottom: isLast ? 'none' : `1px solid ${borderColor}`, transition: 'background 0.12s' }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.015)'; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = ''; }}
                    >
                      <td style={{ padding: '14px 16px' }}>
                        <span style={{ display: 'inline-block', padding: '4px 10px', borderRadius: '4px', fontSize: '11px', fontWeight: 700, background: badge.bg, color: badge.color, whiteSpace: 'nowrap' }}>
                          {badge.label}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px', fontSize: '13px', color: textPrimary, fontWeight: 500 }}>
                        {c.cajero?.nombre ?? <span style={{ color: textSubtle, fontStyle: 'italic' }}>Todos</span>}
                      </td>
                      {esAdmin && (
                        <td style={{ padding: '14px 16px', fontSize: '13px', color: textMuted }}>
                          {c.sucursal?.nombre ?? `#${c.sucursalId}`}
                        </td>
                      )}
                      <td style={{ padding: '14px 16px', fontSize: '12px', color: textMuted, whiteSpace: 'nowrap' }}>
                        {fmtFecha(c.fechaFin)}
                      </td>
                      <td style={{ padding: '14px 16px', fontSize: '13px', fontFamily: 'monospace', fontWeight: 600, color: textPrimary }}>
                        {c.cantidadVentas}
                      </td>
                      <td style={{ padding: '14px 16px', fontSize: '13px', fontFamily: 'monospace', color: textMuted }}>
                        {fmt(c.totalEfectivo)}
                      </td>
                      <td style={{ padding: '14px 16px', fontSize: '14px', fontFamily: 'monospace', fontWeight: 700, color: textPrimary }}>
                        {fmt(c.totalGeneral)}
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            abrirDetalle(c);
                          }}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--accent)',
                            fontSize: '12px',
                            fontWeight: 700,
                            fontFamily: 'inherit',
                            cursor: 'pointer',
                            padding: '8px 12px',
                            borderRadius: '4px',
                            letterSpacing: '0.04em',
                            textTransform: 'uppercase',
                            transition: 'background 0.15s ease',
                          }}
                          onMouseEnter={(e) => {
                            (e.currentTarget as HTMLButtonElement).style.background = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';
                          }}
                          onMouseLeave={(e) => {
                            (e.currentTarget as HTMLButtonElement).style.background = 'none';
                          }}
                        >
                          Ver Detalle
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer totales */}
        {!loading && historial.length > 0 && (
          <div style={{ padding: '12px 20px', borderTop: `1px solid ${borderColor}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', color: textSubtle }}>
              {historial.length} registro{historial.length !== 1 ? 's' : ''} encontrado{historial.length !== 1 ? 's' : ''}
            </span>
            <span style={{ fontSize: '12px', color: textSubtle }}>
              Total período:{' '}
              <strong style={{ color: textPrimary, fontFamily: 'monospace' }}>
                {fmt(historial.reduce((s, c) => s + c.totalGeneral, 0))}
              </strong>
            </span>
          </div>
        )}
      </div>

      {/* ── Modal detalle ── */}
      <CorteDetalleModal
        open={modalOpen}
        corte={corteDetalle}
        isDark={isDark}
        onClose={cerrarDetalle}
      />

      <Toast data={toast} />
    </div>
  );
}