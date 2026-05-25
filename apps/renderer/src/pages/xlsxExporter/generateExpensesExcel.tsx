export interface ExpenseExcelItem {
  id: number;
  fecha: string;
  descripcion: string | null;
  monto: number;
  tipoGasto: { id: number; nombre: string };
  sucursal: { id: number; nombre: string };
  usuario?: { id: number; nombre: string };
}

export interface ExpenseExcelSummary {
  totalGastos: number;
  cantidadGastos: number;
  gastosPorCategoria: Array<{ tipoGastoId: number; tipoGasto: string; total: number; cantidad: number }>;
  gastosPorDia?: Array<{ fecha: string; total: number }>;
}

interface GenerateExpensesExcelOptions {
  gastos: ExpenseExcelItem[];
  summary: ExpenseExcelSummary;
  filters?: {
    startDate?: string;
    endDate?: string;
    branchName?: string;
    typeName?: string;
  };
  generatedBy?: string;
}

function escapeHtml(value: string | number | null | undefined) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function normalizeFilePart(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '') || 'gastos';
}

function resolveRangeLabel(filters?: GenerateExpensesExcelOptions['filters']) {
  if (!filters?.startDate && !filters?.endDate) return 'Todos los periodos';
  if (filters.startDate && filters.endDate) return `${filters.startDate} a ${filters.endDate}`;
  if (filters.startDate) return `Desde ${filters.startDate}`;
  return `Hasta ${filters.endDate}`;
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value || 'N/D';
  return new Intl.DateTimeFormat('es-SV', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}

function formatGeneratedAt() {
  return new Intl.DateTimeFormat('es-SV', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date());
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('es-SV', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(value);
}

function formatPercent(value: number) {
  return new Intl.NumberFormat('es-SV', {
    style: 'percent',
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value);
}

function metricCard(title: string, value: string, accent: string) {
  return `
    <td colspan="2" style="background:#f7f9fc;border:1px solid #d6e0ee;border-top:5px solid ${accent};padding:14px 16px;">
      <div style="color:#5c6b82;font-size:11px;font-weight:700;text-transform:uppercase;">${escapeHtml(title)}</div>
      <div style="color:#0f172a;font-size:24px;font-weight:800;margin-top:8px;">${escapeHtml(value)}</div>
    </td>
  `;
}

function buildCategoryRows(options: GenerateExpensesExcelOptions) {
  const rows = options.summary.gastosPorCategoria.length
    ? options.summary.gastosPorCategoria
    : [{ tipoGastoId: 0, tipoGasto: 'Sin datos', total: 0, cantidad: 0 }];

  return rows.map((item) => {
    const participation = options.summary.totalGastos > 0 ? item.total / options.summary.totalGastos : 0;
    const average = item.cantidad > 0 ? item.total / item.cantidad : 0;

    return `
      <tr>
        <td style="border:1px solid #d9e2ef;">${escapeHtml(item.tipoGasto)}</td>
        <td style="border:1px solid #d9e2ef;text-align:right;font-weight:700;">${item.cantidad}</td>
        <td style="border:1px solid #d9e2ef;text-align:right;font-weight:700;">${escapeHtml(formatCurrency(item.total))}</td>
        <td style="border:1px solid #d9e2ef;text-align:right;font-weight:700;">${escapeHtml(formatPercent(participation))}</td>
        <td style="border:1px solid #d9e2ef;text-align:right;font-weight:700;">${escapeHtml(formatCurrency(average))}</td>
      </tr>
    `;
  }).join('');
}

function buildDailyRows(options: GenerateExpensesExcelOptions) {
  const rows = options.summary.gastosPorDia?.length
    ? options.summary.gastosPorDia
    : [{ fecha: 'Sin datos', total: 0 }];

  return rows.map((item) => `
    <tr>
      <td style="border:1px solid #d9e2ef;">${escapeHtml(item.fecha)}</td>
      <td style="border:1px solid #d9e2ef;text-align:right;font-weight:700;">${escapeHtml(formatCurrency(item.total))}</td>
    </tr>
  `).join('');
}

function buildExpenseRows(options: GenerateExpensesExcelOptions) {
  if (options.gastos.length === 0) {
    return '<tr><td colspan="6" class="empty">Sin gastos para mostrar</td></tr>';
  }

  return options.gastos.map((gasto) => `
    <tr>
      <td style="border:1px solid #d9e2ef;">${escapeHtml(formatDate(gasto.fecha))}</td>
      <td style="border:1px solid #d9e2ef;">${escapeHtml(gasto.tipoGasto.nombre)}</td>
      <td style="border:1px solid #d9e2ef;">${escapeHtml(gasto.descripcion || 'Sin descripcion')}</td>
      <td style="border:1px solid #d9e2ef;">${escapeHtml(gasto.sucursal.nombre)}</td>
      <td style="border:1px solid #d9e2ef;">${escapeHtml(gasto.usuario?.nombre || 'N/D')}</td>
      <td style="border:1px solid #d9e2ef;text-align:right;font-weight:700;">${escapeHtml(formatCurrency(gasto.monto))}</td>
    </tr>
  `).join('');
}

function buildWorkbookHtml(options: GenerateExpensesExcelOptions) {
  const topCategory = options.summary.gastosPorCategoria[0];
  const period = resolveRangeLabel(options.filters);
  const branch = options.filters?.branchName || 'Todas las sucursales';
  const type = options.filters?.typeName || 'Todos los tipos';

  return `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <style>
          body {
            font-family: Arial, Helvetica, sans-serif;
            color: #172033;
            background: #ffffff;
          }

          .sheet {
            width: 980px;
          }

          .hero {
            background: #0f2747;
            color: #ffffff;
            border-radius: 8px;
          }

          .hero-title {
            font-size: 24px;
            font-weight: 800;
            letter-spacing: .5px;
          }

          .hero-subtitle {
            color: #c7d7f2;
            font-size: 12px;
          }

          .meta-label {
            color: #6b7890;
            font-weight: 700;
            text-transform: uppercase;
            font-size: 11px;
            letter-spacing: .6px;
          }

          .meta-value {
            color: #1f2937;
            font-weight: 700;
          }

          .metric {
            background: #f5f8fc;
            border: 1px solid #dce5f2;
            border-radius: 8px;
            padding: 14px;
          }

          .metric-label {
            color: #64748b;
            font-size: 11px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: .7px;
          }

          .metric-value {
            color: #0f172a;
            font-size: 24px;
            font-weight: 800;
            margin-top: 6px;
          }

          .section-title {
            background: #eaf2ff;
            color: #0f2747;
            font-size: 15px;
            font-weight: 800;
            border-left: 6px solid #2563eb;
          }

          table {
            border-collapse: collapse;
          }

          .data-table th {
            background: #17365d;
            color: #ffffff;
            border: 1px solid #17365d;
            font-weight: 800;
            text-align: left;
          }

          .data-table td {
            border: 1px solid #d9e2ef;
          }

          .data-table tr:nth-child(even) td {
            background: #f8fafc;
          }

          .money,
          .number {
            text-align: right;
            font-weight: 700;
          }

          .tag {
            background: #dbeafe;
            color: #1d4ed8;
            font-weight: 800;
            border-radius: 999px;
            padding: 3px 10px;
            text-transform: uppercase;
            font-size: 10px;
          }

          .empty {
            color: #64748b;
            text-align: center;
            font-style: italic;
          }
        </style>
      </head>
      <body>
        <table class="sheet" cellpadding="7" cellspacing="0" style="width:980px;border-collapse:collapse;">
          <colgroup>
            <col style="width:155px;" />
            <col style="width:185px;" />
            <col style="width:155px;" />
            <col style="width:185px;" />
            <col style="width:155px;" />
            <col style="width:145px;" />
          </colgroup>
          <tr>
            <td colspan="6" style="background:#0f2747;color:#ffffff;padding:16px 18px;border:1px solid #0f2747;">
              <div style="font-size:24px;font-weight:800;">FERRED - REPORTE DE GASTOS OPERATIVOS</div>
              <div style="font-size:12px;color:#c7d7f2;margin-top:4px;">Control financiero por sucursal, categoria y periodo</div>
            </td>
          </tr>
          <tr>
            <td style="background:#f1f5f9;color:#526173;font-weight:700;border:1px solid #d6e0ee;">Generado por</td>
            <td style="border:1px solid #d6e0ee;font-weight:700;">${escapeHtml(options.generatedBy || 'Usuario')}</td>
            <td style="background:#f1f5f9;color:#526173;font-weight:700;border:1px solid #d6e0ee;">Fecha</td>
            <td style="border:1px solid #d6e0ee;font-weight:700;">${escapeHtml(formatGeneratedAt())}</td>
            <td style="background:#f1f5f9;color:#526173;font-weight:700;border:1px solid #d6e0ee;">Archivo</td>
            <td style="border:1px solid #d6e0ee;font-weight:700;">Exportacion Excel</td>
          </tr>
          <tr>
            <td style="background:#f1f5f9;color:#526173;font-weight:700;border:1px solid #d6e0ee;">Periodo</td>
            <td style="border:1px solid #d6e0ee;font-weight:700;">${escapeHtml(period)}</td>
            <td style="background:#f1f5f9;color:#526173;font-weight:700;border:1px solid #d6e0ee;">Sucursal</td>
            <td style="border:1px solid #d6e0ee;font-weight:700;">${escapeHtml(branch)}</td>
            <td style="background:#f1f5f9;color:#526173;font-weight:700;border:1px solid #d6e0ee;">Tipo</td>
            <td style="border:1px solid #d6e0ee;font-weight:700;">${escapeHtml(type)}</td>
          </tr>
          <tr><td colspan="6" style="height:10px;"></td></tr>
          <tr>
            ${metricCard('Gastos registrados', String(options.summary.cantidadGastos), '#2563eb')}
            ${metricCard('Total gastos', formatCurrency(options.summary.totalGastos), '#13ba68')}
            ${metricCard('Categoria principal', topCategory ? `${topCategory.tipoGasto} - ${formatCurrency(topCategory.total)}` : 'Sin datos', '#7c3aed')}
          </tr>
          <tr><td colspan="6" style="height:12px;"></td></tr>
          <tr><td colspan="6" style="background:#eaf2ff;color:#0f2747;font-weight:800;border-left:6px solid #2563eb;padding:8px 10px;">Distribucion por categoria</td></tr>
        </table>

        <table class="sheet data-table" cellpadding="8" cellspacing="0" style="width:980px;border-collapse:collapse;">
          <thead>
            <tr>
              <th style="width:260px;background:#17365d;color:#ffffff;border:1px solid #17365d;text-align:left;">Categoria</th>
              <th style="width:120px;background:#17365d;color:#ffffff;border:1px solid #17365d;text-align:right;">Cantidad</th>
              <th style="width:140px;background:#17365d;color:#ffffff;border:1px solid #17365d;text-align:right;">Total</th>
              <th style="width:140px;background:#17365d;color:#ffffff;border:1px solid #17365d;text-align:right;">Participacion</th>
              <th style="width:140px;background:#17365d;color:#ffffff;border:1px solid #17365d;text-align:right;">Promedio</th>
            </tr>
          </thead>
          <tbody>${buildCategoryRows(options)}</tbody>
        </table>

        <table class="sheet" cellpadding="0" cellspacing="0" style="width:980px;border-collapse:collapse;"><tr><td style="height:14px;"></td></tr></table>
        <table class="sheet" cellpadding="8" cellspacing="0" style="width:980px;border-collapse:collapse;">
          <tr><td colspan="2" style="background:#eaf2ff;color:#0f2747;font-weight:800;border-left:6px solid #13ba68;padding:8px 10px;">Totales por dia</td></tr>
        </table>
        <table class="sheet data-table" cellpadding="8" cellspacing="0" style="width:420px;border-collapse:collapse;">
          <thead>
            <tr>
              <th style="width:220px;background:#17365d;color:#ffffff;border:1px solid #17365d;text-align:left;">Fecha</th>
              <th style="width:160px;background:#17365d;color:#ffffff;border:1px solid #17365d;text-align:right;">Total del dia</th>
            </tr>
          </thead>
          <tbody>${buildDailyRows(options)}</tbody>
        </table>

        <table class="sheet" cellpadding="0" cellspacing="0" style="width:980px;border-collapse:collapse;"><tr><td style="height:14px;"></td></tr></table>
        <table class="sheet" cellpadding="8" cellspacing="0" style="width:980px;border-collapse:collapse;">
          <tr><td colspan="6" style="background:#eaf2ff;color:#0f2747;font-weight:800;border-left:6px solid #7c3aed;padding:8px 10px;">Detalle de gastos</td></tr>
        </table>
        <table class="sheet data-table" cellpadding="8" cellspacing="0" style="width:980px;border-collapse:collapse;">
          <thead>
            <tr>
              <th style="width:120px;background:#17365d;color:#ffffff;border:1px solid #17365d;text-align:left;">Fecha</th>
              <th style="width:140px;background:#17365d;color:#ffffff;border:1px solid #17365d;text-align:left;">Tipo</th>
              <th style="width:300px;background:#17365d;color:#ffffff;border:1px solid #17365d;text-align:left;">Descripcion</th>
              <th style="width:180px;background:#17365d;color:#ffffff;border:1px solid #17365d;text-align:left;">Sucursal</th>
              <th style="width:160px;background:#17365d;color:#ffffff;border:1px solid #17365d;text-align:left;">Usuario</th>
              <th style="width:120px;background:#17365d;color:#ffffff;border:1px solid #17365d;text-align:right;">Monto</th>
            </tr>
          </thead>
          <tbody>${buildExpenseRows(options)}</tbody>
        </table>
      </body>
    </html>
  `;
}

export function generateExpensesExcel(options: GenerateExpensesExcelOptions) {
  const html = buildWorkbookHtml(options);
  const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8' });
  const range = normalizeFilePart(resolveRangeLabel(options.filters));
  const fileName = `reporte-gastos-${range}.xls`;

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
