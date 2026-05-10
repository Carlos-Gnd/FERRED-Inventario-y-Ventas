/**
 * CorteDetalleModal.tsx
 * T-10.3: Modal de detalle de un corte histórico + botón reimprimir
 */

import { useEffect, useRef } from 'react';
import type { CorteCaja, TipoCorte } from '../caja.types';

interface CorteDetalleModalProps {
  open: boolean;
  corte: CorteCaja | null;
  isDark: boolean;
  onClose: () => void;
}

const fmt = (n: number) =>
  new Intl.NumberFormat('es-SV', { style: 'currency', currency: 'USD' }).format(n);

const fmtFechaLarga = (iso: string | Date) => {
  const d = iso instanceof Date ? iso : new Date(iso);
  return new Intl.DateTimeFormat('es-SV', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
  }).format(d);
};

const TIPO_INFO: Record<TipoCorte, { label: string; color: string; desc: string }> = {
  X: { label: 'Corte X — Lectura Parcial',   color: 'var(--accent)',  desc: 'Solo lectura, no cierra ventas'   },
  Y: { label: 'Corte Y — Cierre de Cajero',  color: 'var(--success)', desc: 'Cierra ventas del turno'          },
  Z: { label: 'Corte Z — Cierre Total',      color: '#92400e',        desc: 'Cierre contable del día completo' },
};

const IcoPrint = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
    <polyline points="6 9 6 2 18 2 18 9" />
    <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
    <rect x="6" y="14" width="12" height="8" />
  </svg>
);

const IcoClose = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

// Keyframes inyectados una sola vez en el <head>
const STYLES = `
  @keyframes ferred-fade-in  { from { opacity: 0 } to { opacity: 1 } }
  @keyframes ferred-slide-up { from { opacity: 0; transform: translateY(16px) } to { opacity: 1; transform: translateY(0) } }
`;

let stylesInjected = false;
function injectStyles() {
  if (stylesInjected) return;
  const tag = document.createElement('style');
  tag.textContent = STYLES;
  document.head.appendChild(tag);
  stylesInjected = true;
}

