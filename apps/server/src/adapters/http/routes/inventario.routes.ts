/**
 * inventario.routes.ts
 * HU-06: Inventario multisucursal — stock separado por sucursal
 * HU-07: Integración con SyncService (logPendiente en mutaciones)
 */
import { Router, Request, Response, NextFunction } from 'express';
import { prisma }       from '../../db/prisma/prisma.client';
import { roleMiddleware } from '../middleware/role.middleware';
import { logPendiente, OfflineCache, SyncService } from '../../sync/sync.service';

export const inventarioRoutes = Router();

export async function sincronizarStockTotal(productoId: number): Promise<void> {
  const resultado = await prisma.stockSucursal.aggregate({
    where: { productoId },
    _sum:  { cantidad: true },
  });
  const totalStock = resultado._sum.cantidad ?? 0;
  await prisma.producto.update({
    where: { id: productoId },
    data:  { stockActual: totalStock },
  });
}

async function getStockTotal(productoId: number): Promise<number> {
  const r = await prisma.stockSucursal.aggregate({
    where: { productoId },
    _sum:  { cantidad: true },
  });
  return r._sum.cantidad ?? 0;
}

// ── GET /api/inventario/status ──────────────────────────────────────────
inventarioRoutes.get('/status', (_req, res) => {
  res.json({ online: SyncService.isOnline() });
});

// ── GET /api/inventario/stock/:sucursalId ───────────────────────────────
inventarioRoutes.get('/stock/:sucursalId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const sucursalId = Number(req.params.sucursalId);
    const cacheKey   = `stock:${sucursalId}`;
    if (!SyncService.isOnline()) {
      const cached = OfflineCache.get(cacheKey);
      if (cached) return res.json(cached);
    }
    const stocks = await prisma.stockSucursal.findMany({
      where:   { sucursalId },
      include: {
        producto: {
          select: {
            id: true, nombre: true, codigoBarras: true,
            precioVenta: true, precioConIva: true, tieneIva: true,
            tipoUnidad: true, activo: true,
            categoria: { select: { nombre: true } },
          },
        },
      },
      orderBy: { producto: { nombre: 'asc' } },
    });
    OfflineCache.set(cacheKey, stocks);
    return res.json(stocks);
  } catch (err) { return next(err); }
});

// ── GET /api/inventario/criticos/:sucursalId ────────────────────────────
inventarioRoutes.get('/criticos/:sucursalId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const sucursalId = Number(req.params.sucursalId);
    const criticos = await prisma.stockSucursal.findMany({
      where: {
        sucursalId,
        producto: { activo: true },
        cantidad:  { lte: prisma.stockSucursal.fields.minimo as any },
      },
      include: {
        producto: { select: { nombre: true, tipoUnidad: true } },
      },
      orderBy: { cantidad: 'asc' },
    });
    return res.json({ total: criticos.length, criticos });
  } catch (err) { return next(err); }
});

// ── PATCH /api/inventario/:productoId/ajuste ────────────────────────────
inventarioRoutes.patch(
  '/:productoId/ajuste',
  roleMiddleware('ADMIN', 'BODEGA'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const productoId = Number(req.params.productoId);
      const sucursalId = Number(req.body.sucursalId);
      const cantidad   = Number(req.body.cantidad);
      const minimo     = Number(req.body.minimo ?? 0);
      const motivo     = req.body.motivo as string | undefined;
      if (!Number.isFinite(cantidad)) return res.status(400).json({ error: 'cantidad inválida' });
      if (!sucursalId)                return res.status(400).json({ error: 'sucursalId requerido' });
      const stock = await prisma.stockSucursal.upsert({
        where:  { productoId_sucursalId: { productoId, sucursalId } },
        create: { productoId, sucursalId, cantidad: Math.max(0, cantidad), minimo },
        update: { cantidad, minimo },
      });
      await sincronizarStockTotal(productoId);
      await logPendiente('stockSucursal', 'UPDATE', {
        id: stock.id, productoId, sucursalId, cantidad: stock.cantidad, motivo,
      }, (req as any).user?.id);
      OfflineCache.invalidate(`stock:${sucursalId}`);
      return res.json({ ok: true, stock, stockTotal: await getStockTotal(productoId) });
    } catch (err) { return next(err); }
  }
);

