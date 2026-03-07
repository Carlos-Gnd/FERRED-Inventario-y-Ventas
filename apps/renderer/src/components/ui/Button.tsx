import type { CSSProperties, ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';
type Size    = 'sm' | 'md' | 'lg';

interface ButtonProps {
  children:  ReactNode;
  onClick?:  () => void;
  variant?:  Variant;
  size?:     Size;
  disabled?: boolean;
  loading?:  boolean;
  type?:     'button' | 'submit';
  icon?:     ReactNode;
  style?:    CSSProperties;
}

const VARIANTS: Record<Variant, CSSProperties> = {
  primary: {
    background: 'var(--accent)',
    color:      '#fff',
    border:     '1px solid transparent',
  },
  secondary: {
    background: 'var(--bg-elevated)',
    color:      'var(--text-primary)',
    border:     '1px solid var(--border)',
  },
  danger: {
    background: 'rgba(239,68,68,0.1)',
    color:      'var(--danger)',
    border:     '1px solid rgba(239,68,68,0.3)',
  },
  ghost: {
    background: 'transparent',
    color:      'var(--text-muted)',
    border:     '1px solid var(--border)',
  },
};

const SIZES: Record<Size, CSSProperties> = {
  sm: { padding: '6px 12px', fontSize: '12px', height: '32px' },
  md: { padding: '8px 16px', fontSize: '13px', height: '36px' },
  lg: { padding: '12px 24px', fontSize: '14px', height: '44px' },
};

export function Button({
  children, onClick, variant = 'primary', size = 'md',
  disabled = false, loading = false, type = 'button', icon, style,
}: ButtonProps) {
  return (
    <button
      type={type}
      onClick={!disabled && !loading ? onClick : undefined}
      disabled={disabled || loading}
      style={{
        display:     'inline-flex',
        alignItems:  'center',
        gap:         '6px',
        borderRadius: '7px',
        fontWeight:  600,
        cursor:      disabled || loading ? 'not-allowed' : 'pointer',
        opacity:     disabled ? 0.5 : 1,
        transition:  'all 0.15s ease',
        fontFamily:  'inherit',
        whiteSpace:  'nowrap',
        ...VARIANTS[variant],
        ...SIZES[size],
        ...style,
      }}
      onMouseEnter={e => {
        if (!disabled && !loading) e.currentTarget.style.filter = 'brightness(1.1)';
      }}
      onMouseLeave={e => { e.currentTarget.style.filter = 'none'; }}
    >
      {loading ? (
        <span style={{
          display: 'inline-block', width: '12px', height: '12px',
          border: '2px solid rgba(255,255,255,0.3)',
          borderTopColor: 'currentColor',
          borderRadius: '50%',
          animation: 'spin 0.7s linear infinite',
        }} />
      ) : icon}
      {children}
    </button>
  );
}