import { useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore }   from '../../store/authStore';
import { useThemeStore }  from '../../store/themeStore';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';

const PAGE_TITLES: Record<string, { title: string; subtitle: string }> = {
  '/dashboard':  { title: 'Resumen General',       subtitle: 'Dashboard' },
  '/usuarios':   { title: 'Gestión de Usuarios',   subtitle: 'Panel de Control' },
  '/categorias': { title: 'Panel de Categorías',   subtitle: 'Panel de Control' },
  '/productos':  { title: 'Control de Productos',  subtitle: 'Panel de Control' },
  '/reportes':   { title: 'Reportes',              subtitle: 'Panel de Control' },
};

export function Topbar() {
  const location   = useLocation();
  const navigate   = useNavigate();
  const { logout } = useAuthStore();
  const { isDark, toggleTheme } = useThemeStore();
  const { isOnline } = useNetworkStatus();

  const pageInfo = PAGE_TITLES[location.pathname] ?? { title: 'FERRED', subtitle: '' };

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <header style={{
      height: '56px',
      display: 'flex',
      alignItems: 'center',
      padding: '0 24px',
      background: 'var(--bg-surface)',
      borderBottom: '1px solid var(--border)',
      gap: '16px',
      flexShrink: 0,
    }}>
      {/* Page title */}
      <div style={{ flex: 1 }}>
        <h1 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1 }}>
          {pageInfo.title}
        </h1>
        {pageInfo.subtitle && (
          <span style={{ fontSize: '10px', color: 'var(--text-subtle)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            {pageInfo.subtitle}
          </span>
        )}
      </div>

      {/* Connection dot */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <span style={{
          width: '7px', height: '7px', borderRadius: '50%',
          background: isOnline ? 'var(--success)' : 'var(--warning)',
          animation: isOnline ? 'none' : 'pulse-dot 1.5s ease infinite',
        }} />
        <span style={{ fontSize: '11px', color: 'var(--text-subtle)' }}>
          {isOnline ? 'En línea' : 'Sin conexión'}
        </span>
      </div>

      {/* Theme toggle */}
      <button
        onClick={toggleTheme}
        title={isDark ? 'Modo claro' : 'Modo oscuro'}
        style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          padding: '6px 12px',
          background: 'var(--bg-base)',
          border: '1px solid var(--border)',
          borderRadius: '20px',
          color: 'var(--text-muted)',
          fontSize: '11px', fontWeight: 600,
          cursor: 'pointer',
          fontFamily: 'inherit',
          transition: 'all 0.2s ease',
        }}
      >
        <span style={{ fontSize: '13px' }}>{isDark ? '☀️' : '🌙'}</span>
        {isDark ? 'Modo claro' : 'Modo oscuro'}
      </button>

      {/* Notifications bell */}
      <button
        title="Notificaciones"
        style={{
          background: 'none', border: 'none',
          color: 'var(--text-muted)', cursor: 'pointer',
          display: 'flex', alignItems: 'center', padding: '6px',
          borderRadius: '6px', position: 'relative',
          transition: 'color 0.15s',
        }}
        onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-primary)')}
        onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
        </svg>
      </button>

      {/* Logout */}
      <button
        onClick={handleLogout}
        style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          background: 'none', border: '1px solid var(--border)',
          borderRadius: '6px', padding: '6px 12px',
          color: 'var(--text-muted)', cursor: 'pointer',
          fontSize: '12px', fontWeight: 500,
          fontFamily: 'inherit',
          transition: 'all 0.15s',
        }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--danger)'; e.currentTarget.style.color = 'var(--danger)'; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-muted)'; }}
      >
        Cerrar Sesión
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
          <polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
        </svg>
      </button>
    </header>
  );
}