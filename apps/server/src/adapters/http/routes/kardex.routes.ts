import { Router, Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../../db/prisma/prisma.client';
import { roleMiddleware } from '../middleware/role.middleware';
import { assertSameSucursal } from '../middleware/sucursal.guard';

export const kardexRoutes = Router();

const KardexQuerySchema = z.object({
  productoId: z.coerce.number().int().positive(),
  sucursalId: z.coerce.number().int().positive().optional(),
  fechaInicio: z.string().trim().min(1).optional(),
  fechaFin: z.string().trim().min(1).optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(200).optional().default(50),
  orden: z.enum(['asc', 'desc']).optional().default('desc'),
});

function parseFecha(valor: string | undefined, finDelDia = false): Date | undefined {
  if (!valor) return undefined;

  const fechaSolo = /^\d{4}-\d{2}-\d{2}$/.test(valor);
  const fecha = fechaSolo
    ? new Date(`${valor}T${finDelDia ? '23:59:59.999' : '00:00:00.000'}Z`)
    : new Date(valor);

  return Number.isNaN(fecha.getTime()) ? undefined : fecha;
}

kardexRoutes.get(
  '/',
  roleMiddleware('ADMIN', 'BODEGA'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = KardexQuerySchema.safeParse(req.query);
      if (!parsed.success) {
        return res.status(400).json({
          error: 'Parametros invalidos',
          detalle: parsed.error.flatten().fieldErrors,
        });
      }

      const {
        productoId,
        sucursalId,
        fechaInicio,
        fechaFin,
        page,
        limit,
        orden,
      } = parsed.data;

      const desde = parseFecha(fechaInicio);
      const hasta = parseFecha(fechaFin, true);

      if (fechaInicio && !desde) {
        return res.status(400).json({ error: 'fechaInicio invalida' });
      }

      if (fechaFin && !hasta) {
        return res.status(400).json({ error: 'fechaFin invalida' });
      }

      if (desde && hasta && desde > hasta) {
        return res.status(400).json({ error: 'fechaInicio no puede ser mayor que fechaFin' });
      }

      const esAdmin = req.usuario?.rol === 'ADMIN';
      const sucursalFiltro = esAdmin ? sucursalId : req.usuario?.sucursalId;

      if (!esAdmin && !sucursalFiltro) {
        return res.status(403).json({ error: 'Tu usuario no tiene sucursal asignada' });
      }

      if (sucursalFiltro && !assertSameSucursal(req, res, sucursalFiltro)) return;

      const where: Prisma.MovimientoInventarioWhereInput = {
        productoId,
        ...(sucursalFiltro ? { sucursalId: sucursalFiltro } : {}),
        ...((desde || hasta)
          ? {
              fechaMovimiento: {
                ...(desde ? { gte: desde } : {}),
                ...(hasta ? { lte: hasta } : {}),
              },
            }
          : {}),
      };

      const skip = (page - 1) * limit;

      const [total, movimientos] = await prisma.$transaction([
        prisma.movimientoInventario.count({ where }),
        prisma.movimientoInventario.findMany({
          where,
          orderBy: { fechaMovimiento: orden },
          skip,
          take: limit,
          include: {
            producto: {
              select: {
                id: true,
                nombre: true,
                codigoBarras: true,
                tipoUnidad: true,
              },
            },
            sucursal: {
              select: {
                id: true,
                nombre: true,
              },
            },
            usuario: {
              select: {
                id: true,
                nombre: true,
                email: true,
                rol: true,
              },
            },
          },
        }),
      ]);

      return res.json({
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        orderBy: { fechaMovimiento: orden },
        movimientos,
      });
    } catch (error) {
      return next(error);
    }
  },
);
