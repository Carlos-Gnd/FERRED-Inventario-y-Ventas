import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { prisma } from '../../db/prisma/prisma.client';
import {
  crearPedidoOnline,
  CrearPedidoOnlineSchema,
  PedidoOnlineServiceError,
  StockInsuficientePedidoOnlineError,
} from '../services/pedidos-online.service';
import { sincronizarStockTotal } from '../services/stock-sync.service';
import { roleMiddleware } from '../middleware/role.middleware';
import { assertSameSucursal } from '../middleware/sucursal.guard';
import { OfflineCache } from '../../sync/sync.service';

export const pedidosOnlinePublicRoutes = Router();
export const pedidosOnlineRoutes = Router();
export const zonasEnvioPublicRoutes = Router();
export const productosPublicosRoutes = Router();

const ESTADOS_PEDIDO = ['RECIBIDO', 'PREPARANDO', 'LISTO', 'ENTREGADO', 'CANCELADO'] as const;
type EstadoPedidoOnline = typeof ESTADOS_PEDIDO[number];

const TRANSICIONES_PERMITIDAS: Record<EstadoPedidoOnline, EstadoPedidoOnline[]> = {
  RECIBIDO:   ['PREPARANDO', 'CANCELADO'],
  PREPARANDO: ['LISTO', 'CANCELADO'],
  LISTO:      ['ENTREGADO', 'CANCELADO'],
  ENTREGADO:  [],
  CANCELADO:  [],
};

const ListarPedidosQuerySchema = z.object({
  sucursalId: z.coerce.number().int().positive().optional(),
  estado: z.enum(ESTADOS_PEDIDO).optional(),
  fechaInicio: z.coerce.date().optional(),
  fechaFin: z.coerce.date().optional(),
  take: z.coerce.number().int().positive().max(200).optional().default(100),
});

const CambiarEstadoSchema = z.object({
  estado: z.enum(ESTADOS_PEDIDO),
});

function esErrorServicioPedido(error: unknown): error is PedidoOnlineServiceError {
  return error instanceof PedidoOnlineServiceError;
}

function jsonErrorPedido(res: Response, error: PedidoOnlineServiceError) {
  if (error instanceof StockInsuficientePedidoOnlineError) {
    return res.status(error.statusCode).json({
      error: error.message,
      detalle: error.detalles,
    });
  }

  return res.status(error.statusCode).json({ error: error.message });
}

function validarTransicion(estadoActual: EstadoPedidoOnline, estadoNuevo: EstadoPedidoOnline): string | null {
  if (estadoActual === estadoNuevo) return null;
  if (TRANSICIONES_PERMITIDAS[estadoActual].includes(estadoNuevo)) return null;
  return `Transicion invalida de ${estadoActual} a ${estadoNuevo}`;
}

function esEstadoPedidoOnline(estado: string): estado is EstadoPedidoOnline {
  return ESTADOS_PEDIDO.includes(estado as EstadoPedidoOnline);
}

const pedidoCompletoInclude = Prisma.validator<Prisma.PedidoOnlineInclude>()({
  sucursal: {
    select: { id: true, nombre: true, direccion: true, telefono: true },
  },
  zonaEnvio: {
    select: { id: true, nombre: true, descripcion: true, costoEnvio: true, sucursalPreferente: true },
  },
  cliente: {
    select: { id: true, nombre: true, email: true, telefono: true },
  },
  detalles: {
    include: {
      producto: {
        select: {
          id: true,
          nombre: true,
          codigoBarras: true,
          tipoUnidad: true,
          precioVenta: true,
          precioConIva: true,
        },
      },
    },
  },
  pagos: true,
});

type PedidoCompleto = Prisma.PedidoOnlineGetPayload<{
  include: typeof pedidoCompletoInclude;
}>;

type DetalleStockPedido = {
  productoId: number;
  cantidad: number;
};

