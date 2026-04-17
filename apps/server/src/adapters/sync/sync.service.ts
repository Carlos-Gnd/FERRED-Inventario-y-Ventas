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

  prisma.syncLog.create({
    data: {
      tabla,
      operacion,
      payload: JSON.stringify(payload),
      usuarioId: usuarioId ?? null,
      status: 'PENDIENTE',
    },
  }).catch(() => {
    // SQLite local ya guardo la operacion; este espejo remoto es best-effort.
  });
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
  ],
  categoria: ['id', 'nombre', 'descripcion', 'activo'],
  usuario: ['id', 'nombre', 'email', 'contrasenaHash', 'passwordHash', 'rol', 'sucursalId', 'activo'],
  stockSucursal: ['id', 'productoId', 'sucursalId', 'cantidad', 'minimo', 'actualizadoEn'],
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

function limpiarPayload(tabla: string, payload: any) {
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
      } catch (err: any) {
        console.error(`Error sync SQLite ${log.id}:`, err.message);
        marcarError(log.id, err.message, MAX_INTENTOS);
      }
    }

    if (ok > 0) cache.clear();
  },

  async aplicarOperacion(tabla: string, op: string, payload: any) {
    if (!TABLAS_PERMITIDAS.has(tabla)) {
      throw new Error(`Tabla no permitida: ${tabla}`);
    }

    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      throw new Error(`Payload invalido para tabla ${tabla}`);
    }

    // Validación de ID: Solo CREATE puede ir sin ID (si el DB remoto lo genera)
    if (op !== 'CREATE' && !payload.id) {
      throw new Error(`Payload sin id para operacion ${op} en ${tabla}`);
    }

    if (op === 'CREATE') {
      if (tabla === 'producto') {
        await crearProductoDesdePendiente(payload);
        return;
      }

      const model = (prisma as any)[tabla];
      if (!model) throw new Error(`Modelo no encontrado: ${tabla}`);
      const data = limpiarPayload(tabla, payload);

      if (data.id) {
        await model.upsert({
          where: { id: data.id },
          update: data,
          create: data,
        });
      } else {
        await model.create({ data });
      }
      return;
    }

    // Lógica para UPDATE y DELETE
    const model = (prisma as any)[tabla];
    if (!model) throw new Error(`Modelo no encontrado: ${tabla}`);
    const data = limpiarPayload(tabla, payload);

    if (!data.id) {
      throw new Error(`Payload sin id en ${tabla}`);
    }

    if (op === 'UPDATE') {
      await model.update({ where: { id: data.id }, data });
      return;
    }

    if (op === 'DELETE') {
      await model.update({ where: { id: data.id }, data: { activo: false } });
      return;
    }

    throw new Error(`Operacion no soportada: ${op}`);
  },
};

async function crearProductoDesdePendiente(payload: any) {
  const { id: _id, localId: _localId, sucursalId, creadoEn: _creadoEn, ...data } = payload;
  const productoData = limpiarPayload('producto', data) as any;
  delete productoData.id;
  delete productoData.creadoEn;

  const producto = productoData.codigoBarras
    ? await prisma.producto.upsert({
      where: { codigoBarras: String(productoData.codigoBarras) },
      update: productoData,
      create: productoData,
    })
    : await prisma.producto.create({ data: productoData });

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