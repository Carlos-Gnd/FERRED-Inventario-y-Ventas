/**
 * HistorialCortes.tsx
 * T-10.3: Tabla de historial de cortes de caja con filtros.
 */

import type { CorteCaja, TipoCorte } from '../caja.types';
import { useNavigate } from 'react-router-dom';

interface HistorialCortesProps {
  historial: CorteCaja[];
  loading: boolean;
  filtroTipo: string;
  filtroFecha: string;
  onFiltroTipo: (v: string) => void;
  onFiltroFecha: (v: string) => void;
  onBuscar: () => void;
  isDark: boolean;
}

const fmt = (n: number) =>
  new Intl.NumberFormat('es-SV', { style: 'currency', currency: 'USD' }).format(n);

const fmtFecha = (iso: string | Date) => {
  const d = iso instanceof Date ? iso : new Date(iso);
  const hoy = new Date();
  const esHoy = d.toDateString() === hoy.toDateString();
  const ayer = new Date(hoy);
  ayer.setDate(hoy.getDate() - 1);
  const esAyer = d.toDateString() === ayer.toDateString();

  const hora = new Intl.DateTimeFormat('es-SV', { timeStyle: 'short', hour12: true }).format(d);
  if (esHoy) return `Hoy ${hora}`;
  if (esAyer) return `Ayer ${hora}`;
  return new Intl.DateTimeFormat('es-SV', { dateStyle: 'short', timeStyle: 'short', hour12: true }).format(d);
};

const TIPO_BADGE: Record<TipoCorte, { label: string; bg: string; color: string }> = {
  X: { label: 'X — Lectura', bg: 'rgba(59,130,246,0.12)', color: 'var(--accent)' },
  Y: { label: 'Y — Cierre', bg: 'rgba(16,185,129,0.12)', color: 'var(--success)' },
  Z: { label: 'Z — Total', bg: 'rgba(245,158,11,0.12)', color: 'var(--warning)' },
};

export function HistorialCortes({
  historial,
  loading,
  filtroTipo,
  filtroFecha,
  onFiltroTipo,
  onFiltroFecha,
  onBuscar,
  isDark,
}: HistorialCortesProps) {
  const navigate = useNavigate();

  return (
    <div
      style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border)',
        borderRadius: '12px',
        overflow: 'hidden',
      }}
    >
      {/* Header con filtros */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          padding: '18px 20px',
          borderBottom: '1px solid var(--border)',
        }}
      >
        <h2
          style={{
            fontSize: '16px',
            fontWeight: 700,
            color: 'var(--text-primary)',
          }}
        >
          Historial de Cortes
        </h2>

        {/* Filtros */}
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Select tipo */}
          <div style={{ position: 'relative' }}>
            <select
              value={filtroTipo}
              onChange={(e) => onFiltroTipo(e.target.value)}
              style={{
                height: '36px',
                padding: '0 28px 0 10px',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                background: 'var(--bg-elevated)',
                color: 'var(--text-primary)',
                fontSize: '13px',
                fontFamily: 'inherit',
                outline: 'none',
                appearance: 'none',
                cursor: 'pointer',
                minWidth: '120px',
              }}
            >
              <option value="Todos">Tipo: Todos</option>
              <option value="X">Corte X</option>
              <option value="Y">Corte Y</option>
              <option value="Z">Corte Z</option>
            </select>
            <span
              style={{
                position: 'absolute',
                right: '8px',
                top: '50%',
                transform: 'translateY(-50%)',
                pointerEvents: 'none',
                color: 'var(--text-subtle)',
                fontSize: '10px',
              }}
            >
              ▼
            </span>
          </div>

          {/* Date input */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--text-subtle)"
              strokeWidth="1.8"
              strokeLinecap="round"
            >
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            <input
              type="date"
              value={filtroFecha}
              onChange={(e) => onFiltroFecha(e.target.value)}
              style={{
                height: '36px',
                padding: '0 10px',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                background: 'var(--bg-elevated)',
                color: 'var(--text-primary)',
                fontSize: '13px',
                fontFamily: 'inherit',
                outline: 'none',
                cursor: 'pointer',
              }}
            />
          </div>

          <button
            type="button"
            onClick={onBuscar}
            style={{
              height: '36px',
              padding: '0 18px',
              borderRadius: '8px',
              border: 'none',
              background: 'var(--accent)',
              color: '#fff',
              fontSize: '13px',
              fontWeight: 700,
              fontFamily: 'inherit',
              cursor: 'pointer',
            }}
          >
            Buscar
          </button>
        </div>
      </div>

      {/* Tabla */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '640px' }}>
          <thead>
            <tr style={{ background: 'rgba(255,255,255,0.02)' }}>
              {['TIPO', 'CAJERO', 'SUCURSAL', 'FECHA', 'Nº VENTAS', 'TOTAL', 'ACCIONES'].map((h) => (
                <th
                  key={h}
                  style={{
                    padding: '12px 16px',
                    textAlign: 'left',
                    fontSize: '10px',
                    fontWeight: 700,
                    color: 'var(--text-subtle)',
                    letterSpacing: '0.08em',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} style={{ padding: '56px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  Cargando...
                </td>
              </tr>
            ) : historial.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ padding: '56px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  No se encontraron cortes
                </td>
              </tr>
            ) : (
              historial.map((c) => {
                const badge = TIPO_BADGE[c.tipo];
                return (
                  <tr
                    key={c.id}
                    className="tbl-row"
                  >
                    <td style={{ padding: '14px 16px' }}>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '4px 10px',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: 700,
                          background: badge.bg,
                          color: badge.color,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {badge.label}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: '13px', color: 'var(--text-primary)', fontWeight: 500 }}>
                      {c.cajero?.nombre ?? '—'}
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: '13px', color: 'var(--text-muted)' }}>
                      {c.sucursal?.nombre ?? `#${c.sucursalId}`}
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: '13px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                      {fmtFecha(c.fechaFin)}
                    </td>
                    <td
                      style={{
                        padding: '14px 16px',
                        fontSize: '13px',
                        fontFamily: 'JetBrains Mono, monospace',
                        color: 'var(--text-primary)',
                        fontWeight: 600,
                      }}
                    >
                      {c.cantidadVentas}
                    </td>
                    <td
                      style={{
                        padding: '14px 16px',
                        fontSize: '14px',
                        fontFamily: 'JetBrains Mono, monospace',
                        fontWeight: 700,
                        color: 'var(--text-primary)',
                      }}
                    >
                      {fmt(c.totalGeneral)}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
  <button
    type="button"
    onClick={() => navigate('/caja/historial')}
    style={{
      background: 'none',
      border: 'none',
      color: 'var(--accent)',
      fontSize: '12px',
      fontWeight: 700,
      fontFamily: 'inherit',
      cursor: 'pointer',
      padding: '4px 0',
      letterSpacing: '0.04em',
      textTransform: 'uppercase',
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

      {/* Footer */}
      {!loading && historial.length > 0 && (
        <div
          style={{
            padding: '12px 20px',
            borderTop: '1px solid var(--border)',
          }}
        >
          <span style={{ fontSize: '12px', color: 'var(--text-subtle)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
            {historial.length} corte{historial.length !== 1 ? 's' : ''} encontrado{historial.length !== 1 ? 's' : ''}
          </span>
        </div>
      )}
    </div>
  );
}