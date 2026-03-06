export type UserRole = "Admin" | "Cajero" | "Bodeguero";

export type UserRow = {
  id_usuario: number;
  nombre: string;
  correo: string;
  rol: UserRole;
  id_sucursal: number;
  estado: number;
  creado_en: Date;
};