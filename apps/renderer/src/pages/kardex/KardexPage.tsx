import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button } from '../../components/ui/Button';
import { api, isOfflineError } from '../../services/api.client';
import { useAuthStore } from '../../store/authStore';
import type { Producto } from '../../types';
import { generateKardexExcel, type KardexExcelMovement } from '../xlsxExporter/generateKardexExcel';
import './KardexPage.css';

interface BranchOption {
  id: number;
  nombre: string;
}

interface BranchesResponseItem {
  sucursalId: number;
  sucursalNombre: string;
}

interface KardexMovement extends KardexExcelMovement {
  productoId: number;
  sucursalId: number;
}

interface KardexResponse {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  movimientos: KardexMovement[];
}

const PAGE_SIZE = 25;
const ALL_BRANCHES = '';

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('es-SV', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('es-SV', {
    maximumFractionDigits: Number.isInteger(value) ? 0 : 2,
  }).format(value);
}

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function getTypeClass(tipo: string) {
  if (tipo.startsWith('ENTRADA')) return 'entrada';
  if (tipo.startsWith('SALIDA')) return 'salida';
  if (tipo.startsWith('TRANSFERENCIA')) return 'transferencia';
  if (tipo === 'AJUSTE') return 'ajuste';
  return 'neutral';
}

