export type Role = 'ADMIN' | 'CAJERO' | 'BODEGA';

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: Role;
  branchId: number;
}
