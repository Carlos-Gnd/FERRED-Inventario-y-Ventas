import { useEffect, useState } from 'react';
import { SyncState } from '../../hooks/useNetworkStatus';

interface Props {
  syncState: SyncState;
}

export function OfflineBanner({ syncState }: Props) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 800);
    return () => clearTimeout(timer);
  }, []);

  if (!visible) return null;

  const pendientes = syncState.pendientes ?? 0;

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        width:          '100%',
        flexShrink:     0,
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'center',
        gap:            '8px',
        background:     'var(--warning)',
        color:          '#fff',
        padding:        '7px 16px',
        fontSize:       '13px',
        fontWeight:     600,
        boxShadow:      '0 2px 8px rgba(0,0,0,0.3)',
        animation:      'slideDown 0.25s ease',
      }}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="15" height="15"
        viewBox="0 0 24 24"
        fill="none" stroke="currentColor"
        strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
        aria-hidden="true"
        style={{ flexShrink: 0 }}
      >
        <line x1="2" y1="2" x2="22" y2="22" />
        <path d="M8.5 16.5a5 5 0 0 1 7 0" />
        <path d="M2 8.82a15 15 0 0 1 4.17-2.65" />
        <path d="M10.66 5c4.01-.36 8.14.9 11.34 3.76" />
        <path d="M16.85 11.25a10 10 0 0 1 2.22 1.68" />
        <path d="M5 12.5A10 10 0 0 1 10.5 10" />
        <circle cx="12" cy="20" r="1" />
      </svg>

      <span>Modo sin conexión</span>
      <span style={{ opacity: 0.6 }}>•</span>

      {pendientes > 0 ? (
        <span>
          {pendientes === 1
            ? '1 operación pendiente de sincronizar'
            : `${pendientes} operaciones pendientes de sincronizar`}
        </span>
      ) : (
        <span style={{ opacity: 0.85, fontWeight: 400 }}>
          Sin operaciones pendientes
        </span>
      )}
    </div>
  );
}