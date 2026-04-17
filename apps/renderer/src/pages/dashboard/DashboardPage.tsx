/**
 * DashboardPage.tsx
 * T-06.5: Reemplaza la tarjeta genérica de "Alertas de Stock" por dos tarjetas
 * independientes, una por sucursal, con el conteo de productos críticos.
 * Al hacer clic redirige a la página de Stock.
 */
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '../../components/ui';
import { Modal } from '../../components/ui/Modal';
import { api, isOfflineError } from '../../services/api.client';
import { useAuthStore } from '../../store/authStore';
import { useThemeStore } from '../../store/themeStore';
import type { AlertaStockDetalle, UserRole } from '../../types';

const DAYS = ['LUN', 'MAR', 'MIE', 'JUE', 'VIE', 'SAB', 'DOM'];
const BARS = [42, 65, 38, 72, 55, 88, 60];

interface Stats { productos: number; usuarios: number; categorias: number; }

interface StockPorSucursal {
  sucursalId:     number;
  sucursalNombre: string;
  criticos:       number;
}

const REFRESH_MS = 5 * 60 * 1000;

export default function DashboardPage() {
  const navigate = useNavigate();
  const usuario  = useAuthStore(s => s.usuario);
  const isDark   = useThemeStore(s => s.isDark);
  const rol      = (usuario?.rol ?? 'CAJERO') as UserRole;
  const [isCompact, setIsCompact] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth <= 720 : false
  );

  const [stats,        setStats]     = useState<Stats>({ productos: 0, usuarios: 0, categorias: 0 });
  const [stockData,    setStockData] = useState<StockPorSucursal[]>([]);
  const [loadError,    setLoadError] = useState<string | null>(null);
  const [loadingStock, setLoadingStock] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedSucursal, setSelectedSucursal] = useState<StockPorSucursal | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [criticalItems, setCriticalItems] = useState<AlertaStockDetalle[]>([]);
  const refreshTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    let mounted = true;

    async function load() {
      if (mounted) {
        setLoadError(null);
        setLoadingStock(true);
      }

      try {
        const sucursalId = usuario?.sucursalId;
        const [prods, cats, invRes] = await Promise.allSettled([
          api.get('/productos'),
          api.get('/categorias'),
          rol === 'ADMIN'
            ? api.get('/inventario/criticos-por-sucursal')
            : sucursalId
              ? api.get(`/inventario/criticos/${sucursalId}`)
              : Promise.resolve({ data: { total: 0 } }),
        ]);

        if (!mounted) return;

        const productos  = prods.status === 'fulfilled' ? prods.value.data.length : 0;
        const categorias = cats.status  === 'fulfilled' ? cats.value.data.length  : 0;

        if (invRes.status === 'fulfilled') {
          if (rol === 'ADMIN') {
            setStockData(invRes.value.data as StockPorSucursal[]);
          } else {
            const { total } = invRes.value.data;
            setStockData([{
              sucursalId: sucursalId ?? 0,
              sucursalNombre: sucursalId
                ? `Sucursal ${sucursalId}`
                : 'Sin sucursal asignada',
              criticos: total ?? 0,
            }]);
          }
        }

        let usuarios = 0;
        if (rol === 'ADMIN') {
          try {
            const r = await api.get('/usuarios');
            usuarios = r.data.length;
          } catch (err) {
            if (!isOfflineError(err)) {
              console.error('[Dashboard] Error al cargar usuarios:', err);
              setLoadError('No se pudieron cargar algunos datos del panel.');
            }
          }
        }

        setStats({ productos, usuarios, categorias });
      } catch (err) {
        if (!mounted) return;
        if (isOfflineError(err)) {
          setLoadError('Sin conexión; mostrando últimos datos disponibles.');
        } else {
          setLoadError('Error al cargar el panel. Intentá recargar la página.');
          console.error('[Dashboard] Error crítico:', err);
        }
      } finally {
        if (mounted) setLoadingStock(false);
      }
    }

    load();
    refreshTimer.current = setInterval(load, REFRESH_MS);

    return () => {
      mounted = false;
      if (refreshTimer.current) clearInterval(refreshTimer.current);
    };
  }, [rol, usuario?.sucursalId]);

  useEffect(() => {
    const onResize = () => setIsCompact(window.innerWidth <= 720);
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  async function openCriticalModal(sucursal: StockPorSucursal) {
    setSelectedSucursal(sucursal);
    setModalOpen(true);
    setDetailLoading(true);
    setDetailError(null);

    try {
      const { data } = await api.get<{ total: number; criticos: AlertaStockDetalle[] }>('/inventario/criticos-detalle', {
        params: { sucursalId: sucursal.sucursalId },
      });
      setCriticalItems(data.criticos ?? []);
    } catch (err) {
      setCriticalItems([]);
      setDetailError(
        isOfflineError(err)
          ? 'No se pudo cargar el detalle por falta de conexión.'
          : 'No se pudo cargar el detalle de productos críticos.'
      );
    } finally {
      setDetailLoading(false);
    }
  }

  function closeCriticalModal() {
    setModalOpen(false);
    setSelectedSucursal(null);
    setCriticalItems([]);
    setDetailError(null);
  }

  const STATS = [
    { label: 'Productos',        value: stats.productos.toString(),  trend: 'Total',   color: 'var(--accent)',  icon: '📦', visible: true },
    { label: 'Categorías',       value: stats.categorias.toString(), trend: 'Grupos',  color: 'var(--accent)',  icon: '🗂️', visible: rol === 'ADMIN' || rol === 'BODEGA' },
    { label: 'Usuarios Activos', value: stats.usuarios.toString(),   trend: 'Sistema', color: 'var(--success)', icon: '👥', visible: rol === 'ADMIN' },
  ].filter(s => s.visible);

  const mostrarTarjetasStock = rol === 'ADMIN' || rol === 'BODEGA';

  // Grid responsive: mínimo 200px por tarjeta, se acomoda solo

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', animation: 'fadeUp 0.4s ease' }}>

      {/* Bienvenida */}
      <div>
        <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)' }}>
          Bienvenido, {usuario?.nombre?.split(' ')[0]} 👋
        </h2>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
          {rol === 'ADMIN'  && 'Tenés acceso completo al sistema FERRED.'}
          {rol === 'CAJERO' && 'Módulo de ventas y punto de venta disponible.'}
          {rol === 'BODEGA' && 'Gestión de inventario y stock disponible.'}
        </p>
        {loadError && (
          <div style={{
            background: 'var(--bg-surface)', border: '1px solid var(--warning)',
            borderRadius: '8px', padding: '10px 16px',
            fontSize: '13px', color: 'var(--warning)', marginTop: '8px',
          }}>
            ⚠️ {loadError}
          </div>
        )}
      </div>

      {/* Stats grid */}
      <div
        className="stats-grid"
        style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}
      >
        {/* Tarjetas genéricas */}
        {STATS.map(s => (
          <div key={s.label} style={{
            background: 'var(--bg-surface)', border: '1px solid var(--border)',
            borderRadius: '10px', padding: '20px',
            display: 'flex', flexDirection: 'column', gap: '10px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <span style={{ fontSize: '20px' }}>{s.icon}</span>
              <span style={{ fontSize: '11px', fontWeight: 600, color: s.color }}>{s.trend}</span>
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{s.label}</div>
            <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'JetBrains Mono, monospace' }}>
              {s.value}
            </div>
          </div>
        ))}

        {/* ── Tarjetas de stock crítico por sucursal (T-06.5) ── */}
        {mostrarTarjetasStock && stockData.map(suc => (
          <StockCard
            key={suc.sucursalId}
            sucursalNombre={suc.sucursalNombre}
            criticos={suc.criticos}
            onClick={() => openCriticalModal(suc)}
            loading={loadingStock}
          />
        ))}

        {/* Skeletons solo si aún no sabemos cuántas sucursales hay */}
        {mostrarTarjetasStock && loadingStock && stockData.length === 0 && (
          <>
            <SkeletonCard />
            <SkeletonCard />
          </>
        )}
      </div>

      {/* Charts row */}
      <div className="charts-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '16px' }}>
        {/* Bar chart */}
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '10px', padding: '24px' }}>
          <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>Tendencia de Ventas</h3>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '3px' }}>Módulo en desarrollo</p>
            </div>
            <Badge variant="neutral">Pronto</Badge>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '12px', height: '140px' }}>
            {BARS.map((h, i) => (
              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', height: '100%', justifyContent: 'flex-end' }}>
                <div style={{
                  width: '100%', height: `${h}%`,
                  background: i === 5 ? 'var(--accent)' : 'rgba(59,130,246,0.25)',
                  borderRadius: '4px 4px 0 0',
                }} />
                <span style={{ fontSize: '9px', color: 'var(--text-subtle)' }}>{DAYS[i]}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Accesos rápidos */}
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '10px', padding: '20px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '16px' }}>Accesos Rápidos</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {rol !== 'CAJERO' && (
              <a href="/productos" style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                padding: '12px', borderRadius: '8px', textDecoration: 'none',
                background: 'var(--bg-elevated)', border: '1px solid var(--border)',
                color: 'var(--text-primary)', fontSize: '13px', fontWeight: 600,
              }}>
                <span style={{ fontSize: '18px' }}>📦</span> Inventario
              </a>
            )}
            {(rol === 'ADMIN' || rol === 'CAJERO') && (
              <a href="/ventas" style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                padding: '12px', borderRadius: '8px', textDecoration: 'none',
                background: 'var(--bg-elevated)', border: '1px solid var(--border)',
                color: 'var(--text-primary)', fontSize: '13px', fontWeight: 600,
              }}>
                <span style={{ fontSize: '18px' }}>🛒</span> Ventas <Badge variant="neutral">Pronto</Badge>
              </a>
            )}
            {rol === 'ADMIN' && (
              <a href="/usuarios" style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                padding: '12px', borderRadius: '8px', textDecoration: 'none',
                background: 'var(--bg-elevated)', border: '1px solid var(--border)',
                color: 'var(--text-primary)', fontSize: '13px', fontWeight: 600,
              }}>
                <span style={{ fontSize: '18px' }}>👥</span> Usuarios
              </a>
            )}
          </div>
        </div>
      </div>

      <Modal open={modalOpen} onClose={closeCriticalModal} title="Alertas de stock" maxWidth={708} hideHeader>
        <CriticalStockModalContent
          sucursal={selectedSucursal}
          items={criticalItems}
          loading={detailLoading}
          error={detailError}
          isDark={isDark}
          isCompact={isCompact}
          onClose={closeCriticalModal}
          onGoToStock={() => {
            closeCriticalModal();
            navigate('/stock', {
              state: {
                source: 'critical-alerts',
                sucursalId: selectedSucursal?.sucursalId ?? null,
                sucursalNombre: selectedSucursal?.sucursalNombre ?? null,
              },
            });
          }}
        />
      </Modal>
    </div>
  );
}

