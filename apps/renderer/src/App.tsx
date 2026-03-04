import { useEffect, useMemo, useState } from "react";
import { countOutboxByStatus, listRecords, uuid } from "./db/idb";
import type { AnyRecord } from "./db/schema";
import { useNetworkStatus } from "./hooks/useNetworkStatus";
import { syncService } from "./sync/syncService";

type Sale = AnyRecord & {
  total: number;
};

export default function App() {
  const { isOnline } = useNetworkStatus();

  const [sales, setSales] = useState<Sale[]>([]);
  const [pendingCount, setPendingCount] = useState(0);

  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncAt, setLastSyncAt] = useState<number | null>(null);
  const [syncLog, setSyncLog] = useState<string>("");

  const refreshUI = useMemo(() => {
    return async () => {
      const s = await listRecords<Sale>("sale");
      setSales(s.sort((a, b) => b.updatedAt - a.updatedAt));
      setPendingCount(await countOutboxByStatus("PENDING"));
    };
  }, []);

  async function runSync(reason: "AUTO" | "MANUAL") {
    if (!isOnline || isSyncing) return;

    setIsSyncing(true);
    try {
      const r = await syncService.syncNow();
      setLastSyncAt(Date.now());
      setSyncLog(
        `${reason} SYNC: pushed=${r.pushed} pulled=${r.pulled} errors=${r.errors} @ ${new Date().toLocaleTimeString()}`
      );
      await refreshUI();
    } finally {
      setIsSyncing(false);
    }
  }

  // ✅ T-07.4: Auto-sync cuando vuelve internet
  useEffect(() => {
    (async () => {
      await refreshUI();

      if (isOnline) {
        await runSync("AUTO");
      } else {
        setSyncLog("OFFLINE: guardando local + outbox (pendiente).");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOnline]);

  async function createSaleOfflineCapable() {
    const now = Date.now();
    const sale: Sale = {
      id: uuid(),
      updatedAt: now,
      total: Math.floor(Math.random() * 100) + 1,
    };

    await syncService.applyLocalChange({
      entity: "sale",
      operation: "CREATE",
      record: sale,
      payloadForServer: sale,
    });

    await refreshUI();

    // Si estás online, puedes sincronizar al toque (opcional)
    if (isOnline) {
      await runSync("MANUAL");
    }
  }

  const statusLabel = isOnline ? "Online" : "Offline";
  const statusDot = isOnline ? "🟢" : "🔴";
  const syncingDot = isSyncing ? "🟡" : "";

  return (
    <div style={{ padding: 16, fontFamily: "system-ui", maxWidth: 900 }}>
      <h2 style={{ marginBottom: 6 }}>FERRED - Sync (T-07.4)</h2>

      <div
        style={{
          display: "flex",
          gap: 12,
          alignItems: "center",
          flexWrap: "wrap",
          marginBottom: 10,
        }}
      >
        <span>
          Estado: <b>{statusDot} {statusLabel}</b>
        </span>

        <span>
          Pendientes (outbox): <b>{pendingCount}</b>
        </span>

        <span>
          Sync: <b>{isSyncing ? `${syncingDot} Sincronizando...` : "Listo"}</b>
        </span>

        <button onClick={createSaleOfflineCapable} disabled={isSyncing}>
          Crear venta (offline-capable)
        </button>

        <button onClick={() => runSync("MANUAL")} disabled={!isOnline || isSyncing}>
          Sync manual
        </button>
      </div>

      <div style={{ marginBottom: 12, opacity: 0.9 }}>
        <div>
          <small>{syncLog}</small>
        </div>
        <div>
          <small>
            Última sincronización:{" "}
            {lastSyncAt ? new Date(lastSyncAt).toLocaleTimeString() : "—"}
          </small>
        </div>
      </div>

      <h3 style={{ marginTop: 18 }}>Ventas (guardadas local)</h3>

      {sales.length === 0 ? (
        <p style={{ opacity: 0.8 }}>Todavía no hay ventas.</p>
      ) : (
        <ul>
          {sales.map((s) => (
            <li key={s.id}>
              id={s.id} | total=${s.total} | updatedAt={new Date(s.updatedAt).toLocaleString()}
            </li>
          ))}
        </ul>
      )}

      <p style={{ marginTop: 18, opacity: 0.8 }}>
        Prueba: DevTools → Network → Offline → crea varias ventas → vuelve Online → se sincroniza solo.
      </p>
    </div>
  );
}