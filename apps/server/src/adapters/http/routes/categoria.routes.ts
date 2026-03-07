import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../../db/prisma/prisma.client';
import { roleMiddleware } from '../middleware/role.middleware';

export const categoriaRoutes = Router();

const schema = z.object({
  nombre:      z.string().min(2, 'Nombre muy corto'),
  descripcion: z.string().optional(),
});

// GET /api/categorias
categoriaRoutes.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const categorias = await prisma.categoria.findMany({
      include: { _count: { select: { productos: true } } },
      orderBy: { nombre: 'asc' },
    });
    return res.json(categorias.map(c => ({
      id: c.id, nombre: c.nombre, descripcion: c.descripcion,
      nProductos: c._count.productos,
    })));
  } catch (err) { return next(err); }
});

// POST /api/categorias — ADMIN y BODEGA
categoriaRoutes.post('/', roleMiddleware('ADMIN', 'BODEGA'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });

    const existe = await prisma.categoria.findUnique({ where: { nombre: parsed.data.nombre } });
    if (existe) return res.status(400).json({ error: 'Ya existe una categoría con ese nombre' });

    const nueva = await prisma.categoria.create({ data: parsed.data });
    return res.status(201).json({ mensaje: 'Categoría creada', categoria: nueva });
  } catch (err) { return next(err); }
});

// PUT /api/categorias/:id
categoriaRoutes.put('/:id', roleMiddleware('ADMIN', 'BODEGA'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Number(req.params.id);
    const parsed = schema.partial().safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });

    const actualizada = await prisma.categoria.update({ where: { id }, data: parsed.data });
    return res.json({ mensaje: 'Categoría actualizada', categoria: actualizada });
  } catch (err) { return next(err); }
});

// DELETE /api/categorias/:id — Solo ADMIN
categoriaRoutes.delete('/:id', roleMiddleware('ADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Number(req.params.id);
    await prisma.categoria.delete({ where: { id } });
    return res.json({ mensaje: 'Categoría eliminada' });
  } catch (err) { return next(err); }
});