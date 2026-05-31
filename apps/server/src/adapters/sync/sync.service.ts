// DT-01: sync.service.ts ahora es el orquestador.
// La lógica está repartida en sync-connectivity.ts, offline-cache.ts y sync-operation-handler.ts.

import { prisma } from '../db/prisma/prisma.client';
import { leerPendientesLocal, logPendienteLocal, marcarError, marcarSincronizado } from './sync.local';
import { setOnline, isOnline, onConnectivityChange } from './sync-connectivity';
import { OfflineCache } from './offline-cache';
import { aplicarOperacion } from './sync-operation-handler';

export { onConnectivityChange, OfflineCache };

const INTERVAL_MS = 30_000;
const MAX_INTENTOS = 5;
// Tolerancia a fallos transitorios de conectividad: solo marcamos offline tras varios
// fallos consecutivos de `SELECT 1`, para que un blip puntual del pooler no haga parpadear
// la app a "sin conexión" cuando en realidad sí hay red.
const FALLOS_PARA_OFFLINE = 3;
let fallosConsecutivos = 0;

export async function logPendiente(
  tabla: string,
  operacion: 'CREATE' | 'UPDATE' | 'DELETE',
  payload: object,
  usuarioId?: number
) {
  logPendienteLocal(tabla, operacion, payload, usuarioId);

  if (!isOnline()) return;

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
      // Éxito → online inmediato y reseteo del contador de fallos.
      fallosConsecutivos = 0;
      setOnline(true);
      return true;
    } catch {
      // Solo declaramos offline tras varios fallos seguidos (tolerancia a blips del pooler).
      fallosConsecutivos += 1;
      if (fallosConsecutivos >= FALLOS_PARA_OFFLINE) {
        setOnline(false);
      }
      return false;
    }
  },

  isOnline() {
    return isOnline();
  },

  async pushPendientes() {
    const pendientes = leerPendientesLocal(50).filter(log => log.intentos < MAX_INTENTOS);
    if (!pendientes.length) return;

    if (process.env.NODE_ENV !== 'production') {
      console.log(`Sync SQLite: ${pendientes.length} pendientes`);
    }

    let ok = 0;
    for (const log of pendientes) {
      try {
        const payload = JSON.parse(log.payload);
        await aplicarOperacion(log.tabla, log.operacion, payload);
        marcarSincronizado(log.id);
        ok++;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`Error sync SQLite ${log.id}:`, msg);
        marcarError(log.id, msg, MAX_INTENTOS);
      }
    }

    if (ok > 0) OfflineCache.clear();
  },

  aplicarOperacion,
};