async function actualizarReservaPorEstado(
  tx: Prisma.TransactionClient,
  pedido: PedidoCompleto,
  estadoNuevo: EstadoPedidoOnline,
): Promise<void> {
  if (estadoNuevo !== 'CANCELADO' && estadoNuevo !== 'ENTREGADO') return;

  const detalles: DetalleStockPedido[] = pedido.detalles.map((detalle) => ({
    productoId: detalle.productoId,
    cantidad: Number(detalle.cantidad),
  }));

  for (const detalle of detalles) {
    if (!Number.isInteger(detalle.cantidad) || detalle.cantidad <= 0) {
      throw new PedidoOnlineServiceError('El detalle del pedido tiene una cantidad invalida para inventario', 409);
    }

    const resultado = estadoNuevo === 'CANCELADO'
      ? await tx.stockSucursal.updateMany({
          where: {
            productoId: detalle.productoId,
            sucursalId: pedido.sucursalId,
            stockReservado: { gte: detalle.cantidad },
          },
          data: {
            stockReservado: { decrement: detalle.cantidad },
          },
        })
      : await tx.stockSucursal.updateMany({
          where: {
            productoId: detalle.productoId,
            sucursalId: pedido.sucursalId,
            cantidad: { gte: detalle.cantidad },
            stockReservado: { gte: detalle.cantidad },
          },
          data: {
            cantidad: { decrement: detalle.cantidad },
            stockReservado: { decrement: detalle.cantidad },
          },
        });

    if (resultado.count !== 1) {
      throw new PedidoOnlineServiceError(
        estadoNuevo === 'CANCELADO'
          ? 'No se pudo liberar la reserva de stock del pedido'
          : 'No se pudo descontar el stock reservado del pedido',
        409,
      );
    }
  }
}

zonasEnvioPublicRoutes.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const zonas = await prisma.zonaEnvio.findMany({
      where: { activo: true },
      select: {
        id: true,
        nombre: true,
        descripcion: true,
        costoEnvio: true,
        sucursalPreferente: true,
      },
      orderBy: { nombre: 'asc' },
    });

    return res.json(zonas);
  } catch (error) {
    return next(error);
  }
});

productosPublicosRoutes.get('/publico/:sucursalId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const sucursalId = Number(req.params.sucursalId);
    if (!Number.isInteger(sucursalId) || sucursalId < 1) {
      return res.status(400).json({ error: 'sucursalId invalido' });
    }

    const productos = await prisma.producto.findMany({
      where: {
        activo: true,
        stocks: {
          some: {
            sucursalId,
            cantidad: { gt: 0 },
          },
        },
      },
      select: {
        id: true,
        nombre: true,
        codigoBarras: true,
        tipoUnidad: true,
        precioVenta: true,
        precioConIva: true,
        categoria: { select: { id: true, nombre: true } },
        stocks: {
          where: { sucursalId },
          select: {
            sucursalId: true,
            cantidad: true,
            stockReservado: true,
          },
        },
      },
      orderBy: { nombre: 'asc' },
    });

    return res.json(productos.map((producto) => {
      const stock = producto.stocks[0];
      const disponible = Math.max(0, (stock?.cantidad ?? 0) - (stock?.stockReservado ?? 0));

      return {
        id: producto.id,
        nombre: producto.nombre,
        codigoBarras: producto.codigoBarras,
        tipoUnidad: producto.tipoUnidad,
        precioVenta: producto.precioVenta,
        precioConIva: producto.precioConIva,
        categoria: producto.categoria,
        sucursalId,
        stockDisponible: disponible,
      };
    }).filter((producto) => producto.stockDisponible > 0));
  } catch (error) {
    return next(error);
  }
});

pedidosOnlinePublicRoutes.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = CrearPedidoOnlineSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: 'Datos de pedido invalidos',
        detalle: parsed.error.flatten().fieldErrors,
      });
    }

    const pedido = await crearPedidoOnline(parsed.data);
    OfflineCache.invalidate(`stock:${pedido.sucursalId}`);
    OfflineCache.invalidate('productos:');

    return res.status(201).json({ ok: true, pedido });
  } catch (error) {
    if (esErrorServicioPedido(error)) {
      return jsonErrorPedido(res, error);
    }

    return next(error);
  }
});

