import { NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import type { UserRole } from '../../types';

const IcoDashboard = () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>);
const IcoInventory = () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>);
const IcoSales = () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/></svg>);
const IcoUsers = () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>);
const IcoCategories = () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 6h16M4 10h16M4 14h16M4 18h16"/></svg>);
const IcoReports = () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19h16v1.8H4V19Zm2-2V9h2v8H6Zm5 0V4h2v13h-2Zm5 0v-6h2v6h-2Z"/></svg>);
const IcoSettings = () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>);
const IcoTransfer = () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m15 7 5 5-5 5"/><path d="M19 12H5"/><path d="m9 7-5 5 5 5"/></svg>);
const IcoWrench = () => (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>);
const IcoClose = () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>);

interface NavItem { label: string; to: string; icon: React.ReactNode; roles: UserRole[]; badge?: string; }

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard',       to: '/dashboard',       icon: <IcoDashboard />,   roles: ['ADMIN', 'CAJERO', 'BODEGA'] },
  { label: 'Productos',       to: '/productos',       icon: <IcoInventory />,   roles: ['ADMIN', 'BODEGA'] },
  { label: 'Transferencias',  to: '/transferencias',  icon: <IcoTransfer />,    roles: ['ADMIN'] },
  { label: 'Ventas',          to: '/ventas',          icon: <IcoSales />,       roles: ['ADMIN', 'CAJERO'], badge: 'Pronto' },
  { label: 'Categorías',      to: '/categorias',      icon: <IcoCategories />,  roles: ['ADMIN'] },
  { label: 'Usuarios',        to: '/usuarios',        icon: <IcoUsers />,       roles: ['ADMIN'] },
  { label: 'Reportes',        to: '/reportes',        icon: <IcoReports />,     roles: ['ADMIN'], badge: 'Pronto' },
  { label: 'Ajustes',         to: '/ajustes',         icon: <IcoSettings />,    roles: ['ADMIN'], badge: 'Pronto' },
];

interface Props {
  onClose?: () => void;
  hasActiveAlerts?: boolean;
}

export function Sidebar({ onClose, hasActiveAlerts = false }: Props) {
  const navigate = useNavigate();
  const { usuario, logout } = useAuthStore();
  const rol = (usuario?.rol ?? 'CAJERO') as UserRole;
  const visibleItems = NAV_ITEMS.filter(item => item.roles.includes(rol));

  function getInitials(name: string) {
    return name.trim().split(/\s+/).slice(0, 2).map(p => p[0]?.toUpperCase() ?? '').join('');
  }

  function handleLogout() { logout(); navigate('/login'); }

  return (
    <aside style={{
      width: '210px', flexShrink: 0, display: 'flex', flexDirection: 'column',
      background: 'var(--bg-surface)', borderRight: '1px solid var(--border)',
      height: '100%',
    }}>
      {/* Brand */}
      <div style={{
        padding: '20px 16px 16px', borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', gap: '10px',
      }}>
        <div style={{
          width: '36px', height: '36px',
          background: 'linear-gradient(135deg, var(--accent), var(--accent-hover))',
          borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
        }}>
          <IcoWrench />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: '13px', letterSpacing: '0.12em', color: 'var(--text-primary)' }}>FERRED</div>
          <div style={{ fontSize: '10px', color: 'var(--text-subtle)', marginTop: '1px' }}>Panel de Control</div>
        </div>
        {onClose && (
          <button onClick={onClose} className="sidebar-close-btn" style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--text-muted)', padding: '4px', borderRadius: '4px',
          }}>
            <IcoClose />
          </button>
        )}
      </div>

      {/* Role badge */}
      <div style={{ padding: '10px 16px 6px' }}>
        <span style={{
          fontSize: '9px', fontWeight: 700, letterSpacing: '0.12em',
          color: rol === 'ADMIN' ? 'var(--accent)' : rol === 'CAJERO' ? 'var(--success)' : 'var(--warning)',
          background: rol === 'ADMIN' ? 'var(--accent-glow)' : 'rgba(34,197,94,0.1)',
          padding: '3px 8px', borderRadius: '4px',
        }}>
          {rol}
        </span>
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, padding: '8px 8px', overflowY: 'auto' }}>
        {visibleItems.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={onClose}
            style={({ isActive }) => ({
              display: 'flex', alignItems: 'center', gap: '10px',
              padding: '9px 12px', borderRadius: '7px', marginBottom: '2px',
              textDecoration: 'none', fontSize: '13px',
              fontWeight: isActive ? 600 : 400,
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
            {item.badge && (
              <span style={{
                fontSize: '9px', fontWeight: 600, padding: '2px 6px',
                borderRadius: '4px', background: 'var(--warning)', color: '#000',
                letterSpacing: '0.04em',
              }}>{item.badge}</span>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User info + logout */}
      <div style={{
        padding: '12px 16px', borderTop: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', gap: '10px',
      }}>
        <div style={{
          width: '32px', height: '32px', borderRadius: '50%',
          background: 'linear-gradient(135deg, var(--accent), var(--success))',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '11px', fontWeight: 700, color: '#fff', flexShrink: 0,
        }}>
          {usuario?.nombre ? getInitials(usuario.nombre) : 'U'}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {usuario?.nombre ?? 'Usuario'}
          </div>
          <div style={{ fontSize: '10px', color: 'var(--text-subtle)', marginTop: '1px' }}>{rol}</div>
        </div>
        <button onClick={handleLogout} title="Cerrar sesión" style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: 'var(--text-subtle)', padding: '4px', borderRadius: '4px',
          transition: 'color 0.15s', display: 'flex', alignItems: 'center',
        }}
          onMouseEnter={e => (e.currentTarget.style.color = 'var(--danger)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-subtle)')}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
            <polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
        </button>
      </div>
    </aside>
  );
}
