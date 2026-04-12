/**
 * HU-02B — T-02B.1: Registro de venta en transacción atómica
 * HU-09B — T-09B.3: Validación de cantidad según tipoUnidad
 * HU-08A — T-08A.3: Integración con generación de DTE
 */
import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma }          from '../../db/prisma/prisma.client';
import { logPendiente }    from '../../sync/sync.service';
import { sincronizarStockTotal } from './inventario.routes';

export const ventasRoutes = Router();

// ── Schema de validación Zod ──────────────────────────────────
const ItemVentaSchema = z.object({
  productoId: z.number().int().positive(),
  cantidad:   z.number().positive(),
  precioUnit: z.number().positive(),
});

const VentaSchema = z.object({
  sucursalId:     z.number().int().positive(),
  items:          z.array(ItemVentaSchema).min(1, 'El carrito no puede estar vacío'),
  clienteNombre:  z.string().optional().default('Consumidor Final'),
  tipoPago:       z.string().optional().default('efectivo'),
});

// ── Validar cantidad según tipoUnidad (T-09B.3) ──────────────
function validarCantidadPorUnidad(
  cantidad: number,
  tipoUnidad: string | null,
  nombreProducto: string,
): string | null {
  const tipo = tipoUnidad?.toUpperCase() ?? 'UNIDAD';

  if ((tipo === 'UNIDAD' || tipo === 'LOTE') && !Number.isInteger(cantidad)) {
    return `"${nombreProducto}" se vende por ${tipo} — la cantidad debe ser un número entero (recibido: ${cantidad})`;
  }
  if ((tipo === 'PESO' || tipo === 'MEDIDA') && cantidad <= 0) {
    return `"${nombreProducto}" se vende por ${tipo} — la cantidad debe ser mayor a 0`;
  }
  return null;
}

// ── POST /api/ventas ──────────────────────────────────────────
// Registra la venta, descuenta stock y genera DTE en una operación atómica
ventasRoutes.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // 1. Validar body
    const parsed = VentaSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: 'Datos de venta inválidos',
        detalle: parsed.error.flatten().fieldErrors,
      });
    }

    const { sucursalId, items, clienteNombre, tipoPago } = parsed.data;
    const usuarioId = (req as any).usuario?.id ?? null;

    // 2. Verificar productos, stock y tipoUnidad
    const productosIds = items.map(i => i.productoId);
    const productos = await prisma.producto.findMany({
      where:   { id: { in: productosIds }, activo: true },
      include: { stocks: { where: { sucursalId } } },
    });

    if (productos.length !== productosIds.length) {
      return res.status(404).json({ error: 'Uno o más productos no existen o están inactivos' });
    }

    const errores: string[] = [];

    for (const item of items) {
      const producto = productos.find(p => p.id === item.productoId)!;
      const stock    = producto.stocks[0];

      // T-09B.3: validar cantidad vs tipoUnidad
      const errUnidad = validarCantidadPorUnidad(item.cantidad, producto.tipoUnidad, producto.nombre);
      if (errUnidad) errores.push(errUnidad);

      // Validar stock disponible en esta sucursal
      if (!stock || stock.cantidad < item.cantidad) {
        errores.push(
          `"${producto.nombre}" no tiene stock suficiente en esta sucursal. ` +
          `Disponible: ${stock?.cantidad ?? 0}, solicitado: ${item.cantidad}`
        );
      }
    }

    if (errores.length > 0) {
      return res.status(409).json({ error: 'No se puede completar la venta', detalle: errores });
    }

    // 3. Calcular totales
    const subtotal    = items.reduce((acc, i) => acc + i.cantidad * i.precioUnit, 0);
    const iva         = parseFloat((subtotal * 0.13).toFixed(2));
    const total       = parseFloat((subtotal + iva).toFixed(2));
    const subtotalFix = parseFloat(subtotal.toFixed(2));

    // 4. Transacción atómica: factura + detalles + descuento de stock
    const factura = await prisma.$transaction(async (tx) => {
      // 4a. Crear factura DTE
      const nuevaFactura = await tx.facturaDte.create({
        data: {
          sucursalId,
          usuarioId,
          tipoDte:       '01',
          clienteNombre,
          totalSinIva:   subtotalFix,
          iva,
          total,
          estado:        'PENDIENTE_DTE',
          sincronizado:  false,
        },
      });

      // 4b. Crear detalles de venta
      await tx.detalleVenta.createMany({
        data: items.map(i => ({
          facturaId:  nuevaFactura.id,
          productoId: i.productoId,
          cantidad:   i.cantidad,
          precioUnit: i.precioUnit,
          subtotal:   parseFloat((i.cantidad * i.precioUnit).toFixed(2)),
        })),
      });

      // 4c. Descontar stock en la sucursal
      for (const item of items) {
        await tx.stockSucursal.update({
          where: {
            productoId_sucursalId: {
              productoId: item.productoId,
              sucursalId,
            },
          },
          data: { cantidad: { decrement: item.cantidad } },
        });
      }

      return nuevaFactura;
    });

    // 5. Sincronizar stock_actual en productos (fuera de la tx para no bloquear)
    await Promise.all(
      items.map(i => sincronizarStockTotal(i.productoId))
    );

    // 6. Registrar en sync_log para sincronización offline
    await logPendiente('facturaDte', 'CREATE', {
      id: factura.id, sucursalId, total, estado: factura.estado,
    }, usuarioId);

    // 7. Responder con los datos de la factura creada
    const facturaCompleta = await prisma.facturaDte.findUnique({
      where:   { id: factura.id },
      include: {
        detalles: {
          include: { producto: { select: { nombre: true, tipoUnidad: true } } },
        },
        sucursal: { select: { nombre: true } },
      },
    });

    return res.status(201).json({
      ok:      true,
      factura: facturaCompleta,
      resumen: { subtotal: subtotalFix, iva, total },
    });

  } catch (err) { return next(err); }
});

// ── GET /api/ventas/:id/ticket ────────────────────────────────
// T-08B.3: Datos completos para reimprimir un ticket desde historial
ventasRoutes.get('/:id/ticket', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const facturaId = Number(req.params.id);

    const factura = await prisma.facturaDte.findUnique({
      where:   { id: facturaId },
      include: {
        detalles: {
          include: {
            producto: {
              select: { nombre: true, codigoBarras: true, tipoUnidad: true },
            },
          },
        },
        sucursal: { select: { nombre: true, direccion: true, telefono: true } },
        usuario:  { select: { nombre: true } },
      },
    });

    if (!factura) {
      return res.status(404).json({ error: 'Factura no encontrada' });
    }

    return res.json({
      facturaId:      factura.id,
      codigoGeneracion: factura.codigoGeneracion,
      numeroControl:  factura.numeroControl,
      fecha:          factura.creadoEn,
      sucursal:       factura.sucursal,
      cajero:         factura.usuario?.nombre ?? 'Sistema',
      clienteNombre:  factura.clienteNombre,
      tipoDte:        factura.tipoDte,
      estado:         factura.estado,
      items: factura.detalles.map(d => ({
        nombre:     d.producto.nombre,
        tipoUnidad: d.producto.tipoUnidad,
        cantidad:   d.cantidad,
        precioUnit: d.precioUnit,
        subtotal:   d.subtotal,
      })),
      resumen: {
        subtotal: factura.totalSinIva,
        iva:      factura.iva,
        total:    factura.total,
      },
      dteJson: factura.dteJson ?? null,
    });
  } catch (err) { return next(err); }
});