export function CorteDetalleModal({ open, corte, isDark, onClose }: CorteDetalleModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => { injectStyles(); }, []);

  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!open || !corte) return null;

  const info        = TIPO_INFO[corte.tipo];
  const bg          = isDark ? '#1a1a1a' : '#fff';
  const textPrimary = isDark ? '#f1f5f9' : '#1e293b';
  const textMuted   = isDark ? '#94a3b8' : '#64748b';
  const textSubtle  = isDark ? '#64748b' : '#94a3b8';
  const cardBg      = isDark ? '#262626' : '#f8f7f5';
  const borderColor = isDark ? '#333'    : '#e5e7eb';

  return (
    <div
      ref={overlayRef}
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.55)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '16px',
        animation: 'ferred-fade-in 0.2s ease forwards',
      }}
    >
      <div id="corte-print" style={{
        background: bg, borderRadius: '12px', overflow: 'hidden',
        width: '100%', maxWidth: '520px',
        boxShadow: '0 24px 64px rgba(0,0,0,0.35)',
        animation: 'ferred-slide-up 0.25s ease forwards',
        display: 'flex', flexDirection: 'column',
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 24px 16px',
          borderBottom: `1px solid ${borderColor}`,
          display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
              <span style={{
                display: 'inline-block', padding: '4px 10px', borderRadius: '4px',
                fontSize: '10px', fontWeight: 700,
                background: `${info.color}18`, color: info.color,
              }}>
                {corte.tipo === 'X' ? 'LECTURA' : corte.tipo === 'Y' ? 'CIERRE TURNO' : 'CIERRE TOTAL'}
              </span>
              <span style={{ fontSize: '11px', color: textSubtle }}>#{corte.id}</span>
            </div>
            <h2 style={{ fontSize: '18px', fontWeight: 800, color: textPrimary, marginBottom: '2px' }}>
              {info.label}
            </h2>
            <p style={{ fontSize: '12px', color: textMuted }}>{info.desc}</p>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: textMuted, cursor: 'pointer', padding: '4px', display: 'flex', borderRadius: '6px' }}
          >
            <IcoClose />
          </button>
        </div>

        {/* Contenido */}
        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '14px', overflowY: 'auto', maxHeight: '60vh' }}>

          {/* Info general */}
          <div style={{
            background: cardBg, borderRadius: '10px', padding: '16px',
            display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px',
            border: `1px solid ${borderColor}`,
          }}>
            <InfoItem label="Cajero"           value={corte.cajero?.nombre ?? 'Todos los cajeros'} />
            <InfoItem label="Sucursal"         value={corte.sucursal?.nombre ?? `#${corte.sucursalId}`} />
            <InfoItem label="Inicio período"   value={fmtFechaLarga(corte.fechaInicio)} />
            <InfoItem label="Fin período"      value={fmtFechaLarga(corte.fechaFin)} />
            <InfoItem label="Ventas procesadas" value={String(corte.cantidadVentas)} />
            {corte.observaciones && (
              <InfoItem label="Observaciones" value={corte.observaciones} />
            )}
          </div>

          {/* Desglose por método de pago */}
          <div style={{ background: cardBg, borderRadius: '10px', border: `1px solid ${borderColor}`, overflow: 'hidden' }}>
            <div style={{ padding: '10px 16px', borderBottom: `1px solid ${borderColor}` }}>
              <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: textSubtle }}>
                Desglose por método de pago
              </span>
            </div>
            <MontoRow label="Efectivo"      value={corte.totalEfectivo}      borderColor={borderColor} textPrimary={textPrimary} textMuted={textMuted} />
            <MontoRow label="Tarjeta"       value={corte.totalTarjeta}       borderColor={borderColor} textPrimary={textPrimary} textMuted={textMuted} />
            <MontoRow label="Transferencia" value={corte.totalTransferencia} borderColor={borderColor} textPrimary={textPrimary} textMuted={textMuted} last />
          </div>

          {/* Total general */}
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '16px 20px', borderRadius: '10px',
            border: `1px solid ${borderColor}`,
            background: `${info.color}08`,
          }}>
            <span style={{ fontSize: '15px', fontWeight: 700, color: textPrimary }}>TOTAL GENERAL</span>
            <span style={{ fontSize: '26px', fontWeight: 900, color: info.color, fontFamily: 'monospace' }}>
              {fmt(corte.totalGeneral)}
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="no-print" style={{
          padding: '16px 24px', borderTop: `1px solid ${borderColor}`,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <button
            onClick={() => window.print()}
            style={{
              display: 'flex', alignItems: 'center', gap: '7px',
              height: '38px', padding: '0 16px', borderRadius: '8px',
              border: `1px solid ${borderColor}`, background: cardBg,
              color: textMuted, fontSize: '12px', fontWeight: 600,
              cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            <IcoPrint /> Reimprimir
          </button>
          <button
            onClick={onClose}
            style={{
              height: '38px', padding: '0 20px', borderRadius: '8px',
              border: 'none', background: 'var(--accent)',
              color: '#fff', fontSize: '13px', fontWeight: 700,
              cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
      <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-subtle)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
        {label}
      </span>
      <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>
        {value}
      </span>
    </div>
  );
}

function MontoRow({ label, value, borderColor, textPrimary, textMuted, last = false }: {
  label: string; value: number; borderColor: string; textPrimary: string; textMuted: string; last?: boolean;
}) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '12px 16px',
      borderBottom: last ? 'none' : `1px solid ${borderColor}`,
      fontSize: '13px',
    }}>
      <span style={{ color: textMuted }}>{label}</span>
      <span style={{ fontFamily: 'monospace', fontWeight: 600, color: textPrimary }}>
        {fmt(value)}
      </span>
    </div>
  );
}
