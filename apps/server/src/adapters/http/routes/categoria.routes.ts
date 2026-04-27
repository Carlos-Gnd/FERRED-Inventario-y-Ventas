import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../../db/prisma/prisma.client';
import { roleMiddleware } from '../middleware/role.middleware';
import { obtenerCategoriasSqlite } from '../../db/sqlite/sqlite.client';

export const categoriaRoutes = Router();

const schema = z.object({
  nombre:      z.string().min(2, 'Nombre muy corto'),
  descripcion: z.string().optional(),
});

// GET /api/categorias
categoriaRoutes.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const categorias = await prisma.categoria.findMany({
      where:   { activo: true },
      include: { _count: { select: { productos: true } } },
      orderBy: { nombre: 'asc' },
    });
    console.info('[categorias] modo=online origen=prisma');
    return res.json(categorias.map(c => ({
      id: c.id, nombre: c.nombre, descripcion: c.descripcion,
      nProductos: c._count.productos,
    })));
  } catch (err) {
    if (esErrorConexionPrisma(err)) {
      console.info('[categorias] modo=offline origen=sqlite motivo=prisma_caido');
      return res.json(obtenerCategoriasSqlite());
    }

    return next(err);
  }
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

// DELETE /api/categorias/:id — Solo ADMIN (soft delete para ser consistente
// con el resto del sistema; evita romper FKs con productos existentes)
categoriaRoutes.delete('/:id', roleMiddleware('ADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id) || id < 1) return res.status(400).json({ error: 'id inválido' });

    await prisma.categoria.update({
      where: { id },
      data:  { activo: false },
    });
    return res.json({ mensaje: 'Categoría desactivada' });
  } catch (err) { return next(err); }
});

function esErrorConexionPrisma(err: unknown) {
  const error = err as { code?: unknown; message?: unknown };
  const mensaje = String(error?.message ?? '').toLowerCase();
  const code = String(error?.code ?? '').toLowerCase();

  return (
    ['p1001', 'p1002', 'p1008', 'p1017'].includes(code) ||
    mensaje.includes("can't reach database server") ||
    mensaje.includes('timed out fetching a new connection') ||
    mensaje.includes('connection refused') ||
    mensaje.includes('server has closed the connection') ||
    mensaje.includes('econnrefused') ||
    mensaje.includes('enotfound')
  );
}
