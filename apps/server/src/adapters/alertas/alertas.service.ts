/**
 * alertas.service.ts
 * T-03.1: Job automatico revision de stock cada 60 minutos
 * T-03.2: Envio de correo con Nodemailer
 */
import nodemailer from 'nodemailer';
import { prisma } from '../db/prisma/prisma.client';

const INTERVALO_MS = 60 * 60 * 1000;  // 60 minutos
const ANTI_SPAM_MS = 60 * 60 * 1000;  // no re-alertar en 1 hora

// Registro en memoria de ultimas alertas enviadas.
// Se siembra desde BD al arrancar para sobrevivir reinicios (B-16).
const ultimaAlerta = new Map<string, number>();

async function initAntiSpam(): Promise<void> {
  try {
    const hace1hora = new Date(Date.now() - ANTI_SPAM_MS);
    const recientes = await prisma.syncLog.findMany({
      where: { tabla: 'stock_sucursal', operacion: 'ALERTA', creadoEn: { gte: hace1hora } },
      select: { payload: true, creadoEn: true },
    });
    for (const log of recientes) {
      try {
        const parsed = JSON.parse(log.payload) as {
          sucursalId: number;
          items: Array<{ productoId: number }>;
        };
        const ts = new Date(log.creadoEn).getTime();
        for (const item of parsed.items) {
          const key = `${item.productoId}-${parsed.sucursalId}`;
          if ((ultimaAlerta.get(key) ?? 0) < ts) ultimaAlerta.set(key, ts);
        }
      } catch {
        // payload antiguo o malformado, ignorar
      }
    }
    console.log(`[Alertas] Anti-spam cargado desde BD — ${ultimaAlerta.size} entradas`);
  } catch (err: any) {
    console.warn('[Alertas] No se pudo cargar anti-spam desde BD:', err.message);
  }
}

function crearTransporte() {
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    return nodemailer.createTransport({
      host:   process.env.SMTP_HOST,
      port:   Number(process.env.SMTP_PORT ?? 587),
      secure: process.env.SMTP_SECURE === 'true',
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
  }
  console.warn('[Alertas] SMTP no configurado — modo simulado activo');
  return null;
}

async function getEmailBodeguero(sucursalId: number): Promise<string | null> {
  const bodeguero = await prisma.usuario.findFirst({
    where:  { sucursalId, rol: 'BODEGA', activo: true },
    select: { email: true },
  });
  return bodeguero?.email ?? null;
}

function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[c] ?? c
  );
}

