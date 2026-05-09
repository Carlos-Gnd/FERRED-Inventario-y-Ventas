// DT-01: Extraído de sync.service.ts — operaciones contra Prisma para el drenaje del sync_log.

import { prisma } from '../db/prisma/prisma.client';

const TABLAS_PERMITIDAS = new Set([
  'producto',
  'categoria',
  'usuario',
  'stockSucursal',
  'facturaDte',
  'detalleVenta',
  'proveedor',
  'recepcionMercancia',
  'detalleRecepcion',
  'corteCaja',
]);

const CAMPOS_ESCALARES: Record<string, string[]> = {
  producto: [
    'id', 'categoriaId', 'nombre', 'codigoBarras', 'tipoUnidad', 'precioCompra',
    'porcentajeGanancia', 'precioVenta', 'precioConIva', 'tieneIva', 'stockActual',
    'stockMinimo', 'activo', 'creadoEn', 'updatedAt',
  ],
  categoria: ['id', 'nombre', 'descripcion', 'activo', 'updatedAt'],
  // BUG-A03: campo correcto en Prisma es 'contrasenaHash', no 'passwordHash'
  usuario: ['id', 'nombre', 'email', 'contrasenaHash', 'rol', 'sucursalId', 'activo'],
  stockSucursal: ['id', 'productoId', 'sucursalId', 'cantidad', 'minimo', 'actualizadoEn', 'updatedAt'],
  facturaDte: [
    'id', 'sucursalId', 'usuarioId', 'codigoGeneracion', 'numeroControl', 'tipoDte',
    'clienteNombre', 'totalSinIva', 'iva', 'total', 'dteJson', 'estado', 'sincronizado', 'creadoEn',
  ],
  detalleVenta: ['id', 'facturaId', 'productoId', 'cantidad', 'precioUnit', 'subtotal'],
  proveedor: ['id', 'nombre', 'nit', 'telefono', 'email', 'direccion', 'activo', 'creadoEn'],
  recepcionMercancia: [
    'id', 'proveedorId', 'sucursalId', 'usuarioId', 'numeroFactura', 'total', 'observaciones', 'creadoEn',
  ],
  detalleRecepcion: ['id', 'recepcionId', 'productoId', 'cantidad', 'costoUnit', 'subtotal'],
  corteCaja: [
    'id', 'sucursalId', 'cajeroId', 'tipo',
    'fechaInicio', 'fechaFin',
    'totalEfectivo', 'totalTarjeta', 'totalTransferencia', 'totalGeneral',
    'cantidadVentas', 'observaciones', 'creadoEn',
  ],
};

// DT-11: tipo mínimo para acceder a los modelos de Prisma de forma dinámica
type PrismaDelegate = {
  create(args: { data: Record<string, unknown> }): Promise<{ id: number }>;
  update(args: { where: { id: number }; data: Record<string, unknown> }): Promise<unknown>;
  upsert(args: { where: { id: number }; update: Record<string, unknown>; create: Record<string, unknown> }): Promise<unknown>;
};

function getModel(tabla: string): PrismaDelegate {
  const model = (prisma as unknown as Record<string, PrismaDelegate | undefined>)[tabla];
  if (!model) throw new Error(`Modelo no encontrado: ${tabla}`);
  return model;
}

export function limpiarPayload(tabla: string, payload: Record<string, unknown>): Record<string, unknown> {
  const campos = CAMPOS_ESCALARES[tabla];
  if (!campos) throw new Error(`Tabla no soportada: ${tabla}`);
  return Object.fromEntries(
    Object.entries(payload).filter(([key, value]) => campos.includes(key) && value !== undefined)
  );
}

export async function aplicarOperacion(
  tabla: string,
  op: string,
  payload: Record<string, unknown>
): Promise<void> {
  if (!TABLAS_PERMITIDAS.has(tabla)) throw new Error(`Tabla no permitida: ${tabla}`);
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new Error(`Payload invalido para tabla ${tabla}`);
  }
  if (op !== 'CREATE' && !payload.id) {
    throw new Error(`Payload sin id para operacion ${op} en ${tabla}`);
  }

  if (op === 'CREATE') {
    if (tabla === 'producto') { await crearProductoDesdePendiente(payload); return; }
    const model = getModel(tabla);
    const data = limpiarPayload(tabla, payload);
    if (data.id) {
      await model.upsert({ where: { id: Number(data.id) }, update: data, create: data });
    } else {
      await model.create({ data });
    }
    return;
  }

  const model = getModel(tabla);
  const data = limpiarPayload(tabla, payload);
  if (!data.id) throw new Error(`Payload sin id en ${tabla}`);

  if (op === 'UPDATE') { await model.update({ where: { id: Number(data.id) }, data }); return; }
  if (op === 'DELETE') {
    await model.update({ where: { id: Number(data.id) }, data: { activo: false } });
    return;
  }

  throw new Error(`Operacion no soportada: ${op}`);
}

async function crearProductoDesdePendiente(payload: Record<string, unknown>): Promise<void> {
  const { id: _id, localId: _localId, sucursalId, creadoEn: _creadoEn, ...rest } = payload;
  const productoData: Record<string, unknown> = limpiarPayload('producto', rest);
  delete productoData.id;
  delete productoData.creadoEn;

  // limpiarPayload garantiza solo campos válidos de Prisma; cast necesario para API dinámica
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const d = productoData as any;
  const producto = productoData.codigoBarras
    ? await prisma.producto.upsert({
        where: { codigoBarras: String(productoData.codigoBarras) },
        update: d,
        create: d,
      })
    : await prisma.producto.create({ data: d });

  if (sucursalId) {
    await prisma.stockSucursal.upsert({
      where: { productoId_sucursalId: { productoId: producto.id, sucursalId: Number(sucursalId) } },
      create: {
        productoId: producto.id,
        sucursalId: Number(sucursalId),
        cantidad: Number(productoData.stockActual ?? 0),
        minimo:   Number(productoData.stockMinimo ?? 0),
      },
      update: {
        cantidad: Number(productoData.stockActual ?? 0),
        minimo:   Number(productoData.stockMinimo ?? 0),
      },
    });
  }
}
