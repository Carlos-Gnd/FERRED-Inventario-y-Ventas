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

// ── BUG-06 FIX: sincronizarStockTotal ───────────────────────
/**
 * PROBLEMA DETECTADO:
 *   productos.stock_actual  → se actualizaba al editar un producto desde ProductsPage
 *   stock_sucursal.cantidad → se actualizaba al hacer ajustes o transferencias
 *   Resultado: los dos valores divergían con el tiempo, datos inconsistentes.
 *
 * DECISIÓN: stock_actual en productos = SUMA de stock_sucursal de todas las sucursales
 *   - Es la fuente de verdad para el Dashboard y reportes globales
 *   - stock_sucursal es la fuente de verdad para el POS (venta por sucursal)
 *
 * CUÁNDO LLAMAR:
 *   - Después de ajuste de inventario   (/ajuste)
 *   - Después de transferencia          (/transferencia)
 *   - Después de una venta              (cuando se implemente HU-02)
 *   - Después de recepción de proveedor (HU-14)
 */
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

// ── GET /api/inventario/status — estado de conectividad ──────
inventarioRoutes.get('/status', (_req, res) => {
  res.json({ online: SyncService.isOnline() });
});

// ── GET /api/inventario/stock/:sucursalId ────────────────────
// Lista el stock de todos los productos para una sucursal
inventarioRoutes.get('/stock/:sucursalId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const sucursalId = Number(req.params.sucursalId);
    const cacheKey   = `stock:${sucursalId}`;

    // Intentar desde caché si offline
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

// ── GET /api/inventario/criticos/:sucursalId ─────────────────
// Productos bajo el mínimo de ESA sucursal
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

// ── PATCH /api/inventario/:productoId/ajuste ─────────────────
// Ajuste manual de stock para una sucursal específica
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

      // Upsert: crea el registro si no existe aún para esta sucursal
      // BUG-06 FIX: update ahora setea cantidad y minimo directamente (no increment)
      //             para que sincronizarStockTotal calcule la suma real entre sucursales
      const stock = await prisma.stockSucursal.upsert({
        where:  { productoId_sucursalId: { productoId, sucursalId } },
        create: { productoId, sucursalId, cantidad: Math.max(0, cantidad), minimo },
        update: { cantidad, minimo },
      });

      // BUG-06 FIX: sincronizar stock_actual como SUMA de todas las sucursales
      await sincronizarStockTotal(productoId);

      // Registrar para sync si estamos offline
      await logPendiente('stockSucursal', 'UPDATE', {
        id: stock.id, productoId, sucursalId, cantidad: stock.cantidad, motivo,
      }, (req as any).user?.id);

      OfflineCache.invalidate(`stock:${sucursalId}`);
      return res.json({ ok: true, stock, stockTotal: await getStockTotal(productoId) });
    } catch (err) { return next(err); }
  }
);

// ── POST /api/inventario/transferencia ───────────────────────
// Transfiere stock entre sucursales (solo ADMIN)
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

      // Verificar stock suficiente en origen
      const origen = await prisma.stockSucursal.findUnique({
        where: { productoId_sucursalId: { productoId, sucursalId: origenId } },
      });

      if (!origen || origen.cantidad < cantidad) {
        return res.status(409).json({
          error: `Stock insuficiente en sucursal origen. Disponible: ${origen?.cantidad ?? 0}`,
        });
      }

      // Ejecutar transferencia en transacción
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

      // BUG-06 FIX: sincronizar stock_actual después de la transferencia
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

// ── GET /api/inventario/sync-pendientes ──────────────────────
// Cuenta de registros pendientes de sincronizar (para indicador UI)
inventarioRoutes.get('/sync-pendientes', async (_req, res, next) => {
  try {
    const count   = await prisma.syncLog.count({ where: { status: 'PENDIENTE' } });
    const errores = await prisma.syncLog.count({ where: { status: 'ERROR' } });
    return res.json({ pendientes: count, errores, online: SyncService.isOnline() });
  } catch (err) { return next(err); }
});