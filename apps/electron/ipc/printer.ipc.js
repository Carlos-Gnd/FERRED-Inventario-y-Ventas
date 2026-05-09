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

// ── Imprimir corte de caja (X/Y/Z) ───────────────────────────
ipcMain.handle('imprimir-corte', async (_event, corte) => {
  if (!PosPrinter) {
    console.log('[Printer] SIMULADO — corte recibido:', JSON.stringify(corte, null, 2));
    return { ok: true, simulated: true };
  }

  try {
    const printerName = corte?.printerName || 'default';
    const printData = buildCorteData(corte ?? {});

    await PosPrinter.print(printData, {
      preview:        false,
      width:          '300px',
      margin:         '0 0 0 0',
      copies:         1,
      printerName,
      timeOutPerLine: 400,
      silent:         true,
    });

    return { ok: true };
  } catch (err) {
    console.error('[Printer] Error al imprimir corte:', err.message);
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

function buildCorteData(corte) {
  const fmt = (n) => `$${Number(n ?? 0).toFixed(2)}`;
  const fmtFecha = (iso) => {
    const d = new Date(iso);
    return `${d.toLocaleDateString('es-SV')} ${d.toLocaleTimeString('es-SV', { hour: '2-digit', minute: '2-digit' })}`;
  };

  const tipoLabel = {
    X: 'CORTE X - LECTURA PARCIAL',
    Y: 'CORTE Y - CIERRE DE CAJERO',
    Z: 'CORTE Z - CIERRE TOTAL DEL DIA',
  };

  return [
    { type: 'text', value: 'FERRED INDUSTRIAL', style: { fontWeight: '700', textAlign: 'center', fontSize: '16px' } },
    { type: 'text', value: corte.sucursalNombre ?? 'Sucursal', style: { textAlign: 'center', fontSize: '11px' } },
    { type: 'text', value: '--------------------------------', style: {} },
    { type: 'text', value: tipoLabel[corte.tipo] ?? `CORTE ${corte.tipo ?? ''}`.trim(), style: { fontWeight: '700', textAlign: 'center', fontSize: '13px' } },
    { type: 'text', value: `No. ${corte.id ?? ''}`.trim(), style: { textAlign: 'center', fontSize: '11px' } },
    { type: 'text', value: '--------------------------------', style: {} },
    { type: 'text', value: `Cajero : ${corte.cajeroNombre ?? 'Administrador'}`, style: { fontSize: '11px' } },
    { type: 'text', value: `Inicio : ${fmtFecha(corte.fechaInicio ?? new Date().toISOString())}`, style: { fontSize: '11px' } },
    { type: 'text', value: `Cierre : ${fmtFecha(corte.fechaFin ?? new Date().toISOString())}`, style: { fontSize: '11px' } },
    { type: 'text', value: '--------------------------------', style: {} },
    { type: 'text', value: 'TOTALES POR METODO DE PAGO', style: { fontWeight: '700', fontSize: '11px' } },
    { type: 'text', value: `Efectivo     : ${fmt(corte.totalEfectivo)}`, style: { fontSize: '11px' } },
    { type: 'text', value: `Tarjeta      : ${fmt(corte.totalTarjeta)}`, style: { fontSize: '11px' } },
    { type: 'text', value: `Otros        : ${fmt(corte.totalOtros ?? corte.totalTransferencia)}`, style: { fontSize: '11px' } },
    { type: 'text', value: '--------------------------------', style: {} },
    { type: 'text', value: `No. ventas   : ${corte.cantidadVentas ?? 0}`, style: { fontSize: '11px' } },
    { type: 'text', value: `TOTAL GENERAL: ${fmt(corte.totalGeneral)}`, style: { fontWeight: '700', fontSize: '13px' } },
    { type: 'text', value: '--------------------------------', style: {} },
    ...(corte.observaciones ? [{ type: 'text', value: String(corte.observaciones), style: { fontSize: '10px', textAlign: 'center' } }] : []),
    { type: 'text', value: 'VALIDACION INTERNA FERRED', style: { fontSize: '10px', textAlign: 'center' } },
    { type: 'text', value: `Impreso: ${fmtFecha(new Date().toISOString())}`, style: { fontSize: '10px', textAlign: 'center' } },
    { type: 'text', value: ' ', style: {} },
  ];
}
