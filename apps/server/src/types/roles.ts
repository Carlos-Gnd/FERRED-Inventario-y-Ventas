// Usar siempre este tipo para roles
// Tanto backend como frontend deben importar de aquí
export type UserRole = 'ADMIN' | 'CAJERO' | 'BODEGA';

export const ROLES: UserRole[] = ['ADMIN', 'CAJERO', 'BODEGA'];

export const ROLE_LABELS: Record<UserRole, string> = {
  ADMIN:   'Administrador',
  CAJERO:  'Cajero',
  BODEGA:  'Bodeguero',
};