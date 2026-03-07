import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthGuard }       from './guards/AuthGuard';
import { RoleGuard }       from './guards/RoleGuard';
import { AppShell }        from '../components/layout/AppShell';
import LoginPage           from '../pages/auth/LoginPage';
import DashboardPage       from '../pages/dashboard/DashboardPage';
import UsersPage           from '../pages/users/UsersPage';
import CategoriesPage      from '../pages/categories/CategoriesPage';
import ProductsPage        from '../pages/products/ProductsPage';
import ComingSoonPage      from '../pages/ComingSoonPage';

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        <Route
          path="/"
          element={
            <AuthGuard>
              <AppShell />
            </AuthGuard>
          }
        >
          <Route index                element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard"     element={<DashboardPage />} />

          {/* Solo ADMIN */}
          <Route path="usuarios"      element={<RoleGuard roles={['ADMIN']}><UsersPage /></RoleGuard>} />
          <Route path="categorias"    element={<RoleGuard roles={['ADMIN']}><CategoriesPage /></RoleGuard>} />
          <Route path="reportes"      element={<RoleGuard roles={['ADMIN']}><ComingSoonPage titulo="Reportes" /></RoleGuard>} />
          <Route path="ajustes"       element={<RoleGuard roles={['ADMIN']}><ComingSoonPage titulo="Ajustes" /></RoleGuard>} />

          {/* ADMIN + BODEGA */}
          <Route path="productos"     element={<RoleGuard roles={['ADMIN','BODEGA']}><ProductsPage /></RoleGuard>} />

          {/* ADMIN + CAJERO */}
          <Route path="ventas"        element={<RoleGuard roles={['ADMIN','CAJERO']}><ComingSoonPage titulo="Ventas / POS" /></RoleGuard>} />
        </Route>

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}