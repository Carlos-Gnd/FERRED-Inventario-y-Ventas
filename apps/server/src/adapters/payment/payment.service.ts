// T-19.2: Servicio de pagos con Stripe PaymentIntents.
// El pedidoId viaja en metadata del PaymentIntent para que el webhook lo recupere sin BD extra.
import Stripe from 'stripe';
import { env } from '../../config/env';

const stripe = new Stripe(env.payment.secretKey, { apiVersion: '2026-04-22.dahlia' });

export { stripe };

export interface PaymentIntentResult {
  clientSecret:    string;
  paymentIntentId: string;
}

// Crea un PaymentIntent en Stripe. monto en USD (dolares, no centavos).
export async function createPaymentIntent(
  pedidoId: number,
  monto:    number,
): Promise<PaymentIntentResult> {
  if (!Number.isFinite(monto) || monto <= 0) {
    throw new Error('El monto debe ser mayor a cero');
  }
  const pi = await stripe.paymentIntents.create({
    amount:   Math.round(monto * 100), // Stripe usa centavos
    currency: 'usd',
    metadata: { pedidoId: String(pedidoId) },
    automatic_payment_methods: { enabled: true },
  });

  if (!pi.client_secret) throw new Error('Stripe no retornó client_secret');

  return { clientSecret: pi.client_secret, paymentIntentId: pi.id };
}

// Verifica la firma del webhook y retorna el evento de Stripe.
// rawBody debe ser el Buffer/string del cuerpo sin parsear.
export function construirEventoStripe(rawBody: Buffer, signature: string): ReturnType<typeof stripe.webhooks.constructEvent> {
  return stripe.webhooks.constructEvent(rawBody, signature, env.payment.webhookSecret);
}