function getTypeLabel(tipo: string) {
  return tipo
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default function KardexPage() {
  const { usuario } = useAuthStore();
  const isAdmin = usuario?.rol === 'ADMIN';

  const [products, setProducts] = useState<Producto[]>([]);
  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
  const [branchFilter, setBranchFilter] = useState(isAdmin ? ALL_BRANCHES : String(usuario?.sucursalId ?? ''));
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [applied, setApplied] = useState({
    productId: null as number | null,
    branchId: isAdmin ? ALL_BRANCHES : String(usuario?.sucursalId ?? ''),
    startDate: '',
    endDate: '',
  });
  const [movements, setMovements] = useState<KardexMovement[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [loadingBranches, setLoadingBranches] = useState(false);
  const [loadingKardex, setLoadingKardex] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const selectedProduct = useMemo(
    () => products.find((product) => product.id === selectedProductId) ?? null,
    [products, selectedProductId],
  );

  const appliedProduct = useMemo(
    () => products.find((product) => product.id === applied.productId) ?? null,
    [products, applied.productId],
  );

  const branchLabelById = useMemo(() => {
    const map = new Map<number, string>();
    branches.forEach((branch) => map.set(branch.id, branch.nombre));
    return map;
  }, [branches]);

  const appliedBranchName = applied.branchId
    ? branchLabelById.get(Number(applied.branchId)) ?? `Sucursal #${applied.branchId}`
    : 'Todas las sucursales';

  const hasFilters = Boolean(applied.productId);

  const loadProducts = useCallback(async () => {
    setLoadingProducts(true);
    try {
      const { data } = await api.get<Producto[]>('/productos', { params: { limit: 1000 } });
      setProducts(data ?? []);
    } catch (err) {
      console.error('[KardexPage] No se pudieron cargar productos:', err);
      setLoadError(isOfflineError(err) ? 'No hay conexion para cargar productos.' : 'No se pudieron cargar los productos.');
    } finally {
      setLoadingProducts(false);
    }
  }, []);

  const loadBranches = useCallback(async () => {
    if (!isAdmin) {
      const ownBranch = usuario?.sucursalId;
      setBranches(ownBranch ? [{ id: ownBranch, nombre: `Sucursal #${ownBranch}` }] : []);
      setBranchFilter(ownBranch ? String(ownBranch) : '');
      setApplied((prev) => ({ ...prev, branchId: ownBranch ? String(ownBranch) : '' }));
      return;
    }

    setLoadingBranches(true);
    try {
      const { data } = await api.get<BranchesResponseItem[]>('/inventario/criticos-por-sucursal');
      setBranches((data ?? []).map((branch) => ({
        id: branch.sucursalId,
        nombre: branch.sucursalNombre,
      })));
    } catch (err) {
      console.error('[KardexPage] No se pudieron cargar sucursales:', err);
      setBranches([]);
    } finally {
      setLoadingBranches(false);
    }
  }, [isAdmin, usuario?.sucursalId]);

  useEffect(() => {
    loadProducts();
    loadBranches();
  }, [loadProducts, loadBranches]);

  const loadKardex = useCallback(async () => {
    if (!applied.productId) {
      setMovements([]);
      setTotal(0);
      setTotalPages(1);
      return;
    }

    setLoadingKardex(true);
    setLoadError(null);

    const params: Record<string, string> = {
      productoId: String(applied.productId),
      page: String(currentPage),
      limit: String(PAGE_SIZE),
    };

    if (applied.branchId) params.sucursalId = applied.branchId;
    if (applied.startDate) params.fechaInicio = applied.startDate;
    if (applied.endDate) params.fechaFin = applied.endDate;

    try {
      const { data } = await api.get<KardexResponse>('/kardex', { params });
      setMovements(data.movimientos ?? []);
      setTotal(data.total ?? 0);
      setTotalPages(Math.max(1, data.totalPages ?? 1));
    } catch (err: any) {
      console.error('[KardexPage] No se pudo cargar Kardex:', err);
      const apiMsg = err?.response?.data?.error;
      setMovements([]);
      setTotal(0);
      setTotalPages(1);
      setLoadError(apiMsg ?? (isOfflineError(err) ? 'No hay conexion con el servidor.' : 'No se pudo cargar el Kardex.'));
    } finally {
      setLoadingKardex(false);
    }
  }, [applied, currentPage]);

  useEffect(() => {
    loadKardex();
  }, [loadKardex]);

  function handleProductInput(value: string) {
    setProductSearch(value);
    const match = products.find((product) => normalize(product.nombre) === normalize(value));
    setSelectedProductId(match?.id ?? null);
  }

  function handleApplyFilters() {
    const fallbackProduct = products.find((product) => normalize(product.nombre) === normalize(productSearch));
    const productId = selectedProductId ?? fallbackProduct?.id ?? null;

    if (!productId) {
      setLoadError('Selecciona un producto valido para consultar el Kardex.');
      return;
    }

    setCurrentPage(1);
    setApplied({
      productId,
      branchId: branchFilter,
      startDate,
      endDate,
    });
  }

  function handleClearFilters() {
    setProductSearch('');
    setSelectedProductId(null);
    setStartDate('');
    setEndDate('');
    setBranchFilter(isAdmin ? ALL_BRANCHES : String(usuario?.sucursalId ?? ''));
    setApplied({
      productId: null,
      branchId: isAdmin ? ALL_BRANCHES : String(usuario?.sucursalId ?? ''),
      startDate: '',
      endDate: '',
    });
    setCurrentPage(1);
    setLoadError(null);
  }

  async function handleExportExcel() {
    if (!applied.productId || total === 0) return;

    try {
      const exportLimit = 200;
      const baseParams: Record<string, string> = {
        productoId: String(applied.productId),
        limit: String(exportLimit),
      };

      if (applied.branchId) baseParams.sucursalId = applied.branchId;
      if (applied.startDate) baseParams.fechaInicio = applied.startDate;
      if (applied.endDate) baseParams.fechaFin = applied.endDate;

      const first = await api.get<KardexResponse>('/kardex', {
        params: { ...baseParams, page: '1' },
      });

      const allMovements = [...(first.data.movimientos ?? [])];
      const pages = Math.max(1, first.data.totalPages ?? 1);

      if (pages > 1) {
        const rest = await Promise.all(
          Array.from({ length: pages - 1 }, (_, index) => (
            api.get<KardexResponse>('/kardex', {
              params: { ...baseParams, page: String(index + 2) },
            })
          )),
        );

        rest.forEach((response) => {
          allMovements.push(...(response.data.movimientos ?? []));
        });
      }

      generateKardexExcel({
        movimientos: allMovements,
        productoNombre: appliedProduct?.nombre ?? selectedProduct?.nombre ?? `Producto #${applied.productId}`,
        sucursalNombre: appliedBranchName,
        filters: {
          startDate: applied.startDate,
          endDate: applied.endDate,
        },
        generatedBy: usuario?.nombre ?? 'Usuario',
      });
    } catch (err) {
      console.error('[KardexPage] No se pudo exportar Kardex:', err);
      setLoadError('No se pudo exportar el Kardex a Excel.');
    }
  }

  const branchOptions = [
    ...(isAdmin ? [{ value: ALL_BRANCHES, label: 'Todas las sucursales' }] : []),
    ...branches.map((branch) => ({ value: String(branch.id), label: branch.nombre })),
  ];

  const movementDelta = movements.reduce((sum, item) => sum + item.cantidad, 0);
  const lastBalance = movements[0]?.saldoNuevo ?? 0;

  return (
    <section className="kardex-page">
      <div className="kardex-header">
        <div className="kardex-title">
          <h2>Kardex de Inventario</h2>
          <p>Historial cronologico de movimientos por producto y sucursal.</p>
        </div>
        <div className="kardex-actions">
          <Button
            variant="secondary"
            onClick={handleExportExcel}
            disabled={!hasFilters || total === 0 || loadingKardex}
          >
            Exportar Excel
          </Button>
        </div>
      </div>

      <div className="kardex-filter-panel">
        <div className="kardex-filter-grid">
          <div className="kardex-field">
            <label htmlFor="kardex-product">Producto</label>
            <input
              id="kardex-product"
              list="kardex-product-list"
              value={productSearch}
              onChange={(event) => handleProductInput(event.target.value)}
              placeholder={loadingProducts ? 'Cargando productos...' : 'Buscar producto...'}
              disabled={loadingProducts}
            />
            <datalist id="kardex-product-list">
              {products.map((product) => (
                <option key={product.id} value={product.nombre}>
                  {product.codigoBarras ? `${product.codigoBarras} - ${product.nombre}` : product.nombre}
                </option>
              ))}
            </datalist>
          </div>

          <div className="kardex-field">
            <label htmlFor="kardex-branch">Sucursal</label>
            <select
              id="kardex-branch"
              value={branchFilter}
              onChange={(event) => setBranchFilter(event.target.value)}
              disabled={!isAdmin || loadingBranches}
            >
              {branchOptions.map((option) => (
                <option key={option.value || 'all'} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="kardex-field">
            <label htmlFor="kardex-start">Fecha inicio</label>
            <input
              id="kardex-start"
              type="date"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
            />
          </div>

          <div className="kardex-field">
            <label htmlFor="kardex-end">Fecha fin</label>
            <input
              id="kardex-end"
              type="date"
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
            />
          </div>
        </div>

        <div className="kardex-filter-actions">
          <Button variant="ghost" onClick={handleClearFilters}>Limpiar</Button>
          <Button onClick={handleApplyFilters} disabled={loadingProducts}>Consultar Kardex</Button>
        </div>
      </div>

      <div className="kardex-summary-row">
        <div className="kardex-stat">
          <span>Producto</span>
          <strong title={appliedProduct?.nombre ?? selectedProduct?.nombre ?? 'Sin seleccion'}>
            {appliedProduct?.nombre ?? selectedProduct?.nombre ?? 'Sin seleccion'}
          </strong>
        </div>
        <div className="kardex-stat">
          <span>Sucursal</span>
          <strong title={appliedBranchName}>{appliedBranchName}</strong>
        </div>
        <div className="kardex-stat">
          <span>Movimientos</span>
          <strong>{formatNumber(total)}</strong>
        </div>
        <div className="kardex-stat">
          <span>Saldo actual</span>
          <strong>{hasFilters && total > 0 ? formatNumber(lastBalance) : formatNumber(movementDelta)}</strong>
        </div>
      </div>

      <div className="kardex-table-card">
        {loadError ? (
          <div className="kardex-error">{loadError}</div>
        ) : loadingKardex ? (
          <div className="kardex-loading">Cargando movimientos...</div>
        ) : !hasFilters ? (
          <div className="kardex-empty">Selecciona un producto para consultar su Kardex.</div>
        ) : movements.length === 0 ? (
          <div className="kardex-empty">No hay movimientos para los filtros seleccionados.</div>
        ) : (
          <>
            <div className="kardex-table-scroll">
              <table className="kardex-table">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Tipo</th>
                    <th>Referencia</th>
                    <th>Cantidad</th>
                    <th>Saldo anterior</th>
                    <th>Saldo nuevo</th>
                  </tr>
                </thead>
                <tbody>
                  {movements.map((movement) => {
                    const badgeType = getTypeClass(movement.tipo);
                    return (
                      <tr key={movement.id}>
                        <td className="kardex-mono">{formatDateTime(movement.fechaMovimiento)}</td>
                        <td>
                          <span className={`kardex-type-badge kardex-type-badge--${badgeType}`}>
                            {getTypeLabel(movement.tipo)}
                          </span>
                        </td>
                        <td>{movement.referencia || 'N/D'}</td>
                        <td className="kardex-mono">{formatNumber(movement.cantidad)}</td>
                        <td className="kardex-mono">{formatNumber(movement.saldoAnterior)}</td>
                        <td className="kardex-mono">{formatNumber(movement.saldoNuevo)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="kardex-pagination">
              <span>
                Pagina {currentPage} de {totalPages} - {formatNumber(total)} movimiento(s)
              </span>
              <div className="kardex-pagination__buttons">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                  disabled={currentPage <= 1 || loadingKardex}
                >
                  Anterior
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                  disabled={currentPage >= totalPages || loadingKardex}
                >
                  Siguiente
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
