import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar }          from './Sidebar';
import { Topbar }           from './Topbar';
import { BottomNav }        from './BottomNav';
import { OfflineBanner }    from './OfflineBanner';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import { useCriticalAlerts } from '../../hooks/useCriticalAlerts';

export function AppShell() {
  const location = useLocation();
  const { isOffline, isChecking, syncState } = useNetworkStatus();
  const { hasActiveAlerts } = useCriticalAlerts();
  const isReceptionHistoryRoute = location.pathname === '/historial-recepciones';

  // Solo mostrar banner cuando está CONFIRMADAMENTE offline, no durante "checking"
  const showBanner = isOffline && !isChecking;

  return (
    <div style={{
      display: 'flex', height: '100vh',
      background: 'var(--bg-base)', overflow: 'hidden',
    }}>
      <div className="sidebar-wrapper">
        <Sidebar hasActiveAlerts={hasActiveAlerts} />
      </div>

      <div style={{
        display: 'flex', flexDirection: 'column',
        flex: 1, minWidth: 0, overflow: 'hidden',
      }}>
        {showBanner && <OfflineBanner syncState={syncState} />}

        {!isReceptionHistoryRoute && <Topbar />}

        <main style={{
          flex: 1, overflowY: 'auto',
          padding: isReceptionHistoryRoute ? 'clamp(18px, 2vw, 22px) clamp(18px, 2.2vw, 28px)' : 'clamp(16px, 3vw, 28px)',
          background: 'var(--bg-base)',
        }}>
          <Outlet />
        </main>
      </div>

      <BottomNav hasActiveAlerts={hasActiveAlerts} />
    </div>
  );
}   
