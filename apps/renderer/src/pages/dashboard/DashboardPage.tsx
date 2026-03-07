import { Badge } from '../../components/ui';

const STATS = [
  { label: 'Ventas de Hoy',     value: '$4,285.50', trend: '+12.5%',   color: 'var(--success)', icon: '💰' },
  { label: 'Productos Totales', value: '12,482',    trend: 'Total',    color: 'var(--accent)',  icon: '📦' },
  { label: 'Usuarios Activos',  value: '24',        trend: '● En línea', color: 'var(--success)', icon: '👥' },
  { label: 'Alertas de Stock',  value: '18 Items',  trend: 'Crítico',  color: 'var(--danger)',  icon: '⚠️' },
];

const RECENT_ACTIVITY = [
  { user: 'JD', name: 'Juan Delgado',  accion: 'Nueva Venta',    color: 'var(--success)', modulo: 'Ventas POS',   hora: 'Hoy, 14:22' },
  { user: 'RP', name: 'Roberto Peña',  accion: 'Ajuste de Stock', color: 'var(--accent)',  modulo: 'Inventario',   hora: 'Hoy, 13:45' },
  { user: 'LG', name: 'Lucía Gómez',   accion: 'Login Sistema',   color: 'var(--neutral)', modulo: 'Acceso',       hora: 'Hoy, 09:00' },
];

const TOP_PRODUCTS = [
  { nombre: 'Martillo Galpón 16oz',   precio: '$14.50',  stock: 'En Stock',  stockColor: 'var(--success)' },
  { nombre: 'Taladro Percutor 20V',   precio: '$129.00', stock: 'Stock Bajo', stockColor: 'var(--warning)' },
  { nombre: 'Pintura Latex Blanca 1G', precio: '$22.90', stock: 'En Stock',  stockColor: 'var(--success)' },
];

const DAYS = ['LUN', 'MAR', 'MIE', 'JUE', 'VIE', 'SAB', 'DOM'];
const BARS = [42, 65, 38, 72, 55, 88, 60];

export default function DashboardPage() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', animation: 'fadeUp 0.4s ease' }}>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '16px' }}>
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
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '16px' }}>
        {/* Bar chart */}
        <div style={{
          background: 'var(--bg-surface)', border: '1px solid var(--border)',
          borderRadius: '10px', padding: '24px',
        }}>
          <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>Tendencia de Ventas</h3>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '3px' }}>Ingresos semanales proyectados</p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--accent)' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent)', display: 'inline-block' }} />
              Ventas
            </div>
          </div>

          {/* Simple bar chart */}
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '12px', height: '160px' }}>
            {BARS.map((h, i) => (
              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', height: '100%', justifyContent: 'flex-end' }}>
                <div style={{
                  width: '100%',
                  height: `${h}%`,
                  background: i === 5 ? 'var(--accent)' : 'rgba(59,130,246,0.25)',
                  borderRadius: '4px 4px 0 0',
                  transition: 'height 0.3s ease',
                }} />
                <span style={{ fontSize: '9px', color: 'var(--text-subtle)', letterSpacing: '0.05em' }}>{DAYS[i]}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Top products */}
        <div style={{
          background: 'var(--bg-surface)', border: '1px solid var(--border)',
          borderRadius: '10px', padding: '20px',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>Productos Top</h3>
            <button style={{ fontSize: '11px', color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer' }}>Ver Todo</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {TOP_PRODUCTS.map(p => (
              <div key={p.nombre} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '36px', height: '36px', borderRadius: '8px',
                  background: 'var(--bg-elevated)', border: '1px solid var(--border)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', flexShrink: 0,
                }}>🔧</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.nombre}</div>
                  <div style={{ fontSize: '11px', color: p.stockColor, fontWeight: 600, marginTop: '2px' }}>{p.stock}</div>
                </div>
                <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'JetBrains Mono, monospace', flexShrink: 0 }}>{p.precio}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent activity */}
      <div style={{
        background: 'var(--bg-surface)', border: '1px solid var(--border)',
        borderRadius: '10px', overflow: 'hidden',
      }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>Actividad Reciente</h3>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>🕐 Últimas 24 horas</span>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'rgba(255,255,255,0.02)' }}>
              {['USUARIO', 'ACCIÓN', 'MÓDULO', 'FECHA/HORA'].map(h => (
                <th key={h} style={{ padding: '10px 20px', textAlign: 'left', fontSize: '10px', fontWeight: 600, color: 'var(--text-subtle)', letterSpacing: '0.08em' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {RECENT_ACTIVITY.map((r, i) => (
              <tr key={i} style={{ borderTop: '1px solid var(--border)' }}>
                <td style={{ padding: '12px 20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{
                      width: '30px', height: '30px', borderRadius: '50%',
                      background: 'linear-gradient(135deg, var(--accent), var(--success))',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '10px', fontWeight: 700, color: '#fff',
                    }}>{r.user}</div>
                    <span style={{ fontSize: '13px', color: 'var(--text-primary)' }}>{r.name}</span>
                  </div>
                </td>
                <td style={{ padding: '12px 20px' }}>
                  <span style={{ padding: '3px 10px', borderRadius: '4px', fontSize: '11px', fontWeight: 600, background: `${r.color}20`, color: r.color }}>
                    {r.accion}
                  </span>
                </td>
                <td style={{ padding: '12px 20px', fontSize: '12px', color: 'var(--text-muted)' }}>{r.modulo}</td>
                <td style={{ padding: '12px 20px', fontSize: '12px', color: 'var(--text-muted)' }}>{r.hora}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}