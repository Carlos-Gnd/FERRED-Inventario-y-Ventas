import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { api, isOfflineError } from '../../services/api.client';
import type { ProductoComparativo, StockPorSucursal } from '../../types';

type BranchKey = 'central' | 'norte';

interface NavigationState {
  source?: string;
  sucursalId?: number | null;
  sucursalNombre?: string | null;
}

const POR_PAGINA = 8;

function getStockColor(cantidad: number) {
  if (cantidad === 0) return 'var(--danger)';
  if (cantidad <= 5) return 'var(--warning)';
  return 'var(--success)';
}

function getDiffColor(diferencia: number) {
  if (diferencia > 0) return 'var(--success)';
  if (diferencia < 0) return 'var(--danger)';
  return 'var(--text-muted)';
}

function normalizeBranchName(nombre: string) {
  return nombre
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

function resolveBranchKey(sucursalId?: number | null, sucursalNombre?: string | null): BranchKey | null {
  const normalizedName = sucursalNombre ? normalizeBranchName(sucursalNombre) : '';

  if (normalizedName.includes('central') || sucursalId === 1) return 'central';
  if (normalizedName.includes('norte') || sucursalId === 2) return 'norte';

  return null;
}

function getBranchStock(producto: ProductoComparativo, branch: BranchKey): StockPorSucursal | null {
  const ordered = [...producto.sucursales].sort((a, b) => a.sucursalId - b.sucursalId);
  const fallback = ordered[branch === 'central' ? 0 : 1] ?? ordered[0] ?? null;

  if (branch === 'central') {
    return ordered.find((item) => normalizeBranchName(item.sucursalNombre).includes('central')) ?? fallback;
  }

  return ordered.find((item) => normalizeBranchName(item.sucursalNombre).includes('norte')) ?? fallback;
}

function getDisplayStocks(producto: ProductoComparativo) {
  const ordered = [...producto.sucursales].sort((a, b) => a.sucursalId - b.sucursalId);
  return {
    primary: ordered[0] ?? null,
    secondary: ordered[1] ?? null,
  };
}

function getStockLabel(stock: StockPorSucursal | null, fallbackIndex: number) {
  return stock?.sucursalNombre ?? `Sucursal ${fallbackIndex}`;
}

export default function StockPage() {
  const location = useLocation();
  const navigationState = (location.state as NavigationState | null) ?? null;
  const highlightedBranch = resolveBranchKey(navigationState?.sucursalId, navigationState?.sucursalNombre);
  const isAlertEntry = navigationState?.source === 'critical-alerts';
  const [isCompact, setIsCompact] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth <= 720 : false
  );

  const [productos, setProductos] = useState<ProductoComparativo[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [categoria, setCategoria] = useState('Todas');
  const [pagina, setPagina] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function load() {
      setLoading(true);
      setLoadError(null);

      try {
        const { data } = await api.get<ProductoComparativo[]>('/inventario/stock-comparativo');
        if (!mounted) return;
        setProductos(data);
      } catch (err) {
        if (!mounted) return;
        setProductos([]);
        setLoadError(
          isOfflineError(err)
            ? 'Sin conexión. No se pudo cargar el comparativo de inventario.'
            : 'No se pudo cargar el comparativo de inventario.'
        );
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    setPagina(1);
  }, [busqueda, categoria, highlightedBranch, isAlertEntry]);

  useEffect(() => {
    const onResize = () => setIsCompact(window.innerWidth <= 720);
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const categorias = useMemo(
    () => ['Todas', ...Array.from(new Set(productos.map((producto) => producto.categoria))).sort()],
    [productos]
  );

  const filtrados = useMemo(() => {
    const termino = busqueda.trim().toLowerCase();

    return productos.filter((producto) => {
      const focusedStock = highlightedBranch ? getBranchStock(producto, highlightedBranch) : null;
      const coincideSucursal = !highlightedBranch || !isAlertEntry || (focusedStock?.cantidad ?? 0) <= (focusedStock?.minimo ?? 0);
      const coincideBusqueda =
        termino.length === 0 ||
        producto.nombre.toLowerCase().includes(termino) ||
        (producto.codigoBarras ?? '').toLowerCase().includes(termino);
      const coincideCategoria = categoria === 'Todas' || producto.categoria === categoria;

      return coincideBusqueda && coincideCategoria && coincideSucursal;
    });
  }, [productos, busqueda, categoria, highlightedBranch, isAlertEntry]);

  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / POR_PAGINA));
  const paginaActual = Math.min(pagina, totalPaginas);
  const paginados = filtrados.slice((paginaActual - 1) * POR_PAGINA, paginaActual * POR_PAGINA);

  const metricsSource = useMemo(() => {
    if (!highlightedBranch || !isAlertEntry) return productos;
    return productos.filter((producto) => {
      const stock = getBranchStock(producto, highlightedBranch);
      return stock ? stock.cantidad <= stock.minimo : false;
    });
  }, [productos, highlightedBranch, isAlertEntry]);

  const totalProductos = metricsSource.length;
  const conStock = useMemo(() => {
    if (highlightedBranch && isAlertEntry) {
      return metricsSource.filter((producto) => {
        const stock = getBranchStock(producto, highlightedBranch);
        return stock ? stock.cantidad > stock.minimo : false;
      }).length;
    }

    return productos.filter((producto) => producto.sucursales.every((stock) => stock.estado === 'disponible')).length;
  }, [productos, metricsSource, highlightedBranch, isAlertEntry]);

  const stockBajo = useMemo(() => {
    if (highlightedBranch && isAlertEntry) {
      return metricsSource.filter((producto) => {
        const stock = getBranchStock(producto, highlightedBranch);
        return stock ? stock.cantidad > 0 && stock.cantidad <= stock.minimo : false;
      }).length;
    }

    return productos.filter((producto) => producto.sucursales.some((stock) => stock.estado === 'bajo')).length;
  }, [productos, metricsSource, highlightedBranch, isAlertEntry]);

  const sinStock = useMemo(() => {
    if (highlightedBranch && isAlertEntry) {
      return metricsSource.filter((producto) => {
        const stock = getBranchStock(producto, highlightedBranch);
        return stock ? stock.cantidad === 0 : false;
      }).length;
    }

    return productos.filter((producto) => producto.sucursales.some((stock) => stock.estado === 'critico')).length;
  }, [productos, metricsSource, highlightedBranch, isAlertEntry]);

  const branchLabel = highlightedBranch === 'central' ? 'Sucursal Central' : highlightedBranch === 'norte' ? 'Sucursal Norte' : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', animation: 'fadeUp 0.35s ease' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-primary)' }}>Control de Stock</h1>
          <p style={{ marginTop: '6px', fontSize: '13px', color: 'var(--text-muted)' }}>
            {branchLabel && isAlertEntry
              ? `Vista enfocada en productos comprometidos de ${branchLabel}.`
              : 'Comparativo de inventario entre sucursales.'}
          </p>
        </div>

        <span
          style={{
            padding: '6px 10px',
            borderRadius: '999px',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border)',
            color: 'var(--accent)',
            fontSize: '11px',
            fontWeight: 700,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
          }}
        >
          Admin / Bodega
        </span>
      </div>

      {loadError && (
        <div
          style={{
            padding: '14px 16px',
            borderRadius: '12px',
            border: '1px solid rgba(239,68,68,0.18)',
            background: 'rgba(239,68,68,0.08)',
            color: 'var(--danger)',
            fontSize: '13px',
            fontWeight: 600,
          }}
        >
          {loadError}
        </div>
      )}

      {isAlertEntry && (
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: '12px',
            flexWrap: 'wrap',
            padding: '14px 16px',
            borderRadius: '12px',
            border: '1px solid rgba(239,68,68,0.18)',
            background: 'rgba(239,68,68,0.08)',
            color: 'var(--text-primary)',
          }}
        >
          <div>
            <div style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--danger)' }}>
              Alerta activa
            </div>
            <div style={{ marginTop: '6px', fontSize: '13px', color: 'var(--text-muted)' }}>
              Llegaste desde el panel de alertas críticas
              {navigationState.sucursalNombre ? ` para ${navigationState.sucursalNombre}.` : '.'}
            </div>
          </div>

          {navigationState.sucursalId ? (
            <span
              style={{
                padding: '6px 10px',
                borderRadius: '999px',
                border: '1px solid rgba(239,68,68,0.20)',
                background: 'rgba(239,68,68,0.12)',
                color: 'var(--danger)',
                fontSize: '11px',
                fontWeight: 700,
              }}
            >
              Sucursal #{navigationState.sucursalId}
            </span>
          ) : null}
        </div>
      )}

      <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
        {[
          {
            label: 'Productos',
            valor: totalProductos,
            helper: branchLabel && isAlertEntry ? `Alertas visibles en ${branchLabel}` : 'Catálogo monitoreado',
            color: 'var(--accent)',
          },
          {
            label: 'Con stock',
            valor: conStock,
            helper: branchLabel && isAlertEntry ? 'Nivel saludable dentro del foco actual' : 'Disponibles en todas las sucursales',
            color: 'var(--success)',
          },
          {
            label: 'Stock bajo',
            valor: stockBajo,
            helper: branchLabel && isAlertEntry ? 'Requieren atención inmediata' : 'Productos con alerta baja',
            color: 'var(--warning)',
          },
          {
            label: 'Sin stock',
            valor: sinStock,
            helper: branchLabel && isAlertEntry ? 'Productos en cero para la sucursal' : 'Productos críticos en alguna sucursal',
            color: 'var(--danger)',
          },
        ].map((item) => (
          <div
            key={item.label}
            style={{
              background: 'var(--bg-surface)',
              border: `1px solid ${item.color}33`,
              borderLeft: `4px solid ${item.color}`,
              borderRadius: '12px',
              padding: '18px',
              boxShadow: 'var(--shadow-card)',
            }}
          >
            <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: item.color }}>
              {item.label}
            </div>
            <div style={{ marginTop: '10px', fontSize: '28px', fontWeight: 700, color: 'var(--text-primary)' }}>{item.valor}</div>
            <div style={{ marginTop: '4px', fontSize: '12px', color: 'var(--text-muted)' }}>{item.helper}</div>
          </div>
        ))}
      </div>

      <section
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border)',
          borderRadius: '12px',
          boxShadow: 'var(--shadow-card)',
          overflow: 'hidden',
        }}
      >
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', padding: '16px', borderBottom: '1px solid var(--border)' }}>
          <input
            type="text"
            value={busqueda}
            placeholder="Buscar por nombre o SKU"
            onChange={(event) => setBusqueda(event.target.value)}
            style={{
              minHeight: '42px',
              flex: '1 1 240px',
              padding: '10px 12px',
              borderRadius: '8px',
              border: '1px solid var(--border)',
              background: 'var(--bg-elevated)',
              color: 'var(--text-primary)',
              font: 'inherit',
              outline: 'none',
            }}
          />

          <select
            value={categoria}
            onChange={(event) => setCategoria(event.target.value)}
            style={{
              minHeight: '42px',
              flex: '0 1 220px',
              padding: '10px 12px',
              borderRadius: '8px',
              border: '1px solid var(--border)',
              background: 'var(--bg-elevated)',
              color: 'var(--text-primary)',
              font: 'inherit',
              outline: 'none',
            }}
          >
            {categorias.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>

        {isCompact ? (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {loading ? (
              <div style={{ padding: '40px 16px', textAlign: 'center', color: 'var(--text-muted)' }}>
                Cargando inventario...
              </div>
            ) : paginados.length === 0 ? (
              <div style={{ padding: '40px 16px', textAlign: 'center', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                No se encontraron productos con los filtros actuales.
              </div>
            ) : (
              paginados.map((producto, index) => {
                const { primary, secondary } = getDisplayStocks(producto);
                const primaryQty = primary?.cantidad ?? 0;
                const secondaryQty = secondary?.cantidad ?? 0;
                const diferencia = primaryQty - secondaryQty;

                return (
                  <div
                    key={producto.id}
                    style={{
                      padding: '16px',
                      borderBottom: index === paginados.length - 1 ? 'none' : '1px solid var(--border)',
                      background: index % 2 === 0 ? 'transparent' : 'var(--bg-hover)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'flex-start' }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
                          {producto.nombre}
                        </div>
                        <div style={{ marginTop: '4px', fontSize: '11px', color: 'var(--text-muted)' }}>
                          SKU: {producto.codigoBarras ?? `PROD-${producto.id}`}
                        </div>
                      </div>

                      <span
                        style={{
                          display: 'inline-flex',
                          padding: '4px 8px',
                          borderRadius: '999px',
                          background: 'var(--bg-elevated)',
                          border: '1px solid var(--border)',
                          color: 'var(--text-primary)',
                          fontSize: '10px',
                          fontWeight: 700,
                          flexShrink: 0,
                        }}
                      >
                        {producto.categoria}
                      </span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                      {[primary, secondary].map((stock, stockIndex) => (
                        <div
                          key={`mobile-stock-${producto.id}-${stock?.sucursalId ?? `fallback-${stockIndex}`}`}
                          style={{
                            padding: '10px 12px',
                            borderRadius: '10px',
                            background: 'var(--bg-elevated)',
                            border: '1px solid var(--border)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '8px',
                          }}
                        >
                          <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                              {getStockLabel(stock, stockIndex + 1)}
                          </div>
                          <div
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '8px',
                              fontWeight: 700,
                              color: getStockColor(stock?.cantidad ?? 0),
                              fontSize: '14px',
                            }}
                          >
                            <span
                              style={{
                                width: '8px',
                                height: '8px',
                                borderRadius: '50%',
                                background: getStockColor(stock?.cantidad ?? 0),
                              }}
                            />
                            {stock?.cantidad ?? 0}
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                            Mínimo: {stock?.minimo ?? 0}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '10px 12px',
                        borderRadius: '10px',
                        background: 'var(--bg-elevated)',
                        border: '1px solid var(--border)',
                      }}
                    >
                      <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                        Diferencia
                      </span>
                      <span style={{ fontSize: '14px', fontWeight: 800, color: getDiffColor(diferencia) }}>
                        {diferencia > 0 ? `+${diferencia}` : diferencia}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        ) : (
          <div className="table-responsive">
            <table style={{ width: '100%', minWidth: '720px', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--bg-elevated)' }}>
                  {['Producto', 'Categoria', 'Sucursal 1', 'Sucursal 2', 'Diferencia'].map((columna) => (
                    <th
                      key={columna}
                      style={{
                        padding: '12px 16px',
                        textAlign: columna === 'Producto' || columna === 'Categoria' ? 'left' : 'center',
                        borderBottom: '1px solid var(--border)',
                        color: 'var(--text-muted)',
                        fontSize: '11px',
                        fontWeight: 700,
                        letterSpacing: '0.08em',
                        textTransform: 'uppercase',
                      }}
                    >
                      {columna}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} style={{ padding: '40px 16px', textAlign: 'center', color: 'var(--text-muted)' }}>
                      Cargando inventario...
                    </td>
                  </tr>
                ) : paginados.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ padding: '40px 16px', textAlign: 'center', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                      No se encontraron productos con los filtros actuales.
                    </td>
                  </tr>
                ) : (
                  paginados.map((producto, index) => {
                    const { primary, secondary } = getDisplayStocks(producto);
                    const primaryQty = primary?.cantidad ?? 0;
                    const secondaryQty = secondary?.cantidad ?? 0;
                    const diferencia = primaryQty - secondaryQty;

                    return (
                      <tr
                        key={producto.id}
                        style={{
                          background: index % 2 === 0 ? 'transparent' : 'var(--bg-hover)',
                          borderBottom: '1px solid var(--border)',
                        }}
                      >
                        <td style={{ padding: '14px 16px' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <strong style={{ color: 'var(--text-primary)', fontSize: '13px' }}>{producto.nombre}</strong>
                            <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>
                              SKU: {producto.codigoBarras ?? `PROD-${producto.id}`}
                            </span>
                          </div>
                        </td>

                        <td style={{ padding: '14px 16px' }}>
                          <span
                            style={{
                              display: 'inline-flex',
                              padding: '4px 8px',
                              borderRadius: '999px',
                              background: 'var(--bg-elevated)',
                              border: '1px solid var(--border)',
                              color: 'var(--text-primary)',
                              fontSize: '11px',
                              fontWeight: 600,
                            }}
                          >
                            {producto.categoria}
                          </span>
                        </td>

                        {[primary, secondary].map((stock, stockIndex) => (
                          <td
                            key={`table-stock-${producto.id}-${stock?.sucursalId ?? `fallback-${stockIndex}`}`}
                            style={{ padding: '14px 16px', textAlign: 'center' }}
                          >
                            <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                {getStockLabel(stock, stockIndex + 1)}
                              </span>
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '8px',
                                  fontWeight: 700,
                                  color: getStockColor(stock?.cantidad ?? 0),
                                }}
                              >
                                <span
                                  style={{
                                    width: '8px',
                                    height: '8px',
                                    borderRadius: '50%',
                                    background: getStockColor(stock?.cantidad ?? 0),
                                  }}
                                />
                                {stock?.cantidad ?? 0}
                              </span>
                            </div>
                          </td>
                        ))}

                        <td style={{ padding: '14px 16px', textAlign: 'center', fontWeight: 700, color: getDiffColor(diferencia) }}>
                          {diferencia > 0 ? `+${diferencia}` : diferencia}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', padding: '14px 16px' }}>
          <small style={{ color: 'var(--text-muted)' }}>
            Mostrando {paginados.length === 0 ? 0 : (paginaActual - 1) * POR_PAGINA + 1}-{Math.min(paginaActual * POR_PAGINA, filtrados.length)} de {filtrados.length}{' '}
            productos
          </small>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              type="button"
              disabled={paginaActual === 1}
              onClick={() => setPagina((prev) => Math.max(1, prev - 1))}
              style={{
                minWidth: '38px',
                height: '36px',
                padding: '0 12px',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                background: 'var(--bg-elevated)',
                color: 'var(--text-primary)',
                cursor: paginaActual === 1 ? 'not-allowed' : 'pointer',
                opacity: paginaActual === 1 ? 0.45 : 1,
              }}
            >
              Anterior
            </button>

            {Array.from({ length: Math.min(totalPaginas, 5) }, (_, index) => {
              let numero = index + 1;

              if (totalPaginas > 5) {
                if (paginaActual <= 3) numero = index + 1;
                else if (paginaActual >= totalPaginas - 2) numero = totalPaginas - 4 + index;
                else numero = paginaActual - 2 + index;
              }

              const activo = numero === paginaActual;

              return (
                <button
                  key={numero}
                  type="button"
                  onClick={() => setPagina(numero)}
                  style={{
                    minWidth: '38px',
                    height: '36px',
                    padding: '0 12px',
                    borderRadius: '8px',
                    border: activo ? '1px solid var(--accent)' : '1px solid var(--border)',
                    background: activo ? 'var(--accent)' : 'var(--bg-elevated)',
                    color: activo ? '#fff' : 'var(--text-primary)',
                    cursor: 'pointer',
                  }}
                >
                  {numero}
                </button>
              );
            })}

            <button
              type="button"
              disabled={paginaActual === totalPaginas}
              onClick={() => setPagina((prev) => Math.min(totalPaginas, prev + 1))}
              style={{
                minWidth: '38px',
                height: '36px',
                padding: '0 12px',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                background: 'var(--bg-elevated)',
                color: 'var(--text-primary)',
                cursor: paginaActual === totalPaginas ? 'not-allowed' : 'pointer',
                opacity: paginaActual === totalPaginas ? 0.45 : 1,
              }}
            >
              Siguiente
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
