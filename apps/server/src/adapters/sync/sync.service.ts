/**
 * SyncService — sincronización bidireccional Local-First
 */

import { prisma } from '../db/prisma/prisma.client';

const INTERVAL_MS  = 30_000;
const MAX_INTENTOS = 5;

// ── Estado de conexión ─────────────────────────
let _online = true;
let _listeners: ((online: boolean) => void)[] = [];

export function onConnectivityChange(cb: (online: boolean) => void) {
  _listeners.push(cb);
  return () => { _listeners = _listeners.filter(l => l !== cb); };
}

function setOnline(v: boolean) {
  if (v === _online) return;
  _online = v;
  console.log(v ? '🌐 Conectado' : '📴 Offline');
  _listeners.forEach(cb => cb(v));
}

// ── Cache offline ─────────────────────────
interface CacheEntry { data: unknown; expiresAt: number; }
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

// ── Registrar operación ─────────────────────────
export async function logPendiente(
  tabla: string,
  operacion: 'CREATE' | 'UPDATE' | 'DELETE',
  payload: object,
  usuarioId?: number,
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

// ── Seguridad ─────────────────────────
const TABLAS_PERMITIDAS = new Set([
  'producto',
  'categoria',
  'usuario',
  'stockSucursal',
  'facturaDte',
]);

// ── Campos válidos ─────────────────────────
const CAMPOS_ESCALARES: Record<string, string[]> = {
  producto: [
    'id','categoriaId','nombre','codigoBarras','tipoUnidad',
    'precioCompra','porcentajeGanancia','precioVenta','precioConIva',
    'tieneIva','stockActual','stockMinimo','activo','creadoEn',
  ],
  categoria: ['id','nombre','descripcion','activo'],
  usuario: ['id','nombre','email','contrasenaHash','rol','sucursalId','activo'],
  syncLog: ['id','tabla','operacion','payload','usuarioId','status','intentos','error','creadoEn','sincEn'],

  stockSucursal: [
    'id','productoId','sucursalId','cantidad','minimo','actualizadoEn'
  ],

  facturaDte: [
    'id','sucursalId','usuarioId','codigoGeneracion','numeroControl',
    'tipoDte','clienteNombre','totalSinIva','iva','total',
    'dteJson','estado','sincronizado','creadoEn'
  ],
};

// ── Limpiar payload ─────────────────────────
function limpiarPayload(tabla: string, payload: any): any {
  const campos = CAMPOS_ESCALARES[tabla];

  if (!campos) {
    throw new Error(`Tabla no soportada: ${tabla}`);
  }

  const limpio = Object.fromEntries(
    Object.entries(payload).filter(([k]) => campos.includes(k))
  );

  return limpio;
}

// ── Servicio ─────────────────────────
export const SyncService = {

  start() {
    console.log('🔄 SyncService iniciado');
    this.checkConnectivity().then(() => {
      setInterval(() => this.run(), INTERVAL_MS);
    });
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
    const pendientes = await prisma.syncLog.findMany({
      where: { status: 'PENDIENTE', intentos: { lt: MAX_INTENTOS } },
      orderBy: { creadoEn: 'asc' },
      take: 50,
    });

    if (!pendientes.length) return;

    console.log(`📤 Procesando ${pendientes.length} pendientes`);

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

    if (!data.id) {
      throw new Error(`Payload sin id en ${tabla}`);
    }

    if (op === 'CREATE') {
      await model.upsert({
        where: { id: data.id },
        update: data,
        create: data,
      });

    } else if (op === 'UPDATE') {

      await model.update({
        where: { id: data.id },
        data,
      });

    } else if (op === 'DELETE') {

      await model.update({
        where: { id: data.id },
        data: { activo: false },
      });

    } else {
      throw new Error(`Operación no soportada: ${op}`);
    }
  },
};