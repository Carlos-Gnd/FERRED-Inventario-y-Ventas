import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import type { UserRole } from '../../types';
import {
  IcoDashboard, IcoInventory, IcoSales, IcoUsers, IcoCategories,
  IcoReports, IcoSettings, IcoLogout, IcoMore, IcoCaja,
} from '../icons';

interface NavItem {
  label: string;
  to: string;
  icon: React.ReactNode;
  roles: UserRole[];
}

const ALL_ITEMS: NavItem[] = [
  { label: 'Inicio',     to: '/dashboard',  icon: <IcoDashboard  size={22} />, roles: ['ADMIN', 'CAJERO', 'BODEGA'] },
  { label: 'Productos',  to: '/productos',  icon: <IcoInventory  size={22} />, roles: ['ADMIN', 'BODEGA'] },
  { label: 'Ventas',     to: '/ventas',     icon: <IcoSales      size={22} />, roles: ['ADMIN', 'CAJERO'] },
  { label: 'Caja',       to: '/caja',       icon: <IcoCaja       size={22} />, roles: ['ADMIN', 'CAJERO'] },
  { label: 'Usuarios',   to: '/usuarios',   icon: <IcoUsers      size={22} />, roles: ['ADMIN'] },
  { label: 'Categorias', to: '/categorias', icon: <IcoCategories size={22} />, roles: ['ADMIN'] },
  { label: 'Reportes',   to: '/reportes',   icon: <IcoReports    size={22} />, roles: ['ADMIN', 'BODEGA'] },
  { label: 'Historial',   to: '/historial-recepciones', icon: <IcoReports size={22} />, roles: ['ADMIN', 'BODEGA'] },
];

interface BottomNavProps {
  hasActiveAlerts?: boolean;
}

export function BottomNav({ hasActiveAlerts = false }: BottomNavProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { usuario, logout } = useAuthStore();
  const rol = (usuario?.rol ?? 'CAJERO') as UserRole;
  const [menuOpen, setMenuOpen] = useState(false);

  const visibleItems = ALL_ITEMS.filter((item) => item.roles.includes(rol));
  const items      = visibleItems.slice(0, 4);
  const extraItems = visibleItems.slice(4);

  function isActive(to: string) {
    return location.pathname === to || location.pathname.startsWith(`${to}/`);
  }

  function handleLogout() {
    setMenuOpen(false);
    logout();
    navigate('/login');
  }

  return (
    <>
      {menuOpen && (
        <div
          onClick={() => setMenuOpen(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 98,
            background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(2px)',
          }}
        />
      )}

      {menuOpen && (
        <div
          style={{
            position: 'fixed', bottom: '72px', right: '12px', zIndex: 99,
            background: 'var(--bg-surface)', border: '1px solid var(--border)',
            borderRadius: '12px', padding: '8px', minWidth: '180px',
            boxShadow: '0 -8px 32px rgba(0,0,0,0.4)', animation: 'fadeUp 0.18s ease',
          }}
        >
          <div
            style={{
              padding: '10px 12px', borderBottom: '1px solid var(--border)', marginBottom: '6px',
            }}
          >
            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
              {usuario?.nombre ?? 'Usuario'}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
              {usuario?.rol ?? ''}
            </div>
          </div>

          {/* DT-15: reemplazados onMouseEnter/onMouseLeave por clase .menu-item */}
          {extraItems.map((item) => (
            <button
              key={item.to}
              className="menu-item"
              onClick={() => { navigate(item.to); setMenuOpen(false); }}
            >
              <span style={{ color: 'var(--text-muted)' }}>{item.icon}</span>
              {item.label}
            </button>
          ))}

          <button
            className="menu-item"
            onClick={() => { navigate('/ajustes'); setMenuOpen(false); }}
          >
            <span style={{ color: 'var(--text-muted)' }}><IcoSettings size={17} /></span>
            Ajustes
          </button>

          <button className="menu-item menu-item--danger" onClick={handleLogout}>
            <IcoLogout size={17} />
            Cerrar sesion
          </button>
        </div>
      )}

      <nav
        style={{
          display: 'none',
          position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 100,
          background: 'var(--bg-surface)', borderTop: '1px solid var(--border)',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
        className="bottom-nav"
      >
        {items.map((item) => {
          const active = isActive(item.to);
          return (
            <button
              key={item.label}
              onClick={() => navigate(item.to)}
              style={{
                flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
                justifyContent: 'center', gap: '4px', padding: '10px 4px',
                background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              <div
                style={{
                  position: 'relative', width: '44px', height: '28px', borderRadius: '14px',
                  background: active ? 'var(--accent)' : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'background 0.2s ease',
                }}
              >
                <span style={{ color: active ? '#fff' : 'var(--text-subtle)', display: 'flex' }}>
                  {item.icon}
                </span>
                {item.to === '/dashboard' && hasActiveAlerts && (
                  <span
                    title="Hay alertas activas"
                    style={{
                      position: 'absolute', top: '-2px', right: '2px',
                      width: '9px', height: '9px', borderRadius: '50%',
                      background: 'var(--danger)',
                      boxShadow: '0 0 0 3px rgba(239,68,68,0.16)',
                      animation: 'pulse 1s infinite',
                    }}
                  />
                )}
              </div>
              <span style={{ fontSize: '10px', fontWeight: active ? 600 : 400, color: active ? 'var(--text-primary)' : 'var(--text-subtle)' }}>
                {item.label}
              </span>
            </button>
          );
        })}

        <button
          onClick={() => setMenuOpen((open) => !open)}
          style={{
            flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', gap: '4px', padding: '10px 4px',
            background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          <div
            style={{
              width: '44px', height: '28px', borderRadius: '14px',
              background: menuOpen ? 'var(--bg-elevated)' : 'transparent',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'background 0.2s ease',
            }}
          >
            <span style={{ color: menuOpen ? 'var(--text-primary)' : 'var(--text-subtle)', display: 'flex' }}>
              <IcoMore size={22} />
            </span>
          </div>
          <span style={{ fontSize: '10px', fontWeight: menuOpen ? 600 : 400, color: menuOpen ? 'var(--text-primary)' : 'var(--text-subtle)' }}>
            Mas
          </span>
        </button>
      </nav>
    </>
  );
}
