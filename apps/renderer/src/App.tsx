import { useEffect, useMemo, useRef, useState } from 'react';
import { useNetworkStatus } from './hooks/useNetworkStatus';
import { useThemeStore }    from './store/themeStore';
import { AppRouter }        from './router/AppRouter';

export default function App() {
  const { status }               = useNetworkStatus();
  const { isDark }               = useThemeStore();
  const [visible, setVisible]    = useState(false);
  const [bannerStatus, setBanner] = useState<'online' | 'offline' | null>(null);
  const firstRender              = useRef(true);

  // Aplica clase al <html> para CSS variables de tema
  useEffect(() => {
    document.documentElement.classList.toggle('theme-light', !isDark);
  }, [isDark]);

  // Banner de conexión
  useEffect(() => {
    if (firstRender.current) { firstRender.current = false; return; }
    if (status !== 'online' && status !== 'offline') return;

    const show = setTimeout(() => { setBanner(status); setVisible(true); }, 0);
    const hide = setTimeout(() => setVisible(false), 2500);
    return () => { clearTimeout(show); clearTimeout(hide); };
  }, [status]);

  const bannerLabel = useMemo(() => {
    if (bannerStatus === 'online')  return '✓ Conexión restaurada';
    if (bannerStatus === 'offline') return '⚠ Sin conexión a internet';
    return '';
  }, [bannerStatus]);

  return (
    <div style={{ width: '100%', height: '100%' }}>
      {bannerStatus && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999,
          padding: '10px 16px',
          background:  bannerStatus === 'online' ? 'var(--success)' : 'var(--warning)',
          color: '#fff',
          fontSize: '13px',
          fontWeight: 600,
          textAlign: 'center',
          transition: 'transform 0.3s ease, opacity 0.3s ease',
          transform: visible ? 'translateY(0)' : 'translateY(-100%)',
          opacity:   visible ? 1 : 0,
        }}>
          {bannerLabel}
        </div>
      )}
      <AppRouter />
    </div>
  );
}