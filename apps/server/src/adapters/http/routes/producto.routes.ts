import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../../db/prisma/prisma.client';
import { roleMiddleware } from '../middleware/role.middleware';
import { logPendiente, OfflineCache, SyncService } from '../../sync/sync.service';
import { sincronizarStockTotal } from './inventario.routes';

export const productoRoutes = Router();

// ───── SCHEMA ─────
const schema = z.object({
  nombre: z.string().min(2),
  categoriaId: z.number().int().positive().optional(),
  codigoBarras: z.string().optional(),
  tipoUnidad: z.enum(['UNIDAD','CAJA','PESO','MEDIDA','LOTE']).optional(),
  precioCompra: z.number().min(0).optional(),
  porcentajeGanancia: z.number().min(0).optional(),
  precioVenta: z.number().min(0).optional(),
  tieneIva: z.boolean().optional().default(true),
  stockActual: z.number().int().min(0).optional().default(0),
  stockMinimo: z.number().int().min(0).optional().default(0),
});

// ───── FUNCION PRECIOS ─────
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

// ───── GET ─────
productoRoutes.get('/', async (req, res, next) => {
  try {
    const cacheKey = `productos`;

    if (!SyncService.isOnline()) {
      const cached = OfflineCache.get(cacheKey);
      if (cached) return res.json(cached);
    }

    const productos = await prisma.producto.findMany({
      where: { activo: true },
      include: { categoria: true },
      orderBy: { nombre: 'asc' },
    });

    OfflineCache.set(cacheKey, productos);
    return res.json(productos);
  } catch (err) {
    return next(err);
  }
});

// ───── POST (CREATE) ─────
productoRoutes.post('/', roleMiddleware('ADMIN','BODEGA'), async (req, res, next) => {
  try {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0].message });
    }

    const data = calcularPrecios({ ...parsed.data });

    // 🔥 OFFLINE
    if (!SyncService.isOnline()) {
      await logPendiente('producto', 'CREATE', data, req.usuario?.id);

      return res.status(201).json({
        mensaje: 'Producto guardado offline (pendiente de sincronización)'
      });
    }

    // ✅ ONLINE
    const nuevo = await prisma.producto.create({
      data,
      include: { categoria: true }
    });

    const sucursalId = req.usuario?.sucursalId;

    if (sucursalId) {
      await prisma.stockSucursal.upsert({
        where: { productoId_sucursalId: { productoId: nuevo.id, sucursalId } },
        create: {
          productoId: nuevo.id,
          sucursalId,
          cantidad: data.stockActual ?? 0,
          minimo: data.stockMinimo ?? 0
        },
        update: {}
      });
    }

    await logPendiente('producto', 'CREATE', nuevo, req.usuario?.id);
    OfflineCache.invalidate('productos');

    return res.status(201).json({
      mensaje: 'Producto creado',
      producto: nuevo
    });

  } catch (err) {
    return next(err);
  }
});

// ───── PUT (UPDATE) ─────
productoRoutes.put('/:id', roleMiddleware('ADMIN','BODEGA'), async (req, res, next) => {
  try {
    const id = Number(req.params.id);

    const parsed = schema.partial().safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0].message });
    }

    const data = calcularPrecios({ ...parsed.data });

    // 🔥 OFFLINE
    if (!SyncService.isOnline()) {
      await logPendiente('producto', 'UPDATE', { id, ...data }, req.usuario?.id);

      return res.json({
        mensaje: 'Producto actualizado offline'
      });
    }

    // ✅ ONLINE
    const actualizado = await prisma.producto.update({
      where: { id },
      data,
      include: { categoria: true }
    });

    await logPendiente('producto', 'UPDATE', actualizado, req.usuario?.id);
    OfflineCache.invalidate('productos');

    return res.json({
      mensaje: 'Producto actualizado',
      producto: actualizado
    });

  } catch (err) {
    return next(err);
  }
});

// ───── DELETE ─────
productoRoutes.delete('/:id', roleMiddleware('ADMIN'), async (req, res, next) => {
  try {
    const id = Number(req.params.id);

    // 🔥 OFFLINE
    if (!SyncService.isOnline()) {
      await logPendiente('producto', 'DELETE', { id }, req.usuario?.id);

      return res.json({
        mensaje: 'Producto eliminado offline'
      });
    }

    // ✅ ONLINE
    await prisma.producto.update({
      where: { id },
      data: { activo: false }
    });

    await logPendiente('producto', 'DELETE', { id }, req.usuario?.id);
    OfflineCache.invalidate('productos');

    return res.json({
      mensaje: 'Producto eliminado'
    });

  } catch (err) {
    return next(err);
  }
});

// ───── DESCONTAR STOCK ─────
productoRoutes.post('/:id/descontar-stock', roleMiddleware('ADMIN','CAJERO'), async (req, res, next) => {
  try {
    const productoId = Number(req.params.id);
    const { cantidad, sucursalId } = req.body;

    if (!cantidad || cantidad <= 0) {
      return res.status(400).json({ error: 'Cantidad inválida' });
    }

    // 🔥 OFFLINE
    if (!SyncService.isOnline()) {
      await logPendiente('stock', 'UPDATE', { productoId, cantidad, sucursalId }, req.usuario?.id);

      return res.json({
        mensaje: 'Stock actualizado offline'
      });
    }

    const stock = await prisma.stockSucursal.update({
      where: { productoId_sucursalId: { productoId, sucursalId } },
      data: { cantidad: { decrement: cantidad } }
    });

    await sincronizarStockTotal(productoId);

    return res.json({
      mensaje: 'Stock descontado',
      stock
    });

  } catch (err) {
    return next(err);
  }
});