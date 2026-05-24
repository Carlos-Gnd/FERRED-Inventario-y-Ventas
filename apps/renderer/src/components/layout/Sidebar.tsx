import { NavLink, useLocation, useNavigate } from 'react-router-dom';
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

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard',     to: '/dashboard',     icon: <IcoDashboard />,   roles: ['ADMIN', 'CAJERO', 'BODEGA'] },
  { label: 'Productos',     to: '/productos',     icon: <IcoInventory />,   roles: ['ADMIN', 'BODEGA'] },
  { label: 'Stock',         to: '/stock',         icon: <IcoStock />,       roles: ['ADMIN', 'BODEGA'] },
  { label: 'Recepcion',     to: '/recepcion',     icon: <IcoInventory />,   roles: ['ADMIN', 'BODEGA'] },
  { label: 'Historial recepciones', to: '/historial-recepciones', icon: <IcoReports />, roles: ['ADMIN', 'BODEGA'] },
  { label: 'Transferencias',to: '/transferencias',icon: <IcoTransfer />,    roles: ['ADMIN'] },
  { label: 'Ventas',        to: '/ventas',        icon: <IcoSales />,       roles: ['ADMIN', 'CAJERO'] },
  { label: 'Caja',           to: '/caja',           icon: <IcoCaja />,       roles: ['ADMIN', 'CAJERO'] },
  { label: 'Categorias',    to: '/categorias',    icon: <IcoCategories />,  roles: ['ADMIN'] },
  { label: 'Ofertas',       to: '/ofertas',       icon: <IcoReports />,     roles: ['ADMIN'] },
  { label: 'Usuarios',      to: '/usuarios',      icon: <IcoUsers />,       roles: ['ADMIN'] },
  { label: 'Pedidos Online', to: '/pedidos-online', icon: <IcoOrders />,     roles: ['ADMIN', 'BODEGA'] },
  { label: 'Reportes',      to: '/reportes',      icon: <IcoReports />,     roles: ['ADMIN', 'BODEGA'] },
  { label: 'Ajustes',       to: '/ajustes',       icon: <IcoSettings />,    roles: ['ADMIN'] },
];

interface Props {
  onClose?: () => void;
  hasActiveAlerts?: boolean;
}

