import { useCallback, useEffect, useMemo, useState } from 'react';
import { api, isOfflineError } from '../../services/api.client';
import { useAuthStore } from '../../store/authStore';
import { useThemeStore } from '../../store/themeStore';
import { Modal } from '../../components/ui/Modal';
import { exportSalesReportPdf } from '../pdf-exporter/sales-report-pdf';
import { generateSalesExcel } from '../xlsxExporter/generateSalesExcel';
import './ReportsPage.css';

interface BranchOption {
  id: number;
  nombre: string;
}

interface ReportItem {
  producto: string;
  codigoBarras: string | null;
  cantidad: number;
  precioUnit: number;
  subtotal: number;
}

interface VentaReporte {
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
  items: ReportItem[];
}

interface ReportesVentasResumen {
  totalVentas: number;
  cantidadVentas: number;
  promedioVenta: number;
  ventasPorDia: Array<{ fecha: string; total: number }>;
}

interface BranchesResponseItem {
  sucursalId: number;
  sucursalNombre: string;
  criticos: number;
}

const ALL_BRANCHES = '';
const PAGE_SIZE = 10;

function formatDateParts(dateISO: string) {
  const date = new Date(dateISO);
  const day = new Intl.DateTimeFormat('es-SV', { day: '2-digit' }).format(date);
  const month = new Intl.DateTimeFormat('en-US', { month: 'short' }).format(date);
  const year = new Intl.DateTimeFormat('es-SV', { year: 'numeric' }).format(date);
  const time = new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(date);

  return { day, month, year, time };
}

