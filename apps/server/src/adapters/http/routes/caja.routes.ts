/**
 * caja.routes.ts
 * T-10.1 / T-10.3: Endpoints para el módulo de Corte de Caja (X, Y, Z)
 *
 * GET  /api/caja/cortes            → historial con filtros opcionales
 * GET  /api/caja/preview/:tipo     → preview de totales antes de confirmar
 * POST /api/caja/corte             → genera el corte y lo persiste
 */

import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../../db/prisma/prisma.client';
import { roleMiddleware } from '../middleware/role.middleware';
import { assertSameSucursal } from '../middleware/sucursal.guard';
import { logPendiente } from '../../sync/sync.service';

export const cajaRoutes = Router();

// ── Schemas ────────────────────────────────────────────────────────────────

const TipoCorteEnum = z.enum(['X', 'Y', 'Z']);

const CorteSchema = z.object({
  tipo:      TipoCorteEnum,
  sucursalId: z.number().int().positive(),
  observaciones: z.string().optional(),
});

// ── Helpers ────────────────────────────────────────────────────────────────

/** Inicio del día actual en UTC (00:00:00) */
function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Calcula la fecha de inicio del período según el tipo de corte.
 *  - X e Y: desde el último Corte Y de ese cajero (o inicio del día si no hay)
 *  - Z: inicio del día actual
 */
async function calcularFechaInicio(
  tipo: 'X' | 'Y' | 'Z',
  sucursalId: number,
  cajeroId: number | null,
): Promise<Date> {
  if (tipo === 'Z') {
    return startOfToday();
  }

  // Buscar el último corte Y del cajero en la misma sucursal
  const ultimo = cajeroId
    ? await prisma.corteCaja.findFirst({
        where: { tipo: 'Y', sucursalId, cajeroId },
        orderBy: { fechaFin: 'desc' },
      })
    : null;

  return ultimo ? new Date(ultimo.fechaFin) : startOfToday();
}

/** Suma ventas del período para una sucursal (y opcionalmente un cajero) */
async function sumarVentas(
  sucursalId: number,
  desde: Date,
  hasta: Date,
  cajeroId?: number | null,
) {
  const where: any = {
    sucursalId,
    creadoEn: { gte: desde, lte: hasta },
  };
  if (cajeroId) where.usuarioId = cajeroId;

  const facturas = await prisma.facturaDte.findMany({
    where,
    select: { total: true, totalSinIva: true, iva: true },
  });

  const totalGeneral     = facturas.reduce((s, f) => s + (f.total        ?? 0), 0);
  const subtotalSinIva   = facturas.reduce((s, f) => s + (f.totalSinIva  ?? 0), 0);
  const ivaTotal         = facturas.reduce((s, f) => s + (f.iva          ?? 0), 0);
  const cantidadVentas   = facturas.length;

  // Por ahora todos los totales se asignan a efectivo (HU-18 añadirá métodos de pago)
  return {
    totalGeneral:        Math.round(totalGeneral     * 100) / 100,
    totalEfectivo:       Math.round(totalGeneral     * 100) / 100,
    totalTarjeta:        0,
    totalTransferencia:  0,
    subtotalSinIva:      Math.round(subtotalSinIva   * 100) / 100,
    ivaTotal:            Math.round(ivaTotal          * 100) / 100,
    cantidadVentas,
  };
}

// ── GET /api/caja/cortes ────────────────────────────────────────────────────

cajaRoutes.get(
  '/cortes',
  roleMiddleware('ADMIN', 'CAJERO', 'BODEGA'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const sucursalId = req.usuario?.sucursalId;
      const esAdmin    = req.usuario?.rol === 'ADMIN';

      const { tipo, fecha } = req.query;

      const where: any = {};

      // No-ADMIN solo ve cortes de su sucursal
      if (!esAdmin) {
        if (!sucursalId) return res.status(403).json({ error: 'Sin sucursal asignada' });
        where.sucursalId = sucursalId;
      }

      if (tipo && tipo !== 'Todos') where.tipo = String(tipo);

      if (fecha) {
        const d = new Date(String(fecha));
        const inicio = new Date(d); inicio.setHours(0, 0, 0, 0);
        const fin    = new Date(d); fin.setHours(23, 59, 59, 999);
        where.fechaFin = { gte: inicio, lte: fin };
      }

      const cortes = await prisma.corteCaja.findMany({
        where,
        include: {
          cajero:  { select: { id: true, nombre: true } },
          sucursal: { select: { id: true, nombre: true } },
        },
        orderBy: { fechaFin: 'desc' },
        take: 100,
      });

      return res.json(cortes);
    } catch (err) {
      return next(err);
    }
  },
);

// ── GET /api/caja/preview/:tipo ─────────────────────────────────────────────

