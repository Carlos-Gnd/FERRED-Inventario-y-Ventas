/**
 * HU-14 — T-14.1: Recepción de mercancía de proveedores
 * CRUD de proveedores y registro de recepciones con incremento atómico de stock
 */
import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma }         from '../../db/prisma/prisma.client';
import { obtenerRecepcionDetalleSqlite, obtenerRecepcionesSqlite } from '../../db/sqlite/sqlite.client';
import { roleMiddleware } from '../middleware/role.middleware';
import { logPendiente, OfflineCache } from '../../sync/sync.service';
import { sincronizarStockTotal }      from '../services/stock-sync.service';

export const proveedorRoutes = Router();

// ── Schemas ───────────────────────────────────────────────────
const ProveedorSchema = z.object({
  nombre:    z.string().min(2, 'Nombre muy corto'),
  nit:       z.string().optional(),
  telefono:  z.string().optional(),
  email:     z.string().email('Email inválido').optional(),
  direccion: z.string().optional(),
});

const ItemRecepcionSchema = z.object({
  productoId: z.number().int().positive(),
  cantidad:   z.number().positive(),
  costoUnit:  z.number().nonnegative(),
});

const RecepcionSchema = z.object({
  proveedorId:   z.number().int().positive(),
  sucursalId:    z.number().int().positive(),
  numeroFactura: z.string().optional(),
  observaciones: z.string().optional(),
  items:         z.array(ItemRecepcionSchema).min(1, 'Debe incluir al menos un producto'),
});

// ── GET /api/proveedores ──────────────────────────────────────
proveedorRoutes.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const proveedores = await prisma.proveedor.findMany({
      where:   { activo: true },
      orderBy: { nombre: 'asc' },
    });
    return res.json(proveedores);
  } catch (err) { return next(err); }
});

// ── POST /api/proveedores ─────────────────────────────────────
proveedorRoutes.post('/', roleMiddleware('ADMIN', 'BODEGA'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = ProveedorSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });

    if (parsed.data.nit) {
      const existe = await prisma.proveedor.findUnique({ where: { nit: parsed.data.nit } });
      if (existe) return res.status(400).json({ error: 'Ya existe un proveedor con ese NIT' });
    }

    const nuevo = await prisma.proveedor.create({ data: parsed.data });
    return res.status(201).json({ mensaje: 'Proveedor creado', proveedor: nuevo });
  } catch (err) { return next(err); }
});

// ── PUT /api/proveedores/:id ──────────────────────────────────
proveedorRoutes.put('/:id', roleMiddleware('ADMIN', 'BODEGA'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Number(req.params.id);
    const parsed = ProveedorSchema.partial().safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });

    const actualizado = await prisma.proveedor.update({ where: { id }, data: parsed.data });
    return res.json({ mensaje: 'Proveedor actualizado', proveedor: actualizado });
  } catch (err) { return next(err); }
});

// ── DELETE /api/proveedores/:id ───────────────────────────────
// Soft delete: marca activo=false para preservar historial de recepciones
proveedorRoutes.delete('/:id', roleMiddleware('ADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Number(req.params.id);
    await prisma.proveedor.update({ where: { id }, data: { activo: false } });
    return res.json({ mensaje: 'Proveedor desactivado' });
  } catch (err) { return next(err); }
});

// ── POST /api/proveedores/recepcion ───────────────────────────
// Registra recepción + incrementa stock en transacción atómica
proveedorRoutes.post(
  '/recepcion',
  roleMiddleware('ADMIN', 'BODEGA'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = RecepcionSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          error:   'Datos de recepción inválidos',
          detalle: parsed.error.flatten().fieldErrors,
        });
      }

      const { proveedorId, sucursalId, numeroFactura, observaciones, items } = parsed.data;
      const usuarioId = req.usuario?.id;

      // Un no-ADMIN solo puede recibir mercancía en su sucursal asignada
      if (req.usuario?.rol !== 'ADMIN') {
        if (!req.usuario?.sucursalId) {
          return res.status(403).json({ error: 'Tu usuario no tiene sucursal asignada' });
        }
        if (req.usuario.sucursalId !== sucursalId) {
          return res.status(403).json({ error: 'No podés recibir mercancía en otra sucursal' });
        }
      }

      // Validación: proveedor existe y está activo
      const proveedor = await prisma.proveedor.findFirst({
        where: { id: proveedorId, activo: true },
      });
      if (!proveedor) return res.status(404).json({ error: 'Proveedor no existe o está inactivo' });

      // Validación: productos existen y están activos
      const productosIds = items.map(i => i.productoId);
      const productos = await prisma.producto.findMany({
        where: { id: { in: productosIds }, activo: true },
      });
      if (productos.length !== productosIds.length) {
        return res.status(404).json({ error: 'Uno o más productos no existen o están inactivos' });
      }

      const total = parseFloat(
        items.reduce((acc, i) => acc + i.cantidad * i.costoUnit, 0).toFixed(2),
      );

      const recepcion = await prisma.$transaction(async (tx) => {
        const nueva = await tx.recepcionMercancia.create({
          data: {
            proveedorId,
            sucursalId,
            usuarioId,
            numeroFactura,
            observaciones,
            total,
          },
        });

        await tx.detalleRecepcion.createMany({
          data: items.map(i => ({
            recepcionId: nueva.id,
            productoId:  i.productoId,
            cantidad:    i.cantidad,
            costoUnit:   i.costoUnit,
            subtotal:    parseFloat((i.cantidad * i.costoUnit).toFixed(2)),
          })),
        });

        for (const item of items) {
          await tx.stockSucursal.upsert({
            where:  { productoId_sucursalId: { productoId: item.productoId, sucursalId } },
            create: { productoId: item.productoId, sucursalId, cantidad: item.cantidad, minimo: 0 },
            update: { cantidad: { increment: item.cantidad } },
          });
        }

        return nueva;
      });

      // Sincronizar stockTotal y cache fuera de la tx
      try {
        await Promise.all(items.map(i => sincronizarStockTotal(i.productoId)));
      } catch (syncErr) {
        console.error('[recepcion] Error sincronizando stockTotal:', syncErr);
      }
      OfflineCache.invalidate(`stock:${sucursalId}`);

      await logPendiente('recepcionMercancia', 'CREATE', {
        id: recepcion.id, proveedorId, sucursalId, total,
      }, usuarioId);

      const completa = await prisma.recepcionMercancia.findUnique({
        where:   { id: recepcion.id },
        include: {
          proveedor: { select: { nombre: true, nit: true } },
          sucursal:  { select: { nombre: true } },
          detalles:  {
            include: { producto: { select: { nombre: true, tipoUnidad: true } } },
          },
        },
      });

      return res.status(201).json({ ok: true, recepcion: completa });
    } catch (err) { return next(err); }
  },
);