// ── Componente: tarjeta de stock crítico por sucursal (diseño Figma) ─────────
interface StockCardProps {
  sucursalNombre: string;
  criticos:       number;
  onClick:        () => void;
  loading?:       boolean;
}

function StockCard({ sucursalNombre, criticos, onClick, loading = false }: StockCardProps) {
  const tieneCriticos = criticos > 0;

  const dangerColor  = '#ef4444';
  const successColor = '#10b981';
  const estadoColor  = tieneCriticos ? dangerColor : successColor;
  const estadoLabel  = tieneCriticos ? 'Crítico' : 'OK';

  return (
    <div
      onClick={onClick}
      title="Ver página de Stock"
      style={{
        background:    'var(--bg-surface)',
        border:        `1px solid ${tieneCriticos ? 'rgba(239,68,68,0.30)' : 'var(--border)'}`,
        borderRadius:  '12px',
        padding:       '20px',
        display:       'flex',
        flexDirection: 'column',
        gap:           '14px',
        cursor:        'pointer',
        transition:    'border-color 0.2s, box-shadow 0.2s',
        boxShadow:     tieneCriticos
          ? '0 0 0 1px rgba(239,68,68,0.08), 0 2px 8px rgba(0,0,0,0.2)'
          : '0 2px 8px rgba(0,0,0,0.15)',
        opacity:       loading ? 0.5 : 1,
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLDivElement).style.borderColor = tieneCriticos
          ? 'rgba(239,68,68,0.6)' : 'var(--accent)';
        (e.currentTarget as HTMLDivElement).style.boxShadow = tieneCriticos
          ? '0 0 0 2px rgba(239,68,68,0.15), 0 4px 12px rgba(0,0,0,0.25)'
          : '0 0 0 2px rgba(59,130,246,0.15), 0 4px 12px rgba(0,0,0,0.2)';
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLDivElement).style.borderColor = tieneCriticos
          ? 'rgba(239,68,68,0.30)' : 'var(--border)';
        (e.currentTarget as HTMLDivElement).style.boxShadow = tieneCriticos
          ? '0 0 0 1px rgba(239,68,68,0.08), 0 2px 8px rgba(0,0,0,0.2)'
          : '0 2px 8px rgba(0,0,0,0.15)';
      }}
    >
      {/* Fila superior: icono + nombre de sucursal | badge estado */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>

        {/* Icono + nombre */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width:          '36px',
            height:         '36px',
            borderRadius:   '8px',
            background:     tieneCriticos ? 'rgba(239,68,68,0.18)' : 'rgba(16,185,129,0.15)',
            display:        'flex',
            alignItems:     'center',
            justifyContent: 'center',
            flexShrink:     0,
          }}>
            {tieneCriticos ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
                  stroke={dangerColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <line x1="12" y1="9" x2="12" y2="13" stroke={dangerColor} strokeWidth="2" strokeLinecap="round"/>
                <line x1="12" y1="17" x2="12.01" y2="17" stroke={dangerColor} strokeWidth="2" strokeLinecap="round"/>
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M20 6L9 17l-5-5" stroke={successColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
          </div>

          <span style={{
            fontSize:   '14px',
            fontWeight: 600,
            color:      'var(--text-primary)',
            lineHeight: '1.2',
          }}>
            {sucursalNombre}
          </span>
        </div>

        {/* Badge estado */}
        <span style={{
          fontSize:      '11px',
          fontWeight:    700,
          color:         estadoColor,
          background:    tieneCriticos ? 'rgba(239,68,68,0.1)'  : 'rgba(16,185,129,0.1)',
          border:        `1px solid ${tieneCriticos ? 'rgba(239,68,68,0.25)' : 'rgba(16,185,129,0.25)'}`,
          borderRadius:  '20px',
          padding:       '3px 10px',
          letterSpacing: '0.02em',
        }}>
          {estadoLabel}
        </span>
      </div>

      {/* Subtítulo */}
      <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '-4px' }}>
        Stock bajo
      </div>

      {/* Conteo principal */}
      <div style={{
        fontSize:   '26px',
        fontWeight: 700,
        color:      'var(--text-primary)',
        fontFamily: 'JetBrains Mono, monospace',
        lineHeight: '1',
      }}>
        {loading ? '—' : `${criticos} items`}
      </div>
    </div>
  );
}