// ── POST /api/inventario/transferencia ─────────────────────────────────
inventarioRoutes.post(
  '/transferencia',
  roleMiddleware('ADMIN'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { productoId, origenId, destinoId, cantidad } = req.body as {
        productoId: number;
        origenId:   number;
        destinoId:  number;
        cantidad:   number;
      };
      if (!productoId || !origenId || !destinoId || !cantidad || cantidad <= 0) {
        return res.status(400).json({ error: 'Datos de transferencia inválidos' });
      }
      const origen = await prisma.stockSucursal.findUnique({
        where: { productoId_sucursalId: { productoId, sucursalId: origenId } },
      });
      if (!origen || origen.cantidad < cantidad) {
        return res.status(409).json({
          error: `Stock insuficiente en sucursal origen. Disponible: ${origen?.cantidad ?? 0}`,
        });
      }
      const [stockOrigen, stockDestino] = await prisma.$transaction([
        prisma.stockSucursal.update({
          where: { productoId_sucursalId: { productoId, sucursalId: origenId } },
          data:  { cantidad: { decrement: cantidad } },
        }),
        prisma.stockSucursal.upsert({
          where:  { productoId_sucursalId: { productoId, sucursalId: destinoId } },
          create: { productoId, sucursalId: destinoId, cantidad, minimo: 0 },
          update: { cantidad: { increment: cantidad } },
        }),
      ]);
      await sincronizarStockTotal(productoId);
      OfflineCache.invalidate(`stock:${origenId}`);
      OfflineCache.invalidate(`stock:${destinoId}`);
      return res.json({
        mensaje: 'Transferencia realizada',
        origen:  stockOrigen,
        destino: stockDestino,
      });
    } catch (err) { return next(err); }
  }
);

// ── GET /api/inventario/stock-comparativo ───────────────────────────────
// T-06.1: Stock de todos los productos en AMBAS sucursales
inventarioRoutes.get(
  '/stock-comparativo',
  roleMiddleware('ADMIN'),
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const productos = await prisma.producto.findMany({
        where: { activo: true },
        select: {
          id:          true,
          nombre:      true,
          codigoBarras: true,
          tipoUnidad:  true,
          stockMinimo: true,
          precioVenta: true,
          categoria:   { select: { nombre: true } },
          stocks: {
            include: {
              sucursal: { select: { id: true, nombre: true } },
            },
          },
        },
        orderBy: { nombre: 'asc' },
      });

      const resultado = productos.map(p => {
        const sucursales = p.stocks.map(s => ({
          sucursalId:     s.sucursalId,
          sucursalNombre: s.sucursal.nombre,
          cantidad:       s.cantidad,
          minimo:         s.minimo,
          estado:
            s.cantidad === 0       ? 'critico'  :
            s.cantidad <= s.minimo ? 'bajo'      :
                                     'disponible',
        }));
        const stockTotal = sucursales.reduce((acc, s) => acc + s.cantidad, 0);
        return {
          id:           p.id,
          nombre:       p.nombre,
          codigoBarras: p.codigoBarras,
          tipoUnidad:   p.tipoUnidad,
          stockMinimo:  p.stockMinimo,
          precioVenta:  p.precioVenta,
          categoria:    p.categoria?.nombre ?? 'Sin categoría',
          stockTotal,
          sucursales,
        };
      });

      return res.json(resultado);
    } catch (err) { return next(err); }
  }
);

// ── GET /api/inventario/criticos-por-sucursal ───────────────────────────────
// T-06.5: Conteo de productos críticos (cantidad <= minimo) agrupado por sucursal.
// Incluye TODAS las sucursales aunque no tengan stock registrado.
inventarioRoutes.get(
  '/criticos-por-sucursal',
  roleMiddleware('ADMIN'),
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const sucursales = await prisma.sucursal.findMany({
        orderBy: { id: 'asc' },
      });

      const resultado = await Promise.all(
        sucursales.map(async suc => {
          const [{ count }] = await prisma.$queryRaw<[{ count: bigint }]>`
            SELECT COUNT(*)::int AS count
            FROM stock_sucursal ss
            JOIN productos p ON p.id = ss.producto_id
            WHERE ss.sucursal_id = ${suc.id}
              AND p.activo = true
              AND ss.cantidad <= ss.minimo
          `;
          return {
            sucursalId:     suc.id,
            sucursalNombre: suc.nombre,
            criticos:       Number(count),
          };
        })
      );

      return res.json(resultado);
    } catch (err) { return next(err); }
  }
);

// ── GET /api/inventario/sync-pendientes ─────────────────────────────────
inventarioRoutes.get('/sync-pendientes', async (_req, res, next) => {
  try {
    const count   = await prisma.syncLog.count({ where: { status: 'PENDIENTE' } });
    const errores = await prisma.syncLog.count({ where: { status: 'ERROR' } });
    return res.json({ pendientes: count, errores, online: SyncService.isOnline() });
  } catch (err) { return next(err); }
});