import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../../db/prisma/prisma.client';

export const TipoEntregaPedidoOnline = {
  RETIRO: 'RETIRO',
  ENVIO: 'ENVIO',
} as const;

export type TipoEntregaPedidoOnline =
  typeof TipoEntregaPedidoOnline[keyof typeof TipoEntregaPedidoOnline];

const ItemPedidoOnlineSchema = z.object({
  productoId: z.number().int().positive(),
  cantidad: z.number().int().positive(),
});

export const CrearPedidoOnlineSchema = z.object({
  clienteId: z.number().int().positive().optional(),
  clienteNombre: z.string().trim().min(2).optional(),
  clienteTel: z.string().trim().min(7).optional(),
  tipoEntrega: z.enum([TipoEntregaPedidoOnline.RETIRO, TipoEntregaPedidoOnline.ENVIO]),
  sucursalId: z.number().int().positive().optional(),
  zonaEnvioId: z.number().int().positive().optional(),
  direccionEnvio: z.string().trim().min(5).optional(),
  observaciones: z.string().trim().max(500).optional(),
  items: z.array(ItemPedidoOnlineSchema).min(1, 'El pedido debe incluir al menos un producto'),
}).superRefine((pedido, ctx) => {
  if (pedido.tipoEntrega === TipoEntregaPedidoOnline.RETIRO && !pedido.sucursalId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['sucursalId'],
      message: 'sucursalId es requerido para pedidos con RETIRO',
    });
  }

  if (pedido.tipoEntrega === TipoEntregaPedidoOnline.ENVIO) {
    if (!pedido.zonaEnvioId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['zonaEnvioId'],
        message: 'zonaEnvioId es requerido para pedidos con ENVIO',
      });
    }
    if (!pedido.direccionEnvio) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['direccionEnvio'],
        message: 'direccionEnvio es requerida para pedidos con ENVIO',
      });
    }
  }
});

export type CrearPedidoOnlineInput = z.infer<typeof CrearPedidoOnlineSchema>;

export type StockInsuficienteDetalle = {
  productoId: number;
  nombre: string;
  sucursalId: number;
  disponible: number;
  solicitado: number;
};

export class PedidoOnlineServiceError extends Error {
  constructor(
    message: string,
    readonly statusCode: 400 | 404 | 409,
  ) {
    super(message);
    this.name = 'PedidoOnlineServiceError';
  }
}

export class StockInsuficientePedidoOnlineError extends PedidoOnlineServiceError {
  constructor(readonly detalles: StockInsuficienteDetalle[]) {
    super('Stock insuficiente para completar el pedido', 409);
    this.name = 'StockInsuficientePedidoOnlineError';
  }
}

const pedidoOnlineInclude = Prisma.validator<Prisma.PedidoOnlineInclude>()({
  sucursal: {
    select: {
      id: true,
      nombre: true,
      direccion: true,
      telefono: true,
    },
  },
  zonaEnvio: {
    select: {
      id: true,
      nombre: true,
      descripcion: true,
      costoEnvio: true,
      sucursalPreferente: true,
    },
  },
  cliente: {
    select: {
      id: true,
      nombre: true,
      email: true,
      telefono: true,
    },
  },
  detalles: {
    include: {
      producto: {
        select: {
          id: true,
          nombre: true,
          codigoBarras: true,
          tipoUnidad: true,
          precioConIva: true,
          precioVenta: true,
        },
      },
    },
  },
});

export type PedidoOnlineCompleto = Prisma.PedidoOnlineGetPayload<{
  include: typeof pedidoOnlineInclude;
}>;

type ItemPedidoNormalizado = {
  productoId: number;
  cantidad: number;
};

type ProductoParaPedido = {
  id: number;
  nombre: string;
  precioConIva: number | null;
  precioVenta: number | null;
};

function redondearMoneda(valor: number): number {
  return Math.round(valor * 100) / 100;
}

function normalizarItems(items: CrearPedidoOnlineInput['items']): ItemPedidoNormalizado[] {
  const cantidadesPorProducto = new Map<number, number>();

  for (const item of items) {
    cantidadesPorProducto.set(
      item.productoId,
      (cantidadesPorProducto.get(item.productoId) ?? 0) + item.cantidad,
    );
  }

  return Array.from(cantidadesPorProducto.entries()).map(([productoId, cantidad]) => ({
    productoId,
    cantidad,
  }));
}

function obtenerPrecioUnitario(producto: ProductoParaPedido): number {
  const precio = producto.precioConIva ?? producto.precioVenta;
  if (precio === null || precio < 0) {
    throw new PedidoOnlineServiceError(`"${producto.nombre}" no tiene precio de venta configurado`, 409);
  }
  return redondearMoneda(precio);
}

async function obtenerStockDisponible(
  tx: Prisma.TransactionClient,
  productoId: number,
  sucursalId: number,
): Promise<number> {
  const stock = await tx.stockSucursal.findUnique({
    where: { productoId_sucursalId: { productoId, sucursalId } },
    select: { cantidad: true, stockReservado: true },
  });

  return Math.max(0, (stock?.cantidad ?? 0) - (stock?.stockReservado ?? 0));
}

