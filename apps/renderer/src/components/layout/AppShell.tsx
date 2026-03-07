import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar }  from './Topbar';
import { BottomNav } from './BottomNav';

export function AppShell() {
  return (
    <div style={{
      display: 'flex', height: '100vh',
      background: 'var(--bg-base)', overflow: 'hidden',
    }}>
      {/* Sidebar — visible solo en desktop */}
      <div className="sidebar-wrapper">
        <Sidebar />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0, overflow: 'hidden' }}>
        <Topbar />
        <main style={{
          flex: 1, overflowY: 'auto',
          padding: 'clamp(16px, 3vw, 28px)',
          background: 'var(--bg-base)',
        }}>
          <Outlet />
        </main>
      </div>

      {/* Bottom Nav — visible solo en móvil */}
      <BottomNav />
    </div>
  );
}