cajaRoutes.get(
  '/preview/:tipo',
  roleMiddleware('ADMIN', 'CAJERO'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsedTipo = TipoCorteEnum.safeParse(req.params.tipo);
      if (!parsedTipo.success) {
        return res.status(400).json({ error: 'Tipo de corte inválido. Debe ser X, Y o Z' });
      }

      const tipo       = parsedTipo.data;
      const sucursalId = Number(req.query.sucursalId);
      const cajeroId   = req.usuario?.id    ?? null;
      const esAdmin    = req.usuario?.rol === 'ADMIN';

      if (isNaN(sucursalId) || sucursalId < 1) {
        return res.status(400).json({ error: 'sucursalId inválido' });
      }

      // Corte Z solo para ADMIN
      if (tipo === 'Z' && !esAdmin) {
        return res.status(403).json({ error: 'Solo el Administrador puede generar el Corte Z' });
      }

      if (!assertSameSucursal(req, res, sucursalId)) return;

      const sucursal = await prisma.sucursal.findUnique({
        where: { id: sucursalId },
        select: { nombre: true },
      });
      if (!sucursal) return res.status(404).json({ error: 'Sucursal no encontrada' });

      const cajero = cajeroId
        ? await prisma.usuario.findUnique({
            where:  { id: cajeroId },
            select: { nombre: true },
          })
        : null;

      const hasta    = new Date();
      const desde    = await calcularFechaInicio(tipo, sucursalId, cajeroId);

      // Para Corte Z calculamos ventas de todos los cajeros
      const totales = await sumarVentas(
        sucursalId,
        desde,
        hasta,
        tipo === 'Z' ? null : cajeroId,
      );

      // Desglose por cajero solo para Corte Z
      let desgloseCajeros: { cajero: string; ventas: number; total: number }[] | undefined;
      if (tipo === 'Z') {
        const cajeros = await prisma.usuario.findMany({
          where: { sucursalId, activo: true },
          select: { id: true, nombre: true },
        });

        desgloseCajeros = await Promise.all(
          cajeros.map(async (c) => {
            const t = await sumarVentas(sucursalId, desde, hasta, c.id);
            return { cajero: c.nombre, ventas: t.cantidadVentas, total: t.totalGeneral };
          }),
        );

        // Filtrar cajeros sin ventas en el período
        desgloseCajeros = desgloseCajeros.filter((d) => d.ventas > 0);
      }

      return res.json({
        tipo,
        sucursalId,
        sucursalNombre:    sucursal.nombre,
        cajeroNombre:      cajero?.nombre ?? 'Todos los cajeros',
        fechaInicio:       desde.toISOString(),
        fechaFin:          hasta.toISOString(),
        cantidadVentas:    totales.cantidadVentas,
        totalEfectivo:     totales.totalEfectivo,
        totalTarjeta:      totales.totalTarjeta,
        totalTransferencia: totales.totalTransferencia,
        totalGeneral:      totales.totalGeneral,
        subtotalSinIva:    totales.subtotalSinIva,
        ivaTotal:          totales.ivaTotal,
        desgloseCajeros,
      });
    } catch (err) {
      return next(err);
    }
  },
);

// ── POST /api/caja/corte ────────────────────────────────────────────────────

cajaRoutes.post(
  '/corte',
  roleMiddleware('ADMIN', 'CAJERO'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = CorteSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.issues[0].message });
      }

      const { tipo, sucursalId, observaciones } = parsed.data;
      const cajeroId = req.usuario?.id    ?? null;
      const esAdmin  = req.usuario?.rol === 'ADMIN';

      // Validaciones de negocio
      if (tipo === 'Z' && !esAdmin) {
        return res.status(403).json({ error: 'Solo el Administrador puede generar el Corte Z' });
      }

      if (!assertSameSucursal(req, res, sucursalId)) return;

      // Validación adicional para Corte Z:
      // No se puede generar si ya existe un Corte Z hoy
      if (tipo === 'Z') {
        const zHoy = await prisma.corteCaja.findFirst({
          where: {
            tipo: 'Z',
            sucursalId,
            fechaFin: { gte: startOfToday() },
          },
        });
        if (zHoy) {
          return res.status(409).json({
            error: 'Ya existe un Corte Z para el día de hoy en esta sucursal',
          });
        }
      }

      const hasta  = new Date();
      const desde  = await calcularFechaInicio(tipo, sucursalId, cajeroId);
      const totales = await sumarVentas(
        sucursalId,
        desde,
        hasta,
        tipo === 'Z' ? null : cajeroId,
      );

      const corte = await prisma.corteCaja.create({
        data: {
          sucursalId,
          cajeroId:            tipo === 'Z' ? null : cajeroId,
          tipo,
          fechaInicio:         desde,
          fechaFin:            hasta,
          totalEfectivo:       totales.totalEfectivo,
          totalTarjeta:        totales.totalTarjeta,
          totalTransferencia:  totales.totalTransferencia,
          totalGeneral:        totales.totalGeneral,
          cantidadVentas:      totales.cantidadVentas,
          observaciones:       observaciones ?? null,
        },
        include: {
          cajero:   { select: { id: true, nombre: true } },
          sucursal: { select: { id: true, nombre: true } },
        },
      });

      await logPendiente('corteCaja', 'CREATE', {
        id: corte.id, tipo, sucursalId, totalGeneral: totales.totalGeneral,
      }, cajeroId ?? undefined);

      return res.status(201).json({ ok: true, corte });
    } catch (err) {
      return next(err);
    }
  },
);