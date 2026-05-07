// DT-06: Declaración de tipo para window.electronAPI — expuesta por preload.js.
// Permite usar window.electronAPI con tipado estático en lugar de `any`.

import type { PrintTicketData, PrintResult, SyncStatusData } from '../hooks/useElectron';

declare global {
  interface Window {
    electronAPI?: {
      // Info de la app
      getBranchId():      Promise<string>;
      getAppVersion():    Promise<string>;
      getUserDataPath():  Promise<string>;

      // Control de ventana
      minimizeWindow():  void;
      maximizeWindow():  void;
      closeWindow():     void;

      // Impresora térmica
      printTicket(data: PrintTicketData): Promise<PrintResult>;
      getPrinters(): Promise<{ ok: boolean; printers?: unknown[] }>;

      // Estado del servidor embebido
      getServerStatus(): Promise<{ ok: boolean }>;

      // Sincronización offline
      getSyncPendientes(): Promise<{ pendientes: number; errores: number }>;

      // Listeners (main → renderer); devuelven función de cleanup
      onServerReady(cb: (data: { ok: boolean }) => void): () => void;
      onSyncStatus(cb: (data: SyncStatusData) => void): () => void;
    };
  }
}

export {};
