const { ipcMain } = require('electron');

ipcMain.handle('print-ticket', async (event, data) => {
  // Aquí va la integración con Electron POS Printer
  console.log('Printing ticket:', data);
});
