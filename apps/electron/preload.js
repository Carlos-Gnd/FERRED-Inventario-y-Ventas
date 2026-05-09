'use strict';

const { contextBridge, ipcRenderer } = require('electron');
const { IPC } = require('./ipc/channels'); // DT-06: canales tipados

// DT-20: wrapper para ipcRenderer.send (síncrono) — evita que un error
// en el channel rompa silenciosamente el bridge completo.
function safeSend(channel, ...args) {
  try {
    ipcRenderer.send(channel, ...args);
  } catch (err) {
    console.error(`[IPC] send('${channel}') falló:`, err);
  }
}

// DT-20: wrapper para listeners — protege el setup y el callback del usuario.
function safeListener(channel, cb) {
  try {
    const handler = (_event, data) => {
      try { cb(data); } catch (err) { console.error(`[IPC] listener '${channel}' callback error:`, err); }
    };
    ipcRenderer.on(channel, handler);
    return () => ipcRenderer.removeListener(channel, handler);
  } catch (err) {
    console.error(`[IPC] on('${channel}') setup falló:`, err);
    return () => {};
  }
}

contextBridge.exposeInMainWorld('electronAPI', {

  // ── Info de la app ─────────────────────────────────────────
  getBranchId:      ()       => ipcRenderer.invoke(IPC.GET_BRANCH_ID),
  getAppVersion:    ()       => ipcRenderer.invoke(IPC.GET_APP_VERSION),
  getUserDataPath:  ()       => ipcRenderer.invoke(IPC.GET_USER_DATA_PATH),

  // ── Control de ventana (titlebar personalizado) ────────────
  minimizeWindow:   ()       => safeSend(IPC.WINDOW_MINIMIZE),
  maximizeWindow:   ()       => safeSend(IPC.WINDOW_MAXIMIZE),
  closeWindow:      ()       => safeSend(IPC.WINDOW_CLOSE),

  // ── Impresora térmica POS ──────────────────────────────────
  printTicket:      (data)   => ipcRenderer.invoke(IPC.PRINT_TICKET, data),
  printCorte:       (corte)  => ipcRenderer.invoke(IPC.PRINT_CORTE, corte),
  getPrinters:      ()       => ipcRenderer.invoke(IPC.GET_PRINTERS),

  // ── Estado del servidor embebido ───────────────────────────
  getServerStatus:  ()       => ipcRenderer.invoke(IPC.GET_SERVER_STATUS),

  // ── Listeners desde main → renderer ───────────────────────
  onServerReady:    (cb)     => safeListener(IPC.SERVER_READY, cb),
  onSyncStatus:     (cb)     => safeListener(IPC.SYNC_STATUS, cb),

  // ── Estado de sincronizacion offline ──────────────────────
  getSyncPendientes: () => ipcRenderer.invoke(IPC.GET_SYNC_PENDIENTES),
});
