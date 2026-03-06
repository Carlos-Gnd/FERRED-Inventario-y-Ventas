import { Request, Response } from "express";
import { createUserSchema, updateUserSchema } from "../../../validators/user.validator";
import * as userService from "../../../services/user.service";

function toInt(value: any): number {
  const n = Number(value);
  if (!Number.isInteger(n) || n <= 0) throw new Error("ID inválido");
  return n;
}

export async function list(req: Request, res: Response) {
  const users = await userService.listUsers();
  return res.json(users);
}

export async function getById(req: Request, res: Response) {
  try {
    const id = toInt(req.params.id);
    const user = await userService.getUserById(id);
    if (!user) return res.status(404).json({ message: "Usuario no encontrado" });
    return res.json(user);
  } catch (err: any) {
    return res.status(400).json({ message: err.message ?? "Error" });
  }
}

export async function create(req: Request, res: Response) {
  const parsed = createUserSchema.safeParse({
    ...req.body,
    id_sucursal: req.body?.id_sucursal !== undefined ? Number(req.body.id_sucursal) : undefined,
    estado: req.body?.estado !== undefined ? Number(req.body.estado) : undefined,
  });

  if (!parsed.success) {
    return res.status(400).json({
      message: "Validación falló",
      errors: parsed.error.flatten(),
    });
  }

  try {
    const result = await userService.createUser(parsed.data);
    return res.status(201).json({ message: "Usuario creado", ...result });
  } catch (err: any) {
    return res.status(400).json({ message: err.message ?? "Error" });
  }
}

export async function update(req: Request, res: Response) {
  let id: number;

  try {
    id = toInt(req.params.id);
  } catch (err: any) {
    return res.status(400).json({ message: err.message ?? "ID inválido" });
  }

  const parsed = updateUserSchema.safeParse({
    ...req.body,
    id_sucursal: req.body?.id_sucursal !== undefined ? Number(req.body.id_sucursal) : undefined,
    estado: req.body?.estado !== undefined ? Number(req.body.estado) : undefined,
  });

  if (!parsed.success) {
    return res.status(400).json({
      message: "Validación falló",
      errors: parsed.error.flatten(),
    });
  }

  try {
    await userService.updateUser(id, parsed.data);
    return res.json({ message: "Usuario actualizado" });
  } catch (err: any) {
    return res.status(400).json({ message: err.message ?? "Error" });
  }
}

export async function remove(req: Request, res: Response) {
  try {
    const id = toInt(req.params.id);
    await userService.deleteUser(id);
    return res.json({ message: "Usuario eliminado" });
  } catch (err: any) {
    return res.status(400).json({ message: err.message ?? "Error" });
  }
}
