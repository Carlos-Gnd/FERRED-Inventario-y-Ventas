/**
 * dte.service.ts
 * T-08A.1: Construccion del JSON DTE tipo 01
 * T-08A.2: Envio al Sandbox de Hacienda
 * T-08B.1: Generacion del codigo QR
 */
import axios  from 'axios';
import crypto from 'crypto';
import QRCode from 'qrcode';
import { prisma } from '../db/prisma/prisma.client';
import { env }   from '../../config/env';

// Mapa tipoUnidad -> codigo catalogo Hacienda
function uniMedidaCode(tipoUnidad: string | null): number {
  switch ((tipoUnidad ?? 'UNIDAD').toUpperCase()) {
    case 'PESO':   return 32;  // Kilogramo
    case 'MEDIDA': return 52;  // Metro
    case 'LOTE':   return 26;  // Caja
    default:       return 59;  // Unidad
  }
}

function numeroALetras(monto: number): string {
  const entero  = Math.floor(monto);
  const decimal = Math.round((monto - entero) * 100);
  return `${entero} DOLARES CON ${decimal.toString().padStart(2, '0')}/100`;
}

async function generarNumeroControl(sucursalId: number): Promise<string> {
  const count = await prisma.facturaDte.count({ where: { sucursalId } });
  const seq   = String(count + 1).padStart(15, '0');
  const estab = String(sucursalId).padStart(4, '0');
  return `DTE-01-${estab}P001-${seq}`;
}

// T-08A.1: Construir el JSON completo del DTE
export async function construirJsonDTE(facturaId: number): Promise<{
  codigoGeneracion: string;
  numeroControl:    string;
  dteJson:          object;
}> {
  const factura = await prisma.facturaDte.findUnique({
    where:   { id: facturaId },
    include: {
      detalles: {
        include: { producto: { select: { nombre: true, codigoBarras: true, tipoUnidad: true } } },
      },
      sucursal: true,
      usuario:  { select: { nombre: true } },
    },
  });

  if (!factura) throw new Error(`Factura ${facturaId} no encontrada`);

  const codigoGeneracion = factura.codigoGeneracion ?? crypto.randomUUID().toUpperCase();
  const numeroControl    = factura.numeroControl    ?? await generarNumeroControl(factura.sucursalId!);
  const fechaEmision     = factura.creadoEn.toISOString().split('T')[0];
  const horaEmision      = factura.creadoEn.toISOString().split('T')[1].substring(0, 8);

  const cuerpoDocumento = factura.detalles.map((det: any, idx: number) => ({
    numItem:      idx + 1,
    codigo:       det.producto.codigoBarras ?? `PROD-${det.productoId}`,
    descripcion:  det.producto.nombre,
    cantidad:     det.cantidad,
    uniMedida:    uniMedidaCode(det.producto.tipoUnidad),
    precioUni:    det.precioUnit,
    ventaNoSuj:   0,
    ventaExenta:  0,
    ventaGravada: parseFloat((det.cantidad * det.precioUnit).toFixed(2)),
    tributos:     null,
  }));

  const totalGravada = parseFloat((factura.totalSinIva ?? 0).toFixed(2));
  const totalIva     = parseFloat((factura.iva         ?? 0).toFixed(2));
  const totalPagar   = parseFloat((factura.total        ?? 0).toFixed(2));

  const dteJson = {
    identificacion: {
      version:          1,
      ambiente:         env.dte.env === 'sandbox' ? '00' : '01',
      tipoDte:          '01',
      numeroControl,
      codigoGeneracion,
      tipoModelo:       1,
      tipoOperacion:    1,
      tipoContingencia: null,
      motivoContin:     null,
      fecEmi:           fechaEmision,
      horEmi:           horaEmision,
      tipoMoneda:       'USD',
    },
    documentoRelacionado: null,
    emisor: {
      nit:                 '00000000000000',
      nrc:                 '0000000',
      nombre:              'FERRED Inventario y Ventas',
      codActividad:        '47592',
      descActividad:       'Venta al por menor de articulos de ferreteria',
      nombreComercial:     'FERRED',
      tipoEstablecimiento: '01',
      direccion: {
        departamento: '05',
        municipio:    '23',
        complemento:  factura.sucursal?.direccion ?? 'San Miguel, El Salvador',
      },
      telefono:        factura.sucursal?.telefono ?? '00000000',
      correo:          'info@ferred.com.sv',
      codEstableMH:    null,
      codEstable:      null,
      codPuntoVentaMH: null,
      codPuntoVenta:   null,
    },
    receptor: {
      tipoDocumento: null,
      numDocumento:  null,
      nrc:           null,
      nombre:        factura.clienteNombre ?? 'Consumidor Final',
      codActividad:  null,
      descActividad: null,
      direccion:     null,
      telefono:      null,
      correo:        null,
    },
    otrosDocumentos: null,
    ventaTercero:    null,
    cuerpoDocumento,
    resumen: {
      totalNoSuj:          0,
      totalExenta:         0,
      totalGravada,
      subTotalVentas:      totalGravada,
      descuNoSuj:          0,
      descuExenta:         0,
      descuGravada:        0,
      porcentajeDescuento: 0,
      totalDescu:          0,
      tributos: [{ codigo: '20', descripcion: 'Impuesto al Valor Agregado 13%', valor: totalIva }],
      subTotal:            totalGravada,
      ivaRete1:            0,
      reteRenta:           0,
      montoTotalOperacion: totalPagar,
      totalNoGravado:      0,
      totalPagar,
      totalLetras:         numeroALetras(totalPagar),
      totalIva,
      saldoFavor:          0,
      condicionOperacion:  1,
      pagos: [{ codigo: '01', montoPago: totalPagar, referencia: '', periodo: null, plazo: null }],
      numPagoElectronico:  '',
    },
    extension: null,
    apendice:  null,
  };

  return { codigoGeneracion, numeroControl, dteJson };
}

