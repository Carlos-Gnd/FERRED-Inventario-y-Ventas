import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { api, isOfflineError } from '../../services/api.client';
import { useAuthStore } from '../../store/authStore';
import { generateExpensesExcel } from '../xlsxExporter/generateExpensesExcel';
import './ExpensesPage.css';

interface TipoGasto {
  id: number;
  nombre: string;
  descripcion: string | null;
}

interface SucursalOption {
  id: number;
  nombre: string;
}

interface GastoItem {
  id: number;
  tipoGastoId: number;
  monto: number;
  descripcion: string | null;
  fecha: string;
  tipoGasto: { id: number; nombre: string };
  sucursal: { id: number; nombre: string };
  usuario: { id: number; nombre: string };
}

interface GastosResponse {
  total: number;
  totalMonto: number;
  totalesPorTipo: Array<{ tipoGastoId: number; tipoGasto: string; total: number; cantidad: number }>;
  gastos: GastoItem[];
}

interface BranchesResponseItem {
  sucursalId: number;
  sucursalNombre: string;
}

const ALL = '';
const PAGE_SIZE = 6;
const TIPO_GASTO_ORDER = ['Servicios', 'Sueldos', 'Transporte', 'Mantenimiento', 'Otros'];

function todayInputValue() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function monthStartInputValue() {
  const date = new Date();
  date.setDate(1);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}-01`;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('es-SV', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(value);
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('es-SV', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}

function chipClass(index: number) {
  return ['expenses-chip', 'expenses-chip expenses-chip--green', 'expenses-chip expenses-chip--purple', 'expenses-chip expenses-chip--orange'][index % 4];
}

function sortTiposGasto(tipos: TipoGasto[]) {
  return [...tipos].sort((a, b) => {
    const aIndex = TIPO_GASTO_ORDER.indexOf(a.nombre);
    const bIndex = TIPO_GASTO_ORDER.indexOf(b.nombre);
    const safeA = aIndex === -1 ? TIPO_GASTO_ORDER.length : aIndex;
    const safeB = bIndex === -1 ? TIPO_GASTO_ORDER.length : bIndex;
    return safeA === safeB ? a.nombre.localeCompare(b.nombre, 'es') : safeA - safeB;
  });
}

export default function ExpensesPage() {
  const { usuario } = useAuthStore();
  const [tipos, setTipos] = useState<TipoGasto[]>([]);
  const [sucursales, setSucursales] = useState<SucursalOption[]>([]);
  const [response, setResponse] = useState<GastosResponse>({ total: 0, totalMonto: 0, totalesPorTipo: [], gastos: [] });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const [filters, setFilters] = useState({
    fechaInicio: monthStartInputValue(),
    fechaFin: todayInputValue(),
    tipoGastoId: ALL,
    sucursalId: usuario?.sucursalId ? String(usuario.sucursalId) : ALL,
  });
  const [draftFilters, setDraftFilters] = useState(filters);

  const [form, setForm] = useState({
    tipoGastoId: '',
    monto: '',
    descripcion: '',
    fecha: todayInputValue(),
    sucursalId: usuario?.sucursalId ? String(usuario.sucursalId) : '',
  });

  const tipoNombre = useMemo(() => {
    const map = new Map<number, string>();
    tipos.forEach((tipo) => map.set(tipo.id, tipo.nombre));
    return map;
  }, [tipos]);

  const sucursalNombre = useMemo(() => {
    const map = new Map<number, string>();
    sucursales.forEach((sucursal) => map.set(sucursal.id, sucursal.nombre));
    return map;
  }, [sucursales]);

  const selectedBranchLabel = filters.sucursalId ? sucursalNombre.get(Number(filters.sucursalId)) ?? 'Sucursal' : 'Todas';
  const topCategory = response.totalesPorTipo.reduce<
    { tipoGastoId: number; tipoGasto: string; total: number; cantidad: number } | null
  >((current, item) => (!current || item.total > current.total ? item : current), null);

  const totalPages = Math.max(1, Math.ceil(response.gastos.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const visibleRows = response.gastos.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const pageStart = response.gastos.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1;
  const pageEnd = Math.min(safePage * PAGE_SIZE, response.gastos.length);

  const loadOptions = useCallback(async () => {
    const [tiposRes, sucursalesRes] = await Promise.all([
      api.get<TipoGasto[]>('/tipos-gasto'),
      api.get<BranchesResponseItem[]>('/inventario/criticos-por-sucursal'),
    ]);

    const branchOptions = sucursalesRes.data.map((item) => ({
      id: item.sucursalId,
      nombre: item.sucursalNombre,
    }));

    const sortedTipos = sortTiposGasto(tiposRes.data);

    setTipos(sortedTipos);
    setSucursales(branchOptions);

    if (!form.sucursalId && branchOptions[0]) {
      setForm((prev) => ({ ...prev, sucursalId: String(branchOptions[0].id) }));
    }
  }, [form.sucursalId]);

  const loadGastos = useCallback(async () => {
    setLoading(true);
    setError(null);
    const params: Record<string, string> = { limit: '500' };
    if (filters.fechaInicio) params.fechaInicio = filters.fechaInicio;
    if (filters.fechaFin) params.fechaFin = filters.fechaFin;
    if (filters.tipoGastoId) params.tipoGastoId = filters.tipoGastoId;
    if (filters.sucursalId) params.sucursalId = filters.sucursalId;

    try {
      const { data } = await api.get<GastosResponse>('/gastos', { params });
      setResponse(data);
    } catch (err) {
      setResponse({ total: 0, totalMonto: 0, totalesPorTipo: [], gastos: [] });
      setError(isOfflineError(err) ? 'Sin conexion. No se pudieron cargar los gastos.' : 'Error al cargar gastos operativos.');
    } finally {
      setLoading(false);
    }
  }, [filters.fechaFin, filters.fechaInicio, filters.sucursalId, filters.tipoGastoId]);

  useEffect(() => {
    void loadOptions().catch(() => setError('No se pudieron cargar los catalogos de gastos.'));
  }, [loadOptions]);

  useEffect(() => {
    void loadGastos();
  }, [loadGastos]);

  useEffect(() => {
    setPage(1);
  }, [filters]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.tipoGastoId || !form.sucursalId) {
      setError('Selecciona tipo de gasto y sucursal.');
      return;
    }
    if (Number(form.monto) <= 0) {
      setError('El monto debe ser mayor a 0.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await api.post('/gastos', {
        tipoGastoId: Number(form.tipoGastoId),
        monto: Number(form.monto),
        descripcion: form.descripcion.trim() || null,
        fecha: form.fecha,
        sucursalId: Number(form.sucursalId),
      });
      setForm((prev) => ({ ...prev, monto: '', descripcion: '', fecha: todayInputValue() }));
      await loadGastos();
    } catch (err: any) {
      setError(err?.response?.data?.error ?? 'No se pudo registrar el gasto.');
    } finally {
      setSaving(false);
    }
  }

  function handleExport() {
    generateExpensesExcel({
      gastos: response.gastos,
      summary: {
        totalGastos: response.totalMonto,
        cantidadGastos: response.total,
        gastosPorCategoria: response.totalesPorTipo,
      },
      filters: {
        startDate: filters.fechaInicio,
        endDate: filters.fechaFin,
        branchName: filters.sucursalId ? sucursalNombre.get(Number(filters.sucursalId)) : 'Todas las sucursales',
        typeName: filters.tipoGastoId ? tipoNombre.get(Number(filters.tipoGastoId)) : 'Todos los tipos',
      },
      generatedBy: usuario?.nombre ?? 'Usuario',
    });
  }

  return (
    <div className="expenses-page">
      <section className="expenses-header">
        <div>
          <h1>Gastos Operativos</h1>
          <p>Registro y control de egresos por sucursal.</p>
        </div>
      </section>

      {error ? <div className="expenses-alert">{error}</div> : null}

      <section className="expenses-filters">
        <label className="expenses-field">
          <span className="expenses-label">Fecha inicio</span>
          <input className="expenses-input" type="date" value={draftFilters.fechaInicio} onChange={(e) => setDraftFilters((prev) => ({ ...prev, fechaInicio: e.target.value }))} />
        </label>
        <label className="expenses-field">
          <span className="expenses-label">Fecha fin</span>
          <input className="expenses-input" type="date" value={draftFilters.fechaFin} onChange={(e) => setDraftFilters((prev) => ({ ...prev, fechaFin: e.target.value }))} />
        </label>
        <label className="expenses-field">
          <span className="expenses-label">Tipo de gasto</span>
          <select className="expenses-select" value={draftFilters.tipoGastoId} onChange={(e) => setDraftFilters((prev) => ({ ...prev, tipoGastoId: e.target.value }))}>
            <option value={ALL}>Todos</option>
            {tipos.map((tipo) => <option key={tipo.id} value={tipo.id}>{tipo.nombre}</option>)}
          </select>
        </label>
        <label className="expenses-field">
          <span className="expenses-label">Sucursal</span>
          <select className="expenses-select" value={draftFilters.sucursalId} onChange={(e) => setDraftFilters((prev) => ({ ...prev, sucursalId: e.target.value }))}>
            <option value={ALL}>Todas</option>
            {sucursales.map((sucursal) => <option key={sucursal.id} value={sucursal.id}>{sucursal.nombre}</option>)}
          </select>
        </label>
        <button className="expenses-button expenses-filter-action" type="button" onClick={() => setFilters(draftFilters)}>
          Filtrar
        </button>
      </section>

      <section className="expenses-stats">
        <article className="expenses-stat">
          <div>
            <div className="expenses-stat__label">Total del periodo</div>
            <div className="expenses-stat__value"><strong>{loading ? '...' : formatCurrency(response.totalMonto)}</strong></div>
          </div>
          <div className="expenses-stat__icon">$</div>
        </article>
        <article className="expenses-stat expenses-stat--blue">
          <div>
            <div className="expenses-stat__label">Registros</div>
            <div className="expenses-stat__value"><strong>{loading ? '...' : response.total}</strong><span>gastos</span></div>
          </div>
          <div className="expenses-stat__icon">#</div>
        </article>
        <article className="expenses-stat expenses-stat--green">
          <div>
            <div className="expenses-stat__label">{topCategory ? topCategory.tipoGasto : 'Sucursal'}</div>
            <div className="expenses-stat__value">
              <strong>{loading ? '...' : topCategory ? formatCurrency(topCategory.total) : selectedBranchLabel}</strong>
            </div>
          </div>
          <div className="expenses-stat__icon">{topCategory ? 'T' : 'S'}</div>
        </article>
      </section>

      <section className="expenses-workspace">
        <article className="expenses-card">
          <div className="expenses-section-title">
            <h2>Listado de gastos</h2>
            <button className="expenses-button expenses-button--success" type="button" onClick={handleExport} disabled={response.gastos.length === 0}>
              Excel
            </button>
          </div>
          <div className="expenses-table-wrap">
            <table className="expenses-table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Tipo</th>
                  <th>Descripcion</th>
                  <th>Sucursal</th>
                  <th>Monto</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={5} className="expenses-empty">Cargando gastos...</td></tr>
                ) : visibleRows.length === 0 ? (
                  <tr><td colSpan={5} className="expenses-empty">No hay gastos con los filtros actuales.</td></tr>
                ) : visibleRows.map((gasto, index) => (
                  <tr key={gasto.id}>
                    <td>{formatDate(gasto.fecha)}</td>
                    <td><span className={chipClass(index)}>{gasto.tipoGasto.nombre}</span></td>
                    <td>{gasto.descripcion ?? 'Sin descripcion'}</td>
                    <td>{gasto.sucursal.nombre}</td>
                    <td>{formatCurrency(gasto.monto)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="expenses-table-footer">
            <div className="expenses-footnote">Mostrando {pageStart} de {pageEnd} registros</div>
            <div className="expenses-pagination">
              <button type="button" disabled={safePage === 1} onClick={() => setPage((prev) => Math.max(1, prev - 1))}>Anterior</button>
              <button type="button" disabled={safePage === totalPages || response.gastos.length === 0} onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}>Siguiente</button>
            </div>
          </div>
        </article>

        <aside className="expenses-card expenses-card--form">
          <h2 className="expenses-form-title">Registrar gasto</h2>
          <form className="expenses-form" onSubmit={handleSubmit}>
            <label className="expenses-field">
              <span className="expenses-label">Tipo de gasto</span>
              <select className="expenses-select" value={form.tipoGastoId} onChange={(e) => setForm((prev) => ({ ...prev, tipoGastoId: e.target.value }))}>
                <option value="">Seleccionar tipo...</option>
                {tipos.map((tipo) => <option key={tipo.id} value={tipo.id}>{tipo.nombre}</option>)}
              </select>
            </label>
            <label className="expenses-field">
              <span className="expenses-label">Monto $</span>
              <input className="expenses-input" type="number" min="0.01" step="0.01" placeholder="$ 0.00" value={form.monto} onChange={(e) => setForm((prev) => ({ ...prev, monto: e.target.value }))} />
            </label>
            <label className="expenses-field">
              <span className="expenses-label">Descripcion</span>
              <input className="expenses-input" type="text" placeholder="Ej: Compra de insumos..." value={form.descripcion} onChange={(e) => setForm((prev) => ({ ...prev, descripcion: e.target.value }))} />
            </label>
            <div className="expenses-form-grid">
              <label className="expenses-field">
                <span className="expenses-label">Fecha</span>
                <input className="expenses-input" type="date" value={form.fecha} onChange={(e) => setForm((prev) => ({ ...prev, fecha: e.target.value }))} />
              </label>
              <label className="expenses-field">
                <span className="expenses-label">Sucursal</span>
                <select className="expenses-select" value={form.sucursalId} onChange={(e) => setForm((prev) => ({ ...prev, sucursalId: e.target.value }))}>
                  <option value="">Sucursal</option>
                  {sucursales.map((sucursal) => <option key={sucursal.id} value={sucursal.id}>{sucursal.nombre}</option>)}
                </select>
              </label>
            </div>
            <button className="expenses-button expenses-button--wide" type="submit" disabled={saving}>{saving ? 'Guardando...' : 'Registrar'}</button>
          </form>
        </aside>
      </section>
    </div>
  );
}
