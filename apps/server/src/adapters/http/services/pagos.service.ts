import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../../db/prisma/prisma.client';

export const MetodoPagoOnline = {
  EFECTIVO: 'EFECTIVO',
  TARJETA: 'TARJETA',
  TRANSFERENCIA: 'TRANSFERENCIA',
} as const;

export type MetodoPagoOnline = typeof MetodoPagoOnline[keyof typeof MetodoPagoOnline];

export const RegistrarPagoSchema = z.object({
  metodo: z.enum([
    MetodoPagoOnline.EFECTIVO,
    MetodoPagoOnline.TARJETA,
    MetodoPagoOnline.TRANSFERENCIA,
  ]),
  monto: z.number().positive().optional(),
  referencia: z.string().trim().min(1).max(120).optional(),
  comprobanteUrl: z.string().trim().regex(
    /^\/api\/pagos\/comprobante\/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(jpg|jpeg|png)$/i,
    'comprobanteUrl invalida',
  ).optional(),
  tarjeta: z.object({
    numero: z.string().regex(/^\d{12,19}$/, 'numero de tarjeta invalido'),
  }).optional(),
});

export type RegistrarPagoInput = z.infer<typeof RegistrarPagoSchema>;

export const ValidarPagoSchema = z.discriminatedUnion('accion', [
  z.object({
    accion: z.literal('APROBAR'),
  }),
  z.object({
    accion: z.literal('RECHAZAR'),
    motivo: z.string().trim().min(3, 'motivo es requerido').max(500),
  }),
]);

export type ValidarPagoInput = z.infer<typeof ValidarPagoSchema>;

export class PagoServiceError extends Error {
  constructor(
    message: string,
    readonly statusCode: 400 | 402 | 404 | 409,
  ) {
    super(message);
    this.name = 'PagoServiceError';
  }
}

const pagoInclude = {
  pedido: {
    select: {
      id: true,
      estado: true,
      total: true,
      clienteId: true,
      sucursalId: true,
    },
  },
} as const;

export type PagoRegistrado = {
  id: number;
  pedidoId: number;
  metodo: string;
  referencia: string | null;
  comprobanteUrl: string | null;
  monto: number;
  estado: string;
  motivoRechazo: string | null;
  creadoEn: Date;
  validadoEn: Date | null;
  pedido: {
    id: number;
    estado: string;
    total: number;
    clienteId: number | null;
    sucursalId: number;
  };
};

function redondearMoneda(valor: number): number {
  return Math.round(valor * 100) / 100;
}

function ultimosCuatroDigitos(numeroTarjeta: string): string {
  return numeroTarjeta.slice(-4);
}

function assertMontoPedido(monto: number, totalPedido: number): void {
  if (redondearMoneda(monto) !== redondearMoneda(totalPedido)) {
    throw new PagoServiceError('El monto del pago no coincide con el total del pedido', 409);
  }
}

async function liberarReservaPedido(
  tx: Prisma.TransactionClient,
  pedido: {
    sucursalId: number;
    detalles: Array<{ productoId: number; cantidad: number }>;
  },
): Promise<void> {
  for (const detalle of pedido.detalles) {
    const cantidad = Number(detalle.cantidad);
    if (!Number.isInteger(cantidad) || cantidad <= 0) {
      throw new PagoServiceError('El detalle del pedido tiene una cantidad invalida para inventario', 409);
    }

    const resultado = await tx.stockSucursal.updateMany({
      where: {
        productoId: detalle.productoId,
        sucursalId: pedido.sucursalId,
        stockReservado: { gte: cantidad },
      },
      data: {
        stockReservado: { decrement: cantidad },
      },
    });

    if (resultado.count !== 1) {
      throw new PagoServiceError('No se pudo liberar la reserva de stock del pedido', 409);
    }
  }
}

