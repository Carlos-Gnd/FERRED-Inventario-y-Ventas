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

export class PagoServiceError extends Error {
  constructor(
    message: string,
    readonly statusCode: 400 | 402 | 404 | 409,
  ) {
    super(message);
    this.name = 'PagoServiceError';
  }
}

const pagoInclude = Prisma.validator<Prisma.PagoInclude>()({
  pedido: {
    select: {
      id: true,
      estado: true,
      total: true,
      clienteId: true,
      sucursalId: true,
    },
  },
});

export type PagoRegistrado = Prisma.PagoGetPayload<{
  include: typeof pagoInclude;
}>;

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
    return await prisma.$transaction(async (tx) => {
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
