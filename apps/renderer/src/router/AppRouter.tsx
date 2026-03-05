import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import AdminPage from '../pages/admin/AdminPage';

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/admin/users" element={<AdminPage />} />
        <Route path="*" element={<Navigate to="/admin/users" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
