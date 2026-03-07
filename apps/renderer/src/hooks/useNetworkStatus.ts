import { useEffect, useState } from 'react';

type NetworkStatus = 'online' | 'offline' | 'unknown';

export function useNetworkStatus() {
  const [status, setStatus] = useState<NetworkStatus>(
    navigator.onLine ? 'online' : 'offline'
  );

  useEffect(() => {
    const online  = () => setStatus('online');
    const offline = () => setStatus('offline');

    window.addEventListener('online',  online);
    window.addEventListener('offline', offline);

    return () => {
      window.removeEventListener('online',  online);
      window.removeEventListener('offline', offline);
    };
  }, []);

  return { status, isOnline: status === 'online' };
}