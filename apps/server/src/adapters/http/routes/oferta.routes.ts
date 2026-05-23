import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../../db/prisma/prisma.client';
import { roleMiddleware } from '../middleware/role.middleware';

export const ofertaRoutes = Router();

const OfertaBaseSchema = z.object({
  productoId: z.coerce.number().int().positive(),
  precioOferta: z.coerce.number().positive(),
  fechaInicio: z.coerce.date(),
  fechaFin: z.coerce.date(),
  activo: z.boolean().optional().default(true),
}).refine((data) => data.fechaFin > data.fechaInicio, {
  message: 'fechaFin debe ser posterior a fechaInicio',
  path: ['fechaFin'],
});

const CrearOfertaSchema = OfertaBaseSchema;

const ActualizarOfertaSchema = z.object({
  productoId: z.coerce.number().int().positive().optional(),
  precioOferta: z.coerce.number().positive().optional(),
  fechaInicio: z.coerce.date().optional(),
  fechaFin: z.coerce.date().optional(),
  activo: z.boolean().optional(),
}).refine((data) => {
  if (!data.fechaInicio || !data.fechaFin) return true;
  return data.fechaFin > data.fechaInicio;
}, {
  message: 'fechaFin debe ser posterior a fechaInicio',
  path: ['fechaFin'],
});

const ListarOfertasSchema = z.object({
  productoId: z.coerce.number().int().positive().optional(),
  activo: z.enum(['true', 'false']).optional(),
  vigentes: z.enum(['true', 'false']).optional(),
  take: z.coerce.number().int().positive().max(200).optional().default(100),
});

ofertaRoutes.get(
  '/',
  roleMiddleware('ADMIN'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = ListarOfertasSchema.safeParse(req.query);
      if (!parsed.success) {
        return res.status(400).json({
          error: 'Parametros invalidos',
          detalle: parsed.error.flatten().fieldErrors,
        });
      }

      const { productoId, activo, vigentes, take } = parsed.data;
      const ahora = new Date();

      const ofertas = await prisma.oferta.findMany({
        where: {
          ...(productoId ? { productoId } : {}),
          ...(activo !== undefined ? { activo: activo === 'true' } : {}),
          ...(vigentes === 'true' ? {
            activo: true,
            fechaInicio: { lte: ahora },
            fechaFin: { gte: ahora },
          } : {}),
        },
        include: {
          producto: {
            select: {
              id: true,
              nombre: true,
              precioVenta: true,
              precioConIva: true,
            },
          },
        },
        orderBy: { creadoEn: 'desc' },
        take,
      });

      return res.json({ total: ofertas.length, ofertas });
    } catch (error) {
      return next(error);
    }
  },
);

ofertaRoutes.post(
  '/',
  roleMiddleware('ADMIN'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = CrearOfertaSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          error: 'Datos de oferta invalidos',
          detalle: parsed.error.flatten().fieldErrors,
        });
      }

      const { productoId, precioOferta, fechaInicio, fechaFin, activo } = parsed.data;
      const producto = await prisma.producto.findFirst({
        where: { id: productoId, activo: true },
        select: { id: true, nombre: true, precioVenta: true, precioConIva: true },
      });

      if (!producto) return res.status(404).json({ error: 'Producto no encontrado' });

      const precioOriginal = obtenerPrecioOriginal(producto);
      if (precioOferta >= precioOriginal) {
        return res.status(400).json({ error: 'El precio de oferta debe ser menor al precio original' });
      }

      if (activo) {
        const ofertaActiva = await prisma.oferta.findFirst({
          where: { productoId, activo: true },
          select: { id: true },
        });

        if (ofertaActiva) {
          return res.status(409).json({ error: 'El producto ya tiene una oferta activa' });
        }
      }

      const oferta = await prisma.oferta.create({
        data: { productoId, precioOferta, fechaInicio, fechaFin, activo },
        include: { producto: { select: { id: true, nombre: true, precioVenta: true, precioConIva: true } } },
      });

      return res.status(201).json({ mensaje: 'Oferta creada', oferta });
    } catch (error) {
      return next(error);
    }
  },
);

ofertaRoutes.patch(
  '/:id',
  roleMiddleware('ADMIN'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isInteger(id) || id < 1) return res.status(400).json({ error: 'id invalido' });

      const parsed = ActualizarOfertaSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          error: 'Datos de oferta invalidos',
          detalle: parsed.error.flatten().fieldErrors,
        });
      }

      const actual = await prisma.oferta.findUnique({
        where: { id },
        include: { producto: { select: { id: true, nombre: true, precioVenta: true, precioConIva: true } } },
      });

      if (!actual) return res.status(404).json({ error: 'Oferta no encontrada' });

      const productoId = parsed.data.productoId ?? actual.productoId;
      const producto = parsed.data.productoId
        ? await prisma.producto.findFirst({
            where: { id: productoId, activo: true },
            select: { id: true, nombre: true, precioVenta: true, precioConIva: true },
          })
        : actual.producto;

      if (!producto) return res.status(404).json({ error: 'Producto no encontrado' });

      const precioOferta = parsed.data.precioOferta ?? actual.precioOferta;
      const precioOriginal = obtenerPrecioOriginal(producto);
      if (precioOferta >= precioOriginal) {
        return res.status(400).json({ error: 'El precio de oferta debe ser menor al precio original' });
      }

      const activoNuevo = parsed.data.activo ?? actual.activo;
      if (activoNuevo) {
        const ofertaActiva = await prisma.oferta.findFirst({
          where: { productoId, activo: true, id: { not: id } },
          select: { id: true },
        });

        if (ofertaActiva) {
          return res.status(409).json({ error: 'El producto ya tiene una oferta activa' });
        }
      }

      const fechaInicio = parsed.data.fechaInicio ?? actual.fechaInicio;
      const fechaFin = parsed.data.fechaFin ?? actual.fechaFin;
      if (fechaFin <= fechaInicio) {
        return res.status(400).json({ error: 'fechaFin debe ser posterior a fechaInicio' });
      }

      const oferta = await prisma.oferta.update({
        where: { id },
        data: {
          ...(parsed.data.productoId !== undefined ? { productoId: parsed.data.productoId } : {}),
          ...(parsed.data.precioOferta !== undefined ? { precioOferta: parsed.data.precioOferta } : {}),
          ...(parsed.data.fechaInicio !== undefined ? { fechaInicio: parsed.data.fechaInicio } : {}),
          ...(parsed.data.fechaFin !== undefined ? { fechaFin: parsed.data.fechaFin } : {}),
          ...(parsed.data.activo !== undefined ? { activo: parsed.data.activo } : {}),
        },
        include: { producto: { select: { id: true, nombre: true, precioVenta: true, precioConIva: true } } },
      });

      return res.json({ mensaje: 'Oferta actualizada', oferta });
    } catch (error) {
      return next(error);
    }
  },
);

ofertaRoutes.delete(
  '/:id',
  roleMiddleware('ADMIN'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isInteger(id) || id < 1) return res.status(400).json({ error: 'id invalido' });

      const oferta = await prisma.oferta.update({
        where: { id },
        data: { activo: false },
      });

      return res.json({ mensaje: 'Oferta desactivada', oferta });
    } catch (error: unknown) {
      const e = error as { code?: string };
      if (e.code === 'P2025') return res.status(404).json({ error: 'Oferta no encontrada' });
      return next(error);
    }
  },
);

function obtenerPrecioOriginal(producto: { precioConIva: number | null; precioVenta: number | null }) {
  return Number(producto.precioConIva ?? producto.precioVenta ?? 0);
}