async function reservarStockAtomico(
  tx: Prisma.TransactionClient,
  item: ItemPedidoNormalizado,
  producto: ProductoParaPedido,
  sucursalId: number,
): Promise<void> {
  const filasActualizadas = await tx.$executeRaw`
    UPDATE stock_sucursal
    SET stock_reservado = stock_reservado + ${item.cantidad}
    WHERE producto_id = ${item.productoId}
      AND sucursal_id = ${sucursalId}
      AND (cantidad - stock_reservado) >= ${item.cantidad}
  `;

  if (filasActualizadas !== 1) {
    const disponible = await obtenerStockDisponible(tx, item.productoId, sucursalId);
    throw new StockInsuficientePedidoOnlineError([{
      productoId: item.productoId,
      nombre: producto.nombre,
      sucursalId,
      disponible,
      solicitado: item.cantidad,
    }]);
  }
}

async function resolverSucursalYCostoEnvio(
  tx: Prisma.TransactionClient,
  data: CrearPedidoOnlineInput,
): Promise<{ sucursalId: number; costoEnvio: number }> {
  if (data.tipoEntrega === TipoEntregaPedidoOnline.RETIRO) {
    const sucursalId = data.sucursalId;
    if (!sucursalId) {
      throw new PedidoOnlineServiceError('sucursalId es requerido para RETIRO', 400);
    }

    const sucursal = await tx.sucursal.findUnique({
      where: { id: sucursalId },
      select: { id: true },
    });
    if (!sucursal) {
      throw new PedidoOnlineServiceError('Sucursal no encontrada', 404);
    }

    return { sucursalId, costoEnvio: 0 };
  }

  const zonaEnvioId = data.zonaEnvioId;
  if (!zonaEnvioId) {
    throw new PedidoOnlineServiceError('zonaEnvioId es requerido para ENVIO', 400);
  }

  const zonaEnvio = await tx.zonaEnvio.findFirst({
    where: { id: zonaEnvioId, activo: true },
    select: {
      costoEnvio: true,
      sucursalPreferente: true,
    },
  });
  if (!zonaEnvio) {
    throw new PedidoOnlineServiceError('Zona de envio no encontrada o inactiva', 404);
  }
  if (!zonaEnvio.sucursalPreferente) {
    throw new PedidoOnlineServiceError('La zona de envio no tiene sucursal preferente configurada', 409);
  }

  return {
    sucursalId: zonaEnvio.sucursalPreferente,
    costoEnvio: redondearMoneda(zonaEnvio.costoEnvio),
  };
}

export async function crearPedidoOnline(input: CrearPedidoOnlineInput): Promise<PedidoOnlineCompleto> {
  const parsed = CrearPedidoOnlineSchema.safeParse(input);
  if (!parsed.success) {
    throw new PedidoOnlineServiceError(parsed.error.issues[0]?.message ?? 'Pedido invalido', 400);
  }

  const data = parsed.data;
  const items = normalizarItems(data.items);

  return prisma.$transaction(async (tx) => {
    const sucursalYCosto = await resolverSucursalYCostoEnvio(tx, data);
    const productoIds = items.map((item) => item.productoId);
    const productos = await tx.producto.findMany({
      where: { id: { in: productoIds }, activo: true },
      select: {
        id: true,
        nombre: true,
        precioConIva: true,
        precioVenta: true,
      },
    });

    if (productos.length !== productoIds.length) {
      throw new PedidoOnlineServiceError('Uno o mas productos no existen o estan inactivos', 404);
    }

    const productosPorId = new Map(productos.map((producto) => [producto.id, producto]));
    const detalles = items.map((item) => {
      const producto = productosPorId.get(item.productoId);
      if (!producto) {
        throw new PedidoOnlineServiceError(`Producto ${item.productoId} no disponible`, 404);
      }

      const precioUnit = obtenerPrecioUnitario(producto);
      return {
        producto,
        data: {
          productoId: item.productoId,
          cantidad: item.cantidad,
          precioUnit,
          subtotal: redondearMoneda(precioUnit * item.cantidad),
        },
      };
    });

    for (const detalle of detalles) {
      await reservarStockAtomico(tx, detalle.data, detalle.producto, sucursalYCosto.sucursalId);
    }

    const subtotal = redondearMoneda(
      detalles.reduce((total, detalle) => total + detalle.data.subtotal, 0),
    );
    const total = redondearMoneda(subtotal + sucursalYCosto.costoEnvio);

    return tx.pedidoOnline.create({
      data: {
        clienteId: data.clienteId,
        sucursalId: sucursalYCosto.sucursalId,
        zonaEnvioId: data.tipoEntrega === TipoEntregaPedidoOnline.ENVIO ? data.zonaEnvioId : null,
        tipoEntrega: data.tipoEntrega,
        estado: 'RECIBIDO',
        clienteNombre: data.clienteNombre,
        clienteTel: data.clienteTel,
        direccionEnvio: data.tipoEntrega === TipoEntregaPedidoOnline.ENVIO ? data.direccionEnvio : null,
        subtotal,
        costoEnvio: sucursalYCosto.costoEnvio,
        total,
        observaciones: data.observaciones,
        detalles: {
          create: detalles.map((detalle) => detalle.data),
        },
      },
      include: pedidoOnlineInclude,
    });
  }, { timeout: 10000 });
}
