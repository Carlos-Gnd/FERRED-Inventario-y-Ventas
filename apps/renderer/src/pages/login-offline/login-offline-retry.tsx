import { useEffect, useState, type ReactElement } from 'react';
import { isOfflineError } from '../../services/api.client';
import { useElectron } from '../../hooks/useElectron';
import styles from '../auth/LoginPage.module.css';

const RETRYABLE_STATUS = new Set([502, 503, 504]);

type RetryableLoginError = {
  response?: {
    status?: number;
    data?: { error?: string };
  };
  isOffline?: boolean;
  code?: string;
};

type LoginOnce<T> = () => Promise<T>;

const IconOffline = ({ color }: { color: string }) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 9a16 16 0 0 1 22 0" />
    <path d="M4.5 12.5a11 11 0 0 1 15 0" />
    <path d="M8 16a6 6 0 0 1 8 0" />
    <path d="M12 20h0" />
  </svg>
);

function isRetryableLoginError(err: RetryableLoginError) {
  const statusCode = err?.response?.status;
  return isOfflineError(err) || (typeof statusCode === 'number' && RETRYABLE_STATUS.has(statusCode));
}

export function useLoginOfflineRetry() {
  const { isElectron, getServerStatus } = useElectron();
  const [isOfflineMode, setIsOfflineMode] = useState<boolean>(false);

  useEffect(() => {
    let alive = true;

    async function detectOfflineMode() {
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        if (alive) setIsOfflineMode(true);
        return;
      }

      if (!isElectron) {
        if (alive) setIsOfflineMode(false);
        return;
      }

      try {
        const status = await getServerStatus();
        if (alive) setIsOfflineMode(!status.ok);
      } catch {
        if (alive) setIsOfflineMode(true);
      }
    }

    detectOfflineMode();

    return () => {
      alive = false;
    };
  }, []);

  async function retryLoginIfNeeded<T>(loginOnce: LoginOnce<T>, err: RetryableLoginError): Promise<T | null> {
    if (!isElectron || !isRetryableLoginError(err)) {
      return null;
    }

    try {
      const serverStatus = await getServerStatus();
      if (!serverStatus.ok) {
        setIsOfflineMode(true);
        return null;
      }

      setIsOfflineMode(false);
      return await loginOnce();
    } catch (retryErr) {
      if (isOfflineError(retryErr)) {
        setIsOfflineMode(true);
        return null;
      }

      throw retryErr;
    }
  }

  return {
    isOfflineMode,
    retryLoginIfNeeded,
  };
}

export function OfflineModeBadge(): ReactElement {
  return (
    <div className={styles.modeBadge} role="status" aria-live="polite">
      <span className={styles.modeBadgeIcon}>
        <IconOffline color="var(--lp-badge-color)" />
      </span>
      <span>Modo offline</span>
    </div>
  );
}
