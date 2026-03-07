import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../../db/prisma/prisma.client';
import { roleMiddleware } from '../middleware/role.middleware';

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

// Calcula precio de venta automáticamente si se dan costo + ganancia
function calcularPrecios(data: any) {
  if (data.precioCompra && data.porcentajeGanancia !== undefined) {
    const precioVenta = data.precioCompra * (1 + data.porcentajeGanancia / 100);
    data.precioVenta  = Math.round(precioVenta * 100) / 100;
    data.precioConIva = data.tieneIva
      ? Math.round(precioVenta * 1.13 * 100) / 100
      : data.precioVenta;
  }
  return data;
}

// GET /api/productos
productoRoutes.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { buscar, categoriaId, criticos } = req.query;

    const productos = await prisma.producto.findMany({
      where: {
        activo: true,
        ...(categoriaId ? { categoriaId: Number(categoriaId) } : {}),
        ...(criticos === 'true' ? { stockActual: { lte: prisma.producto.fields.stockMinimo as any } } : {}),
        ...(buscar ? {
          OR: [
            { nombre:       { contains: String(buscar) } },
            { codigoBarras: { contains: String(buscar) } },
          ],
        } : {}),
      },
      include: { categoria: { select: { id: true, nombre: true } } },
      orderBy: { nombre: 'asc' },
    });

    return res.json(productos);
  } catch (err) { return next(err); }
});

// GET /api/productos/barcode/:codigo
productoRoutes.get('/barcode/:codigo', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const producto = await prisma.producto.findUnique({
      where:   { codigoBarras: req.params.codigo },
      include: { categoria: true },
    });
    if (!producto) return res.status(404).json({ error: 'Producto no encontrado' });
    return res.json(producto);
  } catch (err) { return next(err); }
});

// POST /api/productos — ADMIN y BODEGA
productoRoutes.post('/', roleMiddleware('ADMIN', 'BODEGA'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });

    const data = calcularPrecios(parsed.data);
    const nuevo = await prisma.producto.create({ data, include: { categoria: true } });
    return res.status(201).json({ mensaje: 'Producto creado', producto: nuevo });
  } catch (err) { return next(err); }
});

// PUT /api/productos/:id
productoRoutes.put('/:id', roleMiddleware('ADMIN', 'BODEGA'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Number(req.params.id);
    const parsed = schema.partial().safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });

    const data = calcularPrecios(parsed.data);
    const actualizado = await prisma.producto.update({ where: { id }, data, include: { categoria: true } });
    return res.json({ mensaje: 'Producto actualizado', producto: actualizado });
  } catch (err) { return next(err); }
});

// DELETE /api/productos/:id — borrado lógico
productoRoutes.delete('/:id', roleMiddleware('ADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Number(req.params.id);
    await prisma.producto.update({ where: { id }, data: { activo: false } });
    return res.json({ mensaje: 'Producto desactivado' });
  } catch (err) { return next(err); }
});