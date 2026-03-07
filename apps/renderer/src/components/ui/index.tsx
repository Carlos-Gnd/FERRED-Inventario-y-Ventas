import { useEffect, type ReactNode } from 'react';

// ─── BADGE ───────────────────────────────────────────────────
type BadgeVariant = 'success' | 'danger' | 'warning' | 'info' | 'neutral';

const BADGE_STYLES: Record<BadgeVariant, { bg: string; color: string; dot: string }> = {
  success: { bg: 'rgba(16,185,129,0.12)',  color: '#10B981', dot: '#10B981' },
  danger:  { bg: 'rgba(239,68,68,0.12)',   color: '#EF4444', dot: '#EF4444' },
  warning: { bg: 'rgba(245,158,11,0.12)',  color: '#F59E0B', dot: '#F59E0B' },
  info:    { bg: 'rgba(59,130,246,0.12)',  color: '#3B82F6', dot: '#3B82F6' },
  neutral: { bg: 'rgba(148,163,184,0.12)', color: '#94A3B8', dot: '#94A3B8' },
};

interface BadgeProps {
  variant?: BadgeVariant;
  dot?:     boolean;
  children: ReactNode;
}

export function Badge({ variant = 'neutral', dot = true, children }: BadgeProps) {
  const s = BADGE_STYLES[variant];
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '5px',
      padding: '3px 10px', borderRadius: '4px',
      fontSize: '11px', fontWeight: 700,
      background: s.bg, color: s.color,
    }}>
      {dot && <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: s.dot, flexShrink: 0 }} />}
      {children}
    </span>
  );
}

// ─── SELECT ──────────────────────────────────────────────────
interface SelectOption { value: string; label: string; }

interface SelectProps {
  label?:    string;
  value:     string;
  options:   SelectOption[];
  onChange:  (val: string) => void;
  disabled?: boolean;
  error?:    string;
}

export function Select({ label, value, options, onChange, disabled, error }: SelectProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      {label && (
        <label style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
          {label}
        </label>
      )}
      <div style={{ position: 'relative' }}>
        <select
          value={value}
          onChange={e => onChange(e.target.value)}
          disabled={disabled}
          style={{
            width: '100%',
            padding: '10px 32px 10px 12px',
            background: 'var(--bg-elevated)',
            border: `1px solid ${error ? 'var(--danger)' : 'var(--border)'}`,
            borderRadius: '6px',
            color: 'var(--text-primary)',
            fontSize: '13px',
            fontFamily: 'inherit',
            outline: 'none',
            appearance: 'none',
            WebkitAppearance: 'none',
            cursor: disabled ? 'not-allowed' : 'pointer',
          }}
        >
          {options.map(opt => (
            <option key={opt.value} value={opt.value} style={{ background: 'var(--bg-elevated)' }}>
              {opt.label}
            </option>
          ))}
        </select>
        <span style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-subtle)', fontSize: '11px' }}>
          ▼
        </span>
      </div>
      {error && <span style={{ fontSize: '11px', color: 'var(--danger)' }}>{error}</span>}
    </div>
  );
}

// ─── TOAST ───────────────────────────────────────────────────
export interface ToastData { msg: string; type: 'success' | 'error' | 'warning'; }

interface ToastProps { data: ToastData | null; }

export function Toast({ data }: ToastProps) {
  if (!data) return null;
  const variantMap = { success: 'success', error: 'danger', warning: 'warning' } as const;
  const v = BADGE_STYLES[variantMap[data.type]];

  return (
    <div style={{
      position: 'fixed', bottom: '24px', right: '24px', zIndex: 2000,
      padding: '12px 18px',
      background: v.bg,
      border: `1px solid ${v.color}40`,
      borderRadius: '8px',
      fontSize: '13px', fontWeight: 600,
      color: v.color,
      boxShadow: 'var(--shadow-card)',
      display: 'flex', alignItems: 'center', gap: '8px',
      animation: 'slideUp 0.25s ease',
    }}>
      <span style={{ fontSize: '15px' }}>
        {data.type === 'success' ? '✓' : data.type === 'error' ? '✕' : '⚠'}
      </span>
      {data.msg}
    </div>
  );
}

// ─── CONFIRM MODAL (Eliminar) ─────────────────────────────────
interface ConfirmDeleteProps {
  open:     boolean;
  onClose:  () => void;
  onConfirm: () => void;
  name:     string;
  warning?: string;
}

export function ConfirmDelete({ open, onClose, onConfirm, name, warning }: ConfirmDeleteProps) {
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '16px',
      }}
    >
      <div style={{
        background: 'var(--bg-surface)', border: '1px solid var(--border)',
        borderRadius: '12px', maxWidth: '420px', width: '100%',
        padding: '28px 24px', textAlign: 'center',
        boxShadow: 'var(--shadow-modal)',
        animation: 'modalIn 0.22s cubic-bezier(0.34,1.56,0.64,1)',
      }}>
        <div style={{
          width: '52px', height: '52px', borderRadius: '50%',
          background: 'rgba(239,68,68,0.1)',
          border: '1px solid rgba(239,68,68,0.25)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '22px', margin: '0 auto 16px',
        }}>⚠</div>

        <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>
          ¿Confirmar eliminación?
        </h3>

        <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '8px' }}>
          Esta acción no se puede deshacer.
        </p>

        <div style={{
          display: 'inline-block',
          background: 'var(--bg-elevated)', border: '1px solid var(--border)',
          borderRadius: '6px', padding: '7px 16px',
          fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)',
          margin: '8px 0 16px',
        }}>
          {name}
        </div>

        {warning && (
          <div style={{
            fontSize: '12px', color: 'var(--warning)',
            background: 'rgba(245,158,11,0.08)',
            border: '1px solid rgba(245,158,11,0.2)',
            borderRadius: '6px', padding: '8px 12px', marginBottom: '16px',
          }}>
            {warning}
          </div>
        )}

        <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
          <button
            onClick={onClose}
            style={{
              flex: 1, padding: '10px',
              background: 'var(--bg-elevated)', border: '1px solid var(--border)',
              borderRadius: '7px', color: 'var(--text-muted)',
              fontFamily: 'inherit', fontSize: '13px', fontWeight: 500, cursor: 'pointer',
            }}
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            style={{
              flex: 1, padding: '10px',
              background: 'linear-gradient(135deg,#dc2626,#b91c1c)',
              border: 'none', borderRadius: '7px',
              color: '#fff', fontFamily: 'inherit', fontSize: '13px',
              fontWeight: 600, cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(220,38,38,0.3)',
            }}
          >
            Sí, eliminar
          </button>
        </div>
      </div>
    </div>
  );
}