/**
 * inventario.routes.ts
 * HU-06: Inventario multisucursal – stock separado por sucursal
 * HU-07: Integración con SyncService (logPendiente en mutaciones)
 *
 * Sprint 2:
 * T-06.1: GET /api/inventario/stock-comparativo
 * T-07C.2: GET /api/inventario/sync-pendientes
 */
import { Router, Request, Response, NextFunction } from 'express';
import { prisma }         from '../../db/prisma/prisma.client';
import { roleMiddleware } from '../middleware/role.middleware';
import { logPendiente, OfflineCache, SyncService } from '../../sync/sync.service';

export const inventarioRoutes = Router();

// ── BUG-06 FIX: sincronizarStockTotal ──────────────────────────────────
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

    const criticos = await prisma.$queryRaw<Array<{
      id: number; productoId: number; sucursalId: number;
      cantidad: number; minimo: number; nombre: string; tipoUnidad: string | null;
    }>>`
      SELECT ss.id, ss.producto_id AS "productoId", ss.sucursal_id AS "sucursalId",
             ss.cantidad, ss.minimo, p.nombre, p.tipo_unidad AS "tipoUnidad"
      FROM stock_sucursal ss
      INNER JOIN productos p ON p.id = ss.producto_id
      WHERE ss.sucursal_id = ${sucursalId}
        AND p.activo = ${true}
        AND ss.cantidad <= ss.minimo
      ORDER BY ss.cantidad ASC
    `;

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
      }, (req as any).usuario?.id);

      OfflineCache.invalidate(`stock:${sucursalId}`);
      return res.json({ ok: true, stock, stockTotal: await getStockTotal(productoId) });
    } catch (err) { return next(err); }
  }
);

// ── POST /api/inventario/transferencia ─────────────────────────────────
// BUG-09 FIX: verificacion de stock DENTRO de la transaccion para evitar TOCTOU
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

      // BUG-09 FIX: verificacion y descuento DENTRO de la misma transaccion
      const [stockOrigen, stockDestino] = await prisma.$transaction(async (tx) => {
        // Verificar stock suficiente dentro de la transaccion
        const origen = await tx.stockSucursal.findUnique({
          where: { productoId_sucursalId: { productoId, sucursalId: origenId } },
        });

        if (!origen || origen.cantidad < cantidad) {
          throw new Error(`Stock insuficiente en sucursal origen. Disponible: ${origen?.cantidad ?? 0}`);
        }

        const stockOrigen = await tx.stockSucursal.update({
          where: { productoId_sucursalId: { productoId, sucursalId: origenId } },
          data:  { cantidad: { decrement: cantidad } },
        });

        const stockDestino = await tx.stockSucursal.upsert({
          where:  { productoId_sucursalId: { productoId, sucursalId: destinoId } },
          create: { productoId, sucursalId: destinoId, cantidad, minimo: 0 },
          update: { cantidad: { increment: cantidad } },
        });

        return [stockOrigen, stockDestino];
      });

      await sincronizarStockTotal(productoId);
      OfflineCache.invalidate(`stock:${origenId}`);
      OfflineCache.invalidate(`stock:${destinoId}`);

      return res.json({
        mensaje: 'Transferencia realizada',
        origen:  stockOrigen,
        destino: stockDestino,
      });
    } catch (err: any) {
      if (err.message?.includes('Stock insuficiente')) {
        return res.status(409).json({ error: err.message });
      }
      return next(err);
    }
  }
);

// ── GET /api/inventario/stock-comparativo ───────────────────────────────
inventarioRoutes.get(
  '/stock-comparativo',
  roleMiddleware('ADMIN'),
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const productos = await prisma.producto.findMany({
        where:   { activo: true },
        select: {
          id:           true,
          nombre:       true,
          codigoBarras: true,
          tipoUnidad:   true,
          stockMinimo:  true,
          precioVenta:  true,
          categoria:    { select: { nombre: true } },
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
            s.cantidad === 0       ? 'critico'    :
            s.cantidad <= s.minimo ? 'bajo'        :
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

// ── GET /api/inventario/sync-pendientes ─────────────────────────────────
// T-07C.2: Conteo de registros pendientes, sincronizados y con error
// BUG-10 FIX: usar JSON.parse en lugar de string matching fragil
inventarioRoutes.get('/sync-pendientes', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const sucursalId = (req as any).usuario?.sucursalId ?? null;

    // BUG-10 FIX: obtener todos los logs y filtrar por sucursalId parseando el JSON
    const todosLogs = await prisma.syncLog.findMany({
      select: { status: true, payload: true },
    });

    const filtrados = sucursalId
      ? todosLogs.filter(log => {
          try {
            const payload = JSON.parse(log.payload);
            return payload.sucursalId === sucursalId;
          } catch {
            return false;
          }
        })
      : todosLogs;

    const pendientes    = filtrados.filter(l => l.status === 'PENDIENTE').length;
    const sincronizados = filtrados.filter(l => l.status === 'SINCRONIZADO').length;
    const errores       = filtrados.filter(l => l.status === 'ERROR').length;

    return res.json({
      pendientes,
      sincronizados,
      errores,
      online:     SyncService.isOnline(),
      sucursalId,
    });
  } catch (err) { return next(err); }
});