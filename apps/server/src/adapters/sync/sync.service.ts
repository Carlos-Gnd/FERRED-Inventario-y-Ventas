/**
 * SyncService — sincronización bidireccional Local-First
 *
 * Estrategia:
 * 1. El servidor opera normalmente contra Supabase cuando hay conexión.
 * 2. Cada mutación (CREATE/UPDATE/DELETE) queda registrada en sync_log con status PENDIENTE.
 * 3. Cuando se detecta reconexión, se suben los pendientes y se confirman.
 * 4. Si Supabase no está disponible, las lecturas usan caché en memoria (5 min TTL).
 */

import { prisma } from '../db/prisma/prisma.client';

const INTERVAL_MS  = 30_000;
const MAX_INTENTOS = 5;

// ── Estado interno de conectividad ────────────────────────────
let _online   = true;
let _listeners: ((online: boolean) => void)[] = [];

export function onConnectivityChange(cb: (online: boolean) => void) {
  _listeners.push(cb);
  return () => { _listeners = _listeners.filter(l => l !== cb); };
}

function setOnline(v: boolean) {
  if (v === _online) return;
  _online = v;
  console.log(v ? '🌐 SyncService: conexión restaurada' : '📴 SyncService: sin conexión — modo offline');
  _listeners.forEach(cb => cb(v));
}

// ── Caché en memoria para modo offline ───────────────────────
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
    if (Date.now() > entry.expiresAt) { cache.delete(key); return null; }
    return entry.data as T;
  },
  invalidate(prefix: string) {
    for (const key of cache.keys()) {
      if (key.startsWith(prefix)) cache.delete(key);
    }
  },
};

// ── Helper para registrar operaciones pendientes ──────────────
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
      payload:   JSON.stringify(payload),
      usuarioId: usuarioId ?? null,
      status:    'PENDIENTE',
    },
  });
}

// ── Campos escalares por tabla ──
const CAMPOS_ESCALARES: Record<string, string[]> = {
  producto: [
    'id', 'categoriaId', 'nombre', 'codigoBarras', 'tipoUnidad',
    'precioCompra', 'porcentajeGanancia', 'precioVenta', 'precioConIva',
    'tieneIva', 'stockActual', 'stockMinimo', 'activo', 'creadoEn',
  ],
  categoria: ['id', 'nombre', 'descripcion', 'activo'],
  usuario:   ['id', 'nombre', 'email', 'passwordHash', 'rol', 'sucursalId', 'activo'],
  syncLog:   ['id', 'tabla', 'operacion', 'payload', 'usuarioId', 'status', 'intentos', 'error', 'creadoEn', 'sincEn'],
};

function limpiarPayload(tabla: string, payload: any): any {
  const campos = CAMPOS_ESCALARES[tabla];
  if (!campos) return payload; // tabla desconocida, intentar tal cual
  return Object.fromEntries(
    Object.entries(payload).filter(([k]) => campos.includes(k))
  );
}

// ── Servicio principal ────────────────────────────────────────
export const SyncService = {
  start() {
    console.log('🔄 SyncService: iniciado');
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

  isOnline() { return _online; },

  async pushPendientes() {
    const pendientes = await prisma.syncLog.findMany({
      where:   { status: 'PENDIENTE', intentos: { lt: MAX_INTENTOS } },
      orderBy: { creadoEn: 'asc' },
      take:    50,
    });

    if (pendientes.length === 0) return;
    console.log(`📤 SyncService: procesando ${pendientes.length} registros pendientes`);

    let ok = 0;
    for (const log of pendientes) {
      try {
        const payload = JSON.parse(log.payload);
        await this.aplicarOperacion(log.tabla, log.operacion, payload);
        await prisma.syncLog.update({
          where: { id: log.id },
          data:  { status: 'SINCRONIZADO', sincEn: new Date() },
        });
        ok++;
      } catch (err: any) {
        console.error(`❌ SyncService error en log ${log.id}:`, err.message);
        await prisma.syncLog.update({
          where: { id: log.id },
          data:  {
            intentos: { increment: 1 },
            error:    err.message?.substring(0, 500),
            status:   log.intentos + 1 >= MAX_INTENTOS ? 'ERROR' : 'PENDIENTE',
          },
        });
      }
    }

    if (ok > 0) {
      console.log(`✅ SyncService: ${ok}/${pendientes.length} sincronizados`);
      cache.clear();
    }
  },

  async aplicarOperacion(tabla: string, op: string, payload: any) {
    const model = (prisma as any)[tabla];
    if (!model) throw new Error(`Tabla desconocida: ${tabla}`);

    // limpiar relaciones anidadas
    const data = limpiarPayload(tabla, payload);
    if (op === 'CREATE') {
      await model.upsert({
        where:  { id: data.id },
        update: data,
        create: data,
      });
    } else if (op === 'UPDATE') {
      await model.update({ where: { id: data.id }, data });
    } else if (op === 'DELETE') {
      await model.update({ where: { id: data.id }, data: { activo: false } });
    }
  },
};