import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

export function AuthGuard() {
  const token = useAuthStore((s) => s.token);
  return token ? <div>Protected Content</div> : <Navigate to="/login" />;
}
