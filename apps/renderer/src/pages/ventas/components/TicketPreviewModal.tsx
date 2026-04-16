// T-02B.2 — Vista Previa del Ticket (modal antes de confirmar cobro)

import { useEffect, useRef } from 'react';
import { Button } from '../../../components/ui/Button';

// ── Tipos ────────────────────────────────────────────────────────────────────

export interface TicketItem {
  id: string | number;
  nombre: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
}

export interface TicketPreviewModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  cliente?: string;
  items: TicketItem[];
  loading?: boolean;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const IVA_RATE = 0.13;

function fmt(n: number) {
  return n.toLocaleString('es-CR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ── Componente ───────────────────────────────────────────────────────────────

export function TicketPreviewModal({
  open,
  onClose,
  onConfirm,
  cliente = 'Consumidor Final',
  items,
  loading = false,
}: TicketPreviewModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  const subtotalBruto = items.reduce((acc, i) => acc + i.subtotal, 0);
  const iva           = subtotalBruto * IVA_RATE;
  const total         = subtotalBruto + iva;

  return (
    <div
      ref={overlayRef}
      onClick={e => { if (e.target === overlayRef.current) onClose(); }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        background: 'rgba(0,0,0,0.55)',
        backdropFilter: 'blur(4px)',
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
          maxWidth: '560px',
          boxShadow: 'var(--shadow-modal)',
          animation: 'modalIn 0.22s cubic-bezier(0.34,1.56,0.64,1)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* ── Encabezado ── */}
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            padding: '16px 20px 14px',
            borderBottom: '1px solid var(--border)',
          }}
        >
          <div>
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1 }}>
              Vista Previa del Ticket
            </h3>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
              Revisa los datos antes de confirmar el cobro
            </p>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-subtle)',
              fontSize: '20px',
              lineHeight: 1,
              padding: '0 4px',
              borderRadius: '4px',
            }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-primary)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-subtle)')}
            aria-label="Cerrar"
          >
            ×
          </button>
        </div>

        {/* ── Cuerpo ── */}
        <div style={{ padding: '16px 20px', overflowY: 'auto', maxHeight: '60vh' }}>

          {/* Cliente */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 12px',
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              marginBottom: '16px',
            }}
          >
            <span style={{ color: 'var(--text-muted)', fontSize: '15px' }}>👤</span>
            <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
              Cliente:{' '}
              <strong style={{ color: 'var(--text-primary)' }}>{cliente}</strong>
            </span>
          </div>

          {/* Tabla de productos */}
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
            <thead>
              <tr>
                {(['PRODUCTO', 'CANT.', 'PRECIO UNITARIO', 'SUBTOTAL'] as const).map(col => (
                  <th
                    key={col}
                    style={{
                      textAlign: col === 'PRODUCTO' ? 'left' : 'right',
                      padding: '6px 8px',
                      color: 'var(--text-subtle)',
                      fontWeight: 600,
                      letterSpacing: '0.05em',
                      borderBottom: '1px solid var(--border)',
                    }}
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => (
                <tr
                  key={item.id}
                  style={{
                    background: idx % 2 === 0 ? 'transparent' : 'rgba(0,0,0,0.03)',
                  }}
                >
                  <td style={{ padding: '8px 8px', color: 'var(--text-primary)', fontWeight: 500 }}>
                    {item.nombre}
                  </td>
                  <td style={{ padding: '8px 8px', textAlign: 'right', color: 'var(--text-muted)' }}>
                    {item.cantidad}
                  </td>
                  <td style={{ padding: '8px 8px', textAlign: 'right', color: 'var(--text-muted)' }}>
                    ${fmt(item.precioUnitario)}
                  </td>
                  <td style={{ padding: '8px 8px', textAlign: 'right', color: 'var(--text-primary)', fontWeight: 600 }}>
                    ${fmt(item.subtotal)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totales */}
          <div
            style={{
              marginTop: '16px',
              borderTop: '1px solid var(--border)',
              paddingTop: '12px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-end',
              gap: '6px',
            }}
          >
            <div style={{ display: 'flex', gap: '32px', fontSize: '12px' }}>
              <span style={{ color: 'var(--text-subtle)' }}>SUBTOTAL</span>
              <span style={{ color: 'var(--text-muted)', minWidth: '80px', textAlign: 'right' }}>
                ${fmt(subtotalBruto)}
              </span>
            </div>
            <div style={{ display: 'flex', gap: '32px', fontSize: '12px' }}>
              <span style={{ color: 'var(--text-subtle)' }}>IVA (13%)</span>
              <span style={{ color: 'var(--text-muted)', minWidth: '80px', textAlign: 'right' }}>
                ${fmt(iva)}
              </span>
            </div>
            <div
              style={{
                display: 'flex',
                gap: '32px',
                alignItems: 'center',
                marginTop: '4px',
                padding: '10px 16px',
                background: 'var(--accent-glow)',
                border: '1px solid var(--border-focus)',
                borderRadius: 'var(--radius-md)',
              }}
            >
              <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '0.05em' }}>
                TOTAL:
              </span>
              <span style={{ fontSize: '22px', fontWeight: 800, color: 'var(--accent)', minWidth: '80px', textAlign: 'right' }}>
                ${fmt(total)}
              </span>
            </div>
          </div>
        </div>

        {/* ── Footer ── */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '10px',
            padding: '12px 20px',
            borderTop: '1px solid var(--border)',
            background: 'var(--bg-card)',
          }}
        >
          <Button variant="ghost" onClick={onClose} icon={<span>‹</span>}>
            CANCELAR
          </Button>
          <Button
            variant="primary"
            onClick={onConfirm}
            loading={loading}
            icon={<span>✓</span>}
            style={{ background: 'var(--success)', borderColor: 'transparent' }}
          >
            CONFIRMAR COBRO
          </Button>
        </div>
      </div>
    </div>
  );
}
