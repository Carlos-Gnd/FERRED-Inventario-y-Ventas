import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

type InternetStatus = 'checking' | 'online' | 'offline';

const CHECK_URL = 'https://www.gstatic.com/generate_204';
const CHECK_TIMEOUT_MS = 3500;
const CHECK_INTERVAL_MS = 15000;

export function useNetworkStatus() {
  const [browserOnline, setBrowserOnline] = useState<boolean>(navigator.onLine);
  const [hasInternet, setHasInternet] = useState<boolean>(navigator.onLine);
  const [lastCheckedAt, setLastCheckedAt] = useState<number | null>(null);
  const [isChecking, setIsChecking] = useState<boolean>(false);
  const mountedRef = useRef(true);

  const checkInternet = useCallback(async () => {
    if (!navigator.onLine) {
      if (!mountedRef.current) return false;
      setBrowserOnline(false);
      setHasInternet(false);
      setLastCheckedAt(Date.now());
      return false;
    }

    setBrowserOnline(true);
    setIsChecking(true);

    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), CHECK_TIMEOUT_MS);

    try {
      await fetch(CHECK_URL, {
        method: 'HEAD',
        cache: 'no-store',
        mode: 'no-cors',
        signal: controller.signal,
      });

      if (!mountedRef.current) return true;
      setHasInternet(true);
      setLastCheckedAt(Date.now());
      return true;
    } catch {
      if (!mountedRef.current) return false;
      setHasInternet(false);
      setLastCheckedAt(Date.now());
      return false;
    } finally {
      window.clearTimeout(timeoutId);
      if (mountedRef.current) setIsChecking(false);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;

    const handleOnline = () => {
      setBrowserOnline(true);
      void checkInternet();
    };

    const handleOffline = () => {
      setBrowserOnline(false);
      setHasInternet(false);
      setLastCheckedAt(Date.now());
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    void checkInternet();
    const intervalId = window.setInterval(() => {
      void checkInternet();
    }, CHECK_INTERVAL_MS);

    return () => {
      mountedRef.current = false;
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.clearInterval(intervalId);
    };
  }, [checkInternet]);

  const status: InternetStatus = useMemo(() => {
    if (isChecking && browserOnline) return 'checking';
    return hasInternet ? 'online' : 'offline';
  }, [browserOnline, hasInternet, isChecking]);

  return {
    browserOnline,
    hasInternet,
    isOnline: hasInternet,
    isChecking,
    lastCheckedAt,
    status,
    checkInternet,
  };
}
