/**
 * CorteYModal.tsx
 * T-10.3: Modal Corte Y — Cierre de Cajero
 * Diseño: panel lateral marrón + campo editable efectivo + checkboxes de verificación
 */

import { useEffect, useRef, useState } from 'react';
import type { CortePreview } from '../caja.types';

interface CorteYModalProps {
  open: boolean;
  preview: CortePreview | null;
  loading: boolean;
  generando: boolean;
  isDark: boolean;
  onClose: () => void;
  onConfirmar: (efectivoFisico: number) => void;
}

const fmt = (n: number) =>
  new Intl.NumberFormat('es-SV', { style: 'currency', currency: 'USD' }).format(n);

const IcoShield = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    <polyline points="9 12 11 14 15 10" />
  </svg>
);

const IcoLock = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
    <rect x="3" y="11" width="18" height="11" rx="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    <circle cx="12" cy="16" r="1" fill="currentColor" />
  </svg>
);

export function CorteYModal({
  open, preview, loading, generando, isDark, onClose, onConfirmar,
}: CorteYModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const [efectivoFisico, setEfectivoFisico] = useState('');
  const [retiroOk, setRetiroOk] = useState(false);
  const [ticketOk, setTicketOk] = useState(false);

  useEffect(() => {
    if (open && preview) {
      setEfectivoFisico(preview.totalEfectivo.toFixed(2));
      setRetiroOk(false);
      setTicketOk(false);
    }
  }, [open, preview]);

  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!open) return null;

  const bg = isDark ? '#1a1a1a' : '#ffffff';
  const textPrimary = isDark ? '#f1f5f9' : '#1e293b';
  const textMuted = isDark ? '#94a3b8' : '#64748b';
  const cardBg = isDark ? '#262626' : '#f2f0ed';
  const borderColor = isDark ? '#333' : '#e5e7eb';
  const inputBg = isDark ? '#1e1e1e' : '#efefec';

  const efectivoNum = parseFloat(efectivoFisico) || 0;
  const diferencia = preview ? efectivoNum - preview.totalGeneral : 0;
  const diferenciaColor = diferencia === 0 ? 'var(--accent)' : diferencia > 0 ? 'var(--success)' : '#ef4444';
  const puedeConfirmar = retiroOk && ticketOk;

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
        width: '100%', maxWidth: '680px',
        boxShadow: '0 24px 64px rgba(0,0,0,0.35)',
        animation: 'slideUp 0.25s ease',
      }}>
        {/* Panel lateral marrón */}
        <div style={{
          width: '180px', flexShrink: 0,
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
          <h2 style={{ fontSize: '22px', fontWeight: 900, color: textPrimary, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.02em' }}>
            Corte Y: Cierre de Cajero
          </h2>
          <p style={{ fontSize: '13px', color: textMuted, marginBottom: '28px' }}>
            Conciliación de caja y finalización de jornada.
          </p>

          {loading ? (
            <div style={{ padding: '40px 0', textAlign: 'center', color: textMuted }}>
              Calculando totales...
            </div>
          ) : preview ? (
            <>
              {/* Label */}
              <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: textMuted, marginBottom: '10px' }}>
                Efectivo en Caja
              </div>

              {/* Campo editable de efectivo */}
              <div style={{ position: 'relative', marginBottom: '14px' }}>
                <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: textMuted, fontSize: '16px', fontWeight: 500 }}>$</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={efectivoFisico}
                  onChange={(e) => setEfectivoFisico(e.target.value)}
                  style={{
                    width: '100%', height: '54px',
                    paddingLeft: '32px', paddingRight: '16px',
                    borderRadius: '8px', border: `1px solid ${borderColor}`,
                    background: inputBg, color: textPrimary,
                    fontSize: '22px', fontWeight: 700, fontFamily: 'monospace',
                    outline: 'none', boxSizing: 'border-box',
                  }}
                />
              </div>

              {/* Ventas totales / diferencia */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '24px' }}>
                <div style={{ background: cardBg, borderRadius: '10px', padding: '16px', border: `1px solid ${borderColor}` }}>
                  <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: textMuted, marginBottom: '6px' }}>Ventas Totales</div>
                  <div style={{ fontSize: '20px', fontWeight: 800, color: textPrimary, fontFamily: 'monospace' }}>{fmt(preview.totalGeneral)}</div>
                </div>
                <div style={{ background: cardBg, borderRadius: '10px', padding: '16px', border: `1px solid ${borderColor}` }}>
                  <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: textMuted, marginBottom: '6px' }}>Diferencia</div>
                  <div style={{ fontSize: '20px', fontWeight: 800, color: diferenciaColor, fontFamily: 'monospace' }}>{fmt(diferencia)}</div>
                </div>
              </div>

              {/* Checkboxes verificación */}
              <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: textMuted, marginBottom: '12px', paddingBottom: '10px', borderBottom: `1px solid ${borderColor}` }}>
                Verificación de Cierre
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '28px' }}>
                <CheckRow
                  checked={retiroOk}
                  onChange={setRetiroOk}
                  label="Retiro de efectivo realizado"
                  isDark={isDark}
                />
                <CheckRow
                  checked={ticketOk}
                  onChange={setTicketOk}
                  label="Ticket impreso"
                  isDark={isDark}
                />
              </div>

              {/* Botones */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <button onClick={onClose} disabled={generando} style={{ background: 'none', border: 'none', color: textMuted, fontSize: '14px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', padding: '8px 0' }}>
                  Cancelar
                </button>
                <button
                  onClick={() => onConfirmar(efectivoNum)}
                  disabled={generando || !puedeConfirmar}
                  title={!puedeConfirmar ? 'Completa la verificación primero' : ''}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    height: '44px', padding: '0 24px', borderRadius: '8px', border: 'none',
                    background: puedeConfirmar ? '#92400e' : (isDark ? '#333' : '#d1d5db'),
                    color: puedeConfirmar ? '#fff' : (isDark ? '#555' : '#9ca3af'),
                    fontSize: '13px', fontWeight: 700,
                    cursor: (generando || !puedeConfirmar) ? 'not-allowed' : 'pointer',
                    fontFamily: 'inherit', opacity: generando ? 0.7 : 1,
                    transition: 'background 0.2s',
                  }}
                >
                  <IcoShield /> {generando ? 'Cerrando...' : 'Confirmar y Cerrar Turno'}
                </button>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function CheckRow({ checked, onChange, label, isDark }: { checked: boolean; onChange: (v: boolean) => void; label: string; isDark: boolean }) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '14px', color: isDark ? '#cbd5e1' : '#374151' }}>
      <div
        onClick={() => onChange(!checked)}
        style={{
          width: '18px', height: '18px', borderRadius: '4px', flexShrink: 0,
          border: checked ? '2px solid #92400e' : `2px solid ${isDark ? '#444' : '#d1d5db'}`,
          background: checked ? '#92400e' : 'transparent',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all 0.15s',
        }}
      >
        {checked && (
          <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round">
            <polyline points="2 6 5 9 10 3" />
          </svg>
        )}
      </div>
      <span onClick={() => onChange(!checked)}>{label}</span>
    </label>
  );
}