export async function registrarPago(
  pedidoId: number,
  input: RegistrarPagoInput,
  options: { clienteId?: number } = {},
): Promise<PagoRegistrado> {
  if (!Number.isInteger(pedidoId) || pedidoId < 1) {
    throw new PagoServiceError('pedidoId invalido', 400);
  }

  const parsed = RegistrarPagoSchema.safeParse(input);
  if (!parsed.success) {
    throw new PagoServiceError(parsed.error.issues[0]?.message ?? 'Datos de pago invalidos', 400);
  }

  const data = parsed.data;

  try {
    return await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const pedido = await tx.pedidoOnline.findUnique({
        where: { id: pedidoId },
        select: {
          id: true,
          total: true,
          estado: true,
          clienteId: true,
        },
      });

      if (!pedido) {
        throw new PagoServiceError('Pedido online no encontrado', 404);
      }
      if (options.clienteId && pedido.clienteId !== options.clienteId) {
        throw new PagoServiceError('Pedido online no encontrado', 404);
      }
      if (pedido.estado === 'CANCELADO') {
        throw new PagoServiceError('No se puede registrar pago para un pedido cancelado', 409);
      }

      const pagoValidado = await tx.pago.findFirst({
        where: { pedidoId, estado: 'VALIDADO' },
        select: { id: true },
      });
      if (pagoValidado) {
        throw new PagoServiceError('El pedido ya tiene un pago validado', 409);
      }

      const monto = redondearMoneda(data.monto ?? pedido.total);
      assertMontoPedido(monto, pedido.total);

      if (data.metodo === MetodoPagoOnline.TARJETA) {
        const numeroTarjeta = data.tarjeta?.numero;
        if (!numeroTarjeta) {
          throw new PagoServiceError('numero de tarjeta requerido', 400);
        }

        const referencia = ultimosCuatroDigitos(numeroTarjeta);
        const rechazada = numeroTarjeta.startsWith('4111');

        if (rechazada) {
          return tx.pago.create({
            data: {
              pedidoId,
              metodo: data.metodo,
              referencia,
              monto,
              estado: 'RECHAZADO',
              motivoRechazo: 'Tarjeta rechazada por simulador',
            },
            include: pagoInclude,
          });
        }

        return tx.pago.create({
          data: {
            pedidoId,
            metodo: data.metodo,
            referencia,
            monto,
            estado: 'VALIDADO',
            validadoEn: new Date(),
          },
          include: pagoInclude,
        });
      }

      if (data.metodo === MetodoPagoOnline.TRANSFERENCIA) {
        if (!data.comprobanteUrl) {
          throw new PagoServiceError('comprobanteUrl es requerida para transferencia', 400);
        }

        return tx.pago.create({
          data: {
            pedidoId,
            metodo: data.metodo,
            referencia: data.referencia ?? null,
            comprobanteUrl: data.comprobanteUrl,
            monto,
            estado: 'VALIDACION_PENDIENTE',
          },
          include: pagoInclude,
        });
      }

      return tx.pago.create({
        data: {
          pedidoId,
          metodo: data.metodo,
          referencia: data.referencia ?? null,
          monto,
          estado: 'PENDIENTE',
        },
        include: pagoInclude,
      });
    }, { timeout: 10000 });
  } catch (error) {
    if (error instanceof PagoServiceError) throw error;

    const prismaError = error as { code?: string };
    if (prismaError.code === 'P2002') {
      throw new PagoServiceError('El pedido ya tiene un pago validado', 409);
    }

    throw error;
  }
}

export async function validarPago(
  pagoId: number,
  input: ValidarPagoInput,
): Promise<PagoRegistrado> {
  if (!Number.isInteger(pagoId) || pagoId < 1) {
    throw new PagoServiceError('pagoId invalido', 400);
  }

  const parsed = ValidarPagoSchema.safeParse(input);
  if (!parsed.success) {
    throw new PagoServiceError(parsed.error.issues[0]?.message ?? 'Datos de validacion invalidos', 400);
  }

  const data = parsed.data;

  try {
    return await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const pago = await tx.pago.findUnique({
        where: { id: pagoId },
        include: {
          pedido: {
            include: {
              detalles: {
                select: {
                  productoId: true,
                  cantidad: true,
                },
              },
            },
          },
        },
      });

      if (!pago) {
        throw new PagoServiceError('Pago no encontrado', 404);
      }

      if (pago.estado === 'VALIDADO') {
        throw new PagoServiceError('El pago ya esta validado', 409);
      }
      if (pago.estado === 'RECHAZADO') {
        throw new PagoServiceError('El pago ya esta rechazado', 409);
      }
      if (pago.pedido.estado === 'ENTREGADO') {
        throw new PagoServiceError('No se puede validar un pago de un pedido entregado', 409);
      }

      const pagoValidado = await tx.pago.findFirst({
        where: {
          pedidoId: pago.pedidoId,
          estado: 'VALIDADO',
        },
        select: { id: true },
      });
      if (pagoValidado) {
        throw new PagoServiceError('El pedido ya tiene un pago validado', 409);
      }

      if (data.accion === 'APROBAR') {
        if (pago.pedido.estado === 'CANCELADO') {
          throw new PagoServiceError('No se puede aprobar un pago de un pedido cancelado', 409);
        }

        return tx.pago.update({
          where: { id: pagoId },
          data: {
            estado: 'VALIDADO',
            motivoRechazo: null,
            validadoEn: new Date(),
          },
          include: pagoInclude,
        });
      }

      if (pago.pedido.estado !== 'CANCELADO') {
        await liberarReservaPedido(tx, pago.pedido);
        await tx.pedidoOnline.update({
          where: { id: pago.pedidoId },
          data: { estado: 'CANCELADO' },
        });
      }

      return tx.pago.update({
        where: { id: pagoId },
        data: {
          estado: 'RECHAZADO',
          motivoRechazo: data.motivo,
          validadoEn: null,
        },
        include: pagoInclude,
      });
    }, { timeout: 10000 });
  } catch (error) {
    if (error instanceof PagoServiceError) throw error;

    const prismaError = error as { code?: string };
    if (prismaError.code === 'P2002') {
      throw new PagoServiceError('El pedido ya tiene un pago validado', 409);
    }

    throw error;
  }
}
