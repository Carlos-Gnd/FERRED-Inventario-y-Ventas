'use strict';

const { contextBridge, ipcRenderer } = require('electron');

// ── API segura expuesta al renderer ─────────────────────────
// NUNCA exponer ipcRenderer completo — solo métodos específicos
contextBridge.exposeInMainWorld('electronAPI', {

  // ── Info de la app ─────────────────────────────────────────
  getBranchId:      ()       => ipcRenderer.invoke('get-branch-id'),
  getAppVersion:    ()       => ipcRenderer.invoke('get-app-version'),
  getUserDataPath:  ()       => ipcRenderer.invoke('get-user-data-path'),

  // ── Control de ventana (titlebar personalizado) ────────────
  minimizeWindow:   ()       => ipcRenderer.send('window-minimize'),
  maximizeWindow:   ()       => ipcRenderer.send('window-maximize'),
  closeWindow:      ()       => ipcRenderer.send('window-close'),

  // ── Impresora térmica POS ──────────────────────────────────
  printTicket:      (data)   => ipcRenderer.invoke('print-ticket', data),
  getPrinters:      ()       => ipcRenderer.invoke('get-printers'),

  // ── Estado del servidor embebido ───────────────────────────
  getServerStatus:  ()       => ipcRenderer.invoke('get-server-status'),

  // ── Listeners desde main → renderer ───────────────────────
  onServerReady:    (cb) => {
    const handler = (_event, data) => cb(data);
    ipcRenderer.on('server-ready', handler);
    return () => ipcRenderer.removeListener('server-ready', handler);
  },

  onSyncStatus: (cb) => {
    const handler = (_event, data) => cb(data);
    ipcRenderer.on('sync-status', handler);
    return () => ipcRenderer.removeListener('sync-status', handler);
  },
});