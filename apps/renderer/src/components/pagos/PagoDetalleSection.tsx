/**
 * PagoDetalleSection.tsx
 * T-18.6: Sección "Pago" dentro del modal detalle de pedido online (renderer)
 *
 * - Badge visual de estado del pago (PENDIENTE, VALIDACION_PENDIENTE, VALIDADO, RECHAZADO)
 * - Imagen del comprobante con zoom al hacer clic
 * - Botones Aprobar / Rechazar para transferencias VALIDACION_PENDIENTE
 * - Solo visible para ADMIN y CAJERO
 */

import { useState } from 'react';
import { api } from '../../services/api.client';

// ── Tipos ─────────────────────────────────────────────────────────────────
export type EstadoPago = 'PENDIENTE' | 'VALIDACION_PENDIENTE' | 'VALIDADO' | 'RECHAZADO';
export type MetodoPagoOnline = 'EFECTIVO' | 'TARJETA' | 'TRANSFERENCIA';

export interface PagoOnline {
  id: number;
  pedidoId: number;
  metodo: MetodoPagoOnline;
  referencia: string | null;
  comprobanteUrl: string | null;
  monto: number;
  estado: EstadoPago;
  motivoRechazo: string | null;
  creadoEn: string;
  validadoEn: string | null;
}

interface PagoDetalleSectionProps {
  pagos: PagoOnline[];
  isDark: boolean;
  onActualizar: () => void;
}

// ── Configuración de badges ───────────────────────────────────────────────
const ESTADO_CONFIG: Record<EstadoPago, { label: string; bg: string; color: string; dot: string }> = {
  PENDIENTE:            { label: 'Pendiente',           bg: 'rgba(245,158,11,0.12)',  color: '#D97706', dot: '#D97706' },
  VALIDACION_PENDIENTE: { label: 'En revisión',         bg: 'rgba(59,130,246,0.12)', color: '#2563EB', dot: '#2563EB' },
  VALIDADO:             { label: 'Aprobado',            bg: 'rgba(16,185,129,0.12)', color: '#059669', dot: '#059669' },
  RECHAZADO:            { label: 'Rechazado',           bg: 'rgba(239,68,68,0.12)',  color: '#DC2626', dot: '#DC2626' },
};

const METODO_LABEL: Record<MetodoPagoOnline, string> = {
  EFECTIVO:      'Efectivo',
  TARJETA:       'Tarjeta',
  TRANSFERENCIA: 'Transferencia',
};

const fmt = (n: number) =>
  new Intl.NumberFormat('es-SV', { style: 'currency', currency: 'USD' }).format(n);

const fmtFecha = (iso: string) =>
  new Intl.DateTimeFormat('es-SV', { dateStyle: 'medium', timeStyle: 'short', hour12: true }).format(new Date(iso));

// ── Iconos ────────────────────────────────────────────────────────────────
const IcoCheck = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const IcoX = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const IcoZoom = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
    <line x1="11" y1="8" x2="11" y2="14" />
    <line x1="8" y1="11" x2="14" y2="11" />
  </svg>
);

