'use strict';

// DT-06: Contrato tipado de canales IPC entre main, preload y renderer.
// Centraliza los nombres de canal para evitar typos y facilitar refactors.

const IPC = {
  // Invoke (renderer → main, devuelven valor)
  GET_BRANCH_ID:       'get-branch-id',
  GET_APP_VERSION:     'get-app-version',
  GET_USER_DATA_PATH:  'get-user-data-path',
  GET_SYNC_PENDIENTES: 'get-sync-pendientes',
  PRINT_TICKET:        'print-ticket',
  GET_PRINTERS:        'get-printers',
  GET_SERVER_STATUS:   'get-server-status',

  // Send (renderer → main, sin respuesta)
  WINDOW_MINIMIZE:     'window-minimize',
  WINDOW_MAXIMIZE:     'window-maximize',
  WINDOW_CLOSE:        'window-close',

  // Push (main → renderer, via send/webContents.send)
  SERVER_READY:        'server-ready',
  SYNC_STATUS:         'sync-status',
};

module.exports = { IPC };
