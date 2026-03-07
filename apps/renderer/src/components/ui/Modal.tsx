import { useEffect, useRef, type ReactNode } from 'react';

interface ModalProps {
  open:     boolean;
  onClose:  () => void;
  title:    string;
  subtitle?: string;
  icon?:    ReactNode;
  children: ReactNode;
  maxWidth?: number;
}

export function Modal({ open, onClose, title, subtitle, icon, children, maxWidth = 480 }: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      ref={overlayRef}
      onClick={e => { if (e.target === overlayRef.current) onClose(); }}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '16px',
      }}
    >
      <div style={{
        background:   'var(--bg-surface)',
        border:       '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        width:        '100%',
        maxWidth:     `${maxWidth}px`,
        boxShadow:    'var(--shadow-modal)',
        animation:    'modalIn 0.22s cubic-bezier(0.34,1.56,0.64,1)',
        overflow:     'hidden',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '12px',
          padding: '16px 20px',
          borderBottom: '1px solid var(--border)',
        }}>
          {icon && (
            <div style={{
              width: '34px', height: '34px', borderRadius: '8px',
              background: 'var(--accent-glow)',
              border: '1px solid var(--border)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--accent)', flexShrink: 0,
            }}>
              {icon}
            </div>
          )}
          <div style={{ flex: 1 }}>
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1 }}>
              {title}
            </h3>
            {subtitle && (
              <p style={{ fontSize: '10px', color: 'var(--text-subtle)', marginTop: '3px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                {subtitle}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--text-subtle)', fontSize: '18px', lineHeight: 1,
              padding: '4px 6px', borderRadius: '4px',
              transition: 'color 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-primary)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-subtle)')}
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '20px' }}>
          {children}
        </div>
      </div>
    </div>
  );
}