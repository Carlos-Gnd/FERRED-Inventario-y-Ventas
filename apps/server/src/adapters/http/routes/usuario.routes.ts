import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../../db/prisma/prisma.client';
import { roleMiddleware } from '../middleware/role.middleware';
import { ROLES } from '../../../types/roles';

export const usuarioRoutes = Router();

const crearSchema = z.object({
  nombre:     z.string().min(2, 'Nombre muy corto'),
  email:      z.string().email('Email inválido'),
  contrasena: z.string().min(6, 'Mínimo 6 caracteres'),
  rol:        z.enum(['ADMIN', 'CAJERO', 'BODEGA']),
  sucursalId: z.number().int().positive(),
  activo:     z.boolean().optional().default(true),
});

const actualizarSchema = crearSchema.partial().omit({ contrasena: true }).extend({
  contrasena: z.string().min(6).optional(),
});

// BUG-20 FIX: middleware que valida que el usuario target pertenezca
// a la misma sucursal del ADMIN logueado
async function validarSucursalTarget(req: Request, res: Response, next: NextFunction) {
  try {
    const adminSucursalId = req.usuario!.sucursalId;

    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ error: 'ID inválido' });

    const target = await prisma.usuario.findUnique({
      where:  { id },
      select: { sucursalId: true },
    });

    if (!target) return res.status(404).json({ error: 'Usuario no encontrado' });

    if (target.sucursalId !== adminSucursalId) {
      return res.status(403).json({
        error: 'No tenés permisos para operar usuarios de otra sucursal',
      });
    }

    return next();
  } catch (err) { return next(err); }
}

// GET /api/usuarios — Solo ADMIN
usuarioRoutes.get('/', roleMiddleware('ADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const sucursalId = req.usuario!.sucursalId;
    const { buscar, rol, activo } = req.query;

    const usuarios = await prisma.usuario.findMany({
      where: {
        sucursalId,
        ...(rol    ? { rol: String(rol) } : {}),
        ...(activo !== undefined ? { activo: activo === 'true' } : {}),
        ...(buscar ? {
          OR: [
            { nombre: { contains: String(buscar) } },
            { email:  { contains: String(buscar) } },
          ],
        } : {}),
      },
      select: {
        id: true, nombre: true, email: true,
        rol: true, sucursalId: true, activo: true, creadoEn: true,
      },
      orderBy: { id: 'desc' },
    });

    return res.json(usuarios);
  } catch (err) { return next(err); }
});

// GET /api/usuarios/:id — BUG-20 FIX: validarSucursalTarget agregado
usuarioRoutes.get('/:id', roleMiddleware('ADMIN'), validarSucursalTarget, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Number(req.params.id);

    const usuario = await prisma.usuario.findUnique({
      where:  { id },
      select: { id: true, nombre: true, email: true, rol: true, sucursalId: true, activo: true },
    });
    if (!usuario) return res.status(404).json({ error: 'Usuario no encontrado' });

    return res.json(usuario);
  } catch (err) { return next(err); }
});

// POST /api/usuarios — Solo ADMIN
usuarioRoutes.post('/', roleMiddleware('ADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = crearSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0].message });
    }

    const { nombre, email, contrasena, rol, sucursalId, activo } = parsed.data;

    const existe = await prisma.usuario.findUnique({ where: { email } });
    if (existe) return res.status(400).json({ error: 'El email ya está registrado' });

    const hash = await bcrypt.hash(contrasena, 12);
    const nuevo = await prisma.usuario.create({
      data: { nombre, email, contrasenaHash: hash, rol, sucursalId, activo },
      select: { id: true, nombre: true, email: true, rol: true, sucursalId: true, activo: true },
    });

    return res.status(201).json({ mensaje: 'Usuario creado', usuario: nuevo });
  } catch (err) { return next(err); }
});

// PUT /api/usuarios/:id — BUG-20 FIX: validarSucursalTarget agregado
usuarioRoutes.put('/:id', roleMiddleware('ADMIN'), validarSucursalTarget, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Number(req.params.id);

    const parsed = actualizarSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0].message });
    }

    const { contrasena, ...resto } = parsed.data;
    const data: any = { ...resto };
    if (contrasena) data.contrasenaHash = await bcrypt.hash(contrasena, 12);

    const actualizado = await prisma.usuario.update({
      where: { id },
      data,
      select: { id: true, nombre: true, email: true, rol: true, sucursalId: true, activo: true },
    });

    return res.json({ mensaje: 'Usuario actualizado', usuario: actualizado });
  } catch (err) { return next(err); }
});

// DELETE /api/usuarios/:id — BUG-20 FIX: validarSucursalTarget agregado
usuarioRoutes.delete('/:id', roleMiddleware('ADMIN'), validarSucursalTarget, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Number(req.params.id);

    await prisma.usuario.update({
      where: { id },
      data:  { activo: false },
    });

    return res.json({ mensaje: 'Usuario desactivado correctamente' });
  } catch (err) { return next(err); }
});