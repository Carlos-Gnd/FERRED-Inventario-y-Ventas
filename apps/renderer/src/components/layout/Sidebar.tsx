import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import type { UserRole } from '../../types';
import {
  IcoDashboard, IcoInventory, IcoSales, IcoUsers, IcoCategories,
  IcoCaja,
  IcoReports, IcoSettings, IcoTransfer, IcoStock, IcoClose, IcoLogout,
  IcoOrders,
} from '../icons';

interface NavItem {
  label: string;
  to: string;
  icon: React.ReactNode;
  roles: UserRole[];
  badge?: string;
}

interface NavGroup {
  // null = ítem(s) sueltos sin encabezado de grupo (ej. Dashboard).
  label: string | null;
  icon?: React.ReactNode;
  items: NavItem[];
}

const R_ALL: UserRole[] = ['ADMIN', 'CAJERO', 'BODEGA'];

// Menú agrupado por funcionalidad (acordeón).
const NAV_GROUPS: NavGroup[] = [
  {
    label: null,
    items: [
      { label: 'Dashboard', to: '/dashboard', icon: <IcoDashboard />, roles: R_ALL },
    ],
  },
  {
    label: 'Inventario',
    icon: <IcoInventory />,
    items: [
      { label: 'Productos',             to: '/productos',             icon: <IcoInventory />,  roles: ['ADMIN', 'BODEGA'] },
      { label: 'Stock',                 to: '/stock',                 icon: <IcoStock />,      roles: ['ADMIN', 'BODEGA'] },
      { label: 'Kardex',                to: '/kardex',                icon: <IcoReports />,    roles: ['ADMIN', 'BODEGA'] },
      { label: 'Recepción',             to: '/recepcion',             icon: <IcoInventory />,  roles: ['ADMIN', 'BODEGA'] },
      { label: 'Historial recepciones', to: '/historial-recepciones', icon: <IcoReports />,    roles: ['ADMIN', 'BODEGA'] },
      { label: 'Transferencias',        to: '/transferencias',        icon: <IcoTransfer />,   roles: ['ADMIN'] },
      { label: 'Categorías',            to: '/categorias',            icon: <IcoCategories />, roles: ['ADMIN'] },
    ],
  },
  {
    label: 'Ventas',
    icon: <IcoSales />,
    items: [
      { label: 'Ventas',         to: '/ventas',         icon: <IcoSales />,   roles: ['ADMIN', 'CAJERO'] },
      { label: 'Caja',           to: '/caja',           icon: <IcoCaja />,    roles: ['ADMIN', 'CAJERO'] },
      { label: 'Devoluciones',   to: '/devoluciones',   icon: <IcoReports />, roles: ['ADMIN', 'CAJERO'] },
      { label: 'Ofertas',        to: '/ofertas',        icon: <IcoReports />, roles: ['ADMIN'] },
      { label: 'Pedidos Online', to: '/pedidos-online', icon: <IcoOrders />,  roles: ['ADMIN', 'BODEGA'] },
    ],
  },
  {
    label: 'Administración',
    icon: <IcoSettings />,
    items: [
      { label: 'Usuarios', to: '/usuarios', icon: <IcoUsers />,    roles: ['ADMIN'] },
      { label: 'Gastos',   to: '/gastos',   icon: <IcoReports />,  roles: ['ADMIN'] },
      { label: 'Reportes', to: '/reportes', icon: <IcoReports />,  roles: ['ADMIN', 'BODEGA'] },
      { label: 'Ajustes',  to: '/ajustes',  icon: <IcoSettings />, roles: ['ADMIN'] },
    ],
  },
];

interface Props {
  onClose?: () => void;
  hasActiveAlerts?: boolean;
}

