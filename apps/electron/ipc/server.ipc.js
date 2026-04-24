'use strict';

const { ipcMain } = require('electron');
const http = require('http');

let serverReady = false;

// ── Verificar si el servidor Express está up ─────────────────
// BUG-M07: usar process.env.PORT en vez de hardcodear 3001
function checkServer(port = Number(process.env.PORT) || 3001) {
  return new Promise((resolve) => {
    const req = http.get(`http://localhost:${port}/health`, (res) => {
      resolve(res.statusCode === 200);
    });
    req.on('error', () => resolve(false));
    req.setTimeout(1000, () => { req.destroy(); resolve(false); });
  });
}

// ── Polling hasta que el servidor esté listo ─────────────────
async function waitForServer(win, maxRetries = 20) {
  const port = Number(process.env.PORT) || 3001;
  for (let i = 0; i < maxRetries; i++) {
    const ok = await checkServer(port);
    if (ok) {
      serverReady = true;
      win?.webContents.send('server-ready', { ok: true });
      console.log(`[ServerIPC] Servidor Express listo en :${port}`);
      return true;
    }
    await new Promise(r => setTimeout(r, 500));
  }
  win?.webContents.send('server-ready', { ok: false, error: 'Timeout esperando servidor' });
  return false;
}

// ── Handler: consultar estado del servidor ───────────────────
ipcMain.handle('get-server-status', async () => {
  if (serverReady) return { ok: true };
  const ok = await checkServer();
  serverReady = ok;
  return { ok };
});

module.exports = { waitForServer };