// DT-01: Extraído de sync.service.ts — operaciones contra Prisma para el drenaje del sync_log.

import { prisma } from '../db/prisma/prisma.client';

const TABLAS_PERMITIDAS = new Set([
  'producto',
  'categoria',
  'unidadMedida',
  'usuario',
  'stockSucursal',
  'facturaDte',
  'detalleVenta',
  'proveedor',
  'recepcionMercancia',
  'detalleRecepcion',
  'corteCaja',
  'movimientoInventario',
  'devolucion',
  'detalleDevolucion',
  'configuracionNegocio',
]);

const CAMPOS_ESCALARES: Record<string, string[]> = {
  producto: [
    'id', 'categoriaId', 'nombre', 'codigoBarras', 'tipoUnidad', 'precioCompra',
    'porcentajeGanancia', 'precioVenta', 'precioConIva', 'tieneIva', 'stockActual',
    'stockMinimo', 'activo', 'disponibleEcommerce', 'caracteristicas', 'imageUrl',
    'creadoEn', 'updatedAt',
  ],
  categoria: ['id', 'nombre', 'descripcion', 'activo', 'updatedAt'],
  unidadMedida: ['codigo', 'nombre', 'descripcion', 'activo'],
  // BUG-A03: campo correcto en Prisma es 'contrasenaHash', no 'passwordHash'
  usuario: ['id', 'nombre', 'email', 'contrasenaHash', 'rol', 'sucursalId', 'activo', 'updatedAt'],
  stockSucursal: ['id', 'productoId', 'sucursalId', 'cantidad', 'minimo', 'stockReservado', 'actualizadoEn', 'updatedAt'],
  facturaDte: [
    'id', 'sucursalId', 'usuarioId', 'codigoGeneracion', 'numeroControl', 'tipoDte',
    'clienteNombre', 'totalSinIva', 'iva', 'total', 'dteJson', 'estado', 'sincronizado', 'creadoEn',
  ],
  detalleVenta: ['id', 'facturaId', 'productoId', 'cantidad', 'precioUnit', 'subtotal'],
  proveedor: ['id', 'nombre', 'nit', 'telefono', 'email', 'direccion', 'activo', 'creadoEn', 'updatedAt'],
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
  // T-25.1: kardex — solo CREATE, los movimientos son inmutables
  movimientoInventario: [
    'id', 'productoId', 'sucursalId', 'tipo', 'cantidad',
    'saldoAnterior', 'saldoNuevo', 'referencia', 'usuarioId', 'fechaMovimiento',
  ],
  // T-12.1: devoluciones offline (T-12.7)
  devolucion: [
    'id', 'ventaId', 'motivo', 'estado', 'aprobadoPor', 'creadoPor', 'fechaDevolucion',
  ],
  detalleDevolucion: ['id', 'devolucionId', 'productoId', 'cantidad'],
  // SP4-A01: T-20.1 configuración del negocio — incluir en sync para que cambios offline lleguen a Postgres
  configuracionNegocio: ['id', 'clave', 'valor', 'tipo'],
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
    if (tabla === 'configuracionNegocio') { await upsertConfiguracion(payload); return; }
    if (tabla === 'unidadMedida') { await upsertUnidadMedida(payload); return; }
    const model = getModel(tabla);
    const data = limpiarPayload(tabla, payload);
    if (data.id) {
      await model.upsert({ where: { id: Number(data.id) }, update: data, create: data });
    } else {
      await model.create({ data });
    }
    return;
  }

  if (op === 'UPDATE' && tabla === 'configuracionNegocio') {
    await upsertConfiguracion(payload);
    return;
  }
  if (op === 'UPDATE' && tabla === 'unidadMedida') {
    await upsertUnidadMedida(payload);
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

async function upsertConfiguracion(payload: Record<string, unknown>): Promise<void> {
  const data = limpiarPayload('configuracionNegocio', payload);
  if (!data.clave) throw new Error('configuracionNegocio sin clave en payload');
  await prisma.configuracionNegocio.upsert({
    where:  { clave: String(data.clave) },
    update: { valor: data.valor as string },
    create: { clave: String(data.clave), valor: String(data.valor ?? ''), tipo: String(data.tipo ?? 'TEXT') },
  });
}

async function upsertUnidadMedida(payload: Record<string, unknown>): Promise<void> {
  const data = limpiarPayload('unidadMedida', payload);
  if (!data.codigo) throw new Error('unidadMedida sin codigo en payload');
  await prisma.unidadMedida.upsert({
    where:  { codigo: String(data.codigo) },
    update: { nombre: String(data.nombre ?? ''), descripcion: data.descripcion as string | undefined },
    create: {
      codigo:      String(data.codigo),
      nombre:      String(data.nombre ?? ''),
      descripcion: data.descripcion as string | undefined,
      activo:      data.activo !== false,
    },
  });
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