// ── Skeleton de tarjeta mientras carga ──────────────────────────────────────
function SkeletonCard() {
  return (
    <div style={{
      background:    'var(--bg-surface)',
      border:        '1px solid var(--border)',
      borderRadius:  '12px',
      padding:       '20px',
      display:       'flex',
      flexDirection: 'column',
      gap:           '14px',
    }}>
      {/* Fila superior */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'var(--border)', animation: 'pulse 1.5s ease-in-out infinite' }} />
          <div style={{ width: '100px', height: '14px', borderRadius: '6px', background: 'var(--border)', animation: 'pulse 1.5s ease-in-out infinite' }} />
        </div>
        <div style={{ width: '52px', height: '22px', borderRadius: '20px', background: 'var(--border)', animation: 'pulse 1.5s ease-in-out infinite' }} />
      </div>
      {/* Subtítulo */}
      <div style={{ width: '60px', height: '12px', borderRadius: '6px', background: 'var(--border)', animation: 'pulse 1.5s ease-in-out infinite' }} />
      {/* Conteo */}
      <div style={{ width: '90px', height: '26px', borderRadius: '6px', background: 'var(--border)', animation: 'pulse 1.5s ease-in-out infinite' }} />
    </div>
  );
}

interface CriticalStockModalContentProps {
  sucursal: StockPorSucursal | null;
  items: AlertaStockDetalle[];
  loading: boolean;
  error: string | null;
  isDark: boolean;
  isCompact: boolean;
  onClose: () => void;
  onGoToStock: () => void;
}

