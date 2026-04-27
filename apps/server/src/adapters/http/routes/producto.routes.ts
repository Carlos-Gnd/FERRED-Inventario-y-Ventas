import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../../db/prisma/prisma.client';
import { roleMiddleware } from '../middleware/role.middleware';
import { logPendiente, OfflineCache, SyncService } from '../../sync/sync.service';
import { sincronizarStockTotal } from '../services/stock-sync.service';
import { assertSameSucursal } from '../middleware/sucursal.guard';
import {
  crearProductoSqlite,
  desactivarProductoSqlite,
  eliminarProductoPendienteSqlite,
  obtenerIdsProductosEliminacionPendienteSqlite,
  obtenerProductosPendientesSqlite,
  obtenerProductosSqlite,
} from '../../db/sqlite/sqlite.client';

export const productoRoutes = Router();

const schema = z.object({
  nombre: z.string().min(2),
  categoriaId: z.number().int().positive().optional(),
  codigoBarras: z.string().optional(),
  tipoUnidad: z.enum(['UNIDAD', 'CAJA', 'PESO', 'MEDIDA', 'LOTE']).optional(),
  precioCompra: z.number().min(0).optional(),
  porcentajeGanancia: z.number().min(0).optional(),
  precioVenta: z.number().min(0).optional(),
  tieneIva: z.boolean().optional().default(true),
  stockActual: z.number().int().min(0).optional().default(0),
  stockMinimo: z.number().int().min(0).optional().default(0),
});

function calcularPrecios(data: any) {
  if (data.precioCompra !== undefined && data.porcentajeGanancia !== undefined) {
    const precioVenta = data.precioCompra * (1 + data.porcentajeGanancia / 100);
    data.precioVenta = Math.round(precioVenta * 100) / 100;
    data.precioConIva = data.tieneIva
      ? Math.round(precioVenta * 1.13 * 100) / 100
      : data.precioVenta;
  }
  return data;
}

productoRoutes.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { buscar, categoriaId, criticos, sucursalId } = req.query;
    const cacheKey = `productos:${JSON.stringify(req.query)}`;
    const online = await SyncService.checkConnectivity();
    const eliminadosPendientes = new Set(obtenerIdsProductosEliminacionPendienteSqlite());

    if (!online) {
      console.info('[productos] modo=offline origen=sqlite motivo=check_connectivity');
      return res.json(obtenerProductosLocalesFiltrados(eliminadosPendientes, {
        buscar: String(buscar ?? ''),
        categoriaId: categoriaId ? Number(categoriaId) : undefined,
        criticos: criticos === 'true',
      }));
    }

    const targetSucursalId = sucursalId
      ? Number(sucursalId)
      : req.usuario?.sucursalId;

    if (targetSucursalId && !assertSameSucursal(req, res, targetSucursalId)) return;

    const productos = await prisma.producto.findMany({
      where: {
        activo: true,
        ...(categoriaId ? { categoriaId: Number(categoriaId) } : {}),
        ...(buscar ? {
          OR: [
            { nombre: { contains: String(buscar), mode: 'insensitive' } },
            { codigoBarras: { contains: String(buscar) } },
          ],
        } : {}),
      },
      include: {
        categoria: { select: { id: true, nombre: true } },
        ...(targetSucursalId ? {
          stocks: {
            where: { sucursalId: targetSucursalId },
            select: { cantidad: true, minimo: true },
          },
        } : {}),
      },
      orderBy: { nombre: 'asc' },
    });

    let resultado = productos.filter((producto) => !eliminadosPendientes.has(producto.id));
    if (criticos === 'true' && targetSucursalId) {
      resultado = resultado.filter((p) => {
        const stock = (p as { stocks?: Array<{ cantidad: number; minimo: number }> }).stocks?.[0];
        return stock ? stock.cantidad <= stock.minimo : p.stockActual <= p.stockMinimo;
      });
    } else if (criticos === 'true') {
      resultado = resultado.filter((p) => p.stockActual <= p.stockMinimo);
    }

    const pendientesLocales = filtrarProductosLocales(obtenerProductosPendientesSqlite(), {
      buscar: String(buscar ?? ''),
      categoriaId: categoriaId ? Number(categoriaId) : undefined,
      criticos: criticos === 'true',
    });
    const conPendientesLocales = mezclarProductosLocalesPendientes(resultado, pendientesLocales);

    console.info('[productos] modo=online origen=prisma');
    OfflineCache.set(cacheKey, conPendientesLocales);
    return res.json(conPendientesLocales);
  } catch (err: any) {
    if (esErrorConexion(err)) {
      const { buscar, categoriaId, criticos } = req.query;
      const eliminadosPendientes = new Set(obtenerIdsProductosEliminacionPendienteSqlite());
      console.info('[productos] modo=offline origen=sqlite motivo=prisma_caido');
      return res.json(obtenerProductosLocalesFiltrados(eliminadosPendientes, {
        buscar: String(buscar ?? ''),
        categoriaId: categoriaId ? Number(categoriaId) : undefined,
        criticos: criticos === 'true',
      }));
    }
    return next(err);
  }
});

