import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthGuard } from './guards/AuthGuard';
import LoginPage from '../pages/auth/LoginPage';

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/*" element={<AuthGuard />} />
      </Routes>
    </BrowserRouter>
  );
}
