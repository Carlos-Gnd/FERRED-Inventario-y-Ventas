import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import AdminPage from '../pages/admin/AdminPage';
import CategoriasCRUDPage from '../pages/categories/CategoriasCRUDPage';

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/admin/users" element={<AdminPage />} />
        <Route path="/admin/categorias" element={<CategoriasCRUDPage />} />
        <Route path="*" element={<Navigate to="/admin/categorias" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
