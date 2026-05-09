/**
 * CorteXModal.tsx
 * T-10.3: Modal Corte X — Lectura de Caja
 * Diseño: panel lateral marrón + contenido blanco/oscuro
 * No cierra turno, solo lectura parcial.
 */

import { useEffect, useRef } from 'react';
import type { CortePreview } from '../caja.types';

interface CorteXModalProps {
  open: boolean;
  preview: CortePreview | null;
  loading: boolean;
  generando: boolean;
  isDark: boolean;
  onClose: () => void;
  onConfirmar: () => void;
}

const fmt = (n: number) =>
  new Intl.NumberFormat('es-SV', { style: 'currency', currency: 'USD' }).format(n);

const IcoPrint = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <polyline points="6 9 6 2 18 2 18 9" />
    <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
    <rect x="6" y="14" width="12" height="8" />
  </svg>
);

const IcoCard = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
    <rect x="1" y="4" width="22" height="16" rx="2" />
    <line x1="1" y1="10" x2="23" y2="10" />
  </svg>
);

const IcoCash = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
    <rect x="2" y="6" width="20" height="12" rx="2" />
    <circle cx="12" cy="12" r="2" />
    <path d="M6 12h.01M18 12h.01" />
  </svg>
);

const IcoLock = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
    <rect x="3" y="11" width="18" height="11" rx="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    <circle cx="12" cy="16" r="1" fill="currentColor" />
  </svg>
);

export function CorteXModal({
  open, preview, loading, generando, isDark, onClose, onConfirmar,
}: CorteXModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!open) return null;

  const bg = isDark ? '#1a1a1a' : '#ffffff';
  const textPrimary = isDark ? '#f1f5f9' : '#1e293b';
  const textMuted = isDark ? '#94a3b8' : '#64748b';
  const cardBg = isDark ? '#262626' : '#f8f7f5';
  const borderColor = isDark ? '#333' : '#e5e7eb';

  return (
    <div
      ref={overlayRef}
      onClick={(e) => { if (e.target === overlayRef.current && !generando) onClose(); }}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.55)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '16px',
        animation: 'fadeIn 0.2s ease',
      }}
    >
      <div style={{
        display: 'flex', borderRadius: '12px', overflow: 'hidden',
        width: '100%', maxWidth: '720px',
        boxShadow: '0 24px 64px rgba(0,0,0,0.35)',
        animation: 'slideUp 0.25s ease',
      }}>
        {/* Panel lateral marrón */}
        <div style={{
          width: '200px', flexShrink: 0,
          background: 'linear-gradient(160deg, #92400e 0%, #78350f 100%)',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'flex-end',
          padding: '32px 20px',
          gap: '12px',
        }}>
          <div style={{ color: 'rgba(255,255,255,0.9)' }}><IcoLock /></div>
          <span style={{
            color: '#fff', fontWeight: 800, fontSize: '11px',
            letterSpacing: '0.15em', textTransform: 'uppercase', textAlign: 'center',
          }}>
            Cierre Seguro
          </span>
        </div>

        {/* Contenido */}
        <div style={{ flex: 1, background: bg, padding: '36px 32px 28px' }}>
          {/* Título */}
          <h2 style={{ fontSize: '22px', fontWeight: 900, color: textPrimary, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.02em' }}>
            Corte X: Lectura de Caja
          </h2>
          <p style={{ fontSize: '13px', color: textMuted, marginBottom: '28px' }}>
            Resumen parcial del flujo de efectivo y transacciones actuales.
          </p>

          {loading ? (
            <div style={{ padding: '40px 0', textAlign: 'center', color: textMuted }}>
              Calculando totales...
            </div>
          ) : preview ? (
            <>
              {/* Label */}
              <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: textMuted, marginBottom: '12px' }}>
                Ventas Parciales
              </div>

              {/* Tarjetas efectivo / tarjeta */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div style={{ background: cardBg, borderRadius: '10px', padding: '16px', display: 'flex', alignItems: 'center', gap: '14px', border: `1px solid ${borderColor}` }}>
                  <div style={{ color: '#92400e', background: 'rgba(146,64,14,0.1)', borderRadius: '8px', padding: '8px', display: 'flex' }}>
                    <IcoCash />
                  </div>
                  <div>
                    <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: textMuted, marginBottom: '4px' }}>Efectivo</div>
                    <div style={{ fontSize: '20px', fontWeight: 800, color: textPrimary, fontFamily: 'monospace' }}>{fmt(preview.totalEfectivo)}</div>
                  </div>
                </div>
                <div style={{ background: cardBg, borderRadius: '10px', padding: '16px', display: 'flex', alignItems: 'center', gap: '14px', border: `1px solid ${borderColor}` }}>
                  <div style={{ color: '#92400e', background: 'rgba(146,64,14,0.1)', borderRadius: '8px', padding: '8px', display: 'flex' }}>
                    <IcoCard />
                  </div>
                  <div>
                    <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: textMuted, marginBottom: '4px' }}>Tarjeta</div>
                    <div style={{ fontSize: '20px', fontWeight: 800, color: textPrimary, fontFamily: 'monospace' }}>{fmt(preview.totalTarjeta)}</div>
                  </div>
                </div>
              </div>

              {/* Ventas totales / diferencia */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '24px' }}>
                <div style={{ background: cardBg, borderRadius: '10px', padding: '16px', border: `1px solid ${borderColor}` }}>
                  <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: textMuted, marginBottom: '6px' }}>Ventas Totales</div>
                  <div style={{ fontSize: '22px', fontWeight: 800, color: textPrimary, fontFamily: 'monospace' }}>{fmt(preview.totalGeneral)}</div>
                </div>
                <div style={{ background: cardBg, borderRadius: '10px', padding: '16px', border: `1px solid ${borderColor}` }}>
                  <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: textMuted, marginBottom: '6px' }}>Diferencia</div>
                  <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--accent)', fontFamily: 'monospace' }}>{fmt(0)}</div>
                </div>
              </div>

              {/* Nota informativa */}
              <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: textMuted, marginBottom: '10px' }}>
                Nota Informativa <span style={{ color: '#ef4444' }}>·</span>
              </div>
              <div style={{ borderLeft: '3px solid var(--accent)', paddingLeft: '14px', marginBottom: '28px' }}>
                <div style={{ display: 'flex', gap: '10px', fontSize: '13px', color: textMuted, lineHeight: 1.6 }}>
                  <span style={{ flexShrink: 0, marginTop: '1px' }}>ℹ</span>
                  <span>Este proceso no cierra el turno ni liquida las ventas. Se genera un reporte informativo del estado actual del sistema.</span>
                </div>
              </div>

              {/* Botones */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <button onClick={onClose} disabled={generando} style={{ background: 'none', border: 'none', color: textMuted, fontSize: '14px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', padding: '8px 0', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Cancelar
                </button>
                <button
                  onClick={onConfirmar}
                  disabled={generando}
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', height: '44px', padding: '0 24px', borderRadius: '8px', border: 'none', background: '#92400e', color: '#fff', fontSize: '13px', fontWeight: 700, cursor: generando ? 'not-allowed' : 'pointer', fontFamily: 'inherit', opacity: generando ? 0.7 : 1, textTransform: 'uppercase', letterSpacing: '0.05em' }}
                >
                  <IcoPrint /> {generando ? 'Generando...' : 'Imprimir Lectura'}
                </button>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}