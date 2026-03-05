import type { AnyRecord, OutboxItem, SyncState } from "./schema";

const DB_NAME = "ferred_offline_db";
const DB_VERSION = 1;

const STORE_RECORDS = "records";
const STORE_OUTBOX = "outbox";
const STORE_SYNCSTATE = "syncState";

type StoreName = typeof STORE_RECORDS | typeof STORE_OUTBOX | typeof STORE_SYNCSTATE;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = () => {
      const db = req.result;

      if (!db.objectStoreNames.contains(STORE_RECORDS)) {
        db.createObjectStore(STORE_RECORDS, { keyPath: "key" });
      }

      if (!db.objectStoreNames.contains(STORE_OUTBOX)) {
        const store = db.createObjectStore(STORE_OUTBOX, { keyPath: "id" });
        store.createIndex("status_createdAt", ["status", "createdAt"], { unique: false });
        store.createIndex("clientOperationId", "clientOperationId", { unique: true });
      }

      if (!db.objectStoreNames.contains(STORE_SYNCSTATE)) {
        db.createObjectStore(STORE_SYNCSTATE, { keyPath: "key" });
      }
    };

    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function tx<T>(
  mode: IDBTransactionMode,
  storeNames: StoreName[],
  fn: (stores: Record<StoreName, IDBObjectStore>) => Promise<T>
): Promise<T> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeNames, mode);

    const stores = {} as Record<StoreName, IDBObjectStore>;
    for (const name of storeNames) stores[name] = transaction.objectStore(name);

    fn(stores)
      .then((result) => {
        transaction.oncomplete = () => resolve(result);
        transaction.onerror = () => reject(transaction.error);
        transaction.onabort = () => reject(transaction.error);
      })
      .catch((e) => {
        try {
          transaction.abort();
        } catch (abortError) {
          reject(abortError);
          return;
        }
        reject(e);
      });
  });
}

export function uuid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function recordKey(entity: string, id: string) {
  return `${entity}:${id}`;
}

// ---------- Records ----------
export async function putRecord(entity: string, record: AnyRecord): Promise<void> {
  const key = recordKey(entity, record.id);
  await tx("readwrite", [STORE_RECORDS], async ({ records }) => {
    await new Promise<void>((resolve, reject) => {
      const req = records.put({ key, entity, record });
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  });
}

export async function listRecords<T = AnyRecord>(entity: string): Promise<T[]> {
  return tx("readonly", [STORE_RECORDS], async ({ records }) => {
    return new Promise<T[]>((resolve, reject) => {
      const req = records.getAll();
      req.onsuccess = () => {
        const all = (req.result ?? []) as Array<{ entity: string; record: T }>;
        resolve(all.filter(x => x.entity === entity).map(x => x.record));
      };
      req.onerror = () => reject(req.error);
    });
  });
}

// ---------- Outbox ----------
export async function addOutboxItem(item: OutboxItem): Promise<void> {
  await tx("readwrite", [STORE_OUTBOX], async ({ outbox }) => {
    await new Promise<void>((resolve, reject) => {
      const req = outbox.add(item);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  });
}

export async function updateOutboxItem(item: OutboxItem): Promise<void> {
  await tx("readwrite", [STORE_OUTBOX], async ({ outbox }) => {
    await new Promise<void>((resolve, reject) => {
      const req = outbox.put(item);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  });
}

export async function getPendingOutbox(limit = 50): Promise<OutboxItem[]> {
  return tx("readonly", [STORE_OUTBOX], async ({ outbox }) => {
    return new Promise<OutboxItem[]>((resolve, reject) => {
      const idx = outbox.index("status_createdAt");
      const range = IDBKeyRange.bound(["PENDING", 0], ["PENDING", Number.MAX_SAFE_INTEGER]);
      const req = idx.getAll(range, limit);
      req.onsuccess = () => resolve((req.result ?? []) as OutboxItem[]);
      req.onerror = () => reject(req.error);
    });
  });
}

export async function countOutboxByStatus(status: OutboxItem["status"]): Promise<number> {
  return tx("readonly", [STORE_OUTBOX], async ({ outbox }) => {
    return new Promise<number>((resolve, reject) => {
      const idx = outbox.index("status_createdAt");
      const range = IDBKeyRange.bound([status, 0], [status, Number.MAX_SAFE_INTEGER]);
      const req = idx.count(range);
      req.onsuccess = () => resolve(req.result ?? 0);
      req.onerror = () => reject(req.error);
    });
  });
}

// ---------- SyncState ----------
export async function getLastPulledAt(): Promise<number> {
  return tx("readonly", [STORE_SYNCSTATE], async ({ syncState }) => {
    return new Promise<number>((resolve, reject) => {
      const req = syncState.get("lastPulledAt");
      req.onsuccess = () => resolve((req.result as SyncState | undefined)?.value ?? 0);
      req.onerror = () => reject(req.error);
    });
  });
}

export async function setLastPulledAt(value: number): Promise<void> {
  await tx("readwrite", [STORE_SYNCSTATE], async ({ syncState }) => {
    await new Promise<void>((resolve, reject) => {
      const req = syncState.put({ key: "lastPulledAt", value } satisfies SyncState);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  });
}