function getInitials(fullName: string) {
  return fullName
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('es-SV', {
    maximumFractionDigits: Number.isInteger(value) ? 0 : 2,
  }).format(value);
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('es-SV', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(value);
}

function buildResumen(items: ReportItem[]) {
  if (items.length === 0) return 'Sin productos';
  const names = items.slice(0, 2).map(item => item.producto);
  const extra = items.length > 2 ? ` +${items.length - 2}` : '';
  return `${names.join(', ')}${extra}`;
}

export default function ReportsPage() {
  const { usuario } = useAuthStore();
  const { isDark, toggleTheme } = useThemeStore();

  const isAdmin = usuario?.rol === 'ADMIN';

  const [ventas, setVentas] = useState<VentaReporte[]>([]);
  const [summary, setSummary] = useState<ReportesVentasResumen>({
    totalVentas: 0,
    cantidadVentas: 0,
    promedioVenta: 0,
    ventasPorDia: [],
  });
  const [branchOptions, setBranchOptions] = useState<BranchOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [branchFilter, setBranchFilter] = useState(ALL_BRANCHES);
  const [appliedFilters, setAppliedFilters] = useState({
    startDate: '',
    endDate: '',
    branchId: ALL_BRANCHES,
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedVenta, setSelectedVenta] = useState<VentaReporte | null>(null);
  const [loadingBranches, setLoadingBranches] = useState(false);

  const visibleName = usuario?.nombre?.trim() || 'Usuario desconocido';
  const visibleRole = usuario?.rol === 'ADMIN' ? 'Administrador' : 'Bodeguero';

  const branchLabelById = useMemo(() => {
    const map = new Map<number, string>();
    branchOptions.forEach(branch => map.set(branch.id, branch.nombre));
    return map;
  }, [branchOptions]);

  const loadBranches = useCallback(async () => {
    if (!isAdmin) {
      const fallbackId = usuario?.sucursalId;
      if (fallbackId) {
        setBranchOptions([{ id: fallbackId, nombre: `Sucursal #${fallbackId}` }]);
        setBranchFilter(String(fallbackId));
        setAppliedFilters(prev => ({ ...prev, branchId: String(fallbackId) }));
      }
      return;
    }

    setLoadingBranches(true);
    try {
      const { data } = await api.get<BranchesResponseItem[]>('/inventario/criticos-por-sucursal');
      setBranchOptions(data.map(item => ({ id: item.sucursalId, nombre: item.sucursalNombre })));
    } catch (err) {
      console.error('[ReportsPage] No se pudieron cargar las sucursales:', err);
      if (usuario?.sucursalId) {
        setBranchOptions([{ id: usuario.sucursalId, nombre: `Sucursal #${usuario.sucursalId}` }]);
        setBranchFilter(String(usuario.sucursalId));
        setAppliedFilters(prev => ({ ...prev, branchId: String(usuario.sucursalId) }));
      }
    } finally {
      setLoadingBranches(false);
    }
  }, [isAdmin, usuario?.sucursalId]);

  const loadReport = useCallback(async () => {
    setLoading(true);
    setLoadError(null);

    const params: Record<string, string> = {
      limit: '500',
    };

    if (appliedFilters.startDate) params.fechaInicio = appliedFilters.startDate;
    if (appliedFilters.endDate) params.fechaFin = appliedFilters.endDate;
    if (appliedFilters.branchId) params.sucursalId = appliedFilters.branchId;

    try {
      const [ventasRes, resumenRes] = await Promise.all([
        api.get<{ total: number; ventas: VentaReporte[] }>('/reportes/ventas', { params }),
        api.get<ReportesVentasResumen>('/reportes/ventas/resumen', { params }),
      ]);

      setVentas(ventasRes.data.ventas ?? []);
      setSummary(
        resumenRes.data ?? {
          totalVentas: 0,
          cantidadVentas: 0,
          promedioVenta: 0,
          ventasPorDia: [],
        },
      );
    } catch (err) {
      setVentas([]);
      setSummary({
        totalVentas: 0,
        cantidadVentas: 0,
        promedioVenta: 0,
        ventasPorDia: [],
      });
      setLoadError(
        isOfflineError(err)
          ? 'Sin conexion. No se pudieron cargar los reportes de ventas.'
          : 'Error al cargar los reportes de ventas.',
      );
    } finally {
      setLoading(false);
    }
  }, [appliedFilters.endDate, appliedFilters.branchId, appliedFilters.startDate]);

  useEffect(() => {
    void loadBranches();
  }, [loadBranches]);

  useEffect(() => {
    void loadReport();
  }, [loadReport]);

  useEffect(() => {
    setCurrentPage(1);
  }, [appliedFilters]);

  const totalPages = Math.max(1, Math.ceil(ventas.length / PAGE_SIZE));
  const safeCurrentPage = Math.min(currentPage, totalPages);

  const displayedItems = useMemo(() => {
    const startIndex = (safeCurrentPage - 1) * PAGE_SIZE;
    return ventas.slice(startIndex, startIndex + PAGE_SIZE);
  }, [safeCurrentPage, ventas]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const pageStart = ventas.length === 0 ? 0 : (safeCurrentPage - 1) * PAGE_SIZE + 1;
  const pageEnd = ventas.length === 0 ? 0 : Math.min(safeCurrentPage * PAGE_SIZE, ventas.length);

  const branchOptionsToRender = branchOptions.length > 0
    ? branchOptions
    : usuario?.sucursalId
      ? [{ id: usuario.sucursalId, nombre: `Sucursal #${usuario.sucursalId}` }]
      : [];

  const exportBranchName = appliedFilters.branchId
    ? branchLabelById.get(Number(appliedFilters.branchId)) ?? `Sucursal #${appliedFilters.branchId}`
    : 'Todas las sucursales';

<<<<<<< HEAD
  const handleExportPdf = useCallback(() => {
    exportSalesReportPdf({
      ventas,
      summary,
      filters: {
        startDate: appliedFilters.startDate,
        endDate: appliedFilters.endDate,
        branchName: exportBranchName,
      },
      generatedBy: visibleName,
    });
  }, [appliedFilters.endDate, appliedFilters.startDate, exportBranchName, summary, ventas, visibleName]);
=======
  const exportFilters = useMemo(() => ({
    startDate: appliedFilters.startDate,
    endDate: appliedFilters.endDate,
    branchName: exportBranchName,
  }), [appliedFilters.endDate, appliedFilters.startDate, exportBranchName]);
>>>>>>> 4772acf7271e8cd858405762aca141f4736bb01b

  const handleExportExcel = useCallback(() => {
    generateSalesExcel({
      ventas,
      summary,
<<<<<<< HEAD
      filters: {
        startDate: appliedFilters.startDate,
        endDate: appliedFilters.endDate,
        branchName: exportBranchName,
      },
      generatedBy: visibleName,
    });
  }, [appliedFilters.endDate, appliedFilters.startDate, exportBranchName, summary, ventas, visibleName]);
=======
      filters: exportFilters,
      generatedBy: visibleName,
    });
  }, [exportFilters, summary, ventas, visibleName]);

  const handleExportPdf = useCallback(() => {
    exportSalesReportPdf({
      ventas,
      summary,
      filters: exportFilters,
      generatedBy: visibleName,
    });
  }, [exportFilters, summary, ventas, visibleName]);
