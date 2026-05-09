/**
 * T-10.2 — Servicios y endpoints de cortes de caja
 * Pacheco
 *
 * X → lectura parcial, toma ventas desde el último corte del cajero
 * Y → cierre de cajero, consolida ventas desde el último corte Y
 * Z → cierre total del día/sucursal, agrupa todos los Y del día (solo ADMIN)
 *
 * Endpoints:
 *   POST /api/caja/corte-x
 *   POST /api/caja/corte-y
 *   POST /api/caja/corte-z  { fecha?: string }
 *   GET  /api/caja/cortes   ?tipo=&sucursalId=&fecha=&limit=
 *   GET  /api/caja/preview  ?tipo=X|Y|Z
 */

import { Router, Request, Response, NextFunction } from 'express';
import { prisma }          from '../../db/prisma/prisma.client';
import { roleMiddleware }  from '../middleware/role.middleware';

export const cajaRoutes = Router();
const corteCajaRepo = (prisma as any).corteCaja;

// ── Helpers de fecha ──────────────────────────────────────────────────────

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}
function endOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
}

// ── Helper: calcular totales por método de pago ───────────────────────────
// En el esquema actual FacturaDte no guarda el método de pago explícito.
// Se considera efectivo por defecto y se mantiene transferencia/tarjeta en 0.
function calcularTotales(facturas: any[]) {
  return facturas.reduce(
    (acc, f) => {
      const total = Number(f.total ?? 0);
      acc.efectivo += total;
      acc.totalGeneral += total;
      return acc;
    },
    { efectivo: 0, tarjeta: 0, otros: 0, totalGeneral: 0 }
  );
}

async function obtenerUltimoCorteY(sucursalId: number, cajeroId: number) {
  return corteCajaRepo.findFirst({
    where: { sucursalId, cajeroId, tipo: 'Y' },
    orderBy: { fechaFin: 'desc' },
    select: { fechaFin: true },
  });
}

async function obtenerFacturasParaCorteXY(sucursalId: number, cajeroId: number) {
  const ultimoCorteY = await obtenerUltimoCorteY(sucursalId, cajeroId);
  const desde = ultimoCorteY?.fechaFin;

  return prisma.facturaDte.findMany({
    where: {
      sucursalId,
      usuarioId: cajeroId,
      ...(desde ? { creadoEn: { gt: desde } } : {}),
    },
    orderBy: { creadoEn: 'asc' },
  });
}

// ── GET /api/caja/preview — totales sin confirmar (para el modal) ─────────

cajaRoutes.get('/preview', roleMiddleware('ADMIN', 'CAJERO'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tipo       = (req.query.tipo as string ?? 'X').toUpperCase();
    const sucursalId = req.usuario!.sucursalId!;
    const cajeroId   = req.usuario!.id;
    const hoy        = new Date();

    let facturas: any[] = [];

    if (tipo === 'X' || tipo === 'Y') {
      facturas = await obtenerFacturasParaCorteXY(sucursalId, cajeroId);
    } else if (tipo === 'Z') {
      facturas = await prisma.facturaDte.findMany({
        where: {
          sucursalId,
          creadoEn: { gte: startOfDay(hoy), lte: endOfDay(hoy) },
        },
      });
    }

    const totales = calcularTotales(facturas);

    res.json({
      tipo,
      cantidadVentas: facturas.length,
      ...totales,
    });
  } catch (err) { next(err); }
});

// ── POST /api/caja/corte-x ────────────────────────────────────────────────

cajaRoutes.post('/corte-x', roleMiddleware('ADMIN', 'CAJERO'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const sucursalId = req.usuario!.sucursalId!;
    const cajeroId   = req.usuario!.id;

    const facturas = await obtenerFacturasParaCorteXY(sucursalId, cajeroId);

    const totales = calcularTotales(facturas);

    // X no marca nada como cerrado — solo registra el corte
    const corte = await corteCajaRepo.create({
      data: {
        sucursalId,
        cajeroId,
        tipo:           'X',
        fechaInicio:    facturas.length > 0 ? facturas[0].creadoEn : new Date(),
        fechaFin:       new Date(),
        totalEfectivo:  totales.efectivo,
        totalTarjeta:   totales.tarjeta,
        totalTransferencia: totales.otros,
        totalGeneral:   totales.totalGeneral,
        cantidadVentas: facturas.length,
        observaciones:  'Corte X — lectura parcial sin cierre',
      },
    });

    res.json(corte);
  } catch (err) { next(err); }
});

// ── POST /api/caja/corte-y ────────────────────────────────────────────────