export function Sidebar({ onClose, hasActiveAlerts = false }: Props) {
  const location = useLocation();
  const navigate = useNavigate();
  const { usuario, logout } = useAuthStore();
  const rol = (usuario?.rol ?? 'CAJERO') as UserRole;
  const isReceptionHistoryRoute = location.pathname === '/historial-recepciones';
  const visibleItems = NAV_ITEMS.filter((item) => item.roles.includes(rol));

  function getInitials(name: string) {
    return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase() ?? '').join('');
  }

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <aside
      style={{
        width: isReceptionHistoryRoute ? '194px' : '210px',
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        background: isReceptionHistoryRoute
          ? 'color-mix(in srgb, var(--bg-surface) 92%, var(--bg-base) 8%)'
          : 'var(--bg-surface)',
        borderRight: isReceptionHistoryRoute ? 'none' : '1px solid var(--border)',
        height: '100%',
      }}
    >
      <div
        style={{
          padding: isReceptionHistoryRoute ? '28px 28px 24px' : '20px 16px 16px',
          borderBottom: isReceptionHistoryRoute ? 'none' : '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
        }}
      >
        {!isReceptionHistoryRoute && (
          <div
            style={{
              width: '36px',
              height: '36px',
              background: 'linear-gradient(135deg, var(--accent), var(--accent-hover))',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
            }}
          >
            <IcoSettings />
          </div>
        )}

        <div style={{ flex: 1 }}>
          <div
            style={{
              fontWeight: 800,
              fontSize: isReceptionHistoryRoute ? '15px' : '13px',
              letterSpacing: isReceptionHistoryRoute ? '0.02em' : '0.12em',
              color: 'var(--accent)',
            }}
          >
            FERRED
          </div>
          <div
            style={{
              fontSize: '10px',
              color: 'var(--text-subtle)',
              marginTop: isReceptionHistoryRoute ? '3px' : '1px',
              letterSpacing: isReceptionHistoryRoute ? '0.18em' : 'normal',
              textTransform: isReceptionHistoryRoute ? 'uppercase' : 'none',
            }}
          >
            {isReceptionHistoryRoute ? 'Industrial Atelier' : 'Panel de Control'}
          </div>
        </div>

        {onClose && (
          <button
            onClick={onClose}
            className="sidebar-close-btn"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-muted)',
              padding: '4px',
              borderRadius: '4px',
            }}
          >
            <IcoClose />
          </button>
        )}
      </div>

      {!isReceptionHistoryRoute && (
        <div style={{ padding: '10px 16px 6px' }}>
          <span
            style={{
              fontSize: '9px',
              fontWeight: 700,
              letterSpacing: '0.12em',
              color: rol === 'ADMIN' ? 'var(--accent)' : rol === 'CAJERO' ? 'var(--success)' : 'var(--warning)',
              background: rol === 'ADMIN' ? 'var(--accent-glow)' : 'rgba(34,197,94,0.1)',
              padding: '3px 8px',
              borderRadius: '4px',
            }}
          >
            {rol}
          </span>
        </div>
      )}

      <nav
        style={{
          flex: 1,
          padding: isReceptionHistoryRoute ? '8px 8px 20px 20px' : '8px 8px',
          overflowY: 'auto',
        }}
      >
        {visibleItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={onClose}
            style={({ isActive }) => ({
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: isReceptionHistoryRoute ? '11px 14px' : '9px 12px',
              borderRadius: isReceptionHistoryRoute ? '0 8px 8px 0' : '7px',
              marginBottom: isReceptionHistoryRoute ? '4px' : '2px',
              textDecoration: 'none',
              fontSize: '13px',
              fontWeight: isActive ? 700 : 500,
              color: isActive ? 'var(--accent)' : 'var(--text-muted)',
              background: isActive
                ? isReceptionHistoryRoute
                  ? 'color-mix(in srgb, var(--accent) 12%, transparent)'
                  : 'var(--accent-glow)'
                : 'transparent',
              borderLeft: isReceptionHistoryRoute ? 'none' : `2px solid ${isActive ? 'var(--accent)' : 'transparent'}`,
              borderRight: isReceptionHistoryRoute ? `3px solid ${isActive ? 'var(--accent)' : 'transparent'}` : 'none',
              transition: 'all 0.15s ease',
            })}
          >
            {item.icon}
            <span style={{ flex: 1 }}>{item.label}</span>
            {item.to === '/dashboard' && hasActiveAlerts && !isReceptionHistoryRoute && (
              <span
                title="Hay alertas activas"
                style={{
                  width: '10px',
                  height: '10px',
                  borderRadius: '50%',
                  background: 'var(--danger)',
                  boxShadow: '0 0 0 4px rgba(239,68,68,0.16)',
                  animation: 'pulse 1s infinite',
                  flexShrink: 0,
                }}
              />
            )}
            {item.badge && !isReceptionHistoryRoute && (
              <span
                style={{
                  fontSize: '9px',
                  fontWeight: 600,
                  padding: '2px 6px',
                  borderRadius: '4px',
                  background: 'var(--warning)',
                  color: '#000',
                  letterSpacing: '0.04em',
                }}
              >
                {item.badge}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      {isReceptionHistoryRoute ? (
        <div style={{ padding: '16px 24px 24px', marginTop: 'auto' }}>
          <button
            onClick={handleLogout}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              background: 'none',
              border: 'none',
              borderTop: '1px solid var(--border)',
              padding: '18px 0 0',
              cursor: 'pointer',
              color: 'var(--text-muted)',
              font: 'inherit',
              textAlign: 'left',
            }}
          >
            <IcoLogout size={14} />
            <span>Sign Out</span>
          </button>
        </div>
      ) : (
        <div
          style={{
            padding: '12px 16px',
            borderTop: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--accent), var(--success))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '11px',
              fontWeight: 700,
              color: '#fff',
              flexShrink: 0,
            }}
          >
            {usuario?.nombre ? getInitials(usuario.nombre) : 'U'}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: '12px',
                fontWeight: 600,
                color: 'var(--text-primary)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {usuario?.nombre ?? 'Usuario'}
            </div>
            <div style={{ fontSize: '10px', color: 'var(--text-subtle)', marginTop: '1px' }}>{rol}</div>
          </div>
          {/* DT-15: reemplazado onMouseEnter/onMouseLeave por clase CSS .btn-logout */}
          <button onClick={handleLogout} title="Cerrar sesion" className="btn-logout">
            <IcoLogout size={14} />
          </button>
        </div>
      )}
    </aside>
  );
}
