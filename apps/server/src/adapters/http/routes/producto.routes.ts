import { randomUUID } from 'crypto';
import fs from 'fs';
import path from 'path';
import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import multer, { FileFilterCallback } from 'multer';
import { prisma } from '../../db/prisma/prisma.client';
import { roleMiddleware } from '../middleware/role.middleware';
import { logPendiente, OfflineCache, SyncService } from '../../sync/sync.service';
import { sincronizarStockTotal } from '../services/stock-sync.service';

// ── Multer: subida de imágenes de productos (T-18) ────────────
const MAX_IMAGEN_BYTES = 5 * 1024 * 1024;
const IMAGENES_DIR = path.resolve(process.cwd(), 'uploads', 'productos');

const MIME_TO_EXT: Readonly<Record<string, string>> = {
  'image/jpeg': 'jpg',
  'image/png':  'png',
  'image/webp': 'webp',
};

const imagenStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    fs.mkdirSync(IMAGENES_DIR, { recursive: true });
    cb(null, IMAGENES_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = MIME_TO_EXT[file.mimetype] ?? 'bin';
    cb(null, `${randomUUID()}.${ext}`);
  },
});

const imagenFilter = (_req: Request, file: Express.Multer.File, cb: FileFilterCallback): void => {
  if (file.mimetype in MIME_TO_EXT) { cb(null, true); return; }
  cb(new Error('Solo se permiten imágenes JPG, PNG o WebP'));
};

const uploadImagen = multer({
  storage:    imagenStorage,
  limits:     { fileSize: MAX_IMAGEN_BYTES, files: 1 },
  fileFilter: imagenFilter,
}).single('imagen');
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
  imageUrl: z.string().nullable().optional(),
});

// DT-11: interface en lugar de any para el parámetro de precios
interface DatosPrecio {
  precioCompra?: number;
  porcentajeGanancia?: number;
  precioVenta?: number;
  precioConIva?: number;
  tieneIva?: boolean;
}

function calcularPrecios<T extends DatosPrecio>(data: T): T {
  const compra    = Number(data.precioCompra);
  const ganancia  = Number(data.porcentajeGanancia);

  if (data.precioCompra !== undefined && data.porcentajeGanancia !== undefined
      && !isNaN(compra) && !isNaN(ganancia) && compra >= 0 && ganancia >= 0) {
    const precioVenta = compra * (1 + ganancia / 100);
    data.precioVenta  = Math.round(precioVenta * 100) / 100;
    data.precioConIva = data.tieneIva
      ? Math.round(precioVenta * 1.13 * 100) / 100
      : data.precioVenta;
  }
  return data;
}

productoRoutes.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { buscar, categoriaId, criticos, sucursalId } = req.query;
    // DT-23: cap para evitar lecturas sin límite (offline no se pagina, retorna todo local)
    const limit = Math.min(1000, Math.max(1, Number(req.query.limit ?? 500)));
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
      take: limit,
    });

    let resultado = productos.filter((producto: any) => !eliminadosPendientes.has(producto.id));
    if (criticos === 'true' && targetSucursalId) {
      resultado = resultado.filter((p: any) => {
        const stock = (p as { stocks?: Array<{ cantidad: number; minimo: number }> }).stocks?.[0];
        return stock ? stock.cantidad <= stock.minimo : p.stockActual <= p.stockMinimo;
      });
    } else if (criticos === 'true') {
      resultado = resultado.filter((p: any) => p.stockActual <= p.stockMinimo);
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
  } catch (err: unknown) {
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
  } catch (err: unknown) {
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
  } catch (err: unknown) {
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

// ── POST /api/productos/:id/imagen (T-18) ────────────────────
// Sube una imagen para el producto, la guarda en uploads/productos/
// y actualiza imageUrl con la ruta pública relativa.
productoRoutes.post(
  '/:id/imagen',
  roleMiddleware('ADMIN', 'BODEGA'),
  (req: Request, res: Response, next: NextFunction) => {
    uploadImagen(req, res, async (err) => {
      if (err instanceof multer.MulterError) {
        const msg = err.code === 'LIMIT_FILE_SIZE'
          ? 'La imagen supera el límite de 5 MB'
          : err.message;
        return res.status(400).json({ error: msg });
      }
      if (err) return res.status(400).json({ error: (err as Error).message });

      const productoId = Number(req.params.id);
      if (!Number.isInteger(productoId) || productoId < 1) {
        if (req.file) fs.unlink(req.file.path, () => {});
        return res.status(400).json({ error: 'ID de producto inválido' });
      }

      if (!req.file) return res.status(400).json({ error: 'No se recibió ningún archivo' });

      // URL pública relativa — no se expone el path absoluto del sistema
      const imageUrl = `/uploads/productos/${req.file.filename}`;

      try {
        const producto = await prisma.producto.findUnique({ where: { id: productoId } });
        if (!producto) {
          fs.unlink(req.file.path, () => {});
          return res.status(404).json({ error: 'Producto no encontrado' });
        }

        // Eliminar imagen anterior si era un archivo local (no base64 ni URL externa)
        if (producto.imageUrl?.startsWith('/uploads/')) {
          const anterior = path.join(process.cwd(), producto.imageUrl);
          fs.unlink(anterior, () => {});
        }

        await prisma.producto.update({ where: { id: productoId }, data: { imageUrl } });
        OfflineCache.invalidate('productos:');

        return res.json({ ok: true, imageUrl });
      } catch (dbErr) {
        fs.unlink(req.file.path, () => {});
        return next(dbErr);
      }
    });
  },
);

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

    const stockActualizado = await prisma.$transaction(async (tx: any) => {
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
  } catch (err: unknown) {
    const e = err as { statusCode?: number; message?: string; disponible?: number; solicitado?: number; sucursalId?: number };
    if (e?.statusCode === 409) {
      return res.status(409).json({
        error: e.message,
        disponible: e.disponible,
        solicitado: e.solicitado,
        sucursalId: e.sucursalId,
      });
    }
    return next(err);
  }
});

function guardarProductoOffline<T extends DatosPrecio>(data: T, sucursalId?: number) {
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

function esErrorConexion(err: unknown) {
  const e = err as { message?: unknown; code?: unknown };
  const mensaje = String(e?.message ?? '').toLowerCase();
  const code = String(e?.code ?? '').toLowerCase();

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
