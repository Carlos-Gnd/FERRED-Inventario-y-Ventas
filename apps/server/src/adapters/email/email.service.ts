// T-19.5 / T-03.2: Servicio de correo compartido — alertas de stock y confirmaciones de pago.
import nodemailer from 'nodemailer';
import { env } from '../../config/env';
import { prisma } from '../db/prisma/prisma.client';

export function crearTransporte() {
  if (env.smtp.host && env.smtp.user && env.smtp.pass) {
    return nodemailer.createTransport({
      host:   env.smtp.host,
      port:   env.smtp.port,
      secure: env.smtp.secure,
      auth: { user: env.smtp.user, pass: env.smtp.pass },
    });
  }
  console.warn('[Email] SMTP no configurado — modo simulado activo');
  return null;
}

export async function obtenerCorreoRemitente(): Promise<string> {
  const config = await prisma.configuracionNegocio.findUnique({
    where: { clave: 'correo_remitente' },
    select: { valor: true },
  }).catch(() => null);

  return config?.valor || env.smtp.user || 'no-reply@ferred.com.sv';
}

function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[c] ?? c
  );
}

// Anti-spam para confirmaciones de pago: no reenviar si ya se envió en 10 min
const ultimaConfirmacion = new Map<number, number>();
const ANTI_SPAM_PAGO_MS = 10 * 60 * 1000;

export interface ConfirmacionPagoParams {
  clienteEmail:  string;
  clienteNombre: string;
  pedidoId:      number;
  productos:     Array<{ nombre: string; cantidad: number; precioUnit: number }>;
  monto:         number;
  metodo:        string;
  transactionId: string;
}

export async function enviarEmailConfirmacionPago(params: ConfirmacionPagoParams): Promise<void> {
  const ultimo = ultimaConfirmacion.get(params.pedidoId) ?? 0;
  if (Date.now() - ultimo < ANTI_SPAM_PAGO_MS) return;

  const transporte = crearTransporte();
  if (!transporte) return;

  const filas = params.productos.map(p => `
    <tr>
      <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb">${escapeHtml(p.nombre)}</td>
      <td style="padding:8px 12px;text-align:center;border-bottom:1px solid #e5e7eb">${p.cantidad}</td>
      <td style="padding:8px 12px;text-align:right;border-bottom:1px solid #e5e7eb">$${(p.cantidad * p.precioUnit).toFixed(2)}</td>
    </tr>`).join('');

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
      <div style="background:#1f2937;padding:20px;border-radius:8px 8px 0 0">
        <h1 style="color:white;margin:0;font-size:20px">Confirmacion de Pago</h1>
        <p style="color:#9ca3af;margin:4px 0 0">FERRED — Pedido #${params.pedidoId}</p>
      </div>
      <div style="background:#f9fafb;padding:20px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px">
        <p>Hola <strong>${escapeHtml(params.clienteNombre)}</strong>, tu pago fue procesado exitosamente.</p>
        <table style="width:100%;border-collapse:collapse;background:white;border:1px solid #e5e7eb;margin:16px 0">
          <thead>
            <tr style="background:#1f2937;color:white">
              <th style="padding:10px;text-align:left">Producto</th>
              <th style="padding:10px;text-align:center">Cant.</th>
              <th style="padding:10px;text-align:right">Subtotal</th>
            </tr>
          </thead>
          <tbody>${filas}</tbody>
          <tfoot>
            <tr style="background:#f3f4f6">
              <td colspan="2" style="padding:10px 12px;font-weight:bold;text-align:right">Total:</td>
              <td style="padding:10px 12px;font-weight:bold;text-align:right">$${params.monto.toFixed(2)}</td>
            </tr>
          </tfoot>
        </table>
        <table style="width:100%;font-size:14px;color:#374151">
          <tr><td style="padding:4px 0"><strong>Metodo:</strong></td><td>${escapeHtml(params.metodo)}</td></tr>
          <tr><td style="padding:4px 0"><strong>Referencia:</strong></td><td style="font-family:monospace">${escapeHtml(params.transactionId)}</td></tr>
        </table>
        <p style="color:#6b7280;font-size:12px;margin-top:16px">Guarda este correo como comprobante de tu compra.</p>
      </div>
    </div>`;

  try {
    const correoRemitente = await obtenerCorreoRemitente();
    await transporte.sendMail({
      from:    `"FERRED" <${correoRemitente}>`,
      to:      params.clienteEmail,
      subject: `Confirmacion de pago — Pedido #${params.pedidoId}`,
      html,
    });
    ultimaConfirmacion.set(params.pedidoId, Date.now());
  } catch (err: unknown) {
    console.error('[Email] Error al enviar confirmacion de pago:', (err as Error).message);
  }
}
