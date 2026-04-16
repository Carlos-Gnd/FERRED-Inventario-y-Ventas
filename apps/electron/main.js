'use strict';

const { app, BrowserWindow, shell, ipcMain, Menu, Tray, nativeImage } = require('electron');
const path    = require('path');
const { fork } = require('child_process');
require('dotenv').config({ path: path.join(__dirname, '.env') });

// ── Importar handlers IPC ────────────────────────────────────
require('./ipc/printer.ipc');
require('./ipc/server.ipc');

// ── Config ───────────────────────────────────────────────────
const DEV_URL    = process.env.ELECTRON_RENDERER_URL || 'http://localhost:5173';
const BRANCH_ID  = process.env.BRANCH_ID || '1';
const IS_DEV     = !app.isPackaged;
const IS_WIN     = process.platform === 'win32';

let mainWindow = null;
let serverProcess = null;
let tray = null;

// ── Arrancar servidor Express embebido ───────────────────────
function startServer() {
  if (IS_DEV) {
    console.log('[Electron] Modo DEV — servidor debe estar corriendo en localhost:3001');
    return;
  }

  const serverEntry = path.join(process.resourcesPath, 'server', 'dist', 'index.js');

  const env = {
    ...process.env,
    BRANCH_ID,
    NODE_ENV: 'production',
    SQLITE_PATH: path.join(app.getPath('userData'), `ferred_branch${BRANCH_ID}.db`),
  };

  serverProcess = fork(serverEntry, [], { env, silent: false });

  serverProcess.on('error', (err) => console.error('[Server]', err));
  serverProcess.on('exit',  (code) => console.log(`[Server] salió con código ${code}`));

  console.log(`[Electron] Servidor embebido iniciado (PID ${serverProcess.pid})`);
}

// ── Crear ventana principal ──────────────────────────────────
function createWindow() {
  mainWindow = new BrowserWindow({
    width:           1280,
    height:          800,
    minWidth:        900,
    minHeight:       600,
    backgroundColor: '#0F172A',
    show:            false,
    titleBarStyle:   IS_WIN ? 'default' : 'hiddenInset',
    icon:            path.join(__dirname, 'resources', 'icon.png'),
    webPreferences: {
      preload:          path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration:  false,
      sandbox:          false,
      webSecurity:      !IS_DEV,
    },
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    if (IS_DEV) mainWindow.webContents.openDevTools({ mode: 'detach' });
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => { mainWindow = null; });

  return mainWindow;
}

// ── Cargar renderer ──────────────────────────────────────────
async function loadRenderer(win) {
  if (IS_DEV) {
    for (let i = 0; i < 30; i++) {
      try {
        await win.loadURL(DEV_URL);
        console.log('[Electron] Renderer cargado desde Vite en', DEV_URL);
        return;
      } catch {
        await new Promise(r => setTimeout(r, 500));
      }
    }
    await win.loadURL(
      `data:text/html,${encodeURIComponent(
        '<body style="font-family:sans-serif;padding:2rem;background:#0F172A;color:#F8FAFC">' +
        '<h2>⚠ No se pudo conectar con el renderer</h2>' +
        '<p>Asegurate de correr <code>pnpm dev:renderer</code> en otra terminal.</p></body>'
      )}`
    );
    return;
  }

  const indexPath = path.join(__dirname, '..', 'renderer', 'dist', 'index.html');
  await win.loadFile(indexPath);
}

// ── Tray (bandeja del sistema) ───────────────────────────────
function createTray() {
  const iconPath = path.join(__dirname, 'resources', 'icon-tray.png');
  const icon     = nativeImage.createFromPath(iconPath);
  tray           = new Tray(icon.isEmpty() ? nativeImage.createEmpty() : icon);

  const menu = Menu.buildFromTemplate([
    { label: 'Abrir FERRED',  click: () => mainWindow?.show() },
    { type:  'separator' },
    { label: `Sucursal ${BRANCH_ID}`, enabled: false },
    { type:  'separator' },
    { label: 'Salir', click: () => { app.isQuitting = true; app.quit(); } },
  ]);

  tray.setToolTip(`FERRED — Sucursal ${BRANCH_ID}`);
  tray.setContextMenu(menu);
  tray.on('double-click', () => mainWindow?.show());
}

// ── Menú de aplicación ───────────────────────────────────────
function buildMenu() {
  const template = [
    {
      label: 'FERRED',
      submenu: [
        { label: 'Acerca de FERRED', role: 'about' },
        { type: 'separator' },
        { label: 'Salir', accelerator: IS_WIN ? 'Alt+F4' : 'CmdOrCtrl+Q', click: () => app.quit() },
      ],
    },
    {
      label: 'Ver',
      submenu: [
        { label: 'Recargar', role: 'reload' },
        { label: 'Forzar recarga', role: 'forceReload' },
        { type: 'separator' },
        { label: 'Zoom +', role: 'zoomIn' },
        { label: 'Zoom −', role: 'zoomOut' },
        { label: 'Tamaño real', role: 'resetZoom' },
        { type: 'separator' },
        { label: 'Pantalla completa', role: 'togglefullscreen' },
        ...(IS_DEV ? [{ type: 'separator' }, { label: 'DevTools', role: 'toggleDevTools' }] : []),
      ],
    },
    {
      label: 'Ventana',
      submenu: [
        { label: 'Minimizar', role: 'minimize' },
        { label: 'Cerrar', role: 'close' },
      ],
    },
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

// ── IPC: básicos desde renderer ──────────────────────────────
ipcMain.handle('get-branch-id', () => BRANCH_ID);
ipcMain.handle('get-app-version', () => app.getVersion());
ipcMain.handle('get-user-data-path', () => app.getPath('userData'));

ipcMain.on('window-minimize', () => mainWindow?.minimize());
ipcMain.on('window-maximize', () => {
  if (mainWindow?.isMaximized()) mainWindow.unmaximize();
  else mainWindow?.maximize();
});
ipcMain.on('window-close', () => mainWindow?.close());

// ── Contar registros pendientes de sync en SQLite local ──────
ipcMain.handle('get-sync-pendientes', async () => {
  try {
    const port = process.env.PORT || '3001';
    const response = await fetch(`http://127.0.0.1:${port}/sync/pendientes-local`);
    if (!response.ok) return { pendientes: 0, errores: 0 };
    return await response.json();
  } catch {
    return { pendientes: 0, errores: 0 };
  }
});

// ── Ciclo de vida de la app ──────────────────────────────────
app.whenReady().then(async () => {
  buildMenu();

  startServer();

  const win = createWindow();
  createTray();
  await loadRenderer(win);
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    const win = createWindow();
    loadRenderer(win);
  }
});

app.on('before-quit', () => {
  app.isQuitting = true;
  if (serverProcess) {
    serverProcess.kill();
    serverProcess = null;
  }
  tray?.destroy();
});
