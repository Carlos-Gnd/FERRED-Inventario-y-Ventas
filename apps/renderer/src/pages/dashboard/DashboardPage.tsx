import { useEffect, useState } from 'react';
import { Badge } from '../../components/ui';
import { api } from '../../services/api.client';
import { useAuthStore } from '../../store/authStore';
import type { UserRole } from '../../types';

const DAYS = ['LUN', 'MAR', 'MIE', 'JUE', 'VIE', 'SAB', 'DOM'];
const BARS = [42, 65, 38, 72, 55, 88, 60];

interface Stats { productos: number; usuarios: number; stockBajo: number; categorias: number; }

export default function DashboardPage() {
  const usuario = useAuthStore(s => s.usuario);
  const rol = (usuario?.rol ?? 'CAJERO') as UserRole;
  const [stats, setStats] = useState<Stats>({ productos: 0, usuarios: 0, stockBajo: 0, categorias: 0 });

  useEffect(() => {
    async function load() {
      try {
        const [prods, cats, invRes] = await Promise.allSettled([
          api.get('/productos'),
          api.get('/categorias'),
          api.get('/inventario/stock-bajo'),
        ]);
        const productos   = prods.status   === 'fulfilled' ? prods.value.data.length   : 0;
        const categorias  = cats.status    === 'fulfilled' ? cats.value.data.length    : 0;
        const stockBajo   = invRes.status  === 'fulfilled' ? invRes.value.data.length  : 0;
        // usuarios solo admin
        let usuarios = 0;
        if (rol === 'ADMIN') {
          try { const r = await api.get('/usuarios'); usuarios = r.data.length; } catch {}
        }
        setStats({ productos, usuarios, stockBajo, categorias });
      } catch {}
    }
    load();
  }, [rol]);

  const STATS = [
    { label: 'Productos',       value: stats.productos.toString(), trend: 'Total',    color: 'var(--accent)',   icon: '📦', visible: true },
    { label: 'Categorías',      value: stats.categorias.toString(), trend: 'Grupos',  color: 'var(--accent)',   icon: '🗂️', visible: rol === 'ADMIN' || rol === 'BODEGA' },
    { label: 'Usuarios Activos',value: stats.usuarios.toString(),  trend: 'Sistema',  color: 'var(--success)',  icon: '👥', visible: rol === 'ADMIN' },
    { label: 'Alertas de Stock',value: `${stats.stockBajo} Items`, trend: 'Crítico',  color: 'var(--danger)',   icon: '⚠️', visible: rol === 'ADMIN' || rol === 'BODEGA' },
  ].filter(s => s.visible);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', animation: 'fadeUp 0.4s ease' }}>

      {/* Bienvenida */}
      <div>
        <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)' }}>
          Bienvenido, {usuario?.nombre?.split(' ')[0]} 👋
        </h2>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
          {rol === 'ADMIN' && 'Tenés acceso completo al sistema FERRED.'}
          {rol === 'CAJERO' && 'Módulo de ventas y punto de venta disponible.'}
          {rol === 'BODEGA' && 'Gestión de inventario y stock disponible.'}
        </p>
      </div>

      {/* Stats */}
      <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '16px' }}>
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

        {/* Accesos rápidos según rol */}
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '10px', padding: '20px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '16px' }}>Accesos Rápidos</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {rol !== 'CAJERO' && (
              <a href="/productos" style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                padding: '12px', borderRadius: '8px', textDecoration: 'none',
                background: 'var(--bg-elevated)', border: '1px solid var(--border)',
                color: 'var(--text-primary)', fontSize: '13px', fontWeight: 600,
                transition: 'border-color 0.15s',
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