productoRoutes.get('/barcode/:codigo', async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!(await SyncService.checkConnectivity())) {
      const producto = obtenerProductosSqlite().find(
        (p: any) => p.codigoBarras === req.params.codigo
      );
      if (!producto) return res.status(404).json({ error: 'Producto no encontrado' });
      return res.json(producto);
    }

    const producto = await prisma.producto.findFirst({
      where: { codigoBarras: req.params.codigo, activo: true },
      include: { categoria: true },
    });

    if (!producto) return res.status(404).json({ error: 'Producto no encontrado' });
    return res.json(producto);
  } catch (err: any) {
    if (esErrorConexion(err)) {
      const producto = obtenerProductosSqlite().find(
        (p: any) => p.codigoBarras === req.params.codigo
      );
      if (!producto) return res.status(404).json({ error: 'Producto no encontrado' });
      return res.json(producto);
    }
    return next(err);
  }
});

productoRoutes.get('/:id/stock/:sucursalId', roleMiddleware('ADMIN', 'CAJERO', 'BODEGA'), async (req, res, next) => {
  try {
    const productoId = Number(req.params.id);
    const sucursalId = Number(req.params.sucursalId);

    if (!assertSameSucursal(req, res, sucursalId)) return;

    const stock = await prisma.stockSucursal.findUnique({
      where: { productoId_sucursalId: { productoId, sucursalId } },
    });

    return res.json({
      productoId,
      sucursalId,
      cantidad: stock?.cantidad ?? 0,
      minimo: stock?.minimo ?? 0,
    });
  } catch (err) {
    return next(err);
  }
});

productoRoutes.post('/', roleMiddleware('ADMIN', 'BODEGA'), async (req: Request, res: Response, next: NextFunction) => {
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });

  const data = calcularPrecios({ ...parsed.data });

  try {
    if (!(await SyncService.checkConnectivity())) {
      return res.status(201).json(guardarProductoOffline(data, req.usuario?.sucursalId));
    }

    const nuevo = await prisma.producto.create({
      data,
      include: { categoria: true },
    });

    const sucursalId = req.usuario?.sucursalId;
    if (sucursalId) {
      await prisma.stockSucursal.upsert({
        where: { productoId_sucursalId: { productoId: nuevo.id, sucursalId } },
        create: {
          productoId: nuevo.id,
          sucursalId,
          cantidad: data.stockActual ?? 0,
          minimo: data.stockMinimo ?? 0,
        },
        update: {},
      });
    }

    await logPendiente('producto', 'CREATE', nuevo, req.usuario?.id);
    OfflineCache.invalidate('productos:');

    return res.status(201).json({ mensaje: 'Producto creado', producto: nuevo });
  } catch (err: any) {
    if (esErrorConexion(err)) {
      return res.status(201).json(guardarProductoOffline(data, req.usuario?.sucursalId));
    }
    return next(err);
  }
});

productoRoutes.put('/:id', roleMiddleware('ADMIN', 'BODEGA'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Number(req.params.id);
    const parsed = schema.partial().safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });

    const data = calcularPrecios({ ...parsed.data });

    if (!(await SyncService.checkConnectivity())) {
      await logPendiente('producto', 'UPDATE', { id, ...data }, req.usuario?.id);
      return res.json({ mensaje: 'Producto actualizado offline' });
    }

    const actualizado = await prisma.producto.update({
      where: { id },
      data,
      include: { categoria: true },
    });

    const sucursalId = req.usuario?.sucursalId;
    if (sucursalId && data.stockActual !== undefined) {
      await prisma.stockSucursal.upsert({
        where: { productoId_sucursalId: { productoId: id, sucursalId } },
        create: {
          productoId: id,
          sucursalId,
          cantidad: data.stockActual,
          minimo: data.stockMinimo ?? 0,
        },
        update: {
          cantidad: data.stockActual,
          ...(data.stockMinimo !== undefined ? { minimo: data.stockMinimo } : {}),
        },
      });
    }

    await logPendiente('producto', 'UPDATE', actualizado, req.usuario?.id);
    OfflineCache.invalidate('productos:');

    return res.json({ mensaje: 'Producto actualizado', producto: actualizado });
  } catch (err) {
    return next(err);
  }
});

