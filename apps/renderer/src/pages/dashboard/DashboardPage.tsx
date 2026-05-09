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
import { StockCard, SkeletonCard } from './StockCard';

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
              ? 'Sin conexión para cargar ventas.'
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
          <div key={s.label} className="stat-card">
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
              <button className="quick-btn" onClick={() => navigate('/productos')}>
                <span style={{ fontSize: '18px' }}>📦</span> Inventario
              </button>
            )}
            {(rol === 'ADMIN' || rol === 'CAJERO') && (
              <button className="quick-btn" onClick={() => navigate('/ventas')}>
                <span style={{ fontSize: '18px' }}>🛒</span> Ventas
              </button>
            )}
            {rol === 'ADMIN' && (
              <button className="quick-btn" onClick={() => navigate('/usuarios')}>
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



