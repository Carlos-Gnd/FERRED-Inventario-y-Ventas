import * as XLSX from 'xlsx';

export interface SalesExcelItem {
  producto: string;
  codigoBarras: string | null;
  cantidad: number;
  precioUnit: number;
  subtotal: number;
}

export interface SalesExcelSale {
  id: number;
  fecha: string;
  sucursal: string | null;
  cajero: string | null;
  clienteNombre: string | null;
  tipoDte: string;
  estado: string;
  totalSinIva: number;
  iva: number;
  total: number;
  items: SalesExcelItem[];
}

export interface SalesExcelSummary {
  totalVentas: number;
  cantidadVentas: number;
  promedioVenta: number;
}

interface GenerateSalesExcelOptions {
  ventas: SalesExcelSale[];
  summary: SalesExcelSummary;
  filters?: {
    startDate?: string;
    endDate?: string;
    branchName?: string;
  };
  generatedBy?: string;
}

const currencyFormat = '$#,##0.00';
const numberFormat = '#,##0.##';

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value || 'N/D';
  return date;
}

function getSaleUnits(venta: SalesExcelSale) {
  return venta.items.reduce((sum, item) => sum + item.cantidad, 0);
}

function getProductsLabel(venta: SalesExcelSale) {
  const names = venta.items.slice(0, 4).map((item) => item.producto);
  const extra = venta.items.length > 4 ? ` +${venta.items.length - 4}` : '';
  return `${names.join(', ') || 'Sin productos'}${extra}`;
}

function sanitizeSheetName(value: string, fallback: string) {
  const clean = value
    .trim()
    .replace(/[\\/?*[\]:]/g, ' ')
    .replace(/\s+/g, ' ')
    .slice(0, 31);

  return clean || fallback;
}

function normalizeFilePart(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '') || 'ventas';
}

function resolveRangeLabel(filters?: GenerateSalesExcelOptions['filters']) {
  if (!filters?.startDate && !filters?.endDate) return 'Todos los periodos';
  if (filters.startDate && filters.endDate) return `${filters.startDate} a ${filters.endDate}`;
  if (filters.startDate) return `Desde ${filters.startDate}`;
  return `Hasta ${filters.endDate}`;
}

function appendColumnWidths(sheet: XLSX.WorkSheet) {
  sheet['!cols'] = [
    { wch: 19 },
    { wch: 10 },
    { wch: 22 },
    { wch: 24 },
    { wch: 22 },
    { wch: 14 },
    { wch: 14 },
    { wch: 14 },
    { wch: 14 },
    { wch: 14 },
    { wch: 40 },
    { wch: 12 },
  ];
}

function applyNumericFormats(sheet: XLSX.WorkSheet) {
  const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1');

  for (let row = range.s.r + 1; row <= range.e.r; row += 1) {
    ['G', 'H', 'I'].forEach((column) => {
      const cell = sheet[`${column}${row + 1}`];
      if (cell) cell.z = currencyFormat;
    });

    const unitsCell = sheet[`J${row + 1}`];
    if (unitsCell) unitsCell.z = numberFormat;
  }
}

function buildSalesRows(ventas: SalesExcelSale[]) {
  return ventas.map((venta) => ({
    Fecha: formatDate(venta.fecha),
    Factura: venta.id,
    Sucursal: venta.sucursal || 'N/D',
    Cajero: venta.cajero || 'N/D',
    Cliente: venta.clienteNombre || 'Cliente general',
    Estado: venta.estado,
    'Subtotal sin IVA': venta.totalSinIva,
    IVA: venta.iva,
    Total: venta.total,
    Unidades: getSaleUnits(venta),
    Productos: getProductsLabel(venta),
    DTE: venta.tipoDte,
  }));
}

function addSalesSheet(workbook: XLSX.WorkBook, sheetName: string, ventas: SalesExcelSale[]) {
  const sheet = XLSX.utils.json_to_sheet(buildSalesRows(ventas), {
    cellDates: true,
  });

  appendColumnWidths(sheet);
  applyNumericFormats(sheet);
  XLSX.utils.book_append_sheet(workbook, sheet, sanitizeSheetName(sheetName, 'Ventas'));
}

function addSummarySheet(workbook: XLSX.WorkBook, options: GenerateSalesExcelOptions, groupByLabel: string) {
  const totalSinIva = options.ventas.reduce((sum, venta) => sum + venta.totalSinIva, 0);
  const iva = options.ventas.reduce((sum, venta) => sum + venta.iva, 0);
  const units = options.ventas.reduce((sum, venta) => sum + getSaleUnits(venta), 0);

  const rows = [
    ['FERRED - Reporte de Ventas'],
    ['Generado por', options.generatedBy || 'Usuario'],
    ['Fecha de generacion', new Date()],
    ['Periodo', resolveRangeLabel(options.filters)],
    ['Sucursal', options.filters?.branchName || 'Todas las sucursales'],
    ['Agrupacion de hojas', groupByLabel],
    [],
    ['Indicador', 'Valor'],
    ['Ventas registradas', options.summary.cantidadVentas || options.ventas.length],
    ['Unidades vendidas', units],
    ['Subtotal sin IVA', totalSinIva],
    ['IVA', iva],
    ['Total facturado', options.summary.totalVentas],
    ['Ticket promedio', options.summary.promedioVenta],
  ];

  const sheet = XLSX.utils.aoa_to_sheet(rows);
  sheet['!cols'] = [{ wch: 26 }, { wch: 28 }];

  ['B11', 'B12', 'B13', 'B14'].forEach((cellRef) => {
    const cell = sheet[cellRef];
    if (cell) cell.z = currencyFormat;
  });

  const generatedAt = sheet.B3;
  if (generatedAt) {
    generatedAt.t = 'd';
    generatedAt.z = 'dd/mm/yyyy hh:mm';
  }

  XLSX.utils.book_append_sheet(workbook, sheet, 'Resumen');
}

function groupSales(options: GenerateSalesExcelOptions) {
  const hasBranchFilter = Boolean(
    options.filters?.branchName && options.filters.branchName !== 'Todas las sucursales',
  );
  const groupBy = hasBranchFilter ? 'cajero' : 'sucursal';
  const label = hasBranchFilter ? 'Cajero' : 'Sucursal';
  const groups = new Map<string, SalesExcelSale[]>();

  options.ventas.forEach((venta) => {
    const key = groupBy === 'cajero'
      ? venta.cajero || 'Sin cajero'
      : venta.sucursal || 'Sin sucursal';

    const current = groups.get(key) ?? [];
    current.push(venta);
    groups.set(key, current);
  });

  return { groups, label };
}

export function generateSalesExcel(options: GenerateSalesExcelOptions) {
  const workbook = XLSX.utils.book_new();
  const { groups, label } = groupSales(options);

  workbook.Props = {
    Title: 'FERRED - Reporte de Ventas',
    Subject: 'Reporte de ventas exportado desde FERRED',
    Author: options.generatedBy || 'FERRED',
    Company: 'FERRED',
    CreatedDate: new Date(),
  };

  addSummarySheet(workbook, options, label);

  if (groups.size === 0) {
    addSalesSheet(workbook, 'Ventas', []);
  } else {
    groups.forEach((ventas, groupName) => {
      addSalesSheet(workbook, `${label} - ${groupName}`, ventas);
    });
  }

  addSalesSheet(workbook, 'Todas las ventas', options.ventas);

  const range = normalizeFilePart(resolveRangeLabel(options.filters));
  XLSX.writeFile(workbook, `reporte-ventas-${range}.xlsx`, { compression: true });
}
