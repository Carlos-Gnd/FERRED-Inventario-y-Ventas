import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useEffect } from 'react';
import type { ReactNode } from 'react';
import type { UserRole } from '../../types';

interface Props {
  roles: UserRole[];
  children: ReactNode;
}

export function RoleGuard({ roles, children }: Props) {
  const usuario = useAuthStore(s => s.usuario);
  const denied = !usuario || !roles.includes(usuario.rol as UserRole);

  useEffect(() => {
    if (denied) {
      window.alert('No tenes permisos para acceder a esta pagina');
    }
  }, [denied]);

  if (denied) {
    return <Navigate to="/dashboard" replace />;
  }
  return <>{children}</>;
}
