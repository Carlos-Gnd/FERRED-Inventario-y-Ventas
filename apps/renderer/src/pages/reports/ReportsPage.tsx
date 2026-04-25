import { useEffect, useMemo, useState } from 'react';
import { api, isOfflineError } from '../../services/api.client';
import { useAuthStore } from '../../store/authStore';
import { useThemeStore } from '../../store/themeStore';
import './ReportsPage.css';

interface HistoryReceptionItem {
  id: number;
  creadoEn: string;
  usuarioNombre: string;
  productoNombre: string;
  sucursalNombre: string;
  cantidadIngresada: number;
}

interface ReportReceptionItem {
  id: number;
  dateISO: string;
  warehouseKeeper: string;
  summary: string;
  quantity: number;
  branch: string;
}

const ALL_BRANCHES = 'Todas las Sucursales';
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
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: Number.isInteger(value) ? 0 : 2,
  }).format(value);
}

export default function ReportsPage() {
  const { usuario } = useAuthStore();
  const { isDark, toggleTheme } = useThemeStore();

  const [receptions, setReceptions] = useState<HistoryReceptionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [branchFilter, setBranchFilter] = useState(ALL_BRANCHES);
  const [currentPage, setCurrentPage] = useState(1);
  const [appliedFilters, setAppliedFilters] = useState({
    startDate: '',
    endDate: '',
    branch: ALL_BRANCHES,
  });

  useEffect(() => {
    let mounted = true;

    async function loadRecepciones() {
      setLoading(true);
      setLoadError(null);

      try {
        const { data } = await api.get<HistoryReceptionItem[]>('/inventario/recepciones-historial');
        if (!mounted) return;
        setReceptions(data);
      } catch (err) {
        if (!mounted) return;

        setReceptions([]);
        setLoadError(
          isOfflineError(err)
            ? 'Sin conexion. No se pudo cargar el historial de recepciones.'
            : 'Error al cargar el historial de recepciones.',
        );
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadRecepciones();
    return () => {
      mounted = false;
    };
  }, []);

  const branchOptions = useMemo(() => {
    const branches = [...new Set(receptions.map((item) => item.sucursalNombre).filter(Boolean))];
    return [ALL_BRANCHES, ...branches];
  }, [receptions]);

  const normalizedItems = useMemo<ReportReceptionItem[]>(() => {
    return receptions.map((item) => ({
      id: item.id,
      dateISO: item.creadoEn,
      warehouseKeeper: item.usuarioNombre?.trim() || 'Sin responsable',
      summary: item.productoNombre?.trim() || 'Producto sin nombre',
      quantity: Number(item.cantidadIngresada ?? 0),
      branch: item.sucursalNombre,
    }));
  }, [receptions]);

  const filteredItems = useMemo(() => {
    const start = appliedFilters.startDate ? new Date(`${appliedFilters.startDate}T00:00:00`) : null;
    const end = appliedFilters.endDate ? new Date(`${appliedFilters.endDate}T23:59:59`) : null;

    return normalizedItems.filter((item) => {
      const itemDate = new Date(item.dateISO);
      const matchesBranch =
        appliedFilters.branch === ALL_BRANCHES || item.branch === appliedFilters.branch;
      const matchesStart = !start || itemDate >= start;
      const matchesEnd = !end || itemDate <= end;

      return matchesBranch && matchesStart && matchesEnd;
    });
  }, [appliedFilters, normalizedItems]);

  const stats = useMemo(() => {
    const totalReceptions = filteredItems.length;
    const totalProducts = filteredItems.reduce((sum, item) => sum + item.quantity, 0);
    const branches = [...new Set(filteredItems.map((item) => item.branch))];
    return { totalReceptions, totalProducts, branches };
  }, [filteredItems]);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / PAGE_SIZE));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const displayedItems = useMemo(() => {
    const startIndex = (safeCurrentPage - 1) * PAGE_SIZE;
    return filteredItems.slice(startIndex, startIndex + PAGE_SIZE);
  }, [filteredItems, safeCurrentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [appliedFilters]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const visibleName = usuario?.nombre?.trim() || 'Usuario desconocido';
  const visibleRole = usuario?.rol === 'ADMIN' ? 'Administrador' : 'Bodeguero';
  const pageStart = filteredItems.length === 0 ? 0 : (safeCurrentPage - 1) * PAGE_SIZE + 1;
  const pageEnd = filteredItems.length === 0 ? 0 : Math.min(safeCurrentPage * PAGE_SIZE, filteredItems.length);

  return (
    <div className="reports-page">
      <section className="reports-header">
        <div>
          <div className="reports-header__title">
            <h1>Historial de Recepciones</h1>
            <span className="reports-role-badge">Solo administrador / bodeguero</span>
          </div>
          <p>Registro de ingresos de mercancia por sucursal</p>
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
          <div className="reports-stat-card__label">Total recepciones</div>
          <div className="reports-stat-card__value reports-stat-card__value--accent">
            <strong>{loading ? '...' : formatNumber(stats.totalReceptions)}</strong>
            <span>&gt;</span>
          </div>
        </article>

        <article className="reports-stat-card">
          <div className="reports-stat-card__label">Productos ingresados</div>
          <div className="reports-stat-card__value">
            <strong>{loading ? '...' : formatNumber(stats.totalProducts)}</strong>
          </div>
        </article>

        <article className="reports-stat-card">
          <div className="reports-stat-card__label">Sucursales involucradas</div>
          <div className="reports-stat-card__value">
            <strong>{loading ? '...' : formatNumber(stats.branches.length)}</strong>
          </div>
          <div className="reports-branch-badges">
            {stats.branches.slice(0, 3).map((branch) => (
              <span key={branch} className="reports-branch-badge" title={branch}>
                {getInitials(branch)}
              </span>
            ))}
          </div>
        </article>
      </section>

      <section className="reports-filters">
        <div className="reports-field-group">
          <label className="reports-field-group__label">Rango de fechas (inicio - fin)</label>
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
              onChange={(event) => setBranchFilter(event.target.value)}
            >
              {branchOptions.map((branch) => (
                <option key={branch} value={branch}>
                  {branch}
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
              branch: branchFilter,
            })
          }
        >
          Filtrar resultados
        </button>
      </section>

      <section className="reports-list-card">
        <div className="reports-list-card__header">
          <h2 className="reports-list-card__title">Listado de Recepciones</h2>

          <button type="button" className="reports-export-button" disabled>
            <span>{'\u2193'}</span>
            Exportar Excel
          </button>
        </div>

        <div className="reports-table-wrap">
          <table className="reports-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Bodeguero responsable</th>
                <th>Productos (resumen)</th>
                <th className="reports-col-qty">Cant. total</th>
                <th className="reports-col-branch">Sucursal</th>
                <th className="reports-col-actions">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="reports-empty-state">
                    Cargando recepciones...
                  </td>
                </tr>
              ) : displayedItems.length === 0 ? (
                <tr>
                  <td colSpan={6} className="reports-empty-state">
                    No hay recepciones que coincidan con los filtros actuales.
                  </td>
                </tr>
              ) : (
                displayedItems.map((item) => {
                  const { day, month, year, time } = formatDateParts(item.dateISO);

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
                          <div className="reports-keeper__avatar">{getInitials(item.warehouseKeeper)}</div>
                          <div className="reports-keeper__name">{item.warehouseKeeper}</div>
                        </div>
                      </td>
                      <td className="reports-cell-summary">
                        <div className="reports-summary">{item.summary}</div>
                      </td>
                      <td className="reports-cell-qty">
                        <div className="reports-qty">
                          {formatNumber(item.quantity)}
                          <span> uds</span>
                        </div>
                      </td>
                      <td className="reports-cell-branch">
                        <span className="reports-chip">{item.branch}</span>
                      </td>
                      <td className="reports-cell-actions">
                        <button type="button" className="reports-detail-button" disabled>
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
            Mostrando {pageStart}-{pageEnd} de {filteredItems.length}
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
              disabled={safeCurrentPage === totalPages || filteredItems.length === 0}
            >
              Siguiente &gt;
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
