import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import type { ReactNode } from 'react';
import type { UserRole } from '../../types';

interface Props {
  roles: UserRole[];
  children: ReactNode;
}

export function RoleGuard({ roles, children }: Props) {
  const usuario = useAuthStore(s => s.usuario);
  if (!usuario || !roles.includes(usuario.rol as UserRole)) {
    return <Navigate to="/dashboard" replace />;
  }
  return <>{children}</>;
}