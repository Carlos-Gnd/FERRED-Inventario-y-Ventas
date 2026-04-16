import { prisma } from '../db/prisma/prisma.client';
import {
  marcarErrorSync,
  marcarSincronizado,
  obtenerPendientesSqlite,
} from '../db/sqlite.client';

const INTERVAL_MS = 30_000;
const MAX_INTENTOS = 5;

let _online = false;
let _listeners: ((online: boolean) => void)[] = [];

export function isOnline() {
  return _online;
}

export function onConnectivityChange(cb: (online: boolean) => void) {
  _listeners.push(cb);
  return () => {
    _listeners = _listeners.filter((listener) => listener !== cb);
  };
}

function setOnline(value: boolean) {
  if (value === _online) return;

  _online = value;
  console.log(value ? 'Conectado' : 'Offline');
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
  await prisma.syncLog.create({
    data: {
      tabla,
      operacion,
      payload: JSON.stringify(payload),
      usuarioId: usuarioId ?? null,
      status: 'PENDIENTE',
    },
  });
}

const TABLAS_PERMITIDAS = new Set([
  'producto',
  'categoria',
  'usuario',
  'stockSucursal',
  'facturaDte',
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
  usuario: ['id', 'nombre', 'email', 'contrasenaHash', 'rol', 'sucursalId', 'activo'],
  syncLog: ['id', 'tabla', 'operacion', 'payload', 'usuarioId', 'status', 'intentos', 'error', 'creadoEn', 'sincEn'],
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
};

function limpiarPayload(tabla: string, payload: any): any {
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
    console.log('SyncService iniciado');
    void this.run();
    setInterval(() => void this.run(), INTERVAL_MS);
  },

  async run() {
    const online = await this.checkConnectivity();
    if (!online) return;

    await this.pushPendientesSqlite();
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

  async pushPendientesSqlite() {
    const pendientes = obtenerPendientesSqlite().filter((log) => log.intentos < MAX_INTENTOS);

    if (!pendientes.length) return;

    console.log(`Sync SQLite: ${pendientes.length} pendientes`);

    for (const log of pendientes) {
      try {
        const payload = JSON.parse(log.payload);

        await this.aplicarOperacion(log.tabla, log.operacion, payload);
        marcarSincronizado(log.id);
      } catch (err: any) {
        console.error(`Error sync SQLite ${log.id}`, err.message);
        marcarErrorSync(
          log.id,
          log.intentos + 1 >= MAX_INTENTOS ? 'ERROR' : 'PENDIENTE'
        );
      }
    }

    cache.clear();
  },

  async pushPendientes() {
    const pendientes = await prisma.syncLog.findMany({
      where: { status: 'PENDIENTE', intentos: { lt: MAX_INTENTOS } },
      orderBy: { creadoEn: 'asc' },
      take: 50,
    });

    if (!pendientes.length) return;

    console.log(`Procesando ${pendientes.length} pendientes`);

    for (const log of pendientes) {
      try {
        const payload = JSON.parse(log.payload);

        await this.aplicarOperacion(log.tabla, log.operacion, payload);

        await prisma.syncLog.update({
          where: { id: log.id },
          data: { status: 'SINCRONIZADO', sincEn: new Date() },
        });
      } catch (err: any) {
        console.error(`Error sync ${log.id}`, err.message);

        await prisma.syncLog.update({
          where: { id: log.id },
          data: {
            intentos: { increment: 1 },
            error: err.message,
            status: log.intentos + 1 >= MAX_INTENTOS ? 'ERROR' : 'PENDIENTE',
          },
        });
      }
    }

    cache.clear();
  },

  async aplicarOperacion(tabla: string, op: string, payload: any) {
    if (!TABLAS_PERMITIDAS.has(tabla)) {
      throw new Error(`Tabla no permitida: ${tabla}`);
    }

    const model = (prisma as any)[tabla] as any;

    if (!model) {
      throw new Error(`Modelo no encontrado: ${tabla}`);
    }

    const data = limpiarPayload(tabla, payload);

    if (op === 'CREATE') {
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

    if (!data.id) {
      throw new Error(`Payload sin id en ${tabla}`);
    }

    if (op === 'UPDATE') {
      await model.update({
        where: { id: data.id },
        data,
      });
      return;
    }

    if (op === 'DELETE') {
      await model.update({
        where: { id: data.id },
        data: { activo: false },
      });
      return;
    }

    throw new Error(`Operacion no soportada: ${op}`);
  },
};
