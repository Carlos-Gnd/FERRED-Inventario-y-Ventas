/**
 * CorteZModal.tsx
 * T-10.3: Modal Corte Z — Cierre de Jornada (Solo Admin)
 * Diseño: panel lateral marrón + resumen consolidado + contraseña admin
 */

import { useEffect, useRef, useState } from 'react';
import type { CortePreview } from '../caja.types';

interface CorteZModalProps {
  open: boolean;
  preview: CortePreview | null;
  loading: boolean;
  generando: boolean;
  isDark: boolean;
  onClose: () => void;
  onConfirmar: (password: string) => void;
}

const fmt = (n: number) =>
  new Intl.NumberFormat('es-SV', { style: 'currency', currency: 'USD' }).format(n);

const IcoShield = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    <polyline points="9 12 11 14 15 10" />
  </svg>
);

const IcoClose = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const IcoLockAdmin = () => (
  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
    <rect x="3" y="11" width="18" height="11" rx="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    <circle cx="12" cy="16" r="1.5" fill="currentColor" />
    <path d="M12 16v2" strokeWidth="2" />
  </svg>
);

export function CorteZModal({
  open, preview, loading, generando, isDark, onClose, onConfirmar,
}: CorteZModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setPassword('');
      setShowPass(false);
      document.body.style.overflow = 'hidden';
      setTimeout(() => inputRef.current?.focus(), 300);
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!open) return null;

  const bg = isDark ? '#1a1a1a' : '#ffffff';
  const textPrimary = isDark ? '#f1f5f9' : '#1e293b';
  const textMuted = isDark ? '#94a3b8' : '#64748b';
  const cardBg = isDark ? '#262626' : '#f8f7f5';
  const borderColor = isDark ? '#333' : '#e5e7eb';
  const inputBg = isDark ? '#1e1e1e' : '#f8f7f5';

  const sucursalesCount = preview?.desgloseCajeros
    ? new Set(preview.desgloseCajeros.map(() => preview.sucursalId)).size
    : 1;
  const cajerosCount = preview?.desgloseCajeros?.filter(c => c.ventas > 0).length ?? 0;

  return (
    <div
      ref={overlayRef}
      onClick={(e) => { if (e.target === overlayRef.current && !generando) onClose(); }}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.6)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '16px',
        animation: 'fadeIn 0.2s ease',
      }}
    >
      <div style={{
        display: 'flex', borderRadius: '12px', overflow: 'hidden',
        width: '100%', maxWidth: '640px',
        boxShadow: '0 24px 64px rgba(0,0,0,0.4)',
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
          <div style={{ color: 'rgba(255,255,255,0.9)' }}><IcoLockAdmin /></div>
          <span style={{
            color: '#fff', fontWeight: 800, fontSize: '10px',
            letterSpacing: '0.12em', textTransform: 'uppercase', textAlign: 'center', lineHeight: 1.5,
          }}>
            Autorización de<br />Nivel Superior
          </span>
        </div>

        {/* Contenido */}
        <div style={{ flex: 1, background: bg, padding: '28px 28px 24px', position: 'relative' }}>
          {/* Botón cerrar */}
          <button
            onClick={onClose}
            style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', color: textMuted, cursor: 'pointer', padding: '4px', display: 'flex', borderRadius: '6px' }}
          >
            <IcoClose />
          </button>

          <h2 style={{ fontSize: '20px', fontWeight: 800, color: textPrimary, marginBottom: '4px' }}>
            Corte Z: Cierre de Jornada
          </h2>
          <p style={{ fontSize: '12px', color: textMuted, marginBottom: '20px' }}>
            Final consolidation of all 'Corte Y' of the day.
          </p>

          {loading ? (
            <div style={{ padding: '40px 0', textAlign: 'center', color: textMuted }}>
              Consolidando datos...
            </div>
          ) : preview ? (
            <>
              {/* Resumen consolidado */}
              <div style={{
                background: cardBg, borderRadius: '10px',
                padding: '18px 20px',
                borderLeft: '4px solid #92400e',
                marginBottom: '20px',
                display: 'grid', gridTemplateColumns: '1fr 1fr',
                gap: '16px',
                border: `1px solid ${borderColor}`,
                borderLeftColor: '#92400e',
              }}>
                <div>
                  <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: textMuted, marginBottom: '6px' }}>Total General</div>
                  <div style={{ fontSize: '24px', fontWeight: 900, color: '#92400e', fontFamily: 'monospace' }}>{fmt(preview.totalGeneral)}</div>
                </div>
                <div>
                  <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: textMuted, marginBottom: '6px' }}>Sucursales</div>
                  <div style={{ fontSize: '24px', fontWeight: 900, color: textPrimary }}>{sucursalesCount}</div>
                </div>
                <div>
                  <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: textMuted, marginBottom: '4px' }}>Cajeros Activos</div>
                  <div style={{ fontSize: '16px', fontWeight: 700, color: textPrimary }}>{cajerosCount} Operadores Consolidados</div>
                </div>
              </div>

              {/* Campo contraseña admin */}
              <div style={{ marginBottom: '20px' }}>
                <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: textMuted, marginBottom: '10px' }}>
                  Contraseña de Administrador
                </div>
                <div style={{ position: 'relative' }}>
                  <input
                    ref={inputRef}
                    type={showPass ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && password) onConfirmar(password); }}
                    placeholder="••••••••"
                    style={{
                      width: '100%', height: '46px',
                      padding: '0 44px 0 16px',
                      borderRadius: '8px',
                      border: `1px solid ${borderColor}`,
                      borderBottom: `2px solid #92400e`,
                      background: inputBg, color: textPrimary,
                      fontSize: '16px', fontFamily: 'monospace',
                      outline: 'none', boxSizing: 'border-box',
                      letterSpacing: '0.15em',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: textMuted, padding: '4px', display: 'flex' }}
                  >
                    {showPass ? (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" /><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" /><line x1="1" y1="1" x2="23" y2="23" /></svg>
                    ) : (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                    )}
                  </button>
                </div>
              </div>

              {/* Botones */}
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={() => { if (password) onConfirmar(password); }}
                  disabled={generando || !password}
                  style={{
                    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                    height: '44px', borderRadius: '8px', border: 'none',
                    background: password ? '#92400e' : (isDark ? '#333' : '#e5e7eb'),
                    color: password ? '#fff' : textMuted,
                    fontSize: '13px', fontWeight: 700, cursor: (generando || !password) ? 'not-allowed' : 'pointer',
                    fontFamily: 'inherit', opacity: generando ? 0.7 : 1,
                    transition: 'background 0.2s',
                  }}
                >
                  <IcoShield /> {generando ? 'Ejecutando...' : 'Ejecutar Cierre Total Z'}
                </button>
                <button
                  onClick={onClose}
                  disabled={generando}
                  style={{ padding: '0 20px', height: '44px', borderRadius: '8px', border: `1px solid ${borderColor}`, background: cardBg, color: textMuted, fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
                >
                  Volver
                </button>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}