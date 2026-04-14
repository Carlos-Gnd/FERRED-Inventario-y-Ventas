import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma }         from '../../db/prisma/prisma.client';
import { roleMiddleware } from '../middleware/role.middleware';
import { logPendiente, OfflineCache, SyncService } from '../../sync/sync.service';
import { sincronizarStockTotal } from './inventario.routes';

export const productoRoutes = Router();

const schema = z.object({
  nombre:             z.string().min(2),
  categoriaId:        z.number().int().positive().optional(),
  codigoBarras:       z.string().optional(),
  tipoUnidad:         z.enum(['UNIDAD','CAJA','PESO','MEDIDA','LOTE']).optional(),
  precioCompra:       z.number().min(0).optional(),
  porcentajeGanancia: z.number().min(0).optional(),
  precioVenta:        z.number().min(0).optional(),
  tieneIva:           z.boolean().optional().default(true),
  stockActual:        z.number().int().min(0).optional().default(0),
  stockMinimo:        z.number().int().min(0).optional().default(0),
});

function calcularPrecios(data: any) {
  if (data.precioCompra !== undefined && data.porcentajeGanancia !== undefined) {
    const precioVenta = data.precioCompra * (1 + data.porcentajeGanancia / 100);
    data.precioVenta  = Math.round(precioVenta * 100) / 100;
    data.precioConIva = data.tieneIva
      ? Math.round(precioVenta * 1.13 * 100) / 100
      : data.precioVenta;
  }
  return data;
}

// ── GET /api/productos ─────────────────────────────────────────────────────────
productoRoutes.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { buscar, categoriaId, criticos, sucursalId } = req.query;
    const cacheKey = `productos:${JSON.stringify(req.query)}`;

    if (!SyncService.isOnline() && req.usuario) {
      const cached = OfflineCache.get(cacheKey);
      if (cached) return res.json(cached);
    }

    const targetSucursalId = sucursalId
      ? Number(sucursalId)
      : req.usuario?.sucursalId;

    const productos = await prisma.producto.findMany({
      where: {
        activo: true,
        ...(categoriaId ? { categoriaId: Number(categoriaId) } : {}),
        ...(buscar ? {
          OR: [
            { nombre:       { contains: String(buscar), mode: 'insensitive' } },
            { codigoBarras: { contains: String(buscar) } },
          ],
        } : {}),
      },
      include: {
        categoria: { select: { id: true, nombre: true } },
        ...(targetSucursalId ? {
          stocks: {
            where:  { sucursalId: targetSucursalId },
            select: { cantidad: true, minimo: true },
          },
        } : {}),
      },
      orderBy: { nombre: 'asc' },
    });

    let resultado = productos;
    if (criticos === 'true' && targetSucursalId) {
      resultado = productos.filter(p => {
        const s = (p as any).stocks?.[0];
        return s ? s.cantidad <= s.minimo : p.stockActual <= p.stockMinimo;
      });
    } else if (criticos === 'true') {
      resultado = productos.filter(p => p.stockActual <= p.stockMinimo);
    }

    OfflineCache.set(cacheKey, resultado);
    return res.json(resultado);
  } catch (err) { return next(err); }
});

// ── GET /api/productos/barcode/:codigo ─────────────────────────────────────────
// BUG-12 FIX: filtrar por activo:true para no retornar productos dados de baja
productoRoutes.get('/barcode/:codigo', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const producto = await prisma.producto.findFirst({
      where:   { codigoBarras: req.params.codigo, activo: true },
      include: { categoria: true },
    });
    if (!producto) return res.status(404).json({ error: 'Producto no encontrado' });
    return res.json(producto);
  } catch (err) { return next(err); }
});

// ── GET /api/productos/:id/stock/:sucursalId ───────────────────────────────────
// BUG-13 FIX: requiere autenticación por rol (antes era público para cualquier JWT)
productoRoutes.get('/:id/stock/:sucursalId', roleMiddleware('ADMIN', 'CAJERO', 'BODEGA'), async (req, res, next) => {
  try {
    const productoId = Number(req.params.id);
    const sucursalId = Number(req.params.sucursalId);

    const stock = await prisma.stockSucursal.findUnique({
      where: { productoId_sucursalId: { productoId, sucursalId } },
    });

    return res.json({
      productoId,
      sucursalId,
      cantidad: stock?.cantidad ?? 0,
      minimo:   stock?.minimo   ?? 0,
    });
  } catch (err) { return next(err); }
});

