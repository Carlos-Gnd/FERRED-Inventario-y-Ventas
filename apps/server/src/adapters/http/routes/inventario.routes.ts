import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../../db/prisma/prisma.client';
import { roleMiddleware } from '../middleware/role.middleware';

export const inventarioRoutes = Router();

// GET /api/inventario/criticos — productos bajo stock mínimo
inventarioRoutes.get('/criticos', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const productos = await prisma.producto.findMany({
      where: { activo: true, stockActual: { lte: prisma.producto.fields.stockMinimo as any } },
      include: { categoria: { select: { nombre: true } } },
      orderBy: { stockActual: 'asc' },
    });
    return res.json({ total: productos.length, productos });
  } catch (err) { return next(err); }
});

// PATCH /api/inventario/:productoId/ajuste — ajuste manual de stock
inventarioRoutes.patch('/:productoId/ajuste', roleMiddleware('ADMIN', 'BODEGA'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const productoId = Number(req.params.productoId);
      const { cantidad, motivo } = req.body as { cantidad: number; motivo?: string };

      if (!Number.isFinite(cantidad)) {
        return res.status(400).json({ error: 'cantidad inválida' });
      }

      const actualizado = await prisma.producto.update({
        where: { id: productoId },
        data:  { stockActual: { increment: cantidad } },
      });

      return res.json({ mensaje: 'Stock ajustado', stockActual: actualizado.stockActual });
    } catch (err) { return next(err); }
  }
);