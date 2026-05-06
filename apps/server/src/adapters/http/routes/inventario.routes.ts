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
import { assertSameSucursal } from '../middleware/sucursal.guard';
import { logPendiente, OfflineCache, SyncService } from '../../sync/sync.service';
import { obtenerStockSucursalSqlite } from '../../db/sqlite/sqlite.client';

export const inventarioRoutes = Router();

// DT-04: sincronizarStockTotal extraída a services/stock-sync.service.ts
import { sincronizarStockTotal } from '../services/stock-sync.service';

async function getStockTotal(productoId: number): Promise<number> {
  const r = await prisma.stockSucursal.aggregate({
    where: { productoId },
    _sum:  { cantidad: true },
  });
  return r._sum.cantidad ?? 0;
}

// ── GET /api/inventario/status ──────────────────────────────────────────
inventarioRoutes.get('/status', roleMiddleware('ADMIN', 'BODEGA', 'CAJERO'), (_req, res) => {
  res.json({ online: SyncService.isOnline() });
});

// ── GET /api/inventario/stock/:sucursalId ───────────────────────────────
inventarioRoutes.get(
  '/stock/:sucursalId',
  roleMiddleware('ADMIN', 'BODEGA', 'CAJERO'),
  async (req: Request, res: Response, next: NextFunction) => {
  try {
    const sucursalId = Number(req.params.sucursalId);
    if (isNaN(sucursalId) || sucursalId < 1) {
      return res.status(400).json({ error: 'sucursalId inválido' });
    }

    if (!assertSameSucursal(req, res, sucursalId)) return;

    const cacheKey = `stock:${sucursalId}`;
    const online = await SyncService.checkConnectivity();

    if (!online) {
      console.info(`[inventario.stock] modo=offline origen=sqlite sucursalId=${sucursalId}`);
      return res.json(obtenerStockSucursalSqlite(sucursalId));
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

    console.info(`[inventario.stock] modo=online origen=prisma sucursalId=${sucursalId}`);
    OfflineCache.set(cacheKey, stocks);
    return res.json(stocks);
  } catch (err) {
    if (esErrorConexionPrisma(err)) {
      const sucursalId = Number(req.params.sucursalId);
      console.info(`[inventario.stock] modo=offline origen=sqlite sucursalId=${sucursalId} motivo=prisma_caido`);
      return res.json(obtenerStockSucursalSqlite(sucursalId));
    }

    return next(err);
  }
  },
);

// ── GET /api/inventario/criticos/:sucursalId ────────────────────────────
inventarioRoutes.get(
  '/criticos/:sucursalId',
  roleMiddleware('ADMIN', 'BODEGA'),
  async (req: Request, res: Response, next: NextFunction) => {
  try {
    const sucursalId = Number(req.params.sucursalId);
    if (isNaN(sucursalId) || sucursalId < 1) {
      return res.status(400).json({ error: 'sucursalId inválido' });
    }

    if (!assertSameSucursal(req, res, sucursalId)) return;

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
  },
);

// ── GET /api/inventario/criticos-detalle ──────────────────────────────────
inventarioRoutes.get(
  '/criticos-detalle',
  roleMiddleware('ADMIN', 'BODEGA'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const rolUsuario  = req.usuario?.rol;
      const sucursalReq = Number(req.query.sucursalId);

      if (rolUsuario !== 'ADMIN' && !req.usuario?.sucursalId) {
        return res.status(403).json({ error: 'Tu usuario no tiene sucursal asignada' });
      }

      const sucursalId =
        rolUsuario === 'ADMIN'
          ? (Number.isFinite(sucursalReq) && sucursalReq > 0 ? sucursalReq : null)
          : req.usuario!.sucursalId;

      const criticos = sucursalId
        ? await prisma.$queryRaw<Array<{
            id: number;
            productoId: number;
            sucursalId: number;
            producto: string;
            codigoBarras: string | null;
            sucursalNombre: string;
            cantidad: number;
            minimo: number;
            tipoUnidad: string | null;
            estado: 'critico' | 'bajo';
          }>>`
            SELECT
              ss.id,
              ss.producto_id AS "productoId",
              ss.sucursal_id AS "sucursalId",
              p.nombre AS "producto",
              p.codigo_barras AS "codigoBarras",
              s.nombre AS "sucursalNombre",
              ss.cantidad,
              ss.minimo,
              p.tipo_unidad AS "tipoUnidad",
              CASE
                WHEN ss.cantidad = 0 THEN 'critico'
                ELSE 'bajo'
              END AS "estado"
            FROM stock_sucursal ss
            INNER JOIN productos p ON p.id = ss.producto_id
            INNER JOIN sucursales s ON s.id = ss.sucursal_id
            WHERE p.activo = ${true}
              AND ss.cantidad <= ss.minimo
              AND ss.sucursal_id = ${sucursalId}
            ORDER BY ss.cantidad ASC, p.nombre ASC
          `
        : await prisma.$queryRaw<Array<{
            id: number;
            productoId: number;
            sucursalId: number;
            producto: string;
            codigoBarras: string | null;
            sucursalNombre: string;
            cantidad: number;
            minimo: number;
            tipoUnidad: string | null;
            estado: 'critico' | 'bajo';
          }>>`
            SELECT
              ss.id,
              ss.producto_id AS "productoId",
              ss.sucursal_id AS "sucursalId",
              p.nombre AS "producto",
              p.codigo_barras AS "codigoBarras",
              s.nombre AS "sucursalNombre",
              ss.cantidad,
              ss.minimo,
              p.tipo_unidad AS "tipoUnidad",
              CASE
                WHEN ss.cantidad = 0 THEN 'critico'
                ELSE 'bajo'
              END AS "estado"
            FROM stock_sucursal ss
            INNER JOIN productos p ON p.id = ss.producto_id
            INNER JOIN sucursales s ON s.id = ss.sucursal_id
            WHERE p.activo = ${true}
              AND ss.cantidad <= ss.minimo
            ORDER BY ss.cantidad ASC, p.nombre ASC
          `;

      return res.json({
        total: criticos.length,
        criticos,
      });
    } catch (err) { return next(err); }
  }
);

// ── GET /api/inventario/criticos-por-sucursal ───────────────────────────
inventarioRoutes.get(
  '/criticos-por-sucursal',
  roleMiddleware('ADMIN'),
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const sucursales = await prisma.sucursal.findMany({
        orderBy: { id: 'asc' },
      });

      const resultado = await Promise.all(
        sucursales.map(async (suc: { id: number; nombre: string }) => {
          const [{ count }] = await prisma.$queryRaw<[{ count: bigint }]>`
            SELECT COUNT(*) AS count
            FROM stock_sucursal ss
            INNER JOIN productos p ON p.id = ss.producto_id
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

      if (!assertSameSucursal(req, res, sucursalId)) return;

      const stock = await prisma.$transaction(async (tx) => {
        const s = await tx.stockSucursal.upsert({
          where:  { productoId_sucursalId: { productoId, sucursalId } },
          create: { productoId, sucursalId, cantidad: Math.max(0, cantidad), minimo },
          update: { cantidad, minimo },
        });

        const resultado = await tx.stockSucursal.aggregate({
          where: { productoId },
          _sum:  { cantidad: true },
        });
        await tx.producto.update({
          where: { id: productoId },
          data:  { stockActual: resultado._sum.cantidad ?? 0 },
        });

        return s;
      }, { timeout: 10000 });

      await logPendiente('stockSucursal', 'UPDATE', {
        id: stock.id, productoId, sucursalId, cantidad: stock.cantidad, motivo,
      }, req.usuario?.id);

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

      if (origenId === destinoId) {
        return res.status(400).json({ error: 'Origen y destino deben ser diferentes' });
      }

      const [stockOrigen, stockDestino] = await prisma.$transaction(async (tx) => {
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
      }, { timeout: 10000 });

      await sincronizarStockTotal(productoId);

      await logPendiente('stockSucursal', 'UPDATE', {
        productoId, origenId, destinoId, cantidad, tipo: 'TRANSFERENCIA',
      }, req.usuario?.id);

      OfflineCache.invalidate(`stock:${origenId}`);
      OfflineCache.invalidate(`stock:${destinoId}`);
      OfflineCache.invalidate('productos:');

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
  roleMiddleware('ADMIN', 'BODEGA'),
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
// BUG-M10 FIX: filtrar por usuarioId directamente en vez de string matching sobre payload JSON
inventarioRoutes.get('/sync-pendientes', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const usuarioId  = req.usuario?.id    ?? null;
    const sucursalId = req.usuario?.sucursalId ?? null;
    const esAdmin    = req.usuario?.rol === 'ADMIN';

    // BUG-M10: filtrar por usuarioId directamente en vez de string matching sobre payload JSON
    const whereBase = (!esAdmin && usuarioId) ? { usuarioId } : {};

    const [pendientes, sincronizados, errores] = await Promise.all([
      prisma.syncLog.count({ where: { ...whereBase, status: 'PENDIENTE' } }),
      prisma.syncLog.count({ where: { ...whereBase, status: 'SINCRONIZADO' } }),
      prisma.syncLog.count({ where: { ...whereBase, status: 'ERROR' } }),
    ]);

    return res.json({
      pendientes,
      sincronizados,
      errores,
      online:     SyncService.isOnline(),
      sucursalId,
    });
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
