import { useState } from 'react';

interface HelpTipProps {
  /** Texto de ayuda que se muestra en el popover */
  text: string;
  /** Lado del popover respecto al ícono */
  side?: 'top' | 'right';
}

/**
 * Ícono de ayuda "?" que muestra un popover al pasar el mouse o al enfocar con teclado.
 * Estilos inline + CSS vars del proyecto. Accesible (foco por teclado + aria-label).
 */
export function HelpTip({ text, side = 'top' }: HelpTipProps) {
  const [show, setShow] = useState(false);

  const popoverPos =
    side === 'right'
      ? { left: '140%', top: '50%', transform: 'translateY(-50%)' }
      : { bottom: '150%', left: '50%', transform: 'translateX(-50%)' };

  return (
    <span style={{ position: 'relative', display: 'inline-flex', verticalAlign: 'middle' }}>
      <button
        type="button"
        aria-label={text}
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        onFocus={() => setShow(true)}
        onBlur={() => setShow(false)}
        style={{
          width: '15px', height: '15px', borderRadius: '50%',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          background: 'var(--bg-elevated)', border: '1px solid var(--border)',
          color: 'var(--text-muted)', fontSize: '10px', fontWeight: 700,
          lineHeight: 1, cursor: 'help', padding: 0, fontFamily: 'inherit',
        }}
      >
        ?
      </button>
      {show && (
        <span
          role="tooltip"
          style={{
            position: 'absolute', ...popoverPos, zIndex: 50,
            width: '220px',
            background: 'var(--bg-surface)', border: '1px solid var(--border)',
            borderRadius: '6px', padding: '8px 10px',
            fontSize: '11px', lineHeight: 1.5, fontWeight: 400,
            color: 'var(--text-muted)', textTransform: 'none', letterSpacing: 'normal',
            boxShadow: 'var(--shadow-card)', pointerEvents: 'none',
          }}
        >
          {text}
        </span>
      )}
    </span>
  );
}
