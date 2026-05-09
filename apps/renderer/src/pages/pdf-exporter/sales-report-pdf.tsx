import { jsPDF } from 'jspdf';
import { autoTable } from 'jspdf-autotable';

export interface SalesReportItem {
  producto: string;
  codigoBarras: string | null;
  cantidad: number;
  precioUnit: number;
  subtotal: number;
}

export interface SalesReportSale {
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
  items: SalesReportItem[];
}

export interface SalesReportSummary {
  totalVentas: number;
  cantidadVentas: number;
  promedioVenta: number;
}

interface ExportSalesReportPdfOptions {
  ventas: SalesReportSale[];
  summary: SalesReportSummary;
  filters?: {
    startDate?: string;
    endDate?: string;
    branchName?: string;
  };
  generatedBy?: string;
}

type JsPdfWithAutoTable = jsPDF & {
  lastAutoTable?: {
    finalY: number;
  };
};

const BRAND = {
  dark: '#0F172A',
  surface: '#162032',
  accent: '#3B82F6',
  warmAccent: '#D97706',
  muted: '#64748B',
  border: '#E2E8F0',
  soft: '#F8FAFC',
};

const currencyFormatter = new Intl.NumberFormat('es-SV', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 2,
});

const numberFormatter = new Intl.NumberFormat('es-SV', {
  maximumFractionDigits: 2,
});

function formatCurrency(value: number) {
  return currencyFormatter.format(Number.isFinite(value) ? value : 0);
}

