'use strict';

const { ipcMain, webContents } = require('electron');

// ── Impresora térmica POS ────────────────────────────────────
// Usa electron-pos-printer si está disponible, o el sistema de impresión de Electron

let PosPrinter = null;

// Carga dinámica (puede no estar instalado en dev)
try {
  PosPrinter = require('electron-pos-printer').PosPrinter;
} catch {
  console.warn('[Printer] electron-pos-printer no instalado — modo simulado activo');
}

// ── Listar impresoras disponibles ────────────────────────────
ipcMain.handle('get-printers', async (event) => {
  try {
    const win = require('electron').BrowserWindow.fromWebContents(event.sender);
    const printers = await win.webContents.getPrintersAsync();
    return { ok: true, printers };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

// ── Imprimir ticket POS ──────────────────────────────────────
ipcMain.handle('print-ticket', async (_event, data) => {
  // data: { items, total, sucursal, cajero, fecha, tipoDte }

  if (!PosPrinter) {
    // Modo simulado — loggear y confirmar
    console.log('[Printer] SIMULADO — ticket recibido:', JSON.stringify(data, null, 2));
    return { ok: true, simulated: true };
  }

  try {
    const printerName = data.printerName || 'default';

    const printData = buildTicketData(data);

    await PosPrinter.print(printData, {
      printerName,
      timeOutPerLine: 400,
      silent:         true,
      preview:        false,
    });

    return { ok: true };
  } catch (err) {
    console.error('[Printer] Error al imprimir:', err.message);
    return { ok: false, error: err.message };
  }
});

// ── Construir datos del ticket ───────────────────────────────
function buildTicketData(data) {
  const { items = [], total = 0, sucursal = 'FERRED', cajero = '', fecha = new Date().toLocaleString('es-SV'), tipoDte = '01' } = data;

  const tipo = tipoDte === '01' ? 'FACTURA' : tipoDte === '03' ? 'CCF' : 'NOTA DE CRÉDITO';

  return [
    { type: 'text', value: '================================', style: { fontWeight: '700', textAlign: 'center' } },
    { type: 'text', value: 'FERRED',                          style: { fontWeight: '700', textAlign: 'center', fontSize: '20px' } },
    { type: 'text', value: 'Ferretería & Suministros',        style: { textAlign: 'center' } },
    { type: 'text', value: sucursal,                          style: { textAlign: 'center' } },
    { type: 'text', value: '================================', style: { textAlign: 'center' } },
    { type: 'text', value: tipo,                              style: { fontWeight: '700', textAlign: 'center' } },
    { type: 'text', value: `Fecha: ${fecha}`,                 style: { textAlign: 'left' } },
    { type: 'text', value: `Cajero: ${cajero}`,               style: { textAlign: 'left' } },
    { type: 'text', value: '--------------------------------', style: { textAlign: 'center' } },
    // Líneas de productos
    ...items.map(item => ({
      type: 'text',
      value: `${item.nombre.padEnd(18).slice(0, 18)} ${String(item.cantidad).padStart(3)} x $${item.precio.toFixed(2)}`,
      style: { fontFamily: 'monospace', textAlign: 'left', fontSize: '11px' },
    })),
    { type: 'text', value: '--------------------------------', style: { textAlign: 'center' } },
    { type: 'text', value: `TOTAL: $${Number(total).toFixed(2)}`,  style: { fontWeight: '700', textAlign: 'right', fontSize: '14px' } },
    { type: 'text', value: '================================', style: { textAlign: 'center' } },
    { type: 'text', value: '¡Gracias por su compra!',         style: { textAlign: 'center' } },
    { type: 'text', value: 'www.ferred.com.sv',               style: { textAlign: 'center' } },
    { type: 'text', value: '', style: { textAlign: 'center' } }, // espacio final
  ];
}