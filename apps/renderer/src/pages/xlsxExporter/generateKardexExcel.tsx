import * as XLSX from 'xlsx';

export interface KardexExcelMovement {
  id: number;
  fechaMovimiento: string;
  tipo: string;
  referencia: string | null;
  cantidad: number;
  saldoAnterior: number;
  saldoNuevo: number;
  producto?: { nombre?: string | null; codigoBarras?: string | null } | null;
  sucursal?: { nombre?: string | null } | null;
  usuario?: { nombre?: string | null } | null;
}

interface GenerateKardexExcelOptions {
  movimientos: KardexExcelMovement[];
  productoNombre: string;
  sucursalNombre?: string;
  filters?: {
    startDate?: string;
    endDate?: string;
  };
  generatedBy?: string;
}

const numberFormat = '#,##0.##';

function parseDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date;
}

function normalizeFilePart(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '') || 'kardex';
}

function resolveRangeLabel(filters?: GenerateKardexExcelOptions['filters']) {
  if (!filters?.startDate && !filters?.endDate) return 'Todos los periodos';
  if (filters.startDate && filters.endDate) return `${filters.startDate} a ${filters.endDate}`;
  if (filters.startDate) return `Desde ${filters.startDate}`;
  return `Hasta ${filters.endDate}`;
}

function buildRows(movimientos: KardexExcelMovement[]) {
  return movimientos.map((mov) => ({
    Fecha: parseDate(mov.fechaMovimiento),
    Tipo: mov.tipo,
    Referencia: mov.referencia || 'N/D',
    Cantidad: mov.cantidad,
    'Saldo anterior': mov.saldoAnterior,
    'Saldo nuevo': mov.saldoNuevo,
    Producto: mov.producto?.nombre || 'N/D',
    'Codigo barras': mov.producto?.codigoBarras || 'N/D',
    Sucursal: mov.sucursal?.nombre || 'N/D',
    Usuario: mov.usuario?.nombre || 'N/D',
  }));
}

function applyFormats(sheet: XLSX.WorkSheet) {
  const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1');

  for (let row = range.s.r + 1; row <= range.e.r; row += 1) {
    const fecha = sheet[`A${row + 1}`];
    if (fecha && fecha.t === 'd') fecha.z = 'dd/mm/yyyy hh:mm';

    ['D', 'E', 'F'].forEach((column) => {
      const cell = sheet[`${column}${row + 1}`];
      if (cell) cell.z = numberFormat;
    });
  }
}

export function generateKardexExcel(options: GenerateKardexExcelOptions) {
  const workbook = XLSX.utils.book_new();
  const range = resolveRangeLabel(options.filters);

  workbook.Props = {
    Title: 'FERRED - Kardex de Inventario',
    Subject: 'Historial de movimientos de inventario',
    Author: options.generatedBy || 'FERRED',
    Company: 'FERRED',
    CreatedDate: new Date(),
  };

  const summaryRows = [
    ['FERRED - Kardex de Inventario'],
    ['Generado por', options.generatedBy || 'Usuario'],
    ['Fecha de generacion', new Date()],
    ['Producto', options.productoNombre],
    ['Sucursal', options.sucursalNombre || 'Todas las sucursales'],
    ['Periodo', range],
    ['Movimientos exportados', options.movimientos.length],
  ];

  const summarySheet = XLSX.utils.aoa_to_sheet(summaryRows);
  summarySheet['!cols'] = [{ wch: 26 }, { wch: 34 }];
  const generatedAt = summarySheet.B3;
  if (generatedAt) {
    generatedAt.t = 'd';
    generatedAt.z = 'dd/mm/yyyy hh:mm';
  }
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Resumen');

  const dataSheet = XLSX.utils.json_to_sheet(buildRows(options.movimientos), { cellDates: true });
  dataSheet['!cols'] = [
    { wch: 19 },
    { wch: 24 },
    { wch: 28 },
    { wch: 12 },
    { wch: 16 },
    { wch: 14 },
    { wch: 30 },
    { wch: 18 },
    { wch: 20 },
    { wch: 22 },
  ];
  applyFormats(dataSheet);
  XLSX.utils.book_append_sheet(workbook, dataSheet, 'Movimientos');

  const productPart = normalizeFilePart(options.productoNombre);
  const rangePart = normalizeFilePart(range);
  XLSX.writeFile(workbook, `kardex-${productPart}-${rangePart}.xlsx`, { compression: true });
}