function formatNumber(value: number) {
  return numberFormatter.format(Number.isFinite(value) ? value : 0);
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value || 'N/D';

  return new Intl.DateTimeFormat('es-SV', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function normalizeFilePart(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '') || 'ventas';
}

function resolveRangeLabel(filters?: ExportSalesReportPdfOptions['filters']) {
  if (!filters?.startDate && !filters?.endDate) return 'Todos los periodos';
  if (filters.startDate && filters.endDate) return `${filters.startDate} a ${filters.endDate}`;
  if (filters.startDate) return `Desde ${filters.startDate}`;
  return `Hasta ${filters.endDate}`;
}

function drawLogo(doc: jsPDF) {
  doc.setFillColor(BRAND.dark);
  doc.roundedRect(14, 12, 28, 18, 3, 3, 'F');

  doc.setFillColor(BRAND.accent);
  doc.roundedRect(17, 15, 7, 12, 1.5, 1.5, 'F');
  doc.setFillColor(BRAND.warmAccent);
  doc.roundedRect(25, 15, 7, 12, 1.5, 1.5, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor('#FFFFFF');
  doc.text('F', 35, 24, { align: 'center' });
}

function drawHeader(
  doc: jsPDF,
  options: ExportSalesReportPdfOptions,
) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const generatedAt = new Intl.DateTimeFormat('es-SV', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date());

  drawLogo(doc);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(BRAND.dark);
  doc.text('FERRED', 48, 19);

  doc.setFontSize(10);
  doc.setTextColor(BRAND.muted);
  doc.text('Inventario y Ventas', 48, 25);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(BRAND.dark);
  doc.text('Reporte de Ventas', pageWidth - 14, 18, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(BRAND.muted);
  doc.text(`Generado: ${generatedAt}`, pageWidth - 14, 24, { align: 'right' });
  doc.text(`Por: ${options.generatedBy || 'Usuario'}`, pageWidth - 14, 29, { align: 'right' });
}

function drawMetadata(doc: jsPDF, options: ExportSalesReportPdfOptions) {
  const branchName = options.filters?.branchName || 'Todas las sucursales';
  const range = resolveRangeLabel(options.filters);

  doc.setFillColor(BRAND.soft);
  doc.setDrawColor(BRAND.border);
  doc.roundedRect(14, 38, 182, 18, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(BRAND.muted);
  doc.text('PERIODO', 20, 45);
  doc.text('SUCURSAL', 91, 45);
  doc.text('REGISTROS', 162, 45);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(BRAND.dark);
  doc.text(range, 20, 51, { maxWidth: 60 });
  doc.text(branchName, 91, 51, { maxWidth: 60 });
  doc.text(formatNumber(options.ventas.length), 162, 51);
}

function drawSummary(doc: jsPDF, options: ExportSalesReportPdfOptions) {
  const totalSinIva = options.ventas.reduce((sum, venta) => sum + venta.totalSinIva, 0);
  const iva = options.ventas.reduce((sum, venta) => sum + venta.iva, 0);
  const units = options.ventas.reduce(
    (sum, venta) => sum + venta.items.reduce((itemSum, item) => itemSum + item.cantidad, 0),
    0,
  );

  const cards = [
    ['Ventas', formatNumber(options.summary.cantidadVentas || options.ventas.length)],
    ['Subtotal sin IVA', formatCurrency(totalSinIva)],
    ['IVA', formatCurrency(iva)],
    ['Total facturado', formatCurrency(options.summary.totalVentas)],
    ['Ticket promedio', formatCurrency(options.summary.promedioVenta)],
    ['Unidades', formatNumber(units)],
  ];

  cards.forEach(([label, value], index) => {
    const x = 14 + (index % 3) * 61;
    const y = 64 + Math.floor(index / 3) * 20;

    doc.setFillColor(index === 3 ? BRAND.surface : BRAND.soft);
    doc.setDrawColor(index === 3 ? BRAND.surface : BRAND.border);
    doc.roundedRect(x, y, 56, 14, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(index === 3 ? '#CBD5E1' : BRAND.muted);
    doc.text(label.toUpperCase(), x + 4, y + 5);

    doc.setFontSize(10);
    doc.setTextColor(index === 3 ? '#FFFFFF' : BRAND.dark);
    doc.text(value, x + 4, y + 11);
  });
}

function buildRows(ventas: SalesReportSale[]) {
  return ventas.map((venta) => {
    const units = venta.items.reduce((sum, item) => sum + item.cantidad, 0);
    const products = venta.items
      .slice(0, 3)
      .map((item) => item.producto)
      .join(', ');
    const extra = venta.items.length > 3 ? ` +${venta.items.length - 3}` : '';

    return [
      formatDate(venta.fecha),
      `#${venta.id}`,
      venta.cajero || 'N/D',
      venta.clienteNombre || 'Cliente general',
      venta.sucursal || 'N/D',
      `${products || 'Sin productos'}${extra}\n${formatNumber(units)} uds`,
      formatCurrency(venta.total),
    ];
  });
}

function drawFooter(doc: jsPDF) {
  const pageCount = doc.getNumberOfPages();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page);
    doc.setDrawColor(BRAND.border);
    doc.line(14, pageHeight - 14, pageWidth - 14, pageHeight - 14);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(BRAND.muted);
    doc.text('FERRED - Reporte generado desde Inventario y Ventas', 14, pageHeight - 8);
    doc.text(`Pagina ${page} de ${pageCount}`, pageWidth - 14, pageHeight - 8, { align: 'right' });
  }
}

function drawTotals(doc: jsPDF, options: ExportSalesReportPdfOptions, finalY: number) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let totalsY = finalY + 10;

  if (totalsY + 24 > pageHeight - 14) {
    doc.addPage();
    drawHeader(doc, options);
    totalsY = 42;
  }

  doc.setFillColor(BRAND.soft);
  doc.setDrawColor(BRAND.border);
  doc.roundedRect(pageWidth - 76, totalsY, 62, 18, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(BRAND.muted);
  doc.text('TOTAL GENERAL', pageWidth - 72, totalsY + 7);

  doc.setFontSize(13);
  doc.setTextColor(BRAND.dark);
  doc.text(formatCurrency(options.summary.totalVentas), pageWidth - 18, totalsY + 14, { align: 'right' });
}

export function exportSalesReportPdf(options: ExportSalesReportPdfOptions) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'letter' }) as JsPdfWithAutoTable;
  const pageWidth = doc.internal.pageSize.getWidth();

  drawHeader(doc, options);
  drawMetadata(doc, options);
  drawSummary(doc, options);

  autoTable(doc, {
    startY: 110,
    head: [['Fecha', 'Factura', 'Cajero', 'Cliente', 'Sucursal', 'Productos', 'Total']],
    body: buildRows(options.ventas),
    margin: { top: 36, left: 14, right: 14, bottom: 22 },
    tableWidth: pageWidth - 28,
    styles: {
      font: 'helvetica',
      fontSize: 8,
      cellPadding: 2.5,
      textColor: BRAND.dark,
      lineColor: BRAND.border,
      lineWidth: 0.1,
      valign: 'middle',
    },
    headStyles: {
      fillColor: BRAND.surface,
      textColor: '#FFFFFF',
      fontStyle: 'bold',
      fontSize: 8,
    },
    alternateRowStyles: {
      fillColor: '#F8FAFC',
    },
    columnStyles: {
      0: { cellWidth: 30 },
      1: { cellWidth: 18 },
      2: { cellWidth: 34 },
      3: { cellWidth: 42 },
      4: { cellWidth: 34 },
      5: { cellWidth: 72 },
      6: { cellWidth: 28, halign: 'right', fontStyle: 'bold' },
    },
    didDrawPage: (data) => {
      if (data.pageNumber > 1) {
        drawHeader(doc, options);
      }
    },
  });

  const finalY = doc.lastAutoTable?.finalY ?? 110;
  drawTotals(doc, options, finalY);
  drawFooter(doc);

  const range = normalizeFilePart(resolveRangeLabel(options.filters));
  doc.save(`reporte-ventas-${range}.pdf`);
}
