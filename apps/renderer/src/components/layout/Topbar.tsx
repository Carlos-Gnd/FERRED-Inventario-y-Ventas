import { useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore }    from '../../store/authStore';
import { useThemeStore }   from '../../store/themeStore';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';

const PAGE_TITLES: Record<string, { title: string; subtitle: string }> = {
  '/dashboard':  { title: 'Resumen General',      subtitle: 'Dashboard' },
  '/usuarios':   { title: 'Gestión de Usuarios',  subtitle: 'Panel de Control' },
  '/categorias': { title: 'Panel de Categorías',  subtitle: 'Panel de Control' },
  '/productos':  { title: 'Control de Productos', subtitle: 'Panel de Control' },
  '/ventas':     { title: 'Ventas / POS',         subtitle: 'Panel de Control' },
  '/reportes':   { title: 'Reportes',             subtitle: 'Panel de Control' },
  '/ajustes':    { title: 'Ajustes',              subtitle: 'Panel de Control' },
};

interface Props { onMenuClick?: () => void; }

export function Topbar({ onMenuClick }: Props) {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuthStore();
  const { isDark, toggleTheme } = useThemeStore();
  const { isOnline } = useNetworkStatus();

  const pageInfo = PAGE_TITLES[location.pathname] ?? { title: 'FERRED', subtitle: '' };

  function handleLogout() { logout(); navigate('/login'); }

  return (
    <header style={{
      height: '56px', display: 'flex', alignItems: 'center',
      padding: '0 16px', background: 'var(--bg-surface)',
      borderBottom: '1px solid var(--border)', gap: '12px', flexShrink: 0,
    }}>
      {/* Hamburger — solo móvil */}
      <button
        onClick={onMenuClick}
        className="hamburger-btn"
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: 'var(--text-muted)', padding: '6px', borderRadius: '6px',
          display: 'none', alignItems: 'center',
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
        </svg>
      </button>

      {/* Page title */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <h1 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {pageInfo.title}
        </h1>
        {pageInfo.subtitle && (
          <span style={{ fontSize: '10px', color: 'var(--text-subtle)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            {pageInfo.subtitle}
          </span>
        )}
      </div>

      {/* Connection dot */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
        <span style={{
          width: '7px', height: '7px', borderRadius: '50%',
          background: isOnline ? 'var(--success)' : 'var(--warning)',
        }} />
        <span className="hide-xs" style={{ fontSize: '11px', color: 'var(--text-subtle)' }}>
          {isOnline ? 'En línea' : 'Sin conexión'}
        </span>
      </div>

      {/* Theme toggle */}
      <button
        onClick={toggleTheme}
        title={isDark ? 'Modo claro' : 'Modo oscuro'}
        style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          padding: '6px 10px', background: 'var(--bg-base)',
          border: '1px solid var(--border)', borderRadius: '20px',
          color: 'var(--text-muted)', fontSize: '11px', fontWeight: 600,
          cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0,
        }}
      >
        <span style={{ fontSize: '13px' }}>{isDark ? '☀️' : '🌙'}</span>
        <span className="hide-sm">{isDark ? 'Modo claro' : 'Modo oscuro'}</span>
      </button>

      {/* Logout */}
      <button
        onClick={handleLogout}
        style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          background: 'none', border: '1px solid var(--border)',
          borderRadius: '6px', padding: '6px 10px',
          color: 'var(--text-muted)', cursor: 'pointer',
          fontSize: '12px', fontWeight: 500, fontFamily: 'inherit',
          flexShrink: 0,
        }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--danger)'; e.currentTarget.style.color = 'var(--danger)'; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-muted)'; }}
      >
        <span className="hide-sm">Cerrar Sesión</span>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
          <polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
        </svg>
      </button>
    </header>
  );
}