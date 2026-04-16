// T-02B.3 — Cobro exitoso: notificación con folio + botón imprimir ticket

import { useEffect, useRef } from 'react';
import { Button } from '../../../components/ui/Button';

// ── Tipos ────────────────────────────────────────────────────────────────────

export interface VentaExitosaModalProps {
  open: boolean;
  folio: string;
  fechaEmision: string;   // ej. "24 Oct, 2023"
  horaRegistro: string;   // ej. "14:30"
  totalNeto: number;
  onImprimir: () => void; 
  onNuevaVenta: () => void;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return n.toLocaleString('es-CR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ── Componente ───────────────────────────────────────────────────────────────

export function VentaExitosaModal({
  open,
  folio,
  fechaEmision,
  horaRegistro,
  totalNeto,
  onImprimir,
  onNuevaVenta,
}: VentaExitosaModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  // No cierra con Escape — el cajero debe elegir explícitamente una acción
  useEffect(() => {
    if (!open) return;
  }, [open]);

  if (!open) return null;

  return (
    <div
      ref={overlayRef}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        background: 'rgba(0,0,0,0.65)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
    >
      <div
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          width: '100%',
          maxWidth: '400px',
          boxShadow: 'var(--shadow-modal)',
          animation: 'modalIn 0.25s cubic-bezier(0.34,1.56,0.64,1)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: '32px 28px 24px',
          gap: '0',
          textAlign: 'center',
        }}
      >
        {/* ── Ícono de éxito ── */}
        <div
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: 'var(--success)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '18px',
            boxShadow: '0 0 0 8px rgba(16,185,129,0.15)',
          }}
        >
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>

        {/* ── Título ── */}
        <h2
          style={{
            fontSize: '22px',
            fontWeight: 800,
            color: 'var(--text-primary)',
            lineHeight: 1.2,
            marginBottom: '12px',
          }}
        >
          ¡Venta Registrada<br />Exitosamente!
        </h2>

        {/* ── Folio ── */}
        <div
          style={{
            display: 'inline-block',
            padding: '3px 10px',
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: '4px',
            fontSize: '10px',
            fontWeight: 700,
            letterSpacing: '0.1em',
            color: 'var(--text-subtle)',
            marginBottom: '20px',
          }}
        >
          FACTURA #{folio}
        </div>

        {/* ── Detalles ── */}
        <div
          style={{
            width: '100%',
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            overflow: 'hidden',
            marginBottom: '20px',
          }}
        >
          {/* Fecha */}
          <Row label="FECHA DE EMISIÓN" value={fechaEmision} />
          <div style={{ height: '1px', background: 'var(--border)' }} />
          {/* Hora */}
          <Row label="HORA REGISTRO" value={horaRegistro} />
          <div style={{ height: '1px', background: 'var(--border)' }} />
          {/* Total */}
          <Row
            label="TOTAL NETO"
            value={`$${fmt(totalNeto)}`}
            valueStyle={{ color: 'var(--accent)', fontWeight: 800, fontSize: '16px' }}
          />
          <div style={{ height: '1px', background: 'var(--border)' }} />
          {/* Estado */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '10px 14px',
            }}
          >
            <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.06em', color: 'var(--text-subtle)' }}>
              ESTADO DE PAGO
            </span>
            <span
              style={{
                fontSize: '10px',
                fontWeight: 700,
                letterSpacing: '0.06em',
                color: 'var(--success)',
                background: 'rgba(16,185,129,0.12)',
                border: '1px solid rgba(16,185,129,0.3)',
                borderRadius: '4px',
                padding: '2px 8px',
              }}
            >
              CONFIRMADO
            </span>
          </div>
        </div>

        {/* ── Botones ── */}
        <div style={{ display: 'flex', gap: '10px', width: '100%' }}>
          <Button
            variant="primary"
            size="md"
            onClick={onImprimir}
            icon={<PrinterIcon />}
            style={{ flex: 1, justifyContent: 'center' }}
          >
            Imprimir Ticket
          </Button>
          <Button
            variant="ghost"
            size="md"
            onClick={onNuevaVenta}
            icon={<RefreshIcon />}
            style={{ flex: 1, justifyContent: 'center' }}
          >
            Nueva Venta
          </Button>
        </div>

        {/* ── Nota impresión ── */}
        <p
          style={{
            marginTop: '14px',
            fontSize: '11px',
            color: 'var(--text-subtle)',
            fontStyle: 'italic',
          }}
        >
          El ticket será enviado al módulo de impresión térmica
        </p>
      </div>
    </div>
  );
}

// ── Sub-componentes internos ──────────────────────────────────────────────────

function Row({
  label,
  value,
  valueStyle,
}: {
  label: string;
  value: string;
  valueStyle?: React.CSSProperties;
}) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '10px 14px',
      }}
    >
      <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.06em', color: 'var(--text-subtle)' }}>
        {label}
      </span>
      <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', ...valueStyle }}>
        {value}
      </span>
    </div>
  );
}

function PrinterIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 6 2 18 2 18 9" />
      <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
      <rect x="6" y="14" width="12" height="8" />
    </svg>
  );
}

function RefreshIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 4 23 10 17 10" />
      <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
    </svg>
  );
}