// T-08B.1: Generar QR del DTE como base64
// fechaEmi debe ser YYYY-MM-DD (la fecha real de emisión de la factura)
export async function generarQRDte(codigoGeneracion: string, fechaEmi: string): Promise<string> {
  const ambiente = env.dte.env === 'sandbox' ? '00' : '01';
  const url = `https://admin.factura.gob.sv/consultaPublica?ambiente=${ambiente}&codGen=${codigoGeneracion}&fechaEmi=${fechaEmi}`;
  return QRCode.toDataURL(url, {
    errorCorrectionLevel: 'M',
    width:  200,
    margin: 1,
  });
}

// T-08A.2: Enviar DTE al Sandbox de Hacienda
export async function enviarDteHacienda(facturaId: number): Promise<{
  ok:             boolean;
  estado:         string;
  selloRecibido?: string;
  qrBase64?:      string;
  error?:         string;
}> {
  try {
    const { codigoGeneracion, numeroControl, dteJson } = await construirJsonDTE(facturaId);

    // Guardar JSON y codigos en la BD antes de enviar
    await prisma.facturaDte.update({
      where: { id: facturaId },
      data:  { codigoGeneracion, numeroControl, dteJson: JSON.stringify(dteJson) },
    });

    // Generar QR con la fecha real de emisión del DTE
    const fechaEmi = (dteJson as any).identificacion.fecEmi as string;
    const qrBase64 = await generarQRDte(codigoGeneracion, fechaEmi);

    // Intentar enviar al Sandbox de Hacienda
    let estadoFinal   = 'SIMULADO';
    let selloRecibido: string | undefined;

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };

      // Autenticación: Bearer tiene prioridad; Basic como alternativa
      if (env.dte.authToken) {
        headers['Authorization'] = `Bearer ${env.dte.authToken}`;
      } else if (env.dte.sandboxUser && env.dte.sandboxPass) {
        const credentials = Buffer.from(`${env.dte.sandboxUser}:${env.dte.sandboxPass}`).toString('base64');
        headers['Authorization'] = `Basic ${credentials}`;
      }

      const response = await axios.post(
        `${env.dte.sandboxUrl}/fe/dte/recepcion`,
        {
          ambiente:         (dteJson as any).identificacion.ambiente,
          idEnvio:          1,
          version:          1,
          tipoDte:          '01',
          documento:        Buffer.from(JSON.stringify(dteJson)).toString('base64'),
          codigoGeneracion,
        },
        { headers, timeout: 10000 },
      );

      if (response.data?.estado === 'PROCESADO') {
        estadoFinal   = 'PROCESADO';
        selloRecibido = response.data?.selloRecibido;
      } else {
        estadoFinal = 'ERROR_HACIENDA';
        const errMsg = JSON.stringify(response.data?.observaciones ?? response.data);
        await prisma.facturaDte.update({
          where: { id: facturaId },
          data:  { estado: estadoFinal },
        });
        return { ok: false, estado: estadoFinal, error: errMsg };
      }
    } catch (axiosErr: any) {
      // Sandbox no disponible — marcar como SIMULADO (no bloquear la venta)
      estadoFinal = 'SIMULADO';
      console.warn('[DTE] Sandbox no disponible — modo SIMULADO:', axiosErr.message);
    }

    await prisma.facturaDte.update({
      where: { id: facturaId },
      data:  { estado: estadoFinal, sincronizado: true },
    });

    return { ok: true, estado: estadoFinal, selloRecibido, qrBase64 };

  } catch (err: any) {
    console.error('[DTE] Error:', err.message);
    await prisma.facturaDte.update({
      where: { id: facturaId },
      data:  { estado: 'ERROR_INTERNO' },
    }).catch(() => {});
    return { ok: false, estado: 'ERROR_INTERNO', error: err.message };
  }
}

