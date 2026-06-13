// DT-01: sync.service.ts ahora es el orquestador.
// La lógica está repartida en sync-connectivity.ts, offline-cache.ts y sync-operation-handler.ts.

import { prisma } from '../db/prisma/prisma.client';
import { leerPendientesLocal, logPendienteLocal, marcarError, marcarSincronizado } from './sync.local';
import { setOnline, isOnline, onConnectivityChange } from './sync-connectivity';
import { OfflineCache } from './offline-cache';
import { aplicarOperacion } from './sync-operation-handler';

export { onConnectivityChange, OfflineCache };

/**
 * Encola una mutación de dominio para sincronización offline-first.
 *
 * Paso 2 del patrón de escritura doble: escribe SIEMPRE en el `sync_log` de SQLite
 * (vía {@link logPendienteLocal}) y, solo si hay conexión, además crea el `SyncLog`
 * espejo en Postgres. Si la escritura remota falla, se loguea pero NO se lanza: el
 * pendiente local garantiza que el dato se reconcilie en el próximo drenaje.
 *
 * @param tabla     Nombre de la tabla/agregado (debe estar en `TABLAS_SYNC`).
 * @param operacion Tipo de mutación: 'CREATE' | 'UPDATE' | 'DELETE'.
 * @param payload   Objeto con los campos a persistir (se serializa a JSON).
 * @param usuarioId Autor de la operación; opcional para jobs del sistema.
 */

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

/**
 * Orquestador de sincronización offline ↔ online.
 *
 * Corre un loop cada {@link INTERVAL_MS} (30 s): verifica conectividad y, si hay red,
 * drena los pendientes locales contra Postgres. Es un singleton (objeto literal) que
 * se arranca una vez desde el composition root con {@link SyncService.start}.
 */
export const SyncService = {
  /** Arranca el loop: una corrida inmediata y luego cada {@link INTERVAL_MS}. */
  start() {
    void this.run();
    setInterval(() => void this.run(), INTERVAL_MS);
  },

  /** Una iteración del loop: chequea conexión y, si hay, empuja pendientes. */
  async run() {
    const online = await this.checkConnectivity();
    if (!online) return;
    await this.pushPendientes();
  },

  /**
   * Sondea Postgres con `SELECT 1` y actualiza el estado online/offline.
   *
   * Tolera blips del pooler: solo declara offline tras {@link FALLOS_PARA_OFFLINE}
   * fallos consecutivos; cualquier éxito resetea el contador y marca online de inmediato.
   *
   * @returns `true` si la consulta tuvo éxito en esta llamada.
   */
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

  /** Estado de conectividad actual (sin sondear; usa el último valor conocido). */
  isOnline() {
    return isOnline();
  },

  /**
   * Drena el `sync_log` de SQLite: lee hasta 50 pendientes (que no hayan agotado
   * {@link MAX_INTENTOS}), aplica cada uno con {@link aplicarOperacion} y los marca
   * sincronizados o con error. Invalida la {@link OfflineCache} si aplicó al menos uno.
   */
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