pedidosOnlineRoutes.get(
  '/',
  roleMiddleware('ADMIN', 'BODEGA'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = ListarPedidosQuerySchema.safeParse(req.query);
      if (!parsed.success) {
        return res.status(400).json({
          error: 'Parametros invalidos',
          detalle: parsed.error.flatten().fieldErrors,
        });
      }

      const { sucursalId, estado, fechaInicio, fechaFin, take } = parsed.data;
      const sucursalFiltro = req.usuario?.rol === 'ADMIN'
        ? sucursalId
        : req.usuario?.sucursalId;

      if (req.usuario?.rol !== 'ADMIN' && !sucursalFiltro) {
        return res.status(403).json({ error: 'Tu usuario no tiene sucursal asignada' });
      }

      if (sucursalFiltro && !assertSameSucursal(req, res, sucursalFiltro)) return;

      const pedidos = await prisma.pedidoOnline.findMany({
        where: {
          ...(sucursalFiltro ? { sucursalId: sucursalFiltro } : {}),
          ...(estado ? { estado } : {}),
          ...((fechaInicio || fechaFin) ? {
            creadoEn: {
              ...(fechaInicio ? { gte: fechaInicio } : {}),
              ...(fechaFin ? { lte: fechaFin } : {}),
            },
          } : {}),
        },
        include: pedidoCompletoInclude,
        orderBy: { creadoEn: 'desc' },
        take,
      });

      return res.json({ total: pedidos.length, pedidos });
    } catch (error) {
      return next(error);
    }
  },
);

pedidosOnlineRoutes.patch(
  '/:id/estado',
  roleMiddleware('ADMIN', 'BODEGA'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isInteger(id) || id < 1) {
        return res.status(400).json({ error: 'id invalido' });
      }

      const parsed = CambiarEstadoSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          error: 'Estado invalido',
          detalle: parsed.error.flatten().fieldErrors,
        });
      }

      const pedido = await prisma.$transaction(async (tx) => {
        const actual = await tx.pedidoOnline.findUnique({
          where: { id },
          include: pedidoCompletoInclude,
        });

        if (!actual) {
          throw new PedidoOnlineServiceError('Pedido online no encontrado', 404);
        }

        if (!assertSameSucursal(req, res, actual.sucursalId)) return null;

        if (!esEstadoPedidoOnline(actual.estado)) {
          throw new PedidoOnlineServiceError(`Estado actual desconocido: ${actual.estado}`, 409);
        }

        const estadoActual = actual.estado;
        const estadoNuevo = parsed.data.estado;
        const errorTransicion = validarTransicion(estadoActual, estadoNuevo);
        if (errorTransicion) {
          throw new PedidoOnlineServiceError(errorTransicion, 409);
        }

        if (estadoActual !== estadoNuevo) {
          await actualizarReservaPorEstado(tx, actual, estadoNuevo);
        }

        return tx.pedidoOnline.update({
          where: { id },
          data: { estado: estadoNuevo },
          include: pedidoCompletoInclude,
        });
      }, { timeout: 10000 });

      if (!pedido) return;

      if (parsed.data.estado === 'ENTREGADO') {
        const productoIds = [...new Set(pedido.detalles.map((detalle) => detalle.productoId))];
        const syncResults = await Promise.allSettled(
          productoIds.map((productoId) => sincronizarStockTotal(productoId)),
        );
        for (const result of syncResults) {
          if (result.status === 'rejected') {
            console.error('[pedidos-online] Error sincronizando stockTotal post-entrega:', result.reason);
          }
        }
      }

      OfflineCache.invalidate(`stock:${pedido.sucursalId}`);
      OfflineCache.invalidate('productos:');

      return res.json({ ok: true, pedido });
    } catch (error) {
      if (esErrorServicioPedido(error)) {
        return jsonErrorPedido(res, error);
      }

      return next(error);
    }
  },
);
