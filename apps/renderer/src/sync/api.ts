import type { EntityName, OperationType } from "../db/schema";

/**
 * Payload que se envía al servidor
 */
export type PushOperationPayload = {
  clientOperationId: string;
  entity: EntityName;
  operation: OperationType;
  recordId: string;
  payload: any;
  createdAt: number;
};

/**
 * Respuesta del servidor al hacer PUSH
 */
export type PushResponse =
  | { ok: true; serverRecordId?: string; serverUpdatedAt?: number }
  | { ok: false; retryable: boolean; message: string };

/**
 * Respuesta del servidor al hacer PULL
 */
export type PullResponse = {
  ok: true;
  changes: Array<{
    entity: EntityName;
    record: any;
  }>;
  newPulledAt: number;
};

/**
 * ==========================================
 *  MODO SIMULADO (SIN BACKEND REAL)
 * ==========================================
 * Esto permite demostrar:
 * OFFLINE → PENDING → ONLINE → SYNC AUTOMÁTICO
 *
 * Más adelante puedes reemplazar esto por fetch()
 */

/**
 * Simula enviar operación al servidor
 */
export async function pushOperation(
  _op: PushOperationPayload
): Promise<PushResponse> {
  // Simula delay de red
  await new Promise((resolve) => setTimeout(resolve, 300));

  return {
    ok: true,
    serverUpdatedAt: Date.now(),
  };
}

/**
 * Simula traer cambios del servidor
 */
export async function pullChanges(
  _lastPulledAt: number
): Promise<PullResponse | { ok: false; message: string }> {
  // Simula delay de red
  await new Promise((resolve) => setTimeout(resolve, 200));

  return {
    ok: true,
    changes: [], // No trae cambios en modo simulado
    newPulledAt: Date.now(),
  };
}