// ── POST /api/productos ────────────────────────────────────────────────────────
productoRoutes.post('/', roleMiddleware('ADMIN', 'BODEGA'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });

    const data  = calcularPrecios({ ...parsed.data });
    const nuevo = await prisma.producto.create({ data, include: { categoria: true } });

    const sucursalId = req.usuario?.sucursalId;
    if (sucursalId) {
      await prisma.stockSucursal.upsert({
        where:  { productoId_sucursalId: { productoId: nuevo.id, sucursalId } },
        create: { productoId: nuevo.id, sucursalId, cantidad: data.stockActual ?? 0, minimo: data.stockMinimo ?? 0 },
        update: {},
      });
    }

    await logPendiente('producto', 'CREATE', nuevo, req.usuario?.id);
    OfflineCache.invalidate('productos:');

    return res.status(201).json({ mensaje: 'Producto creado', producto: nuevo });
  } catch (err) { return next(err); }
});

// ── PUT /api/productos/:id ─────────────────────────────────────────────────────
productoRoutes.put('/:id', roleMiddleware('ADMIN', 'BODEGA'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id     = Number(req.params.id);
    const parsed = schema.partial().safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });

    const data        = calcularPrecios({ ...parsed.data });
    const actualizado = await prisma.producto.update({ where: { id }, data, include: { categoria: true } });

    const sucursalId = req.usuario?.sucursalId;
    if (sucursalId && data.stockActual !== undefined) {
      await prisma.stockSucursal.upsert({
        where:  { productoId_sucursalId: { productoId: id, sucursalId } },
        create: { productoId: id, sucursalId, cantidad: data.stockActual, minimo: data.stockMinimo ?? 0 },
        update: { cantidad: data.stockActual, ...(data.stockMinimo !== undefined ? { minimo: data.stockMinimo } : {}) },
      });
    }

    await logPendiente('producto', 'UPDATE', actualizado, req.usuario?.id);
    OfflineCache.invalidate('productos:');

    return res.json({ mensaje: 'Producto actualizado', producto: actualizado });
  } catch (err) { return next(err); }
});

// ── DELETE /api/productos/:id — borrado lógico ─────────────────────────────────
productoRoutes.delete('/:id', roleMiddleware('ADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Number(req.params.id);
    await prisma.producto.update({ where: { id }, data: { activo: false } });
    // BUG-04 FIX 5: req.usuario?.id en lugar de (req as any).user?.id
    await logPendiente('producto', 'DELETE', { id }, req.usuario?.id);
    OfflineCache.invalidate('productos:');
    return res.json({ mensaje: 'Producto desactivado' });
  } catch (err) { return next(err); }
});

// ── POST /api/productos/:id/descontar-stock ────────────────────────────────────
// BUG-06 FIX: verificación + decremento dentro de $transaction para evitar TOCTOU
productoRoutes.post('/:id/descontar-stock', roleMiddleware('ADMIN', 'CAJERO'), async (req, res, next) => {
  try {
    const productoId = Number(req.params.id);
    const { cantidad, sucursalId } = req.body as { cantidad: number; sucursalId: number };

    if (!cantidad || cantidad <= 0) return res.status(400).json({ error: 'cantidad inválida' });
    if (!sucursalId)                return res.status(400).json({ error: 'sucursalId requerido' });

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

    const [stockActualizado] = await prisma.$transaction([
      prisma.stockSucursal.update({
        where: { productoId_sucursalId: { productoId, sucursalId } },
        data:  { cantidad: { decrement: cantidad } },
      }),
      prisma.producto.update({
        where: { id: productoId },
        data:  { stockActual: { decrement: cantidad } },
      }),
    ]);

    OfflineCache.invalidate(`stock:${sucursalId}`);
    return res.json({ mensaje: 'Stock descontado', stockRestante: stockActualizado.cantidad });
  } catch (err: any) {
    if (err?.statusCode === 409) {
      return res.status(409).json({
        error:      err.message,
        disponible: err.disponible,
        solicitado: err.solicitado,
        sucursalId: err.sucursalId,
      });
    }
    return next(err);
  }
});