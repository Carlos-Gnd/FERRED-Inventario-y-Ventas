import type { AnyRecord, EntityName, OperationType, OutboxItem } from "../db/schema";
import {
  addOutboxItem,
  getLastPulledAt,
  getPendingOutbox,
  putRecord,
  setLastPulledAt,
  updateOutboxItem,
  uuid,
} from "../db/idb";
import { pullChanges, pushOperation } from "./api";

type CreateLocalChangeArgs = {
  entity: EntityName;
  operation: OperationType;
  record: AnyRecord;       // lo que guardas local
  payloadForServer?: unknown;  // si quieres enviar un DTO diferente al record
};

class SyncService {
  private syncing = false;

  /**
   * Esto se usa cuando el usuario crea/edita/elimina algo.
   * Funciona ONLINE u OFFLINE.
   *
   * 1) Guarda en local
   * 2) Guarda una operación en outbox (pendiente de enviar)
   */
  async applyLocalChange(args: CreateLocalChangeArgs): Promise<void> {
    const { entity, operation, record, payloadForServer } = args;

    // 1) Guardar siempre en local primero (offline-first)
    await putRecord(entity, record);

    // 2) Guardar operación pendiente en outbox
    const item: OutboxItem = {
      id: uuid(),
      clientOperationId: uuid(), // idempotencia
      entity,
      operation,
      recordId: record.id,
      payload: payloadForServer ?? record,
      createdAt: Date.now(),
      status: "PENDING",
      retryCount: 0,
    };

    await addOutboxItem(item);
  }

  /**
   * Sincroniza:
   * - PUSH: envía outbox pendiente al servidor
   * - PULL: baja cambios del servidor a local
   *
   * IMPORTANTE: se llama automáticamente cuando vuelve la conexión.
   */
  async syncNow(): Promise<{ pushed: number; pulled: number; errors: number }> {
    if (this.syncing) return { pushed: 0, pulled: 0, errors: 0 };
    this.syncing = true;

    let pushed = 0;
    let pulled = 0;
    let errors = 0;

    try {
      // =========================
      // 1) PUSH (local -> server)
      // =========================
      const pending = await getPendingOutbox(100);

      for (const item of pending) {
        // marcar como SYNCING
        item.status = "SYNCING";
        await updateOutboxItem(item);

        const res = await pushOperation({
          clientOperationId: item.clientOperationId,
          entity: item.entity,
          operation: item.operation,
          recordId: item.recordId,
          payload: item.payload,
          createdAt: item.createdAt,
        });

        if (res.ok) {
          item.status = "DONE";
          item.lastError = undefined;
          await updateOutboxItem(item);
          pushed++;
        } else {
          errors++;
          item.retryCount += 1;
          item.lastError = res.message;

          // si se puede reintentar, vuelve a pending. si no, queda error.
          item.status = res.retryable ? "PENDING" : "ERROR";
          await updateOutboxItem(item);

          // Si es error no-retryable, mejor parar para evitar desorden
          if (!res.retryable) break;
        }
      }

      // =========================
      // 2) PULL (server -> local)
      // =========================
      const lastPulledAt = await getLastPulledAt();
      const pullRes = await pullChanges(lastPulledAt);

      if (pullRes.ok) {
        for (const ch of pullRes.changes) {
          const record = ch.record as AnyRecord;
          if (typeof record.updatedAt !== "number") record.updatedAt = Date.now();
          await putRecord(ch.entity, record);
          pulled++;
        }
        await setLastPulledAt(pullRes.newPulledAt);
      } else {
        errors++;
      }

      return { pushed, pulled, errors };
    } finally {
      this.syncing = false;
    }
  }
}

export const syncService = new SyncService();