>>>>>>> 4772acf7271e8cd858405762aca141f4736bb01b

  return (
    <div className="reports-page">
      <section className="reports-header">
        <div>
          <div className="reports-header__title">
            <h1>Reporte de Ventas</h1>
            <span className="reports-role-badge">Ventas reales</span>
          </div>
          <p>Facturación registrada por fecha y sucursal desde el servidor.</p>
        </div>

        <div className="reports-user-card">
          <button
            type="button"
            className="reports-theme-toggle"
            onClick={toggleTheme}
            title={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
          >
            {isDark ? '\u2600' : '\u263E'}
          </button>
          <div className="reports-user-card__meta">
            <div className="reports-user-card__name">{visibleName}</div>
            <div className="reports-user-card__role">{visibleRole}</div>
          </div>
          <div className="reports-user-card__avatar">{getInitials(visibleName)}</div>
        </div>
      </section>

      {loadError ? <div className="reports-alert reports-alert--error">{loadError}</div> : null}

      <section className="reports-stats">
        <article className="reports-stat-card">
          <div className="reports-stat-card__label">Ventas registradas</div>
          <div className="reports-stat-card__value reports-stat-card__value--accent">
            <strong>{loading ? '...' : formatNumber(summary.cantidadVentas)}</strong>
            <span>&gt;</span>
          </div>
        </article>

        <article className="reports-stat-card">
          <div className="reports-stat-card__label">Total facturado</div>
          <div className="reports-stat-card__value">
            <strong>{loading ? '...' : formatCurrency(summary.totalVentas)}</strong>
          </div>
        </article>

        <article className="reports-stat-card">
          <div className="reports-stat-card__label">Ticket promedio</div>
          <div className="reports-stat-card__value">
            <strong>{loading ? '...' : formatCurrency(summary.promedioVenta)}</strong>
          </div>
          <div className="reports-branch-badges">
            {branchOptionsToRender.slice(0, 3).map((branch) => (
              <span key={branch.id} className="reports-branch-badge" title={branch.nombre}>
                {getInitials(branch.nombre)}
              </span>
            ))}
          </div>
        </article>
      </section>

      <section className="reports-filters">
        <div className="reports-field-group">
          <label className="reports-field-group__label">Rango de fechas</label>
          <div className="reports-date-fields">
            <input
              className="reports-input"
              type="date"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
            />
            <input
              className="reports-input"
              type="date"
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
            />
          </div>
        </div>

        <div className="reports-field-group">
          <label className="reports-field-group__label">Sucursal</label>
          <div className="reports-select-wrap">
            <select
              className="reports-select"
              value={branchFilter}
              disabled={!isAdmin && branchOptionsToRender.length <= 1}
              onChange={(event) => setBranchFilter(event.target.value)}
            >
              <option value={ALL_BRANCHES}>Todas las sucursales</option>
              {branchOptionsToRender.map((branch) => (
                <option key={branch.id} value={String(branch.id)}>
                  {branch.nombre}
                </option>
              ))}
            </select>
            <span className="reports-select-caret" aria-hidden="true">{'\u25BE'}</span>
          </div>
        </div>

        <button
          type="button"
          className="reports-filter-button"
          onClick={() =>
            setAppliedFilters({
              startDate,
              endDate,
              branchId: branchFilter,
            })
          }
        >
          Filtrar resultados
        </button>
      </section>

      <section className="reports-list-card">
        <div className="reports-list-card__header">
          <div>
            <h2 className="reports-list-card__title">Ventas recientes</h2>
            <p style={{ marginTop: '4px', fontSize: '12px', color: 'var(--text-muted)' }}>
              {loadingBranches ? 'Cargando sucursales...' : 'Listado real de facturas emitidas.'}
            </p>
          </div>

          <div className="reports-export-actions">
            <button
              type="button"
              className="reports-export-button"
              onClick={handleExportExcel}
              disabled={loading || ventas.length === 0}
              title={ventas.length === 0 ? 'No hay ventas para exportar' : 'Exportar reporte de ventas en Excel'}
            >
              <span>{'\u2193'}</span>
              Exportar Excel
            </button>

            <button
              type="button"
              className="reports-export-button"
              onClick={handleExportPdf}
              disabled={loading || ventas.length === 0}
              title={ventas.length === 0 ? 'No hay ventas para exportar' : 'Exportar reporte de ventas en PDF'}
            >
              <span>{'\u2193'}</span>
              Exportar PDF
            </button>
          </div>
        </div>

        <div className="reports-table-wrap">
          <table className="reports-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Cajero</th>
                <th>Cliente / resumen</th>
                <th className="reports-col-qty">Total</th>
                <th className="reports-col-branch">Sucursal</th>
                <th className="reports-col-actions">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="reports-empty-state">
                    Cargando ventas...
                  </td>
                </tr>
              ) : displayedItems.length === 0 ? (
                <tr>
                  <td colSpan={6} className="reports-empty-state">
                    No hay ventas que coincidan con los filtros actuales.
                  </td>
                </tr>
              ) : (
                displayedItems.map((item) => {
                  const { day, month, year, time } = formatDateParts(item.fecha);
                  const resumen = buildResumen(item.items);
                  const totalItems = item.items.reduce((sum, current) => sum + current.cantidad, 0);

                  return (
                    <tr key={item.id}>
                      <td className="reports-cell-date">
                        <div className="reports-row-date">
                          <div className="reports-row-date__headline">{day} {month},</div>
                          <strong className="reports-row-date__headline">{year}</strong>
                          <span>{time}</span>
                        </div>
                      </td>
                      <td className="reports-cell-keeper">
                        <div className="reports-keeper">
                          <div className="reports-keeper__avatar">{getInitials(item.cajero ?? 'Sin cajero')}</div>
                          <div>
                            <div className="reports-keeper__name">{item.cajero ?? 'Sin cajero'}</div>
                            <div className="reports-row-text-muted" style={{ fontSize: '11px', marginTop: '2px' }}>
                              {item.tipoDte} · {item.estado}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="reports-cell-summary">
                        <div className="reports-summary">{item.clienteNombre ?? 'Cliente general'}</div>
                        <div className="reports-row-text-muted" style={{ marginTop: '6px' }}>{resumen}</div>
                      </td>
                      <td className="reports-cell-qty">
                        <div className="reports-qty">
                          {formatCurrency(item.total)}
                          <span> / {formatNumber(totalItems)} uds</span>
                        </div>
                      </td>
                      <td className="reports-cell-branch">
                        <span className="reports-chip">{item.sucursal ?? branchLabelById.get(Number(branchFilter)) ?? 'Sucursal'}</span>
                      </td>
                      <td className="reports-cell-actions">
                        <button
                          type="button"
                          className="reports-detail-button"
                          onClick={() => setSelectedVenta(item)}
                        >
                          <span>{'\u25E6'}</span>
                          Ver detalle
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="reports-list-card__footer">
          <div className="reports-footnote">
            Mostrando {pageStart}-{pageEnd} de {ventas.length}
          </div>

          <div className="reports-pagination">
            <button
              type="button"
              onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
              disabled={safeCurrentPage === 1}
            >
              &lt; Anterior
            </button>
            <button
              type="button"
              onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
              disabled={safeCurrentPage === totalPages || ventas.length === 0}
            >
              Siguiente &gt;
            </button>
          </div>
        </div>
      </section>

      <Modal
        open={!!selectedVenta}
        onClose={() => setSelectedVenta(null)}
        title="Detalle de venta"
        maxWidth={640}
      >
        {selectedVenta ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'grid', gap: '8px', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
              <div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.12em' }}>Factura</div>
                <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>#{selectedVenta.id}</div>
              </div>
              <div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.12em' }}>Fecha</div>
                <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{new Date(selectedVenta.fecha).toLocaleString('es-SV')}</div>
              </div>
              <div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.12em' }}>Sucursal</div>
                <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{selectedVenta.sucursal ?? 'N/D'}</div>
              </div>
              <div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.12em' }}>Cajero</div>
                <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{selectedVenta.cajero ?? 'N/D'}</div>
              </div>
            </div>

            <div style={{ display: 'grid', gap: '10px' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)' }}>
                Productos
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {selectedVenta.items.map((item, index) => (
                  <div
                    key={`${item.producto}-${index}`}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr auto auto',
                      gap: '12px',
                      padding: '10px 12px',
                      border: '1px solid var(--border)',
                      borderRadius: '8px',
                      background: 'var(--bg-elevated)',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{item.producto}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                        {item.codigoBarras ?? 'Sin código'} · {formatNumber(item.cantidad)} uds
                      </div>
                    </div>
                    <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                      {formatCurrency(item.precioUnit)}
                    </div>
                    <div style={{ fontWeight: 700, color: 'var(--accent)' }}>
                      {formatCurrency(item.subtotal)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: 'grid', gap: '8px', paddingTop: '4px', borderTop: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Subtotal sin IVA</span>
                <strong style={{ color: 'var(--text-primary)' }}>{formatCurrency(selectedVenta.totalSinIva)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
                <span style={{ color: 'var(--text-muted)' }}>IVA</span>
                <strong style={{ color: 'var(--text-primary)' }}>{formatCurrency(selectedVenta.iva)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Total</span>
                <strong style={{ color: 'var(--accent)', fontSize: '18px' }}>{formatCurrency(selectedVenta.total)}</strong>
              </div>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
