import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthGuard }       from './guards/AuthGuard';
import { AppShell }        from '../components/layout/AppShell';
import LoginPage           from '../pages/auth/LoginPage';
import DashboardPage       from '../pages/dashboard/DashboardPage';
import UsersPage           from '../pages/users/UsersPage';
import CategoriesPage      from '../pages/categories/CategoriesPage';
import ProductsPage        from '../pages/products/ProductsPage';

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Pública */}
        <Route path="/login" element={<LoginPage />} />

        {/* Protegidas — todas dentro del shell */}
        <Route
          path="/"
          element={
            <AuthGuard>
              <AppShell />
            </AuthGuard>
          }
        >
          <Route index             element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard"  element={<DashboardPage />} />
          <Route path="usuarios"   element={<UsersPage />} />
          <Route path="categorias" element={<CategoriesPage />} />
          <Route path="productos"  element={<ProductsPage />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}