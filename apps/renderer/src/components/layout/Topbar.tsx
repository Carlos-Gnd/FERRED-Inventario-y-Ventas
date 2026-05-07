/**
 * Topbar.tsx
 * T-07.3: Muestra indicador de conectividad en tiempo real
 * T-07D.2: Badge naranja cuando hay pendientes + confirmación verde post-sync
 */
import { useNavigate } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { useThemeStore } from '../../store/themeStore';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';

export function Topbar() {
  const navigate   = useNavigate();
  const { usuario, logout } = useAuthStore();
  const { isDark, toggleTheme } = useThemeStore();
  const { status, isOnline, syncState, isSyncing, syncError, syncNow } = useNetworkStatus();
  const branchLabel = usuario?.sucursalId
    ? `Sucursal ${usuario.sucursalId}`
    : 'Sin sucursal asignada';

  // ── Lógica de confirmación post-sync ──────────────────────
  const [showSynced, setShowSynced] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const prevPendientes = useRef<number>(syncState.pendientes);
  const syncTimer      = useRef<ReturnType<typeof setTimeout> | null>(null);
  const feedbackTimer  = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const prev = prevPendientes.current;
    const curr = syncState.pendientes;

    // Si había pendientes y ahora no hay → sync completada
    if (prev > 0 && curr === 0 && isOnline) {
      setShowSynced(true);
      if (syncTimer.current) clearTimeout(syncTimer.current);
      syncTimer.current = setTimeout(() => setShowSynced(false), 3000);
    }

    prevPendientes.current = curr;

    return () => {
      if (syncTimer.current) clearTimeout(syncTimer.current);
    };
  }, [syncState.pendientes, isOnline]);

  function handleLogout() { logout(); navigate('/login'); }

  async function handleSyncNow() {
    try {
      await syncNow();
      setSyncFeedback('Sincronizacion completada');
      setShowSynced(true);
    } catch {
      setSyncFeedback('No se pudo sincronizar');
    }

    if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
    feedbackTimer.current = setTimeout(() => setSyncFeedback(null), 3500);
  }

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60_000);
    return () => {
      clearInterval(timer);
      if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
    };
  }, []);

  const initials = (name: string) =>
    name.trim().split(/\s+/).slice(0, 2).map(p => p[0]?.toUpperCase() ?? '').join('');

  const getLastSyncInfo = () => {
    if (!isOnline) {
      return {
        label: 'Ultima sync: sin conexion',
        color: 'var(--text-subtle)',
        background: 'rgba(148,163,184,0.1)',
        border: 'rgba(148,163,184,0.25)',
      };
    }

    if (!syncState.lastSync) {
      return {
        label: 'Ultima sync: pendiente',
        color: 'var(--warning)',
        background: 'rgba(245,158,11,0.1)',
        border: 'rgba(245,158,11,0.35)',
      };
    }

    const diffMs = Math.max(0, now - syncState.lastSync.getTime());
    const diffMin = Math.floor(diffMs / 60_000);
    const label = diffMin < 1
      ? 'Ultima sync: hace menos de 1m'
      : `Ultima sync: hace ${diffMin}m`;
    const isStale = diffMin > 15;

    return {
      label,
      color: isStale ? 'var(--warning)' : 'var(--success)',
      background: isStale ? 'rgba(245,158,11,0.1)' : 'rgba(16,185,129,0.08)',
      border: isStale ? 'rgba(245,158,11,0.35)' : 'rgba(16,185,129,0.2)',
    };
  };

  // ── Indicador de red ────────────────────────────────────────
  const NetIndicator = () => {
    const lastSync = getLastSyncInfo();

    if (status === 'checking') return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
        <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: 'var(--warning)', animation: 'pulse 1s infinite' }} />
        <span style={{ fontSize: '11px', color: 'var(--warning)' }}>Verificando...</span>
      </div>
    );

    if (!isOnline) return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '5px',
        padding: '4px 10px', background: 'rgba(239,68,68,0.1)',
        border: '1px solid rgba(239,68,68,0.25)', borderRadius: '20px' }}>
        <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: 'var(--danger)' }} />
        <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--danger)' }}>Sin conexión</span>
        <span style={{ fontSize: '10px', color: 'var(--text-subtle)', fontWeight: 600 }}>
          - {lastSync.label.replace('Ultima sync: ', '')}
        </span>
        {syncState.pendientes > 0 && (
          <span style={{ fontSize: '10px', color: 'var(--danger)', fontWeight: 700 }}>
            · {syncState.pendientes} pendientes
          </span>
        )}
      </div>
    );

    // Confirmación verde post-sync (3 segundos)
    if (showSynced) return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: '5px',
        padding: '4px 10px', background: 'rgba(16,185,129,0.15)',
        border: '1px solid rgba(16,185,129,0.4)', borderRadius: '20px',
        animation: 'pulse 0.4s ease',
      }}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
          stroke="var(--success)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
        <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--success)' }}>
          Sincronizado
        </span>
      </div>
    );

    // Online + pendientes → badge naranja separado
    if (syncState.pendientes > 0) return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '5px',
        padding: '4px 10px', background: 'rgba(245,158,11,0.1)',
        border: '1px solid rgba(245,158,11,0.35)', borderRadius: '20px' }}>
        <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: 'var(--warning)', animation: 'pulse 1.5s infinite' }} />
        <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--warning)' }}>En línea</span>
        <span style={{ fontSize: '10px', color: 'var(--warning)', fontWeight: 700 }}>
          · {syncState.pendientes} por sincronizar
        </span>
        {syncState.errores > 0 && (
          <span style={{ fontSize: '10px', color: 'var(--danger)', fontWeight: 700 }}>
            · {syncState.errores} errores
          </span>
        )}
      </div>
    );

    // Online sin pendientes — estado normal
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '5px',
        padding: '4px 10px', background: 'rgba(16,185,129,0.08)',
        border: '1px solid rgba(16,185,129,0.2)', borderRadius: '20px' }}>
        <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: 'var(--success)' }} />
        <span style={{ fontSize: '11px', fontWeight: 500, color: 'var(--success)' }}>En línea</span>
      </div>
    );
  };

  const LastSyncIndicator = () => {
    const info = getLastSyncInfo();

    return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: '6px',
        padding: '4px 10px',
        background: info.background,
        border: `1px solid ${info.border}`,
        borderRadius: '20px',
        whiteSpace: 'nowrap',
      }}>
        <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: info.color }} />
        <span style={{ fontSize: '11px', fontWeight: 600, color: info.color }}>
          {info.label}
        </span>
      </div>
    );
  };

  return (
    // DT-14: layout estático del header en clase .topbar
    <header className="topbar">
      {/* Nombre de sucursal */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-subtle)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
        </svg>
        <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 500 }} className="hide-sm">
          {branchLabel}
        </span>
      </div>

      <div style={{ flex: 1 }} />

      {/* Indicador de red — oculto en xs */}
      <div className="hide-xs">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <NetIndicator />
          <LastSyncIndicator />
          {isOnline && (
            // DT-14: estilos del botón en .topbar-sync-btn / .topbar-sync-btn--syncing
            <button
              onClick={handleSyncNow}
              disabled={isSyncing}
              title={syncError ?? 'Sincronizar ahora'}
              className={`topbar-sync-btn${isSyncing ? ' topbar-sync-btn--syncing' : ''}`}
            >
              {isSyncing ? 'Sincronizando...' : 'Sincronizar ahora'}
            </button>
          )}
          {syncFeedback && (
            <span style={{
              fontSize: '11px',
              fontWeight: 600,
              color: syncFeedback.includes('No se') ? 'var(--danger)' : 'var(--success)',
              whiteSpace: 'nowrap',
            }}>
              {syncFeedback}
            </span>
          )}
        </div>
      </div>

      {/* Theme toggle — DT-14: estilos en .topbar-theme-btn */}
      <button onClick={toggleTheme} className="topbar-theme-btn" title={isDark ? 'Modo claro' : 'Modo oscuro'}>
        {isDark ? '☀️' : '🌙'}
      </button>

      {/* Usuario */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div className="hide-sm" style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>{usuario?.nombre}</div>
          <div style={{ fontSize: '10px', color: 'var(--text-subtle)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{usuario?.rol}</div>
        </div>
        <div style={{
          width: '32px', height: '32px', borderRadius: '50%',
          background: 'var(--accent)', display: 'flex', alignItems: 'center',
          justifyContent: 'center', fontSize: '11px', fontWeight: 700, color: '#fff',
          cursor: 'pointer', flexShrink: 0,
        }}
          onClick={handleLogout}
          title="Cerrar sesión"
        >
          {initials(usuario?.nombre ?? 'U')}
        </div>
      </div>
    </header>
  );
}
