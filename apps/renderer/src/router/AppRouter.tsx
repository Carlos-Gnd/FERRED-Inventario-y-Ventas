// AppRouter.tsx
// Este archivo define las rutas principales de la app y protege el acceso según rol.

import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthGuard }       from './guards/AuthGuard';
import { RoleGuard }       from './guards/RoleGuard';
import { AppShell }        from '../components/layout/AppShell';
import LoginPage           from '../pages/auth/LoginPage';
import { useAuthStore }    from '../store/authStore';
import DashboardPage       from '../pages/dashboard/DashboardPage';
import UsersPage           from '../pages/users/UsersPage';
import CategoriesPage      from '../pages/categories/CategoriesPage';
import ProductsPage        from '../pages/products/ProductsPage';
import InventoryReceptionPage from '../pages/inventory-reception/InventoryReception';
import ComingSoonPage      from '../pages/ComingSoonPage';
import TransfersPage       from '../pages/transfers/TransfersPage';
import StockPage           from '../pages/stock/StockPage';
import VentasPage          from '../pages/ventas/VentasPage';
import ReportsPage         from '../pages/reports/ReportsPage';

function LoginRoute() {
  const isAuthenticated = useAuthStore(s => s.isAuthenticated);
  return isAuthenticated ? <Navigate to="/dashboard" replace /> : <LoginPage />;
}

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Ruta pública de login — redirige a dashboard si ya está autenticado */}
        <Route path="/login" element={<LoginRoute />} />

        {/*
          El layout principal se carga en '/' y envuelve las rutas internas
          con AppShell. AuthGuard protege toda esta área para usuarios autenticados.
        */}
        <Route
          path="/"
          element={
            <AuthGuard>
              <AppShell />
            </AuthGuard>
          }
        >
          {/* Redirige la raíz al dashboard */}
          <Route index                element={<Navigate to="/dashboard" replace />} />

          {/* Página principal visible después de iniciar sesión */}
          <Route path="dashboard"     element={<DashboardPage />} />

          {/* Rutas exclusivas para el rol ADMIN */}
          <Route path="usuarios"      element={<RoleGuard roles={['ADMIN']}><UsersPage /></RoleGuard>} />
          <Route path="categorias"    element={<RoleGuard roles={['ADMIN']}><CategoriesPage /></RoleGuard>} />
          <Route path="reportes"      element={<RoleGuard roles={['ADMIN', 'BODEGA']}><ReportsPage /></RoleGuard>} />
          <Route path="ajustes"       element={<RoleGuard roles={['ADMIN']}><ComingSoonPage titulo="Ajustes" /></RoleGuard>} />
          <Route path="transferencias" element={<RoleGuard roles={['ADMIN']}><TransfersPage /></RoleGuard>} />

          {/* Rutas para ADMIN y BODEGA */}
          <Route path="productos"     element={<RoleGuard roles={['ADMIN','BODEGA']}><ProductsPage /></RoleGuard>} />
          <Route path="stock"         element={<RoleGuard roles={['ADMIN','BODEGA']}><StockPage /></RoleGuard>} />
          <Route path="recepcion"     element={<RoleGuard roles={['ADMIN','BODEGA']}><InventoryReceptionPage /></RoleGuard>} />

          {/* Rutas para ADMIN y CAJERO */}
          <Route path="ventas"        element={<RoleGuard roles={['ADMIN','CAJERO']}><VentasPage /></RoleGuard>} />
        </Route>

        {/* Cualquier ruta desconocida redirige al login */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
