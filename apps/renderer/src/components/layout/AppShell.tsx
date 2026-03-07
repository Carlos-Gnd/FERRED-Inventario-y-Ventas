import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar }  from './Topbar';

export function AppShell() {
  return (
    <div style={{
      display: 'flex',
      height: '100vh',
      background: 'var(--bg-base)',
      overflow: 'hidden',
    }}>
      <Sidebar />
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0, overflow: 'hidden' }}>
        <Topbar />
        <main style={{
          flex: 1,
          overflowY: 'auto',
          padding: '28px',
          background: 'var(--bg-base)',
        }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}