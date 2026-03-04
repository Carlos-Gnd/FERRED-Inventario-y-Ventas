export type EntityName = "sale" | "inventoryMovement" | "product";
export type OperationType = "CREATE" | "UPDATE" | "DELETE";

export type AnyRecord = Record<string, any> & {
  id: string;
  updatedAt: number; // epoch ms
};

export type OutboxItem = {
  id: string;                 // id outbox
  clientOperationId: string;  // idempotencia
  entity: EntityName;
  operation: OperationType;
  recordId: string;
  payload: any;
  createdAt: number;
  status: "PENDING" | "SYNCING" | "DONE" | "ERROR";
  retryCount: number;
  lastError?: string;
};

export type SyncState = {
  key: "lastPulledAt";
  value: number;
};