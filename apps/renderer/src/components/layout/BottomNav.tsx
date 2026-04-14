import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import type { UserRole } from '../../types';

const IcoDashboard  = () => (<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>);
const IcoProducts   = () => (<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>);
const IcoStock      = () => (<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3h18v4H3z"/><path d="M5 7v11a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7"/><path d="M9 12h6"/><path d="M12 9v6"/></svg>);
const IcoSales      = () => (<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/></svg>);
const IcoUsers      = () => (<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>);
const IcoCategories = () => (<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 6h16M4 10h16M4 14h16M4 18h16"/></svg>);
const IcoMore       = () => (<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/></svg>);
const IcoLogout     = () => (<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>);
const IcoSettings   = () => (<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>);

interface NavItem { label: string; to: string; icon: React.ReactNode; roles: UserRole[]; }

const ALL_ITEMS: NavItem[] = [
  { label: 'Inicio',     to: '/dashboard', icon: <IcoDashboard />,  roles: ['ADMIN','CAJERO','BODEGA'] },
  { label: 'Stock',      to: '/stock',     icon: <IcoStock />,      roles: ['ADMIN','BODEGA'] },
  { label: 'Productos',  to: '/productos', icon: <IcoProducts />,   roles: ['ADMIN','BODEGA'] },
  { label: 'Ventas',     to: '/ventas',    icon: <IcoSales />,      roles: ['ADMIN','CAJERO'] },
  { label: 'Usuarios',   to: '/usuarios',  icon: <IcoUsers />,      roles: ['ADMIN'] },
  { label: 'Categorías', to: '/categorias',icon: <IcoCategories />, roles: ['ADMIN'] },
];

export function BottomNav() {
  const location  = useLocation();
  const navigate  = useNavigate();
  const { usuario, logout } = useAuthStore();
  const rol = (usuario?.rol ?? 'CAJERO') as UserRole;
  const [menuOpen, setMenuOpen] = useState(false);

  const items = ALL_ITEMS.filter(i => i.roles.includes(rol)).slice(0, 4);

  function isActive(to: string) {
    return location.pathname === to || location.pathname.startsWith(to + '/');
  }

  function handleLogout() {
    setMenuOpen(false);
    logout();
    navigate('/login');
  }

  return (
    <>
      {/* Overlay para cerrar el menú al tocar fuera */}
      {menuOpen && (
        <div
          onClick={() => setMenuOpen(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 98,
            background: 'rgba(0,0,0,0.35)',
            backdropFilter: 'blur(2px)',
          }}
        />
      )}

      {/* Menú "Más" — popup hacia arriba */}
      {menuOpen && (
        <div style={{
          position: 'fixed',
          bottom: '72px',
          right: '12px',
          zIndex: 99,
          background: 'var(--bg-surface)',
          border: '1px solid var(--border)',
          borderRadius: '12px',
          padding: '8px',
          minWidth: '180px',
          boxShadow: '0 -8px 32px rgba(0,0,0,0.4)',
          animation: 'fadeUp 0.18s ease',
        }}>
          {/* Info del usuario */}
          <div style={{
            padding: '10px 12px 10px',
            borderBottom: '1px solid var(--border)',
            marginBottom: '6px',
          }}>
            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
              {usuario?.nombre ?? 'Usuario'}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
              {usuario?.rol ?? ''}
            </div>
          </div>

          {/* Ajustes */}
          <button
            onClick={() => { navigate('/ajustes'); setMenuOpen(false); }}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: '10px',
              padding: '10px 12px', borderRadius: '8px',
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--text-primary)', fontSize: '13px', fontFamily: 'inherit',
              textAlign: 'left',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'none')}
          >
            <span style={{ color: 'var(--text-muted)' }}><IcoSettings /></span>
            Ajustes
          </button>

          {/* Cerrar sesión */}
          <button
            onClick={handleLogout}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: '10px',
              padding: '10px 12px', borderRadius: '8px',
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--danger)', fontSize: '13px', fontFamily: 'inherit',
              textAlign: 'left',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.08)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'none')}
          >
            <IcoLogout />
            Cerrar sesión
          </button>
        </div>
      )}

      {/* Barra de navegación inferior */}
      <nav style={{
        display: 'none',
        position: 'fixed',
        bottom: 0, left: 0, right: 0,
        zIndex: 100,
        background: 'var(--bg-surface)',
        borderTop: '1px solid var(--border)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }} className="bottom-nav">

        {items.map(item => {
          const active = isActive(item.to);
          return (
            <button key={item.label} onClick={() => navigate(item.to)} style={{
              flex: 1, display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              gap: '4px', padding: '10px 4px',
              background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit',
            }}>
              <div style={{
                width: '44px', height: '28px', borderRadius: '14px',
                background: active ? 'var(--accent)' : 'transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'background 0.2s ease',
              }}>
                <span style={{ color: active ? '#fff' : 'var(--text-subtle)', display: 'flex' }}>
                  {item.icon}
                </span>
              </div>
              <span style={{
                fontSize: '10px', fontWeight: active ? 600 : 400,
                color: active ? 'var(--text-primary)' : 'var(--text-subtle)',
              }}>
                {item.label}
              </span>
            </button>
          );
        })}

        {/* Botón Más — abre menú, NO cierra sesión */}
        <button
          onClick={() => setMenuOpen(o => !o)}
          style={{
            flex: 1, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            gap: '4px', padding: '10px 4px',
            background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          <div style={{
            width: '44px', height: '28px', borderRadius: '14px',
            background: menuOpen ? 'var(--bg-elevated)' : 'transparent',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'background 0.2s ease',
          }}>
            <span style={{ color: menuOpen ? 'var(--text-primary)' : 'var(--text-subtle)', display: 'flex' }}>
              <IcoMore />
            </span>
          </div>
          <span style={{
            fontSize: '10px', fontWeight: menuOpen ? 600 : 400,
            color: menuOpen ? 'var(--text-primary)' : 'var(--text-subtle)',
          }}>
            Más
          </span>
        </button>
      </nav>
    </>
  );
}