function CriticalStockModalContent({
  sucursal,
  items,
  loading,
  error,
  isDark,
  isCompact,
  onClose,
  onGoToStock,
}: CriticalStockModalContentProps) {
  const labelSucursal = sucursal?.sucursalNombre ?? 'Sucursal';
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
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '10px',
          color: 'var(--danger)',
          fontSize: '12px',
          fontWeight: 800,
          letterSpacing: '0.22em',
          textTransform: 'uppercase',
        }}>
          <span style={{
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
          }}>
            !
          </span>
          Niveles críticos
        </div>

        <div>
          <div>
            <h3 style={{ fontSize: isCompact ? '18px' : '21px', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.15 }}>
              Productos con stock crítico
            </h3>
            <p style={{ fontSize: isCompact ? '11px' : '12px', color: 'var(--text-muted)', marginTop: '8px' }}>
              {labelSucursal} · {items.length} productos en alerta
            </p>
          </div>
        </div>
      </div>

      <div style={{
        background: palette.panelBg,
        borderRadius: '6px',
        overflow: 'hidden',
        border: palette.tableShellBorder,
        boxShadow: isDark ? undefined : 'inset 0 0 0 1px rgba(255,255,255,0.45)',
      }}>
        {!isCompact && (
          <div style={{
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
          }}>
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
          <div style={{ padding: '30px 20px', color: 'var(--danger)', textAlign: 'center' }}>
            {error}
          </div>
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
                gridTemplateColumns: isCompact ? '1fr' : 'minmax(220px, 1.6fr) minmax(150px, 1fr) minmax(120px, 0.8fr)',
                gap: isCompact ? '10px' : '18px',
                padding: isCompact ? '14px 14px' : '22px 26px',
                alignItems: isCompact ? 'stretch' : 'center',
                borderBottom: index === items.length - 1 ? 'none' : palette.rowBorder,
                background: palette.rowBg,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: isCompact ? '10px' : '14px', minWidth: 0 }}>
                <div style={{
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
                }}>
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
                  {item.estado === 'critico' ? '!' : '↘'}
                </div>

                <div style={{ minWidth: 0 }}>
                  <div style={{
                    fontSize: isCompact ? '14px' : '16px',
                    fontWeight: 700,
                    color: 'var(--text-primary)',
                    whiteSpace: isCompact ? 'normal' : 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}>
                    {item.producto}
                  </div>
                  <div style={{ fontSize: isCompact ? '11px' : '12px', color: 'var(--accent)', marginTop: isCompact ? '3px' : '5px' }}>
                    SKU: {item.codigoBarras ?? `PROD-${item.productoId}`}
                  </div>
                </div>
              </div>

              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)', fontWeight: 600, fontSize: isCompact ? '13px' : '14px' }}>
                <span style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: item.sucursalId % 2 === 0 ? 'var(--accent)' : palette.branchDotAlt,
                  flexShrink: 0,
                }} />
                {item.sucursalNombre}
              </div>

              <div style={{ display: 'flex', justifyContent: isCompact ? 'flex-start' : 'flex-end' }}>
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minWidth: '106px',
                  padding: isCompact ? '7px 10px' : '8px 12px',
                  borderRadius: '999px',
                  border: `1px solid ${item.estado === 'critico' ? 'rgba(239,68,68,0.20)' : palette.lowBadgeBorder}`,
                  background: item.estado === 'critico' ? (isDark ? 'rgba(127,29,29,0.20)' : '#f8ece9') : palette.lowBadgeBg,
                  color: item.estado === 'critico' ? '#ff4d4f' : palette.lowBadgeColor,
                  fontSize: isCompact ? '11px' : '12px',
                  fontWeight: 800,
                }}>
                  {item.cantidad} unidades
                </span>
              </div>

              {isCompact && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div style={{
                    padding: '8px 10px',
                    borderRadius: '10px',
                    background: isDark ? 'rgba(15,23,42,0.36)' : '#f8f3ec',
                    border: palette.rowBorder,
                  }}>
                    <div style={{ fontSize: '10px', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                      Estado
                    </div>
                    <div style={{
                      marginTop: '6px',
                      color: item.estado === 'critico' ? 'var(--danger)' : palette.lowBadgeColor,
                      fontSize: '13px',
                      fontWeight: 700,
                    }}>
                      {item.estado === 'critico' ? 'Crítico' : 'Bajo'}
                    </div>
                  </div>

                  <div style={{
                    padding: '8px 10px',
                    borderRadius: '10px',
                    background: isDark ? 'rgba(15,23,42,0.36)' : '#f8f3ec',
                    border: palette.rowBorder,
                  }}>
                    <div style={{ fontSize: '10px', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                      Mínimo
                    </div>
                    <div style={{
                      marginTop: '6px',
                      color: 'var(--text-primary)',
                      fontSize: '13px',
                      fontWeight: 700,
                    }}>
                      {item.minimo} unidades
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '12px',
        padding: isCompact ? '0 4px' : '4px 14px 0 14px',
        color: palette.noteText,
        lineHeight: 1.6,
      }}>
        <span style={{ color: palette.noteIcon, fontWeight: 700, marginTop: '2px' }}>i</span>
        <p style={{ fontSize: isCompact ? '12px' : '13px', maxWidth: '560px' }}>
          Los productos en esta lista han caído por debajo del umbral mínimo de seguridad. Se recomienda
          realizar una orden de compra inmediata para evitar rupturas de stock adicionales.
        </p>
      </div>

      <div style={{
        display: 'flex',
        justifyContent: 'flex-end',
        alignItems: 'center',
        gap: isCompact ? '10px' : '18px',
        flexWrap: 'wrap',
        paddingTop: '6px',
        flexDirection: isCompact ? 'column-reverse' : 'row',
      }}>
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
          Ir a Stock →
        </button>
      </div>
    </div>
  );
}