cajaRoutes.post('/corte-y', roleMiddleware('ADMIN', 'CAJERO'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const sucursalId = req.usuario!.sucursalId!;
    const cajeroId   = req.usuario!.id;

    const facturas = await obtenerFacturasParaCorteXY(sucursalId, cajeroId);

    const totales = calcularTotales(facturas);

    const corte = await corteCajaRepo.create({
      data: {
        sucursalId,
        cajeroId,
        tipo:           'Y',
        fechaInicio:    facturas.length > 0 ? facturas[0].creadoEn : new Date(),
        fechaFin:       new Date(),
        totalEfectivo:  totales.efectivo,
        totalTarjeta:   totales.tarjeta,
        totalTransferencia: totales.otros,
        totalGeneral:   totales.totalGeneral,
        cantidadVentas: facturas.length,
        observaciones:  'Corte Y — cierre de cajero',
      },
    });

    res.json(corte);
  } catch (err) { next(err); }
});

// ── POST /api/caja/corte-z ────────────────────────────────────────────────

cajaRoutes.post('/corte-z', roleMiddleware('ADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const sucursalId = req.usuario!.sucursalId!;
    const fecha      = req.body.fecha ? new Date(req.body.fecha) : new Date();
    const inicioDia = startOfDay(fecha);
    const finDia = endOfDay(fecha);

    // En esta implementación "sin campo cerrada", consideramos que una venta
    // está cerrada operativamente cuando quedó incluida en un corte Y.
    const ventasDelDia = await prisma.facturaDte.count({
      where: {
        sucursalId,
        creadoEn: { gte: inicioDia, lte: finDia },
      },
    });

    // Agrupar todos los cortes Y del día
    const cortesY: Array<{
      totalEfectivo: number;
      totalTarjeta: number;
      totalTransferencia: number;
      totalGeneral: number;
      cantidadVentas: number;
    }> = await corteCajaRepo.findMany({
      where: {
        sucursalId,
        tipo:     'Y',
        fechaFin: { gte: inicioDia, lte: finDia },
      },
    });

    const totales = cortesY.reduce(
      (acc: { efectivo: number; tarjeta: number; otros: number; totalGeneral: number; cantidad: number }, c: { totalEfectivo: number; totalTarjeta: number; totalTransferencia: number; totalGeneral: number; cantidadVentas: number }) => ({
        efectivo:     acc.efectivo     + c.totalEfectivo,
        tarjeta:      acc.tarjeta      + c.totalTarjeta,
        otros:        acc.otros        + c.totalTransferencia,
        totalGeneral: acc.totalGeneral + c.totalGeneral,
        cantidad:     acc.cantidad     + c.cantidadVentas,
      }),
      { efectivo: 0, tarjeta: 0, otros: 0, totalGeneral: 0, cantidad: 0 }
    );

    if (totales.cantidad < ventasDelDia) {
      const faltantes = ventasDelDia - totales.cantidad;
      return res.status(409).json({
        error: `Faltan ${faltantes} venta(s) por incluir en cortes Y del día.`,
        code: 'Y_PENDIENTES',
      });
    }

    const corte = await corteCajaRepo.create({
      data: {
        sucursalId,
        cajeroId:       null,
        tipo:           'Z',
        fechaInicio:    inicioDia,
        fechaFin:       new Date(),
        totalEfectivo:  totales.efectivo,
        totalTarjeta:   totales.tarjeta,
        totalTransferencia: totales.otros,
        totalGeneral:   totales.totalGeneral,
        cantidadVentas: totales.cantidad,
        observaciones:  `Corte Z — agrupa ${cortesY.length} cortes Y del día`,
      },
    });

    res.json(corte);
  } catch (err) { next(err); }
});

// ── GET /api/caja/cortes — historial con filtros ──────────────────────────

cajaRoutes.get('/cortes', roleMiddleware('ADMIN', 'CAJERO'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tipo, fecha, limit } = req.query;
    const rol        = req.usuario!.rol;
    const sucursalId = req.usuario!.sucursalId!;
    const cajeroId   = req.usuario!.id;

    const where: any = {};

    // CAJERO solo ve los suyos, ADMIN ve todos de su sucursal
    if (rol === 'CAJERO') {
      where.cajeroId   = cajeroId;
      where.sucursalId = sucursalId;
    } else {
      where.sucursalId = Number(req.query.sucursalId) || sucursalId;
    }

    if (tipo)  where.tipo    = (tipo as string).toUpperCase();
    if (fecha) {
      const d = new Date(fecha as string);
      where.fechaFin = { gte: startOfDay(d), lte: endOfDay(d) };
    }

    const cortes = await corteCajaRepo.findMany({
      where,
      orderBy: { fechaFin: 'desc' },
      take:    limit ? Number(limit) : 50,
      include: {
        cajero:   { select: { nombre: true } },
        sucursal: { select: { nombre: true } },
      },
    });

    res.json(cortes);
  } catch (err) { next(err); }
});
