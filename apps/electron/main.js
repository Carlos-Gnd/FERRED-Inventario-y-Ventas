const { app, BrowserWindow } = require('electron');
const path = require('path');
require('dotenv').config();

const DEV_URL = process.env.ELECTRON_RENDERER_URL || 'http://localhost:5173';

function createWindow() {
  return new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
    },
  });
}

async function loadRenderer(win) {
  if (!app.isPackaged) {
    for (let i = 0; i < 30; i += 1) {
      try {
        await win.loadURL(DEV_URL);
        return;
      } catch {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }

    await win.loadURL(`data:text/html,${encodeURIComponent('<h2>No se pudo abrir Vite en http://localhost:5173</h2><p>Ejecuta pnpm run dev y revisa que apps/renderer este arriba.</p>')}`);
    return;
  }

  await win.loadFile(path.join(__dirname, '../renderer/dist/index.html'));
}

app.whenReady().then(async () => {
  const win = createWindow();
  await loadRenderer(win);
});
