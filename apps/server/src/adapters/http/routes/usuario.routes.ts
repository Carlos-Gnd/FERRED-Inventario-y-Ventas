import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';
import { roleGuard } from '../middleware/roleGuard';
import { branchGuard } from '../middleware/branchGuard';

export const usuarioRoutes = Router();
const prisma = new PrismaClient();

// Solo ADMIN puede ver usuarios
usuarioRoutes.get('/', roleGuard('ADMIN'), branchGuard, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const sucursalId = Number((req as any).sucursalId ?? (req as any).branchId);
    const usuarios = await prisma.user.findMany({
      where: { branchId: sucursalId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        branchId: true,
      },
    });

    return res.json(
      usuarios.map((u) => ({
        id: u.id,
        nombre: u.name,
        email: u.email,
        rol: u.role,
        sucursalId: u.branchId,
      })),
    );
  } catch (error) {
    return next(error);
  }
});

// Solo ADMIN puede crear usuarios
usuarioRoutes.post('/', roleGuard('ADMIN'), branchGuard, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { nombre, email, contrasena, rol } = req.body;
    const sucursalIdBody = req.body.sucursalId ?? req.body.sucursal_id ?? req.body.branchId;
    const sucursalIdToken = (req as any).sucursalId ?? (req as any).branchId;
    const sucursalId = Number(sucursalIdBody ?? sucursalIdToken);

    if (!nombre || !email || !contrasena || !rol || !Number.isFinite(sucursalId) || sucursalId <= 0) {
      return res.status(400).json({ error: 'Todos los campos son requeridos' });
    }

    const rolesValidos = ['ADMIN', 'CAJERO', 'BODEGA'];
    if (!rolesValidos.includes(rol)) {
      return res.status(400).json({ error: 'Rol invalido' });
    }

    const existe = await prisma.user.findUnique({ where: { email } });
    if (existe) {
      return res.status(400).json({ error: 'El email ya esta registrado' });
    }

    const passwordHash = await bcrypt.hash(contrasena, 12);
    const creado = await prisma.user.create({
      data: {
        name: nombre,
        email,
        passwordHash,
        role: rol,
        branchId: sucursalId,
      },
      select: {
        id: true,
      },
    });

    return res.status(201).json({
      mensaje: 'Usuario creado correctamente',
      id: creado.id,
    });
  } catch (error) {
    return next(error);
  }
});

// Solo ADMIN puede desactivar usuarios
usuarioRoutes.patch('/:id/desactivar', roleGuard('ADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id) || id <= 0) {
      return res.status(400).json({ error: 'ID invalido' });
    }

    const existe = await prisma.user.findUnique({ where: { id }, select: { id: true } });
    if (!existe) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // No existe columna "activo" en el schema actual; desactivamos bloqueando su rol.
    await prisma.user.update({
      where: { id },
      data: { role: 'INACTIVO' },
    });

    return res.json({ mensaje: 'Usuario desactivado' });
  } catch (error) {
    return next(error);
  }
});
