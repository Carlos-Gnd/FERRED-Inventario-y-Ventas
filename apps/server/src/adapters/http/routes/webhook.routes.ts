// T-19.3: Webhook de Stripe — recibe payment_intent.succeeded / payment_intent.payment_failed.
// Montado ANTES de express.json() en index.ts para que el body llegue sin parsear.
import { Router, Request, Response } from 'express';
import type Stripe from 'stripe';
import { prisma }                    from '../../db/prisma/prisma.client';
import { stripe, construirEventoStripe } from '../../payment/payment.service';
import { enviarEmailConfirmacionPago } from '../../email/email.service';

export const stripeWebhookRoutes = Router();

stripeWebhookRoutes.post('/', async (req: Request, res: Response) => {
  const signature = req.headers['stripe-signature'];
  if (!signature || typeof signature !== 'string') {
    return res.status(400).json({ error: 'Firma de webhook requerida' });
  }

  let evento: ReturnType<typeof stripe.webhooks.constructEvent>;
  try {
    evento = construirEventoStripe(req.body as Buffer, signature);
  } catch (err: unknown) {
    console.error('[Webhook] Firma invalida:', (err as Error).message);
    return res.status(400).json({ error: 'Firma invalida' });
  }

  try {
    const pi = evento.data.object as Stripe.PaymentIntent;
    if (evento.type === 'payment_intent.succeeded') {
      await manejarPagoExitoso(pi);
    } else if (evento.type === 'payment_intent.payment_failed') {
      await manejarPagoFallido(pi);
    }
    // Otros eventos de Stripe se ignoran silenciosamente
  } catch (err: unknown) {
    console.error('[Webhook] Error procesando evento:', (err as Error).message);
    // Retornamos 200 igual para que Stripe no reintente indefinidamente errores de lógica
  }

  return res.json({ received: true });
});

async function manejarPagoExitoso(pi: Stripe.PaymentIntent): Promise<void> {
  const pedidoId = Number(pi.metadata?.pedidoId);
  if (!pedidoId) return;

  const pedido = await prisma.pedidoOnline.findUnique({
    where:   { id: pedidoId },
    include: {
      detalles: {
        include: { producto: { select: { nombre: true } } },
      },
      cliente: { select: { email: true, nombre: true } },
    },
  });
  if (!pedido) return;

  const monto = pi.amount_received / 100;

  // Idempotencia: upsert por (pedidoId, estado='VALIDADO') — la constraint unique lo garantiza
  await prisma.pago.upsert({
    where:  { pago_pedido_validado_unique: { pedidoId, estado: 'VALIDADO' } },
    update: {},
    create: {
      pedidoId,
      metodo:     'STRIPE',
      referencia: pi.id,
      monto,
      estado:     'VALIDADO',
      validadoEn: new Date(),
    },
  });

  // Notificar al cliente por email si tenemos su correo
  const clienteEmail  = pedido.cliente?.email;
  const clienteNombre = pedido.cliente?.nombre ?? pedido.clienteNombre ?? 'Cliente';

  if (clienteEmail) {
    await enviarEmailConfirmacionPago({
      clienteEmail,
      clienteNombre,
      pedidoId,
      productos: pedido.detalles.map(d => ({
        nombre:     d.producto.nombre,
        cantidad:   Number(d.cantidad),
        precioUnit: d.precioUnit,
      })),
      monto,
      metodo:        'Stripe',
      transactionId: pi.id,
    });
  }
}

async function manejarPagoFallido(pi: Stripe.PaymentIntent): Promise<void> {
  const pedidoId = Number(pi.metadata?.pedidoId);
  if (!pedidoId) return;

  const motivo = pi.last_payment_error?.message ?? 'Pago rechazado por la pasarela';

  await prisma.pago.upsert({
    where:  { pago_pedido_validado_unique: { pedidoId, estado: 'RECHAZADO' } },
    update: { motivoRechazo: motivo },
    create: {
      pedidoId,
      metodo:        'STRIPE',
      referencia:    pi.id,
      monto:         pi.amount / 100,
      estado:        'RECHAZADO',
      motivoRechazo: motivo,
    },
  });
}
