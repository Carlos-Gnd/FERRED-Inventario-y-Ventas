import { pool } from "../db/pool";
import bcrypt from "bcrypt";
import { env } from "../config/env";
import { UserRow } from "../types/user.types";

type CreateUserInput = {
  nombre: string;
  correo: string;
  password: string;
  rol: "Admin" | "Cajero" | "Bodeguero";
  id_sucursal: number;
  estado?: number;
};

type UpdateUserInput = Partial<CreateUserInput>;

export async function listUsers(): Promise<Omit<UserRow, "password">[]> {
  const [rows] = await pool.query(
    `SELECT id_usuario, nombre, correo, rol, id_sucursal, estado, creado_en
     FROM usuarios
     ORDER BY id_usuario DESC`
  );
  return rows as any;
}

export async function getUserById(id: number): Promise<Omit<UserRow, "password"> | null> {
  const [rows] = await pool.query(
    `SELECT id_usuario, nombre, correo, rol, id_sucursal, estado, creado_en
     FROM usuarios
     WHERE id_usuario = ? LIMIT 1`,
    [id]
  );

  const r = (rows as any[])[0];
  return r ?? null;
}

export async function createUser(input: CreateUserInput): Promise<{ id_usuario: number }> {
  // obligatorios
  if (!input.rol) throw new Error("rol es obligatorio");
  if (!input.id_sucursal) throw new Error("id_sucursal es obligatorio");

  // evitar duplicado por correo
  const [exists] = await pool.query(
    `SELECT id_usuario FROM usuarios WHERE correo = ? LIMIT 1`,
    [input.correo]
  );
  if ((exists as any[]).length > 0) {
    throw new Error("El correo ya existe");
  }

  const hashed = await bcrypt.hash(input.password, env.bcrypt.saltRounds);
  const estado = input.estado ?? 1;

  const [result] = await pool.query(
    `INSERT INTO usuarios (nombre, correo, password, rol, id_sucursal, estado)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [input.nombre, input.correo, hashed, input.rol, input.id_sucursal, estado]
  );

  const insertId = (result as any).insertId as number;
  return { id_usuario: insertId };
}

export async function updateUser(id: number, input: UpdateUserInput): Promise<void> {
  const fields: string[] = [];
  const values: any[] = [];

  if (input.nombre !== undefined) { fields.push("nombre = ?"); values.push(input.nombre); }
  if (input.correo !== undefined) { fields.push("correo = ?"); values.push(input.correo); }
  if (input.rol !== undefined) { fields.push("rol = ?"); values.push(input.rol); }
  if (input.id_sucursal !== undefined) { fields.push("id_sucursal = ?"); values.push(input.id_sucursal); }
  if (input.estado !== undefined) { fields.push("estado = ?"); values.push(input.estado); }

  if (input.password !== undefined) {
    const hashed = await bcrypt.hash(input.password, env.bcrypt.saltRounds);
    fields.push("password = ?");
    values.push(hashed);
  }

  if (fields.length === 0) return;

  values.push(id);

  const [result] = await pool.query(
    `UPDATE usuarios SET ${fields.join(", ")} WHERE id_usuario = ?`,
    values
  );

  if ((result as any).affectedRows === 0) {
    throw new Error("Usuario no encontrado");
  }
}

export async function deleteUser(id: number): Promise<void> {
  const [result] = await pool.query(
    `DELETE FROM usuarios WHERE id_usuario = ?`,
    [id]
  );

  if ((result as any).affectedRows === 0) {
    throw new Error("Usuario no encontrado");
  }
}