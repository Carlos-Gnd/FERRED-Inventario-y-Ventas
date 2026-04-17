/**
 * HU-02B — T-02B.1: Registro de venta en transacción atómica
 * HU-09B — T-09B.3: Validación de cantidad según tipoUnidad
 * HU-08A — T-08A.3: Integración con generación de DTE
 * HU-08B — T-08B.3: Servicio de reimpresión de tickets
 */
import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma }          from '../../db/prisma/prisma.client';
import { roleMiddleware }  from '../middleware/role.middleware';
import { assertSameSucursal } from '../middleware/sucursal.guard';
import { logPendiente }    from '../../sync/sync.service';
import { sincronizarStockTotal } from './inventario.routes';
import { enviarDteHacienda }    from '../../dte/dte.service';

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
ventasRoutes.post('/', roleMiddleware('ADMIN', 'CAJERO'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = VentaSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: 'Datos de venta inválidos',
        detalle: parsed.error.flatten().fieldErrors,
      });
    }

    const { sucursalId, items, clienteNombre, tipoPago } = parsed.data;
    const usuarioId = req.usuario?.id;

    // BUG-21 FIX: fail-closed cross-sucursal. Un no-ADMIN sin sucursal asignada
    // no puede vender; si la tiene, debe coincidir con la sucursalId del body.
    if (req.usuario?.rol !== 'ADMIN') {
      if (!req.usuario?.sucursalId) {
        return res.status(403).json({ error: 'Tu usuario no tiene sucursal asignada' });
      }
      if (req.usuario.sucursalId !== sucursalId) {
        return res.status(403).json({ error: 'No podés registrar ventas en otra sucursal' });
      }
    }

    // Validación previa: existencia de productos
    const productosIds = items.map(i => i.productoId);
    const productos = await prisma.producto.findMany({
      where: { id: { in: productosIds }, activo: true },
    });

    if (productos.length !== productosIds.length) {
      return res.status(404).json({ error: 'Uno o más productos no existen o están inactivos' });
    }

    // T-09B.3: validar cantidad vs tipoUnidad
    const erroresUnidad: string[] = [];
    for (const item of items) {
      const producto = productos.find(p => p.id === item.productoId)!;
      const errUnidad = validarCantidadPorUnidad(item.cantidad, producto.tipoUnidad, producto.nombre);
      if (errUnidad) erroresUnidad.push(errUnidad);
    }
    if (erroresUnidad.length > 0) {
      return res.status(409).json({ error: 'No se puede completar la venta', detalle: erroresUnidad });
    }

    const subtotal    = items.reduce((acc, i) => acc + i.cantidad * i.precioUnit, 0);
    const iva         = parseFloat((subtotal * 0.13).toFixed(2));
    const total       = parseFloat((subtotal + iva).toFixed(2));
    const subtotalFix = parseFloat(subtotal.toFixed(2));

    const factura = await prisma.$transaction(async (tx) => {
      // Verificar stock DENTRO de la transacción para evitar race conditions
      const erroresStock: string[] = [];
      for (const item of items) {
        const stock = await tx.stockSucursal.findUnique({
          where: { productoId_sucursalId: { productoId: item.productoId, sucursalId } },
        });
        if (!stock || stock.cantidad < item.cantidad) {
          const nombre = productos.find(p => p.id === item.productoId)!.nombre;
          erroresStock.push(
            `"${nombre}" no tiene stock suficiente en esta sucursal. ` +
            `Disponible: ${stock?.cantidad ?? 0}, solicitado: ${item.cantidad}`
          );
        }
      }
      if (erroresStock.length > 0) {
        throw Object.assign(new Error('Stock insuficiente'), { stockErrors: erroresStock });
      }

      const nuevaFactura = await tx.facturaDte.create({
        data: {
          sucursalId,
          usuarioId,
          tipoDte:       '01',
          clienteNombre,
          totalSinIva:   subtotalFix,
          iva,
          total,
          estado:        'SIMULADO',
          sincronizado:  false,
        },
      });

      await tx.detalleVenta.createMany({
        data: items.map(i => ({
          facturaId:  nuevaFactura.id,
          productoId: i.productoId,
          cantidad:   i.cantidad,
          precioUnit: i.precioUnit,
          subtotal:   parseFloat((i.cantidad * i.precioUnit).toFixed(2)),
        })),
      });

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
    }, { timeout: 10000 });

    const syncResults = await Promise.allSettled(
      items.map(i => sincronizarStockTotal(i.productoId))
    );
    for (const r of syncResults) {
      if (r.status === 'rejected') {
        console.error('[ventas] Error sincronizando stockTotal post-venta:', r.reason);
      }
    }

    await logPendiente('facturaDte', 'CREATE', {
      id: factura.id, sucursalId, total, estado: factura.estado,
    }, usuarioId);

    // T-08A.3 / BUG-16 FIX: disparar DTE post-venta sin bloquear la respuesta.
    // Si Hacienda falla, la venta NO se revierte — queda SIMULADO o ERROR_HACIENDA
    // en factura.estado y se puede reintentar con POST /api/dte/:id/reenviar.
    setImmediate(() => {
      enviarDteHacienda(factura.id).catch(err =>
        console.error(`[ventas] DTE post-venta falló (factura ${factura.id}):`, err.message)
      );
    });

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

  } catch (err: any) {
    if (err.stockErrors) {
      return res.status(409).json({ error: 'No se puede completar la venta', detalle: err.stockErrors });
    }
    return next(err);
  }
});

// ── GET /api/ventas/:id/ticket ────────────────────────────────
// T-08B.3: Datos completos para reimprimir un ticket desde historial
ventasRoutes.get('/:id/ticket', roleMiddleware('ADMIN', 'CAJERO'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const facturaId = Number(req.params.id);
    if (isNaN(facturaId) || facturaId < 1) {
      return res.status(400).json({ error: 'id inválido' });
    }

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

    // BUG-N2: validar pertenencia antes de devolver el ticket completo
    if (!assertSameSucursal(req, res, factura.sucursalId)) return;

    return res.json({
      facturaId:        factura.id,
      codigoGeneracion: factura.codigoGeneracion,
      numeroControl:    factura.numeroControl,
      fecha:            factura.creadoEn,
      sucursal:         factura.sucursal,
      cajero:           factura.usuario?.nombre ?? 'Sistema',
      clienteNombre:    factura.clienteNombre,
      tipoDte:          factura.tipoDte,
      estado:           factura.estado,
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