import './App.css';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNetworkStatus } from './hooks/useNetworkStatus';
import { AppRouter } from './router/AppRouter';

export default function App() {
  const { status } = useNetworkStatus();
  const [isNotificationVisible, setIsNotificationVisible] = useState(false);
  const [notificationStatus, setNotificationStatus] = useState<'online' | 'offline' | null>(null);
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    if (status !== 'online' && status !== 'offline') return;

    const showId = window.setTimeout(() => {
      setNotificationStatus(status);
      setIsNotificationVisible(true);
    }, 0);

    const hideId = window.setTimeout(() => {
      setIsNotificationVisible(false);
    }, 2000);

    return () => {
      window.clearTimeout(showId);
      window.clearTimeout(hideId);
    };
  }, [status]);

  const statusLabel = useMemo(() => {
    if (notificationStatus === 'online') return 'Con conexion a internet';
    if (notificationStatus === 'offline') return 'Sin conexion a internet';
    return '';
  }, [notificationStatus]);

  return (
    <div className="app-root">
      {notificationStatus && (
        <div
          className={`network-banner network-banner-${notificationStatus} ${isNotificationVisible ? '' : 'network-banner-hidden'}`}
          role="status"
          aria-live="polite"
        >
          {statusLabel}
        </div>
      )}
      <AppRouter />
    </div>
  );
}
