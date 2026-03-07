// apps/renderer/src/hooks/useElectron.ts
// Hook seguro para acceder a la API de Electron desde el renderer.
// Si la app corre en el navegador (sin Electron), todas las funciones
// retornan valores por defecto o no-ops.

const api = typeof window !== 'undefined' ? (window as any).electronAPI : null;
const IS_ELECTRON = !!api;

export function useElectron() {
  return {
    isElectron: IS_ELECTRON,

    // Info
    getBranchId:    (): Promise<string>  => api?.getBranchId()    ?? Promise.resolve('1'),
    getAppVersion:  (): Promise<string>  => api?.getAppVersion()  ?? Promise.resolve('dev'),
    getUserDataPath:(): Promise<string>  => api?.getUserDataPath() ?? Promise.resolve(''),

    // Ventana (solo activo en Electron)
    minimize: () => api?.minimizeWindow(),
    maximize: () => api?.maximizeWindow(),
    close:    () => api?.closeWindow(),

    // Impresora térmica
    printTicket: (data: PrintTicketData): Promise<PrintResult> =>
      api?.printTicket(data) ?? Promise.resolve({ ok: false, error: 'No en Electron' }),

    getPrinters: (): Promise<{ ok: boolean; printers?: any[] }> =>
      api?.getPrinters() ?? Promise.resolve({ ok: false, printers: [] }),

    // Estado del servidor embebido
    getServerStatus: (): Promise<{ ok: boolean }> =>
      api?.getServerStatus() ?? Promise.resolve({ ok: true }),  // en web asumimos ok

    // Suscribirse a eventos desde main
    onServerReady: (cb: (data: { ok: boolean }) => void): (() => void) =>
      api?.onServerReady(cb) ?? (() => {}),

    onSyncStatus: (cb: (data: SyncStatusData) => void): (() => void) =>
      api?.onSyncStatus(cb) ?? (() => {}),
  };
}

// ── Tipos ─────────────────────────────────────────────────────
export interface PrintTicketData {
  printerName?: string;
  sucursal?:    string;
  cajero?:      string;
  fecha?:       string;
  tipoDte?:     '01' | '03' | '05';
  total:        number;
  items: Array<{
    nombre:   string;
    cantidad: number;
    precio:   number;
  }>;
}

export interface PrintResult {
  ok:         boolean;
  simulated?: boolean;
  error?:     string;
}

export interface SyncStatusData {
  status:    'syncing' | 'done' | 'error';
  records?:  number;
  message?:  string;
}