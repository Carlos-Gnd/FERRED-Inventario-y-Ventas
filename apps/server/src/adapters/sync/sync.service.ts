import { prisma } from '../db/prisma/prisma.client';
import {
  leerPendientesLocal,
  logPendienteLocal,
  marcarError,
  marcarSincronizado,
} from './sync.local';

const INTERVAL_MS = 30_000;
const MAX_INTENTOS = 5;

let _online = true;
let _listeners: ((online: boolean) => void)[] = [];

export function onConnectivityChange(cb: (online: boolean) => void) {
  _listeners.push(cb);
  return () => {
    _listeners = _listeners.filter((listener) => listener !== cb);
  };
}

function setOnline(value: boolean) {
  if (value === _online) return;
  _online = value;
  _listeners.forEach((cb) => cb(value));
}

interface CacheEntry {
  data: unknown;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry>();
const CACHE_TTL = 5 * 60 * 1000;

export const OfflineCache = {
  set(key: string, data: unknown) {
    cache.set(key, { data, expiresAt: Date.now() + CACHE_TTL });
  },

  get<T>(key: string): T | null {
    const entry = cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      cache.delete(key);
      return null;
    }
    return entry.data as T;
  },

  invalidate(prefix: string) {
    for (const key of cache.keys()) {
      if (key.startsWith(prefix)) cache.delete(key);
    }
  },
};

export async function logPendiente(
  tabla: string,
  operacion: 'CREATE' | 'UPDATE' | 'DELETE',
  payload: object,
  usuarioId?: number
) {
  logPendienteLocal(tabla, operacion, payload, usuarioId);

  if (!SyncService.isOnline()) return;

  // BUG-A02: awaitar y loguear el error en vez de silenciarlo
  try {
    await prisma.syncLog.create({
      data: {
        tabla,
        operacion,
        payload: JSON.stringify(payload),
        usuarioId: usuarioId ?? null,
        status: 'PENDIENTE',
      },
    });
  } catch (err: unknown) {
    console.error('[SyncService] Error al crear syncLog remoto:', (err as Error).message);
  }
}

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
]);

const CAMPOS_ESCALARES: Record<string, string[]> = {
  producto: [
    'id',
    'categoriaId',
    'nombre',
    'codigoBarras',
    'tipoUnidad',
    'precioCompra',
    'porcentajeGanancia',
    'precioVenta',
    'precioConIva',
    'tieneIva',
    'stockActual',
    'stockMinimo',
    'activo',
    'creadoEn',
    'updatedAt',
  ],
  categoria: ['id', 'nombre', 'descripcion', 'activo', 'updatedAt'],
  // BUG-A03: eliminado 'passwordHash' — el campo correcto en Prisma es 'contrasenaHash'
  usuario: ['id', 'nombre', 'email', 'contrasenaHash', 'rol', 'sucursalId', 'activo'],
  stockSucursal: ['id', 'productoId', 'sucursalId', 'cantidad', 'minimo', 'actualizadoEn', 'updatedAt'],
  facturaDte: [
    'id',
    'sucursalId',
    'usuarioId',
    'codigoGeneracion',
    'numeroControl',
    'tipoDte',
    'clienteNombre',
    'totalSinIva',
    'iva',
    'total',
    'dteJson',
    'estado',
    'sincronizado',
    'creadoEn',
  ],
  detalleVenta: ['id', 'facturaId', 'productoId', 'cantidad', 'precioUnit', 'subtotal'],
  proveedor: ['id', 'nombre', 'nit', 'telefono', 'email', 'direccion', 'activo', 'creadoEn'],
  recepcionMercancia: [
    'id',
    'proveedorId',
    'sucursalId',
    'usuarioId',
    'numeroFactura',
    'total',
    'observaciones',
    'creadoEn',
  ],
  detalleRecepcion: ['id', 'recepcionId', 'productoId', 'cantidad', 'costoUnit', 'subtotal'],
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

function limpiarPayload(tabla: string, payload: Record<string, unknown>) {
  const campos = CAMPOS_ESCALARES[tabla];
  if (!campos) {
    throw new Error(`Tabla no soportada: ${tabla}`);
  }

  return Object.fromEntries(
    Object.entries(payload).filter(([key, value]) => campos.includes(key) && value !== undefined)
  );
}

export const SyncService = {
  start() {
    void this.run();
    setInterval(() => void this.run(), INTERVAL_MS);
  },

  async run() {
    const online = await this.checkConnectivity();
    if (!online) return;
    await this.pushPendientes();
  },

  async checkConnectivity(): Promise<boolean> {
    try {
      await prisma.$queryRaw`SELECT 1`;
      setOnline(true);
      return true;
    } catch {
      setOnline(false);
      return false;
    }
  },

  isOnline() {
    return _online;
  },

  async pushPendientes() {
    const pendientes = leerPendientesLocal(50).filter((log) => log.intentos < MAX_INTENTOS);
    if (!pendientes.length) return;

    if (process.env.NODE_ENV !== 'production') {
      console.log(`Sync SQLite: ${pendientes.length} pendientes`);
    }

    let ok = 0;
    for (const log of pendientes) {
      try {
        const payload = JSON.parse(log.payload);
        await this.aplicarOperacion(log.tabla, log.operacion, payload);
        marcarSincronizado(log.id);
        ok++;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`Error sync SQLite ${log.id}:`, msg);
        marcarError(log.id, msg, MAX_INTENTOS);
      }
    }

    if (ok > 0) cache.clear();
  },

  async aplicarOperacion(tabla: string, op: string, payload: Record<string, unknown>) {
    if (!TABLAS_PERMITIDAS.has(tabla)) {
      throw new Error(`Tabla no permitida: ${tabla}`);
    }

    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      throw new Error(`Payload invalido para tabla ${tabla}`);
    }

    if (op !== 'CREATE' && !payload.id) {
      throw new Error(`Payload sin id para operacion ${op} en ${tabla}`);
    }

    if (op === 'CREATE') {
      if (tabla === 'producto') {
        await crearProductoDesdePendiente(payload);
        return;
      }

      const model = getModel(tabla);
      const data = limpiarPayload(tabla, payload);

      if (data.id) {
        await model.upsert({
          where: { id: Number(data.id) },
          update: data,
          create: data,
        });
      } else {
        await model.create({ data });
      }
      return;
    }

    const model = getModel(tabla);
    const data = limpiarPayload(tabla, payload);

    if (!data.id) {
      throw new Error(`Payload sin id en ${tabla}`);
    }

    if (op === 'UPDATE') {
      await model.update({ where: { id: Number(data.id) }, data });
      return;
    }

    if (op === 'DELETE') {
      await model.update({ where: { id: Number(data.id) }, data: { activo: false } });
      return;
    }

    throw new Error(`Operacion no soportada: ${op}`);
  },
};

async function crearProductoDesdePendiente(payload: Record<string, unknown>) {
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
      where: {
        productoId_sucursalId: {
          productoId: producto.id,
          sucursalId: Number(sucursalId),
        },
      },
      create: {
        productoId: producto.id,
        sucursalId: Number(sucursalId),
        cantidad: Number(productoData.stockActual ?? 0),
        minimo: Number(productoData.stockMinimo ?? 0),
      },
      update: {
        cantidad: Number(productoData.stockActual ?? 0),
        minimo: Number(productoData.stockMinimo ?? 0),
      },
    });
  }
}
