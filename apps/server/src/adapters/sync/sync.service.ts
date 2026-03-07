/**
 * SyncService — sincronización bidireccional Local-First
 *
 * Estrategia:
 * 1. El servidor opera normalmente contra Supabase cuando hay conexión.
 * 2. Cada mutación (CREATE/UPDATE/DELETE) queda registrada en sync_log con status PENDIENTE.
 * 3. Cuando se detecta reconexión, se suben los pendientes y se confirman.
 * 4. Si Supabase no está disponible, las lecturas usan caché en memoria (5 min TTL).
 */

import axios from 'axios';
import { prisma } from '../db/prisma/prisma.client';
import { env }    from '../../config/env';

const INTERVAL_MS  = 30_000;   // cada 30 s
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
const CACHE_TTL = 5 * 60 * 1000; // 5 minutos

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

// ── Servicio principal ────────────────────────────────────────
export const SyncService = {
  start() {
    console.log('🔄 SyncService: iniciado');
    // Verificar conectividad inicial
    this.checkConnectivity().then(() => {
      // Programar chequeos periódicos
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
      await axios.get(`${env.supabase.url}/health`, {
        timeout: 3000,
        headers: { apikey: env.supabase.serviceKey },
      });
      setOnline(true);
      return true;
    } catch {
      setOnline(false);
      return false;
    }
  },

  isOnline() { return _online; },

  // Sube registros PENDIENTE a Supabase directamente vía Prisma
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
      // Invalidar toda la caché — los datos cambiaron
      cache.clear();
    }
  },

  async aplicarOperacion(tabla: string, op: string, payload: any) {
    const model = (prisma as any)[tabla];
    if (!model) throw new Error(`Tabla desconocida: ${tabla}`);

    if (op === 'CREATE') {
      await model.upsert({
        where:  { id: payload.id },
        update: payload,
        create: payload,
      });
    } else if (op === 'UPDATE') {
      await model.update({ where: { id: payload.id }, data: payload });
    } else if (op === 'DELETE') {
      await model.update({ where: { id: payload.id }, data: { activo: false } });
    }
  },
};