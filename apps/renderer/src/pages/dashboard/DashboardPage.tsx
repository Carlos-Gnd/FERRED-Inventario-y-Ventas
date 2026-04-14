/**
 * DashboardPage.tsx
 * T-06.5: Reemplaza la tarjeta genérica de "Alertas de Stock" por dos tarjetas
 * independientes — una por sucursal — con el conteo de productos críticos.
 * Al hacer clic redirige a la página de Stock.
 */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '../../components/ui';
import { api, isOfflineError } from '../../services/api.client';
import { useAuthStore } from '../../store/authStore';
import type { UserRole } from '../../types';

const DAYS = ['LUN', 'MAR', 'MIE', 'JUE', 'VIE', 'SAB', 'DOM'];
const BARS = [42, 65, 38, 72, 55, 88, 60];

interface Stats { productos: number; usuarios: number; categorias: number; }

interface StockPorSucursal {
  sucursalId:     number;
  sucursalNombre: string;
  criticos:       number;
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const usuario  = useAuthStore(s => s.usuario);
  const rol      = (usuario?.rol ?? 'CAJERO') as UserRole;

  const [stats,        setStats]     = useState<Stats>({ productos: 0, usuarios: 0, categorias: 0 });
  const [stockData,    setStockData] = useState<StockPorSucursal[]>([]);
  const [loadError,    setLoadError] = useState<string | null>(null);
  const [loadingStock, setLoadingStock] = useState(true);

  useEffect(() => {
    async function load() {
      setLoadError(null);
      try {
        const [prods, cats, invRes] = await Promise.allSettled([
          api.get('/productos'),
          api.get('/categorias'),
          // T-06.5: endpoint con todas las sucursales y su conteo de críticos
          rol === 'ADMIN'
            ? api.get('/inventario/criticos-por-sucursal')
            : api.get(`/inventario/criticos/${usuario?.sucursalId ?? 1}`),
        ]);

        const productos  = prods.status === 'fulfilled' ? prods.value.data.length : 0;
        const categorias = cats.status  === 'fulfilled' ? cats.value.data.length  : 0;

        // ── Procesar stock crítico por sucursal ──────────────────
        if (invRes.status === 'fulfilled') {
          if (rol === 'ADMIN') {
            // /inventario/criticos-por-sucursal devuelve:
            // [{ sucursalId, sucursalNombre, criticos }] — una entrada por cada sucursal
            const raw: StockPorSucursal[] = invRes.value.data;
            setStockData(raw);
          } else {
            // /inventario/criticos/:id devuelve: { total, criticos: [...] }
            const { total } = invRes.value.data;
            setStockData([{
              sucursalId:     usuario?.sucursalId ?? 0,
              sucursalNombre: usuario?.sucursalId
                ? `Sucursal ${usuario.sucursalId}`
                : 'Sin sucursal asignada',
              criticos:       total ?? 0,
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
        setLoadingStock(false);
      } catch (err) {
        setLoadingStock(false);
        if (isOfflineError(err)) {
          setLoadError('Sin conexión — mostrando últimos datos disponibles.');
        } else {
          setLoadError('Error al cargar el panel. Intentá recargar la página.');
          console.error('[Dashboard] Error crítico:', err);
        }
      }
    }
    load();
  }, [rol, usuario?.sucursalId]);

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
            onClick={() => navigate('/productos')}
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
      {/* Fila superior: ícono + nombre de sucursal  |  badge estado */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>

        {/* Ícono + nombre */}
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
        {loading ? '—' : `${criticos} Items`}
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