// ── GET /api/proveedores/recepciones ──────────────────────────
proveedorRoutes.get('/recepciones', async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!tienePrismaRecepciones()) {
      const sucursalId = req.usuario?.rol !== 'ADMIN' ? req.usuario?.sucursalId : undefined;
      return res.json(obtenerRecepcionesSqlite(sucursalId));
    }

    // Un no-ADMIN solo ve recepciones de su sucursal
    const where = req.usuario?.rol !== 'ADMIN' && req.usuario?.sucursalId
      ? { sucursalId: req.usuario.sucursalId }
      : {};

    const recepciones = await prisma.recepcionMercancia.findMany({
      where,
      include: {
        proveedor: { select: { nombre: true } },
        sucursal:  { select: { nombre: true } },
        usuario:   { select: { nombre: true } },
        _count:    { select: { detalles: true } },
      },
      orderBy: { creadoEn: 'desc' },
      take:    100,
    });

    return res.json(recepciones);
  } catch (err: any) {
    if (debeUsarSqlite(err)) {
      const sucursalId = req.usuario?.rol !== 'ADMIN' ? req.usuario?.sucursalId : undefined;
      return res.json(obtenerRecepcionesSqlite(sucursalId));
    }
    return next(err);
  }
});

// ── GET /api/proveedores/recepciones/:id ──────────────────────
proveedorRoutes.get('/recepciones/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!tienePrismaRecepciones()) {
      const recepcion = obtenerRecepcionDetalleSqlite(Number(req.params.id));
      if (!recepcion) return res.status(404).json({ error: 'Recepción no encontrada' });

      if (req.usuario?.rol !== 'ADMIN' && recepcion.sucursalId !== req.usuario?.sucursalId) {
        return res.status(403).json({ error: 'No podés ver recepciones de otra sucursal' });
      }

      return res.json(recepcion);
    }

    const id = Number(req.params.id);
    const recepcion = await prisma.recepcionMercancia.findUnique({
      where:   { id },
      include: {
        proveedor: true,
        sucursal:  { select: { nombre: true } },
        usuario:   { select: { nombre: true } },
        detalles:  {
          include: { producto: { select: { nombre: true, tipoUnidad: true, codigoBarras: true } } },
        },
      },
    });
    if (!recepcion) return res.status(404).json({ error: 'Recepción no encontrada' });

    if (req.usuario?.rol !== 'ADMIN' && recepcion.sucursalId !== req.usuario?.sucursalId) {
      return res.status(403).json({ error: 'No podés ver recepciones de otra sucursal' });
    }

    return res.json(recepcion);
  } catch (err: any) {
    if (debeUsarSqlite(err)) {
      const recepcion = obtenerRecepcionDetalleSqlite(Number(req.params.id));
      if (!recepcion) return res.status(404).json({ error: 'Recepción no encontrada' });

      if (req.usuario?.rol !== 'ADMIN' && recepcion.sucursalId !== req.usuario?.sucursalId) {
        return res.status(403).json({ error: 'No podés ver recepciones de otra sucursal' });
      }

      return res.json(recepcion);
    }
    return next(err);
  }
});

function tienePrismaRecepciones() {
  const client = prisma as any;
  return Boolean(client?.recepcionMercancia);
}

function debeUsarSqlite(err: any) {
  const mensaje = String(err?.message ?? '').toLowerCase();
  const code = String(err?.code ?? '').toLowerCase();

  return (
    code === 'p1001' ||
    code === 'p2021' ||
    code === 'p2022' ||
    mensaje.includes("can't reach database server") ||
    mensaje.includes('connection') ||
    mensaje.includes('connect') ||
    mensaje.includes('timeout') ||
    mensaje.includes('cannot read properties of undefined') ||
    mensaje.includes('does not exist') ||
    mensaje.includes('relation') ||
    mensaje.includes('column') ||
    mensaje.includes('table') ||
    mensaje.includes('econnrefused') ||
    mensaje.includes('enotfound')
  );
}
