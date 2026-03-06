import { z } from "zod";

const roleEnum = z.enum(["Admin", "Cajero", "Bodeguero"]);

export const createUserSchema = z.object({
  nombre: z.string().min(2, "nombre muy corto"),
  correo: z.string().email("correo inválido"),
  password: z.string().min(6, "password mínimo 6 caracteres"),
  rol: roleEnum,
  id_sucursal: z.number().int().positive("id_sucursal inválido"),
  estado: z.number().int().min(0).max(1).optional(),
});

export const updateUserSchema = z.object({
  nombre: z.string().min(2).optional(),
  correo: z.string().email().optional(),
  password: z.string().min(6).optional(),
  rol: roleEnum.optional(),
  id_sucursal: z.number().int().positive().optional(),
  estado: z.number().int().min(0).max(1).optional(),
});