// ── Componente principal ──────────────────────────────────────────────────
export function PagoDetalleSection({ pagos, isDark, onActualizar }: PagoDetalleSectionProps) {
  const [rechazandoId, setRechazandoId] = useState<number | null>(null);
  const [motivoRechazo, setMotivoRechazo] = useState('');
  const [loadingId, setLoadingId]         = useState<number | null>(null);
  const [errorId, setErrorId]             = useState<number | null>(null);
  const [errorMsg, setErrorMsg]           = useState<string | null>(null);
  const [zoomUrl, setZoomUrl]             = useState<string | null>(null);

  const textPrimary = 'var(--text-primary)';
  const textMuted   = 'var(--text-muted)';
  const textSubtle  = 'var(--text-subtle)';
  const borderColor = 'var(--border)';
  const cardBg      = 'var(--bg-elevated)';

  async function handleAprobar(pagoId: number) {
    setLoadingId(pagoId);
    setErrorId(null);
    setErrorMsg(null);
    try {
      await api.patch(`/pagos/${pagoId}/validar`, { accion: 'APROBAR' });
      onActualizar();
    } catch (err: any) {
      setErrorId(pagoId);
      setErrorMsg(err.response?.data?.error ?? 'Error al aprobar el pago');
    } finally {
      setLoadingId(null);
    }
  }

  async function handleRechazar(pagoId: number) {
    if (!motivoRechazo.trim() || motivoRechazo.trim().length < 3) {
      setErrorId(pagoId);
      setErrorMsg('El motivo de rechazo debe tener al menos 3 caracteres');
      return;
    }
    setLoadingId(pagoId);
    setErrorId(null);
    setErrorMsg(null);
    try {
      await api.patch(`/pagos/${pagoId}/validar`, { accion: 'RECHAZAR', motivo: motivoRechazo.trim() });
      setRechazandoId(null);
      setMotivoRechazo('');
      onActualizar();
    } catch (err: any) {
      setErrorId(pagoId);
      setErrorMsg(err.response?.data?.error ?? 'Error al rechazar el pago');
    } finally {
      setLoadingId(null);
    }
  }

  if (pagos.length === 0) {
    return (
      <div style={{ padding: '16px 0' }}>
        <SectionTitle />
        <div style={{
          background: cardBg, border: `1px solid ${borderColor}`,
          borderRadius: '8px', padding: '20px', textAlign: 'center',
          fontSize: '13px', color: textMuted,
        }}>
          No hay pagos registrados para este pedido
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '16px 0' }}>
      <SectionTitle />

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {pagos.map((pago) => {
          const cfg = ESTADO_CONFIG[pago.estado];
          const esPendienteRevision = pago.estado === 'VALIDACION_PENDIENTE';
          const isLoading = loadingId === pago.id;
          const hasError = errorId === pago.id;

          return (
            <div
              key={pago.id}
              style={{
                background: cardBg, border: `1px solid ${borderColor}`,
                borderRadius: '10px', overflow: 'hidden',
              }}
            >
              {/* Header del pago */}
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '14px 16px',
                borderBottom: (pago.comprobanteUrl || esPendienteRevision) ? `1px solid ${borderColor}` : 'none',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  {/* Badge estado */}
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: '5px',
                    padding: '4px 10px', borderRadius: '20px',
                    fontSize: '11px', fontWeight: 700,
                    background: cfg.bg, color: cfg.color,
                  }}>
                    <span style={{
                      width: '6px', height: '6px', borderRadius: '50%',
                      background: cfg.dot, flexShrink: 0,
                    }} />
                    {cfg.label}
                  </span>

                  {/* Método */}
                  <span style={{ fontSize: '13px', fontWeight: 600, color: textPrimary }}>
                    {METODO_LABEL[pago.metodo]}
                  </span>

                  {pago.referencia && (
                    <span style={{ fontSize: '11px', color: textSubtle }}>
                      Ref: {pago.referencia}
                    </span>
                  )}
                </div>

                {/* Monto */}
                <span style={{
                  fontSize: '16px', fontWeight: 800,
                  fontFamily: 'JetBrains Mono, monospace',
                  color: pago.estado === 'VALIDADO' ? 'var(--success)' : textPrimary,
                }}>
                  {fmt(pago.monto)}
                </span>
              </div>

              {/* Info adicional */}
              <div style={{ padding: '10px 16px', display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                <MiniInfo label="Registrado" value={fmtFecha(pago.creadoEn)} />
                {pago.validadoEn && (
                  <MiniInfo label="Validado" value={fmtFecha(pago.validadoEn)} />
                )}
              </div>

              {/* Motivo de rechazo */}
              {pago.estado === 'RECHAZADO' && pago.motivoRechazo && (
                <div style={{
                  margin: '0 16px 14px',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  background: 'rgba(239,68,68,0.06)',
                  border: '1px solid rgba(239,68,68,0.15)',
                  fontSize: '12px', color: '#DC2626',
                }}>
                  <strong>Motivo de rechazo:</strong> {pago.motivoRechazo}
                </div>
              )}

              {/* Comprobante */}
              {pago.comprobanteUrl && (
                <div style={{ padding: '0 16px 14px' }}>
                  <p style={{ fontSize: '10px', fontWeight: 700, color: textSubtle, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>
                    Comprobante
                  </p>
                  <div
                    style={{
                      position: 'relative', borderRadius: '8px', overflow: 'hidden',
                      border: `1px solid ${borderColor}`, cursor: 'zoom-in',
                      maxWidth: '280px',
                    }}
                    onClick={() => setZoomUrl(pago.comprobanteUrl)}
                  >
                    <img
                      src={`http://localhost:3001${pago.comprobanteUrl}`}
                      alt="Comprobante de transferencia"
                      style={{ width: '100%', maxHeight: '160px', objectFit: 'cover', display: 'block' }}
                    />
                    <div style={{
                      position: 'absolute', inset: 0,
                      background: 'rgba(0,0,0,0)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'background 0.15s',
                    }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = 'rgba(0,0,0,0.3)'; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = 'rgba(0,0,0,0)'; }}
                    >
                      <span style={{ color: '#fff', opacity: 0, transition: 'opacity 0.15s' }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLSpanElement).style.opacity = '1'; }}
                      >
                        <IcoZoom />
                      </span>
                    </div>
                    <div style={{
                      position: 'absolute', bottom: '6px', right: '6px',
                      background: 'rgba(0,0,0,0.5)', borderRadius: '4px',
                      padding: '3px 8px',
                      fontSize: '10px', color: '#fff', fontWeight: 600,
                      display: 'flex', alignItems: 'center', gap: '4px',
                    }}>
                      <IcoZoom /> Ver completo
                    </div>
                  </div>
                </div>
              )}

              {/* Botones Aprobar / Rechazar */}
              {esPendienteRevision && (
                <div style={{ padding: '0 16px 16px' }}>
                  {rechazandoId === pago.id ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <textarea
                        placeholder="Motivo del rechazo (requerido)..."
                        value={motivoRechazo}
                        onChange={(e) => { setMotivoRechazo(e.target.value); setErrorId(null); }}
                        rows={2}
                        style={{
                          width: '100%', borderRadius: '8px',
                          border: `1px solid ${borderColor}`,
                          background: 'var(--bg-surface)',
                          color: textPrimary, fontSize: '13px',
                          padding: '10px 12px', outline: 'none',
                          resize: 'vertical', fontFamily: 'inherit',
                          boxSizing: 'border-box',
                        }}
                      />
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          onClick={() => { setRechazandoId(null); setMotivoRechazo(''); setErrorId(null); }}
                          style={{
                            flex: 1, height: '36px', borderRadius: '8px',
                            border: `1px solid ${borderColor}`, background: 'transparent',
                            color: textMuted, fontSize: '12px', fontWeight: 600,
                            cursor: 'pointer', fontFamily: 'inherit',
                          }}
                        >
                          Cancelar
                        </button>
                        <button
                          onClick={() => handleRechazar(pago.id)}
                          disabled={isLoading}
                          style={{
                            flex: 1, height: '36px', borderRadius: '8px', border: 'none',
                            background: isLoading ? 'var(--bg-elevated)' : '#DC2626',
                            color: isLoading ? textMuted : '#fff',
                            fontSize: '12px', fontWeight: 700,
                            cursor: isLoading ? 'not-allowed' : 'pointer',
                            fontFamily: 'inherit',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                          }}
                        >
                          <IcoX /> {isLoading ? 'Rechazando...' : 'Confirmar rechazo'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => { setRechazandoId(pago.id); setErrorId(null); }}
                        disabled={isLoading}
                        style={{
                          flex: 1, height: '38px', borderRadius: '8px',
                          border: '1px solid rgba(239,68,68,0.3)',
                          background: 'rgba(239,68,68,0.06)', color: '#DC2626',
                          fontSize: '12px', fontWeight: 700,
                          cursor: isLoading ? 'not-allowed' : 'pointer',
                          fontFamily: 'inherit',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                        }}
                      >
                        <IcoX /> Rechazar
                      </button>
                      <button
                        onClick={() => handleAprobar(pago.id)}
                        disabled={isLoading}
                        style={{
                          flex: 1, height: '38px', borderRadius: '8px', border: 'none',
                          background: isLoading ? 'var(--bg-elevated)' : 'var(--success)',
                          color: isLoading ? textMuted : '#fff',
                          fontSize: '12px', fontWeight: 700,
                          cursor: isLoading ? 'not-allowed' : 'pointer',
                          fontFamily: 'inherit',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                        }}
                      >
                        <IcoCheck /> {isLoading ? 'Aprobando...' : 'Aprobar'}
                      </button>
                    </div>
                  )}

                  {hasError && errorMsg && (
                    <p style={{ fontSize: '12px', color: '#DC2626', marginTop: '8px' }}>{errorMsg}</p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Modal zoom comprobante */}
      {zoomUrl && (
        <ZoomModal
          url={`http://localhost:3001${zoomUrl}`}
          onClose={() => setZoomUrl(null)}
        />
      )}
    </div>
  );
}

// ── Componentes auxiliares ────────────────────────────────────────────────

function SectionTitle() {
  return (
    <div style={{
      fontSize: '10px', fontWeight: 700, letterSpacing: '0.12em',
      textTransform: 'uppercase', color: 'var(--text-subtle)',
      marginBottom: '12px', paddingBottom: '8px',
      borderBottom: '1px solid var(--border)',
    }}>
      Información de Pago
    </div>
  );
}

function MiniInfo({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-subtle)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        {label}
      </span>
      <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>{value}</p>
    </div>
  );
}

function ZoomModal({ url, onClose }: { url: string; onClose: () => void }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 2000,
        background: 'rgba(0,0,0,0.85)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '24px',
        animation: 'fadeIn 0.15s ease',
      }}
    >
      <div style={{ position: 'relative', maxWidth: '90vw', maxHeight: '90vh' }}>
        <img
          src={url}
          alt="Comprobante — vista completa"
          style={{ maxWidth: '100%', maxHeight: '85vh', borderRadius: '8px', display: 'block' }}
          onClick={(e) => e.stopPropagation()}
        />
        <button
          onClick={onClose}
          style={{
            position: 'absolute', top: '-12px', right: '-12px',
            width: '32px', height: '32px', borderRadius: '50%',
            background: '#fff', border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '16px', fontWeight: 700, color: '#1e293b',
            boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
          }}
        >
          ×
        </button>
        <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.6)', fontSize: '12px', marginTop: '12px' }}>
          Clic fuera para cerrar
        </p>
      </div>
    </div>
  );
}