import './App.css';
import { useNetworkStatus } from './hooks/useNetworkStatus';
import { AppRouter } from './router/AppRouter';

export default function App() {
  const { status } = useNetworkStatus();

  const statusLabel =
    status === 'online'
      ? 'Con conexion a internet'
      : status === 'checking'
        ? 'Verificando conexion a internet...'
        : 'Sin conexion a internet';

  return (
    <div className="app-root">
      <div className={`network-banner network-banner-${status}`} role="status" aria-live="polite">
        {statusLabel}
      </div>
      <AppRouter />
    </div>
  );
}