productoRoutes.delete('/:id', roleMiddleware('ADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Number(req.params.id);

    // BUG-A13: validar id < 0 ANTES de intentar cualquier operación
    if (id < 0) {
      const eliminadoLocal = eliminarProductoPendienteSqlite(id);
      if (!eliminadoLocal) {
        return res.status(404).json({ error: 'Producto local pendiente no encontrado' });
      }
      OfflineCache.invalidate('productos:');
      return res.json({ mensaje: 'Producto eliminado localmente' });
    }

    if (!(await SyncService.checkConnectivity())) {
      desactivarProductoSqlite(id);
      await logPendiente('producto', 'DELETE', { id }, req.usuario?.id);
      OfflineCache.invalidate('productos:');
      return res.json({ mensaje: 'Producto eliminado offline' });
    }

    await prisma.producto.update({ where: { id }, data: { activo: false } });
    await logPendiente('producto', 'DELETE', { id }, req.usuario?.id);
    OfflineCache.invalidate('productos:');

    return res.json({ mensaje: 'Producto desactivado' });
  } catch (err) {
    return next(err);
  }
});

productoRoutes.post('/:id/descontar-stock', roleMiddleware('ADMIN', 'CAJERO'), async (req, res, next) => {
  try {
    const productoId = Number(req.params.id);
    const { cantidad, sucursalId } = req.body as { cantidad: number; sucursalId: number };

    if (!cantidad || cantidad <= 0) return res.status(400).json({ error: 'cantidad invalida' });
    if (!sucursalId) return res.status(400).json({ error: 'sucursalId requerido' });

    if (!(await SyncService.checkConnectivity())) {
      await logPendiente('stockSucursal', 'UPDATE', { productoId, cantidad, sucursalId }, req.usuario?.id);
      return res.json({ mensaje: 'Stock actualizado offline' });
    }

    const stockActualizado = await prisma.$transaction(async (tx) => {
      const stock = await tx.stockSucursal.findUnique({
        where: { productoId_sucursalId: { productoId, sucursalId } },
      });

      const disponible = stock?.cantidad ?? 0;
      if (disponible < cantidad) {
        throw Object.assign(new Error('Stock insuficiente en esta sucursal'), {
          statusCode: 409,
          disponible,
          solicitado: cantidad,
          sucursalId,
        });
      }

      return tx.stockSucursal.update({
        where: { productoId_sucursalId: { productoId, sucursalId } },
        data: { cantidad: { decrement: cantidad } },
      });
    }, { timeout: 10000 });

    await sincronizarStockTotal(productoId);

    OfflineCache.invalidate(`stock:${sucursalId}`);
    return res.json({ mensaje: 'Stock descontado', stockRestante: stockActualizado.cantidad });
  } catch (err: any) {
    if (err?.statusCode === 409) {
      return res.status(409).json({
        error: err.message,
        disponible: err.disponible,
        solicitado: err.solicitado,
        sucursalId: err.sucursalId,
      });
    }
    return next(err);
  }
});

function guardarProductoOffline(data: any, sucursalId?: number) {
  const producto = crearProductoSqlite(data, sucursalId);
  OfflineCache.invalidate('productos:');

  return {
    mensaje: 'Producto guardado offline. Se sincronizara cuando vuelva internet.',
    producto,
  };
}

function filtrarProductosLocales(
  productos: any[],
  filtros: { buscar?: string; categoriaId?: number; criticos?: boolean }
) {
  return productos.filter((producto) => {
    const coincideBusqueda = !filtros.buscar
      || producto.nombre?.toLowerCase().includes(filtros.buscar.toLowerCase())
      || producto.codigoBarras?.includes(filtros.buscar);
    const coincideCategoria = !filtros.categoriaId
      || producto.categoriaId === filtros.categoriaId;
    const coincideCritico = !filtros.criticos
      || producto.stockActual <= producto.stockMinimo;

    return coincideBusqueda && coincideCategoria && coincideCritico;
  });
}

function obtenerProductosLocalesFiltrados(
  eliminadosPendientes: Set<number>,
  filtros: { buscar?: string; categoriaId?: number; criticos?: boolean }
) {
  const productosLocales = obtenerProductosSqlite()
    .filter((producto: any) => !eliminadosPendientes.has(Number(producto.id)));

  return filtrarProductosLocales(productosLocales, filtros);
}

function mezclarProductosLocalesPendientes(remotos: any[], localesPendientes: any[]) {
  if (!localesPendientes.length) return remotos;

  const clavesRemotas = new Set(
    remotos.flatMap((producto) => [
      producto.codigoBarras ? `barcode:${producto.codigoBarras}` : null,
      `name:${normalizarNombre(producto.nombre)}`,
    ]).filter(Boolean)
  );

  const localesSinDuplicar = localesPendientes.filter((producto) => {
    const claves = [
      producto.codigoBarras ? `barcode:${producto.codigoBarras}` : null,
      `name:${normalizarNombre(producto.nombre)}`,
    ].filter(Boolean);

    return !claves.some((clave) => clavesRemotas.has(clave));
  });

  return [...localesSinDuplicar, ...remotos];
}

function normalizarNombre(nombre: unknown) {
  return String(nombre ?? '').trim().toLowerCase();
}

function esErrorConexion(err: any) {
  const mensaje = String(err?.message ?? '').toLowerCase();
  const code = String(err?.code ?? '').toLowerCase();

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
