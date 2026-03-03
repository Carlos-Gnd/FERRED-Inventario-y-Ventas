const { app, BrowserWindow } = require('electron');
const path = require('path');
require('dotenv').config();

// Arranca el servidor Express interno
require('../server/src/index');

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
    },
  });

  // En dev carga el servidor de Vite, en prod el build
  if (process.env.NODE_ENV === 'development') {
    win.loadURL('http://localhost:5173');
  } else {
    win.loadFile(path.join(__dirname, '../renderer/dist/index.html'));
  }
}

app.whenReady().then(createWindow);