/**
 * Obtener estado de un DTE
 */
export async function obtenerEstadoDTE(facturaId: number): Promise<{
  id:               number;
  numeroControl:    string | null;
  codigoGeneracion: string | null;
  estado:           string;
  sincronizado:     boolean;
}> {
  const factura = await prisma.facturaDte.findUnique({
    where:  { id: facturaId },
    select: { id: true, numeroControl: true, codigoGeneracion: true, estado: true, sincronizado: true },
  });

  if (!factura) throw new Error(`Factura DTE ${facturaId} no encontrada`);
  return factura;
}

/**
 * Listar DTEs de una sucursal
 */
export async function listarDTEsSucursal(
  sucursalId: number,
  limit:      number = 50,
  offset:     number = 0,
): Promise<{ total: number; DTEs: any[] }> {
  const [total, DTEs] = await Promise.all([
    prisma.facturaDte.count({ where: { sucursalId } }),
    prisma.facturaDte.findMany({
      where:   { sucursalId },
      select:  { id: true, numeroControl: true, codigoGeneracion: true, estado: true, clienteNombre: true, total: true, creadoEn: true },
      orderBy: { creadoEn: 'desc' },
      take:    limit,
      skip:    offset,
    }),
  ]);

  return { total, DTEs };
}

/**
 * Reenviar un DTE que falló
 */
export async function reenviarDTE(facturaId: number): Promise<{
  ok:             boolean;
  estado:         string;
  selloRecibido?: string;
  qrBase64?:      string;
  error?:         string;
}> {
  const factura = await prisma.facturaDte.findUnique({
    where:  { id: facturaId },
    select: { id: true, estado: true },
  });

  if (!factura) throw new Error(`Factura DTE ${facturaId} no encontrada`);

  await prisma.facturaDte.update({
    where: { id: facturaId },
    data:  { estado: 'PENDIENTE' },
  });

  return enviarDteHacienda(facturaId);
}
