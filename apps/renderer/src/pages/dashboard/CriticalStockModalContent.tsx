import type { AlertaStockDetalle } from '../../types';

export interface CriticalStockModalContentProps {
  sucursalNombre: string | null;
  items: AlertaStockDetalle[];
  loading: boolean;
  error: string | null;
  isDark: boolean;
  isCompact: boolean;
  onClose: () => void;
  onGoToStock: () => void;
}

export function CriticalStockModalContent({
  sucursalNombre,
  items,
  loading,
  error,
  isDark,
  isCompact,
  onClose,
  onGoToStock,
}: CriticalStockModalContentProps) {
  const labelSucursal = sucursalNombre ?? 'Sucursal';
  const palette = isDark
    ? {
        panelBg: 'var(--bg-surface)',
        tableShellBg: 'rgba(6,12,24,0.72)',
        tableShellBorder: '1px solid rgba(59,130,246,0.10)',
        tableHeadBg: 'rgba(148,163,184,0.12)',
        tableHeadColor: 'rgba(248,250,252,0.92)',
        rowBg: 'rgba(6,12,24,0.22)',
        rowBorder: '1px solid rgba(59,130,246,0.10)',
        iconBoxBg: 'rgba(29,78,216,0.10)',
        iconBoxBorder: '1px solid rgba(59,130,246,0.12)',
        noteText: 'var(--accent)',
        noteIcon: 'rgba(148,163,184,0.9)',
        actionShadow: '0 10px 24px rgba(59,130,246,0.22)',
        lowBadgeBorder: 'rgba(59,130,246,0.18)',
        lowBadgeBg: 'rgba(29,78,216,0.14)',
        lowBadgeColor: '#1d8fff',
        branchDotAlt: '#b86c06',
      }
    : {
        panelBg: '#fdf9f3',
        tableShellBg: '#f6f1ea',
        tableShellBorder: '1px solid #ece4d8',
        tableHeadBg: '#ebe5e4',
        tableHeadColor: '#5f4a33',
        rowBg: '#fcfaf7',
        rowBorder: '1px solid #efe7da',
        iconBoxBg: '#fffaf5',
        iconBoxBorder: '1px solid #ece1d2',
        noteText: '#8a6b44',
        noteIcon: '#9b8a72',
        actionShadow: '0 10px 24px rgba(191,112,0,0.18)',
        lowBadgeBorder: 'rgba(176,120,53,0.18)',
        lowBadgeBg: '#f4efe8',
        lowBadgeColor: '#ad7430',
        branchDotAlt: '#ad6b14',
      };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: isCompact ? '20px' : '28px' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '10px',
            color: 'var(--danger)',
            fontSize: '12px',
            fontWeight: 800,
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
          }}
        >
          <span
            style={{
              width: '22px',
              height: '22px',
              borderRadius: '50%',
              background: 'rgba(239,68,68,0.18)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--danger)',
              fontSize: '13px',
              fontWeight: 900,
            }}
          >
            !
          </span>
          Niveles criticos
        </div>

        <div>
          <div>
            <h3
              style={{
                fontSize: isCompact ? '18px' : '21px',
                fontWeight: 800,
                color: 'var(--text-primary)',
                lineHeight: 1.15,
              }}
            >
              Productos con stock critico
            </h3>
            <p style={{ fontSize: isCompact ? '11px' : '12px', color: 'var(--text-muted)', marginTop: '8px' }}>
              {labelSucursal} · {items.length} productos en alerta
            </p>
          </div>
        </div>
      </div>

      <div
        style={{
          background: palette.panelBg,
          borderRadius: '6px',
          overflow: 'hidden',
          border: palette.tableShellBorder,
          boxShadow: isDark ? undefined : 'inset 0 0 0 1px rgba(255,255,255,0.45)',
        }}
      >
        {!isCompact && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(220px, 1.6fr) minmax(150px, 1fr) minmax(120px, 0.8fr)',
              gap: '18px',
              padding: '15px 26px',
              background: palette.tableHeadBg,
              borderBottom: palette.rowBorder,
              color: palette.tableHeadColor,
              fontSize: '11px',
              fontWeight: 800,
              letterSpacing: '0.10em',
              textTransform: 'uppercase',
            }}
          >
            <span>Producto</span>
            <span>Sucursal</span>
            <span style={{ textAlign: 'right' }}>Stock actual</span>
          </div>
        )}

        {loading ? (
          <div style={{ padding: '30px 20px', color: 'var(--text-muted)', textAlign: 'center' }}>
            Cargando alertas...
          </div>
        ) : error ? (
          <div style={{ padding: '30px 20px', color: 'var(--danger)', textAlign: 'center' }}>{error}</div>
        ) : items.length === 0 ? (
          <div style={{ padding: '30px 20px', color: 'var(--text-muted)', textAlign: 'center' }}>
            No hay productos en alerta para esta sucursal.
          </div>
        ) : (
          items.map((item, index) => (
            <div
              key={item.id}
              style={{
                display: 'grid',
                gridTemplateColumns: isCompact
                  ? '1fr'
                  : 'minmax(220px, 1.6fr) minmax(150px, 1fr) minmax(120px, 0.8fr)',
                gap: isCompact ? '10px' : '18px',
                padding: isCompact ? '14px 14px' : '22px 26px',
                alignItems: isCompact ? 'stretch' : 'center',
                borderBottom: index === items.length - 1 ? 'none' : palette.rowBorder,
                background: palette.rowBg,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: isCompact ? '10px' : '14px',
                  minWidth: 0,
                }}
              >
                <div
                  style={{
                    width: isCompact ? '38px' : '44px',
                    height: isCompact ? '38px' : '44px',
                    borderRadius: '4px',
                    background: palette.iconBoxBg,
                    border: palette.iconBoxBorder,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: item.estado === 'critico' ? 'var(--danger)' : 'var(--warning)',
                    fontWeight: 900,
                    fontSize: '0px',
                    lineHeight: 0,
                    flexShrink: 0,
                  }}
                >
                  {item.estado === 'critico' ? (
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path
                        d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l2.1-2.1a5.8 5.8 0 0 1-7.3 7.3l-5.6 5.6a1.8 1.8 0 1 1-2.5-2.5l5.6-5.6a5.8 5.8 0 0 1 7.3-7.3l-2.6 2.6Z"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path d="m7.2 7.2 3.2 3.2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                    </svg>
                  ) : (
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path d="m12 4 7 4-7 4-7-4 7-4Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
                      <path d="m5 12 7 4 7-4" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
                    </svg>
                  )}
                  {item.estado === 'critico' ? '!' : '->'}
                </div>

                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: isCompact ? '14px' : '16px',
                      fontWeight: 700,
                      color: 'var(--text-primary)',
                      whiteSpace: isCompact ? 'normal' : 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {item.producto}
                  </div>
                  <div
                    style={{
                      fontSize: isCompact ? '11px' : '12px',
                      color: 'var(--accent)',
                      marginTop: isCompact ? '3px' : '5px',
                    }}
                  >
                    SKU: {item.codigoBarras ?? `PROD-${item.productoId}`}
                  </div>
                </div>
              </div>

              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  color: 'var(--text-primary)',
                  fontWeight: 600,
                  fontSize: isCompact ? '13px' : '14px',
                }}
              >
                <span
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: item.sucursalId % 2 === 0 ? 'var(--accent)' : palette.branchDotAlt,
                    flexShrink: 0,
                  }}
                />
                {item.sucursalNombre}
              </div>

              <div style={{ display: 'flex', justifyContent: isCompact ? 'flex-start' : 'flex-end' }}>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minWidth: '106px',
                    padding: isCompact ? '7px 10px' : '8px 12px',
                    borderRadius: '999px',
                    border: `1px solid ${
                      item.estado === 'critico' ? 'rgba(239,68,68,0.20)' : palette.lowBadgeBorder
                    }`,
                    background:
                      item.estado === 'critico'
                        ? isDark
                          ? 'rgba(127,29,29,0.20)'
                          : '#f8ece9'
                        : palette.lowBadgeBg,
                    color: item.estado === 'critico' ? '#ff4d4f' : palette.lowBadgeColor,
                    fontSize: isCompact ? '11px' : '12px',
                    fontWeight: 800,
                  }}
                >
                  {item.cantidad} unidades
                </span>
              </div>

              {isCompact && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div
                    style={{
                      padding: '8px 10px',
                      borderRadius: '10px',
                      background: isDark ? 'rgba(15,23,42,0.36)' : '#f8f3ec',
                      border: palette.rowBorder,
                    }}
                  >
                    <div
                      style={{
                        fontSize: '10px',
                        fontWeight: 800,
                        letterSpacing: '0.08em',
                        textTransform: 'uppercase',
                        color: 'var(--text-muted)',
                      }}
                    >
                      Estado
                    </div>
                    <div
                      style={{
                        marginTop: '6px',
                        color: item.estado === 'critico' ? 'var(--danger)' : palette.lowBadgeColor,
                        fontSize: '13px',
                        fontWeight: 700,
                      }}
                    >
                      {item.estado === 'critico' ? 'Critico' : 'Bajo'}
                    </div>
                  </div>

                  <div
                    style={{
                      padding: '8px 10px',
                      borderRadius: '10px',
                      background: isDark ? 'rgba(15,23,42,0.36)' : '#f8f3ec',
                      border: palette.rowBorder,
                    }}
                  >
                    <div
                      style={{
                        fontSize: '10px',
                        fontWeight: 800,
                        letterSpacing: '0.08em',
                        textTransform: 'uppercase',
                        color: 'var(--text-muted)',
                      }}
                    >
                      Minimo
                    </div>
                    <div
                      style={{
                        marginTop: '6px',
                        color: 'var(--text-primary)',
                        fontSize: '13px',
                        fontWeight: 700,
                      }}
                    >
                      {item.minimo} unidades
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: '12px',
          padding: isCompact ? '0 4px' : '4px 14px 0 14px',
          color: palette.noteText,
          lineHeight: 1.6,
        }}
      >
        <span style={{ color: palette.noteIcon, fontWeight: 700, marginTop: '2px' }}>i</span>
        <p style={{ fontSize: isCompact ? '12px' : '13px', maxWidth: '560px' }}>
          Los productos en esta lista han caido por debajo del umbral minimo de seguridad. Se recomienda
          realizar una orden de compra inmediata para evitar rupturas de stock adicionales.
        </p>
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent: 'flex-end',
          alignItems: 'center',
          gap: isCompact ? '10px' : '18px',
          flexWrap: 'wrap',
          paddingTop: '6px',
          flexDirection: isCompact ? 'column-reverse' : 'row',
        }}
      >
        <button
          type="button"
          onClick={onClose}
          style={{
            minWidth: isCompact ? '100%' : '104px',
            height: '40px',
            borderRadius: '8px',
            border: '1px solid transparent',
            background: 'transparent',
            color: 'var(--text-muted)',
            fontSize: '13px',
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          Cerrar
        </button>
        <button
          type="button"
          onClick={onGoToStock}
          style={{
            minWidth: isCompact ? '100%' : '152px',
            height: '40px',
            borderRadius: '4px',
            border: 'none',
            background: 'linear-gradient(135deg, var(--accent), var(--accent-hover))',
            color: '#fff',
            fontSize: '13px',
            fontWeight: 800,
            cursor: 'pointer',
            boxShadow: palette.actionShadow,
          }}
        >
          Ir a Stock {'->'}
        </button>
      </div>
    </div>
  );
}
