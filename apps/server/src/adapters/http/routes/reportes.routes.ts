/**
 * reportes.routes.ts
 * HU-05: Reportes de ventas con filtros y exportación
 *
 * T-05.1: GET /api/reportes/ventas          — lista paginada de facturas
 * T-05.2: GET /api/reportes/ventas/resumen  — totales y serie por día (reemplaza BUG-A07 mocks)
 */
import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma }          from '../../db/prisma/prisma.client';
import { roleMiddleware }  from '../middleware/role.middleware';
import { assertSameSucursal } from '../middleware/sucursal.guard';

export const reportesRoutes = Router();

// ── Esquema de query params compartido ──────────────────────────
const ReportesQuerySchema = z.object({
  fechaInicio: z.string().date('fechaInicio debe ser YYYY-MM-DD').optional(),
  fechaFin:    z.string().date('fechaFin debe ser YYYY-MM-DD').optional(),
  sucursalId:  z.coerce.number().int().positive().optional(),
  cajeroId:    z.coerce.number().int().positive().optional(),
  limit:       z.coerce.number().int().min(1).max(500).optional().default(200),
});

function parseFecha(valor: string | undefined, horaFin = false): Date | undefined {
  if (!valor) return undefined;
  const d = new Date(valor);
  if (horaFin) {
    d.setUTCHours(23, 59, 59, 999);
  }
  return d;
}

function buildWhere(
  params: z.infer<typeof ReportesQuerySchema>,
  req: Request,
) {
  const esAdmin = req.usuario?.rol === 'ADMIN';

  // No-ADMIN solo puede ver su propia sucursal
  const sucursalId = esAdmin
    ? (params.sucursalId ?? undefined)
    : (req.usuario?.sucursalId ?? undefined);

  // Si no-ADMIN pasa un sucursalId distinto al suyo, lo ignoramos y usamos el suyo
  // (assertSameSucursal valida en endpoints que reciben un recurso ajeno;
  //  aquí filtramos directamente para no exponer datos de otras sucursales)
  return {
    ...(sucursalId   ? { sucursalId }                                   : {}),
    ...(params.cajeroId ? { usuarioId: params.cajeroId }               : {}),
    ...(params.fechaInicio || params.fechaFin
      ? {
          creadoEn: {
            ...(params.fechaInicio ? { gte: parseFecha(params.fechaInicio) }         : {}),
            ...(params.fechaFin    ? { lte: parseFecha(params.fechaFin, true) }      : {}),
          },
        }
      : {}),
  };
}

// ── T-05.1: GET /api/reportes/ventas ────────────────────────────
// Lista de ventas (facturas) con detalles, filtrada por fecha/sucursal/cajero.
reportesRoutes.get(
  '/ventas',
  roleMiddleware('ADMIN', 'CAJERO', 'BODEGA'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = ReportesQuerySchema.safeParse(req.query);
      if (!parsed.success) {
        return res.status(400).json({
          error: 'Parámetros inválidos',
          detalle: parsed.error.flatten().fieldErrors,
        });
      }

      const esAdmin = req.usuario?.rol === 'ADMIN';
      if (!esAdmin && !req.usuario?.sucursalId) {
        return res.status(403).json({ error: 'Tu usuario no tiene sucursal asignada' });
      }

      const where = buildWhere(parsed.data, req);

      const facturas = await prisma.facturaDte.findMany({
        where,
        orderBy: { creadoEn: 'desc' },
        take: parsed.data.limit,
        include: {
          sucursal: { select: { nombre: true } },
          usuario:  { select: { nombre: true } },
          detalles: {
            include: {
              producto: { select: { nombre: true, codigoBarras: true } },
            },
          },
        },
      });

      return res.json({
        total:   facturas.length,
        ventas:  facturas.map(f => ({
          id:            f.id,
          fecha:         f.creadoEn,
          sucursal:      f.sucursal?.nombre ?? null,
          cajero:        f.usuario?.nombre ?? null,
          clienteNombre: f.clienteNombre,
          tipoDte:       f.tipoDte,
          estado:        f.estado,
          totalSinIva:   f.totalSinIva,
          iva:           f.iva,
          total:         f.total,
          items: f.detalles.map(d => ({
            producto:   d.producto.nombre,
            codigoBarras: d.producto.codigoBarras,
            cantidad:   d.cantidad,
            precioUnit: d.precioUnit,
            subtotal:   d.subtotal,
          })),
        })),
      });
    } catch (err) { return next(err); }
  },
);

// ── T-05.2: GET /api/reportes/ventas/resumen ────────────────────
// Agrega totales y serie por día para gráficos (reemplaza mocks BUG-A07).
reportesRoutes.get(
  '/ventas/resumen',
  roleMiddleware('ADMIN', 'CAJERO', 'BODEGA'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = ReportesQuerySchema.safeParse(req.query);
      if (!parsed.success) {
        return res.status(400).json({
          error: 'Parámetros inválidos',
          detalle: parsed.error.flatten().fieldErrors,
        });
      }

      const esAdmin = req.usuario?.rol === 'ADMIN';
      if (!esAdmin && !req.usuario?.sucursalId) {
        return res.status(403).json({ error: 'Tu usuario no tiene sucursal asignada' });
      }

      const where = buildWhere(parsed.data, req);

      const facturas = await prisma.facturaDte.findMany({
        where,
        select: { total: true, creadoEn: true },
        orderBy: { creadoEn: 'asc' },
      });

      if (facturas.length === 0) {
        return res.json({
          totalVentas:    0,
          cantidadVentas: 0,
          promedioVenta:  0,
          ventasPorDia:   [],
        });
      }

      let suma = 0;
      const porDiaMap = new Map<string, number>();

      for (const f of facturas) {
        const monto = Number(f.total ?? 0);
        suma += monto;

        const key = f.creadoEn.toISOString().slice(0, 10); // 'YYYY-MM-DD'
        porDiaMap.set(key, (porDiaMap.get(key) ?? 0) + monto);
      }

      const cantidadVentas = facturas.length;
      const totalVentas    = Number(suma.toFixed(2));
      const promedioVenta  = Number((suma / cantidadVentas).toFixed(2));

      const ventasPorDia = Array.from(porDiaMap.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([fecha, total]) => ({ fecha, total: Number(total.toFixed(2)) }));

      return res.json({ totalVentas, cantidadVentas, promedioVenta, ventasPorDia });
    } catch (err) { return next(err); }
  },
);