export function Sidebar({ onClose, hasActiveAlerts = false }: Props) {
  const navigate = useNavigate();
  const { usuario, logout } = useAuthStore();
  const rol = (usuario?.rol ?? 'CAJERO') as UserRole;

  // Grupos visibles para el rol (se ocultan los que quedan sin ítems).
  const visibleGroups = NAV_GROUPS
    .map((g) => ({ ...g, items: g.items.filter((i) => i.roles.includes(rol)) }))
    .filter((g) => g.items.length > 0);

  // Acordeón: todos los grupos abiertos por defecto; el usuario colapsa los que quiera.
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const toggleGroup = (label: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      next.has(label) ? next.delete(label) : next.add(label);
      return next;
    });

  function getInitials(name: string) {
    return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase() ?? '').join('');
  }

  function handleLogout() {
    logout();
    navigate('/login');
  }

  const renderItem = (item: NavItem) => (
    <NavLink
      key={item.to}
      to={item.to}
      onClick={onClose}
      style={({ isActive }) => ({
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '9px 12px',
        borderRadius: '7px',
        marginBottom: '2px',
        textDecoration: 'none',
        fontSize: '13px',
        fontWeight: isActive ? 700 : 500,
        color: isActive ? 'var(--accent)' : 'var(--text-muted)',
        background: isActive ? 'var(--accent-glow)' : 'transparent',
        borderLeft: `2px solid ${isActive ? 'var(--accent)' : 'transparent'}`,
        transition: 'all 0.15s ease',
      })}
    >
      {item.icon}
      <span style={{ flex: 1 }}>{item.label}</span>
      {item.to === '/dashboard' && hasActiveAlerts && (
        <span
          title="Hay alertas activas"
          style={{
            width: '10px', height: '10px', borderRadius: '50%',
            background: 'var(--danger)', boxShadow: '0 0 0 4px rgba(239,68,68,0.16)',
            animation: 'pulse 1s infinite', flexShrink: 0,
          }}
        />
      )}
      {item.badge && (
        <span style={{ fontSize: '9px', fontWeight: 600, padding: '2px 6px', borderRadius: '4px', background: 'var(--warning)', color: '#000', letterSpacing: '0.04em' }}>
          {item.badge}
        </span>
      )}
    </NavLink>
  );

  return (
    <aside
      style={{
        width: '210px',
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--bg-surface)',
        borderRight: '1px solid var(--border)',
        height: '100%',
      }}
    >
      {/* Logo */}
      <div style={{ padding: '20px 16px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div
          style={{
            width: '36px', height: '36px',
            background: 'linear-gradient(135deg, var(--accent), var(--accent-hover))',
            borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
          }}
        >
          <IcoSettings />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 800, fontSize: '13px', letterSpacing: '0.12em', color: 'var(--accent)' }}>FERRED</div>
          <div style={{ fontSize: '10px', color: 'var(--text-subtle)', marginTop: '1px' }}>Panel de Control</div>
        </div>
        {onClose && (
          <button onClick={onClose} className="sidebar-close-btn" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '4px', borderRadius: '4px' }}>
            <IcoClose />
          </button>
        )}
      </div>

      {/* Badge de rol */}
      <div style={{ padding: '10px 16px 6px' }}>
        <span
          style={{
            fontSize: '9px', fontWeight: 700, letterSpacing: '0.12em',
            color: rol === 'ADMIN' ? 'var(--accent)' : rol === 'CAJERO' ? 'var(--success)' : 'var(--warning)',
            background: rol === 'ADMIN' ? 'var(--accent-glow)' : 'rgba(34,197,94,0.1)',
            padding: '3px 8px', borderRadius: '4px',
          }}
        >
          {rol}
        </span>
      </div>

      {/* Navegación agrupada (acordeón) */}
      <nav style={{ flex: 1, padding: '8px 8px', overflowY: 'auto' }}>
        {visibleGroups.map((group, idx) => {
          if (!group.label) {
            // Ítems sueltos (Dashboard): mismo look que los encabezados de grupo
            // (ícono de acento + texto en negrita mayúscula), pero como enlace con estado activo.
            return (
              <div key={`g-${idx}`} style={{ marginBottom: '6px' }}>
                {group.items.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={onClose}
                    style={({ isActive }) => ({
                      display: 'flex', alignItems: 'center', gap: '10px',
                      padding: '9px 12px', marginBottom: '2px', borderRadius: '7px',
                      textDecoration: 'none', fontSize: '12px', fontWeight: 800,
                      letterSpacing: '0.06em', textTransform: 'uppercase',
                      color: isActive ? 'var(--accent)' : 'var(--text-primary)',
                      background: isActive ? 'var(--accent-glow)' : 'transparent',
                    })}
                  >
                    <span style={{ display: 'inline-flex', color: 'var(--accent)' }}>{item.icon}</span>
                    <span style={{ flex: 1, textAlign: 'left' }}>{item.label}</span>
                    {item.to === '/dashboard' && hasActiveAlerts && (
                      <span
                        title="Hay alertas activas"
                        style={{
                          width: '10px', height: '10px', borderRadius: '50%',
                          background: 'var(--danger)', boxShadow: '0 0 0 4px rgba(239,68,68,0.16)',
                          animation: 'pulse 1s infinite', flexShrink: 0,
                        }}
                      />
                    )}
                  </NavLink>
                ))}
              </div>
            );
          }
          const isCollapsed = collapsed.has(group.label);
          return (
            <div key={group.label} style={{ marginBottom: '6px' }}>
              <button
                onClick={() => toggleGroup(group.label!)}
                aria-expanded={!isCollapsed}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: '10px',
                  padding: '9px 12px', marginBottom: '2px', background: 'none', border: 'none', cursor: 'pointer',
                  borderRadius: '7px', fontFamily: 'inherit', fontSize: '12px', fontWeight: 800,
                  letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-primary)',
                }}
              >
                <span style={{ display: 'inline-flex', color: 'var(--accent)' }}>{group.icon}</span>
                <span style={{ flex: 1, textAlign: 'left' }}>{group.label}</span>
                <span style={{ display: 'inline-flex', color: 'var(--text-muted)', transition: 'transform 0.15s ease', transform: isCollapsed ? 'rotate(-90deg)' : 'none' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
                </span>
              </button>
              {!isCollapsed && group.items.map(renderItem)}
            </div>
          );
        })}
      </nav>

      {/* Footer: usuario + logout */}
      <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--accent), var(--success))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700, color: '#fff', flexShrink: 0 }}>
          {usuario?.nombre ? getInitials(usuario.nombre) : 'U'}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {usuario?.nombre ?? 'Usuario'}
          </div>
          <div style={{ fontSize: '10px', color: 'var(--text-subtle)', marginTop: '1px' }}>{rol}</div>
        </div>
        {/* DT-15: estilos del botón en clase CSS .btn-logout */}
        <button onClick={handleLogout} title="Cerrar sesion" className="btn-logout">
          <IcoLogout size={14} />
        </button>
      </div>
    </aside>
  );
}
