'use strict';

const { contextBridge, ipcRenderer } = require('electron');

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
  getBranchId:      ()       => ipcRenderer.invoke('get-branch-id'),
  getAppVersion:    ()       => ipcRenderer.invoke('get-app-version'),
  getUserDataPath:  ()       => ipcRenderer.invoke('get-user-data-path'),

  // ── Control de ventana (titlebar personalizado) ────────────
  minimizeWindow:   ()       => safeSend('window-minimize'),
  maximizeWindow:   ()       => safeSend('window-maximize'),
  closeWindow:      ()       => safeSend('window-close'),

  // ── Impresora térmica POS ──────────────────────────────────
  printTicket:      (data)   => ipcRenderer.invoke('print-ticket', data),
  getPrinters:      ()       => ipcRenderer.invoke('get-printers'),

  // ── Estado del servidor embebido ───────────────────────────
  getServerStatus:  ()       => ipcRenderer.invoke('get-server-status'),

  // ── Listeners desde main → renderer ───────────────────────
  onServerReady:    (cb)     => safeListener('server-ready', cb),
  onSyncStatus:     (cb)     => safeListener('sync-status', cb),

  // ── Estado de sincronizacion offline ──────────────────────
  getSyncPendientes: () => ipcRenderer.invoke('get-sync-pendientes'),
});