function construirHtmlCorreo(
  productos: Array<{ nombre: string; cantidad: number; minimo: number; estado: string }>,
  sucursalNombre: string,
  esCritico: boolean,
): { subject: string; html: string } {
  const subject = esCritico
    ? `ALERTA CRITICA — Productos sin stock en ${sucursalNombre}`
    : `Alerta de Stock Bajo — ${sucursalNombre}`;

  const filas = productos.map(p => `
    <tr style="background:${p.estado === 'critico' ? '#fee2e2' : '#fef3c7'}">
      <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb">${escapeHtml(p.nombre)}</td>
      <td style=\"padding:8px 12px;text-align:center;font-weight:bold;color:${p.estado === 'critico' ? '#dc2626' : '#d97706'}\">${p.cantidad}</td>
      <td style="padding:8px 12px;text-align:center">${p.minimo}</td>
      <td style="padding:8px 12px;text-align:center">
        <span style="padding:2px 8px;border-radius:4px;font-size:12px;font-weight:bold;background:${p.estado === 'critico' ? '#dc2626' : '#f59e0b'};color:white">
          ${p.estado === 'critico' ? 'SIN STOCK' : 'STOCK BAJO'}
        </span>
      </td>
    </tr>`).join('');

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
      <div style="background:${esCritico ? '#dc2626' : '#f59e0b'};padding:20px;border-radius:8px 8px 0 0">
        <h1 style="color:white;margin:0;font-size:20px">
          ${esCritico ? 'ALERTA CRITICA DE STOCK' : 'Alerta de Stock Bajo'}
        </h1>
        <p style="color:white;margin:6px 0 0;opacity:0.9">${escapeHtml(sucursalNombre)} — FERRED</p>
      </div>
      <div style="background:#f9fafb;padding:20px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px">
        <table style="width:100%;border-collapse:collapse;background:white;border:1px solid #e5e7eb">
          <thead>
            <tr style="background:#1f2937;color:white">
              <th style="padding:10px">Producto</th>
              <th style="padding:10px;text-align:center">Stock actual</th>
              <th style="padding:10px;text-align:center">Minimo</th>
              <th style="padding:10px;text-align:center">Estado</th>
            </tr>
          </thead>
          <tbody>${filas}</tbody>
        </table>
      </div>
    </div>`;

  return { subject, html };
}

// T-03.1 + T-03.2: Revisar stock y enviar correos
async function checkStock(): Promise<void> {
  try {
    const todos = await prisma.stockSucursal.findMany({
      include: {
        producto: { select: { nombre: true, stockMinimo: true, activo: true } },
        sucursal: { select: { id: true, nombre: true } },
      },
    });

    const bajoMinimo = todos.filter(
      (c: any) => c.producto.activo && c.cantidad <= c.minimo
    );

    if (bajoMinimo.length === 0) return;

    // Agrupar por sucursal
    const porSucursal = new Map<number, typeof bajoMinimo>();
    for (const item of bajoMinimo) {
      const sid = item.sucursal.id;
      if (!porSucursal.has(sid)) porSucursal.set(sid, []);
      porSucursal.get(sid)!.push(item);
    }

    const transporte = crearTransporte();

    for (const [sucursalId, items] of porSucursal) {
      // Anti-spam: filtrar ya alertados en la ultima hora
      const paraAlertar = items.filter((item: any) => {
        const key      = `${item.productoId}-${sucursalId}`;
        const lastTime = ultimaAlerta.get(key) ?? 0;
        return Date.now() - lastTime > ANTI_SPAM_MS;
      });

      if (paraAlertar.length === 0) continue;

      // Marcar como alertados
      paraAlertar.forEach((item: any) =>
        ultimaAlerta.set(`${item.productoId}-${sucursalId}`, Date.now())
      );

      // Registrar en sync_log — sucursalId en raíz del payload para que
      // el filtro de sync-pendientes (B-04) lo cuente correctamente (B-17).
      await prisma.syncLog.create({
        data: {
          tabla:     'stock_sucursal',
          operacion: 'ALERTA',
          payload:   JSON.stringify({
            sucursalId,
            items: paraAlertar.map((i: any) => ({
              productoId: i.productoId,
              nombre:     i.producto.nombre,
              cantidad:   i.cantidad,
              minimo:     i.minimo,
            })),
          }),
          status: 'SINCRONIZADO',
        },
      });

      const sucursalNombre = items[0].sucursal.nombre;
      const tieneCriticos  = paraAlertar.some((i: any) => i.cantidad === 0);
      const productosInfo  = paraAlertar.map((i: any) => ({
        nombre:   i.producto.nombre,
        cantidad: i.cantidad,
        minimo:   i.minimo,
        estado:   i.cantidad === 0 ? 'critico' : 'bajo',
      }));

      if (!transporte) {
        console.log(`[Alertas] SIMULADO — ${paraAlertar.length} alertas en ${sucursalNombre}`);
        productosInfo.forEach((p: any) =>
          console.log(`  - ${p.nombre}: ${p.cantidad} / min ${p.minimo} (${p.estado})`)
        );
        continue;
      }

      const emailBodeguero = await getEmailBodeguero(sucursalId);
      if (!emailBodeguero) continue;

      const { subject, html } = construirHtmlCorreo(productosInfo, sucursalNombre, tieneCriticos);

      await transporte.sendMail({
        from:    `"FERRED Sistema" <${process.env.SMTP_USER}>`,
        to:      emailBodeguero,
        subject,
        html,
      });

      console.log(`[Alertas] Correo enviado a ${emailBodeguero} — ${paraAlertar.length} productos`);
    }
  } catch (err: any) {
    console.error('[Alertas] Error en checkStock:', err.message);
  }
}

export const AlertasService = {
  async start() {
    console.log('[Alertas] Servicio iniciado — revision cada 60 minutos');
    await initAntiSpam();          // B-16: sembrar anti-spam desde BD
    checkStock();
    setInterval(checkStock, INTERVALO_MS);
  },
  checkNow: checkStock,
};
