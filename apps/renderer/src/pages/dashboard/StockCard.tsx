// DT-02: Extraído de DashboardPage.tsx para reducir el tamaño del god file.

export interface StockCardProps {
  sucursalNombre: string;
  criticos:       number;
  onClick:        () => void;
  loading?:       boolean;
}

export function StockCard({ sucursalNombre, criticos, onClick, loading = false }: StockCardProps) {
  const tieneCriticos = criticos > 0;
  const dangerColor   = '#ef4444';
  const successColor  = '#10b981';
  const estadoColor   = tieneCriticos ? dangerColor : successColor;
  const estadoLabel   = tieneCriticos ? 'Crítico' : 'OK';

  return (
    // DT-15: clases .stock-card y .stock-card--crit reemplazan onMouseEnter/onMouseLeave
    <div
      onClick={onClick}
      title="Ver página de Stock"
      className={`stock-card${tieneCriticos ? ' stock-card--crit' : ''}`}
      style={{
        background:    'var(--bg-surface)',
        border:        `1px solid ${tieneCriticos ? 'rgba(239,68,68,0.30)' : 'var(--border)'}`,
        borderRadius:  '12px',
        padding:       '20px',
        display:       'flex',
        flexDirection: 'column',
        gap:           '14px',
        boxShadow:     tieneCriticos
          ? '0 0 0 1px rgba(239,68,68,0.08), 0 2px 8px rgba(0,0,0,0.2)'
          : '0 2px 8px rgba(0,0,0,0.15)',
        opacity: loading ? 0.5 : 1,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '36px', height: '36px', borderRadius: '8px', flexShrink: 0,
            background: tieneCriticos ? 'rgba(239,68,68,0.18)' : 'rgba(16,185,129,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {tieneCriticos ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
                  stroke={dangerColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <line x1="12" y1="9"  x2="12"    y2="13" stroke={dangerColor} strokeWidth="2" strokeLinecap="round"/>
                <line x1="12" y1="17" x2="12.01" y2="17" stroke={dangerColor} strokeWidth="2" strokeLinecap="round"/>
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M20 6L9 17l-5-5" stroke={successColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
          </div>
          <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', lineHeight: '1.2' }}>
            {sucursalNombre}
          </span>
        </div>

        <span style={{
          fontSize: '11px', fontWeight: 700, color: estadoColor, letterSpacing: '0.02em',
          background:   tieneCriticos ? 'rgba(239,68,68,0.1)'  : 'rgba(16,185,129,0.1)',
          border:       `1px solid ${tieneCriticos ? 'rgba(239,68,68,0.25)' : 'rgba(16,185,129,0.25)'}`,
          borderRadius: '20px', padding: '3px 10px',
        }}>
          {estadoLabel}
        </span>
      </div>

      <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '-4px' }}>Stock bajo</div>

      <div style={{
        fontSize: '26px', fontWeight: 700, color: 'var(--text-primary)',
        fontFamily: 'JetBrains Mono, monospace', lineHeight: '1',
      }}>
        {loading ? '—' : `${criticos} items`}
      </div>
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div style={{
      background: 'var(--bg-surface)', border: '1px solid var(--border)',
      borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'var(--border)', animation: 'pulse 1.5s ease-in-out infinite' }} />
          <div style={{ width: '100px', height: '14px', borderRadius: '6px', background: 'var(--border)', animation: 'pulse 1.5s ease-in-out infinite' }} />
        </div>
        <div style={{ width: '52px', height: '22px', borderRadius: '20px', background: 'var(--border)', animation: 'pulse 1.5s ease-in-out infinite' }} />
      </div>
      <div style={{ width: '60px', height: '12px', borderRadius: '6px', background: 'var(--border)', animation: 'pulse 1.5s ease-in-out infinite' }} />
      <div style={{ width: '90px', height: '26px', borderRadius: '6px', background: 'var(--border)', animation: 'pulse 1.5s ease-in-out infinite' }} />
    </div>
  );
}
