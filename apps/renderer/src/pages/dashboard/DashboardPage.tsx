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
import type { AlertaStockDetalle, UserRole, VentaSemanalPunto, VentaSemanalResumen } from '../../types';
import { CriticalStockModalContent } from './CriticalStockModalContent';

interface Stats { productos: number; usuarios: number; categorias: number; }

interface StockPorSucursal {
  sucursalId:     number;
  sucursalNombre: string;
  criticos:       number;
}

const REFRESH_MS = 5 * 60 * 1000;
const SALES_WINDOW_DAYS = 7;
const WEEKDAY_LABELS = ['DOM', 'LUN', 'MAR', 'MIE', 'JUE', 'VIE', 'SAB'] as const;

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function buildEmptySalesTrend(): VentaSemanalPunto[] {
  const today = startOfDay(new Date());
  const trend: VentaSemanalPunto[] = [];

  for (let index = SALES_WINDOW_DAYS - 1; index >= 0; index -= 1) {
    const date = new Date(today);
    date.setDate(today.getDate() - index);

    trend.push({
      date: date.toISOString(),
      label: WEEKDAY_LABELS[date.getDay()],
      total: 0,
      ventas: 0,
    });
  }

  return trend;
}

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
  const [salesTrend, setSalesTrend] = useState<VentaSemanalPunto[]>(() => buildEmptySalesTrend());
  const [salesLoading, setSalesLoading] = useState(true);
  const [salesError, setSalesError] = useState<string | null>(null);
  const refreshTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    let mounted = true;

    async function load() {
      if (mounted) {
        setLoadError(null);
        setLoadingStock(true);
        setSalesLoading(true);
        setSalesError(null);
      }

      try {
        const sucursalId = usuario?.sucursalId;
        const [prods, cats, invRes, ventasRes] = await Promise.allSettled([
          api.get('/productos'),
          api.get('/categorias'),
          rol === 'ADMIN'
            ? api.get('/inventario/criticos-por-sucursal')
            : sucursalId
              ? api.get(`/inventario/criticos/${sucursalId}`)
              : Promise.resolve({ data: { total: 0 } }),
          api.get<VentaSemanalResumen>('/ventas/estadisticas/semanales', {
            params: { days: SALES_WINDOW_DAYS },
          }),
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

        if (ventasRes.status === 'fulfilled') {
          setSalesTrend(ventasRes.value.data.dias);
        } else {
          setSalesTrend(buildEmptySalesTrend());
          setSalesError(
            isOfflineError(ventasRes.reason)
              ? 'Sin conexiÃ³n para cargar ventas.'
              : 'No se pudieron cargar las ventas recientes.'
          );
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
        setSalesTrend(buildEmptySalesTrend());
        setSalesError(
          isOfflineError(err)
            ? 'Sin conexion para cargar ventas.'
            : 'No se pudieron cargar las ventas recientes.'
        );
        if (isOfflineError(err)) {
          setLoadError('Sin conexión; mostrando últimos datos disponibles.');
        } else {
          setLoadError('Error al cargar el panel. Intentá recargar la página.');
          console.error('[Dashboard] Error crítico:', err);
        }
      } finally {
        if (mounted) {
          setLoadingStock(false);
          setSalesLoading(false);
        }
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
  const maxSalesAmount = salesTrend.reduce((max, item) => Math.max(max, item.total), 0);

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
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '12px', height: '140px' }}>
            {salesTrend.map((item, i) => (
              <div key={item.date} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', height: '100%', justifyContent: 'flex-end' }}>
                <div style={{
                  width: '100%',
                  height: maxSalesAmount > 0 ? `${Math.max((item.total / maxSalesAmount) * 100, 6)}%` : '4px',
                  background: i === salesTrend.length - 1 ? 'var(--accent)' : 'rgba(59,130,246,0.25)',
                  borderRadius: '4px 4px 0 0',
                  opacity: salesLoading ? 0.55 : 1,
                }} />
                <span style={{ fontSize: '9px', color: 'var(--text-subtle)' }}>{item.label}</span>
              </div>
            ))}
          </div>
          <div style={{ marginTop: '12px', fontSize: '12px', color: salesError ? 'var(--warning)' : 'var(--text-muted)' }}>
            {salesError
              ? salesError
              : `${salesTrend.reduce((acc, item) => acc + item.ventas, 0)} ventas registradas en los ultimos ${SALES_WINDOW_DAYS} dias`}
          </div>
        </div>

        {/* Accesos rápidos */}
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '10px', padding: '20px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '16px' }}>Accesos Rápidos</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {rol !== 'CAJERO' && (
              <button onClick={() => navigate('/productos')} style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                padding: '12px', borderRadius: '8px', textDecoration: 'none',
                background: 'var(--bg-elevated)', border: '1px solid var(--border)',
                color: 'var(--text-primary)', fontSize: '13px', fontWeight: 600,
                cursor: 'pointer', width: '100%', textAlign: 'left',
              }}>
                <span style={{ fontSize: '18px' }}>📦</span> Inventario
              </button>
            )}
            {(rol === 'ADMIN' || rol === 'CAJERO') && (
              <button onClick={() => navigate('/ventas')} style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                padding: '12px', borderRadius: '8px', textDecoration: 'none',
                background: 'var(--bg-elevated)', border: '1px solid var(--border)',
                color: 'var(--text-primary)', fontSize: '13px', fontWeight: 600,
                cursor: 'pointer', width: '100%', textAlign: 'left',
              }}>
                <span style={{ fontSize: '18px' }}>🛒</span> Ventas
              </button>
            )}
            {rol === 'ADMIN' && (
              <button onClick={() => navigate('/usuarios')} style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                padding: '12px', borderRadius: '8px', textDecoration: 'none',
                background: 'var(--bg-elevated)', border: '1px solid var(--border)',
                color: 'var(--text-primary)', fontSize: '13px', fontWeight: 600,
                cursor: 'pointer', width: '100%', textAlign: 'left',
              }}>
                <span style={{ fontSize: '18px' }}>👥</span> Usuarios
              </button>
            )}
          </div>
        </div>
      </div>

      <Modal open={modalOpen} onClose={closeCriticalModal} title="Alertas de stock" maxWidth={708} hideHeader>
        <CriticalStockModalContent
          sucursalNombre={selectedSucursal?.sucursalNombre ?? null}
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

