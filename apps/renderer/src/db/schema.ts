export type EntityName = "sale" | "inventoryMovement" | "product";
export type OperationType = "CREATE" | "UPDATE" | "DELETE";

export type AnyRecord = Record<string, unknown> & {
  id: string;
  updatedAt: number; // epoch ms
};

export type OutboxItem = {
  id: string;                 // id outbox
  clientOperationId: string;  // idempotencia
  entity: EntityName;
  operation: OperationType;
  recordId: string;
  payload: unknown;
  createdAt: number;
  status: "PENDING" | "SYNCING" | "DONE" | "ERROR";
  retryCount: number;
  lastError?: string;
};

export type SyncState = {
  key: "lastPulledAt";
  value: number;
};
