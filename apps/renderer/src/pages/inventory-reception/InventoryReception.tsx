// InventoryReception.tsx
// Esta página muestra la interfaz de recepción de mercancía para roles ADMIN y BODEGA.
// Permite buscar productos, seleccionar una bodega destino, ingresar la cantidad recibida
// y confirmar el ajuste de stock mediante el endpoint del servidor.

import { useEffect, useMemo, useState } from 'react';
import { api, isOfflineError } from '../../services/api.client';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select, Toast } from '../../components/ui';
import type { ProductoComparativo, StockPorSucursal } from '../../types';

// Tipo local para almacenar las sucursales únicas extraídas de los productos.
interface SucursalOption {
  id: number;
  nombre: string;
}

export default function InventoryReceptionPage() {
  // Estado local de la página
  const [productos, setProductos] = useState<ProductoComparativo[]>([]); // Lista de productos cargados
  const [busqueda, setBusqueda] = useState(''); // Texto de búsqueda por nombre/código
  const [selectedProductId, setSelectedProductId] = useState(''); // Producto actualmente seleccionado
  const [cantidad, setCantidad] = useState(''); // Cantidad recibida ingresada por el usuario
  const [destinoId, setDestinoId] = useState(''); // ID de la bodega destino seleccionada
  const [loading, setLoading] = useState(true); // Estado de carga inicial
  const [loadError, setLoadError] = useState<string | null>(null); // Error de carga de productos
  const [saving, setSaving] = useState(false); // Estado durante el guardado del ajuste
  const [formError, setFormError] = useState<Record<string, string>>({}); // Errores de validación de formulario
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null); // Mensajes de notificación

  // Carga inicial de productos desde el endpoint de inventario comparativo.
  useEffect(() => {
    let mounted = true;

    async function load() {
      setLoading(true);
      setLoadError(null);

      try {
        const { data } = await api.get<ProductoComparativo[]>('/inventario/stock-comparativo');
        if (!mounted) return;
        setProductos(data);
      } catch (err: any) {
        if (!mounted) return;
        setProductos([]);
        setLoadError(
          isOfflineError(err)
            ? 'Sin conexión. No se pudo cargar la recepción de mercancía.'
            : 'Error al cargar los productos.'
        );
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    return () => { mounted = false; };
  }, []);

  // Construye la lista de sucursales disponibles a partir de los productos cargados.
  // Esto se usa para el selector de bodega destino.
  const sucursales = useMemo(() => {
    const map = new Map<number, SucursalOption>();
    productos.forEach(producto => {
      producto.sucursales.forEach(sucursal => {
        if (!map.has(sucursal.sucursalId)) {
          map.set(sucursal.sucursalId, { id: sucursal.sucursalId, nombre: sucursal.sucursalNombre });
        }
      });
    });
    return Array.from(map.values());
  }, [productos]);

  // Encuentra el producto que el usuario ha seleccionado en la lista.
  const productoSeleccionado = useMemo(
    () => productos.find(producto => producto.id === Number(selectedProductId)) ?? null,
    [productos, selectedProductId]
  );

  // Encuentra el stock actual en la sucursal destino seleccionada, si existe.
  const destinoStock = useMemo<StockPorSucursal | null>(() => {
    if (!productoSeleccionado || !destinoId) return null;
    return productoSeleccionado.sucursales.find(s => s.sucursalId === Number(destinoId)) ?? null;
  }, [productoSeleccionado, destinoId]);

  // Filtra productos según la búsqueda de nombre o código.
  const results = useMemo(() => {
    const termino = busqueda.trim().toLowerCase();
    return productos.filter(producto => {
      if (!termino) return true;
      return (
        producto.nombre.toLowerCase().includes(termino) ||
        (producto.codigoBarras ?? '').toLowerCase().includes(termino)
      );
    });
  }, [productos, busqueda]);

  // Muestra un mensaje temporal en la pantalla.
  function showToast(msg: string, type: 'success' | 'error') {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  // Limpia los campos de cantidad y bodega destino.
  function handleReset() {
    setCantidad('');
    setDestinoId('');
    setFormError({});
  }

  // Valida los campos obligatorios antes de enviar el ajuste.
  function validate() {
    const errors: Record<string, string> = {};
    if (!selectedProductId) errors.producto = 'Selecciona un producto.';
    if (!destinoId) errors.destino = 'Selecciona la bodega destino.';
    if (!cantidad || Number(cantidad) <= 0) errors.cantidad = 'Ingresa una cantidad válida.';
    setFormError(errors);
    return Object.keys(errors).length === 0;
  }

  // Confirma el ingreso de mercancía y actualiza el stock en la sucursal destino.
  async function handleConfirm() {
    if (!validate() || !productoSeleccionado) return;

    const recibida = Number(cantidad);
    const destino = Number(destinoId);
    const actualDestino = destinoStock?.cantidad ?? 0;
    const minimoDestino = destinoStock?.minimo ?? 0;
    const cantidadTotal = actualDestino + recibida;

    setSaving(true);
    try {
      await api.patch(`/inventario/${productoSeleccionado.id}/ajuste`, {
        sucursalId: destino,
        cantidad: cantidadTotal,
        minimo: minimoDestino,
        motivo: 'RECEPCION',
        tipoMovimiento: 'RECEPCION',
        cantidadIngresada: recibida,
      });

      showToast('Ingreso registrado correctamente', 'success');
      handleReset();
      setSelectedProductId(String(productoSeleccionado.id));
      const { data } = await api.get<ProductoComparativo[]>('/inventario/stock-comparativo');
      setProductos(data);
    } catch (err: any) {
      showToast(err.response?.data?.error ?? 'Error al confirmar ingreso', 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '22px', animation: 'fadeUp 0.35s ease' }}>
      {/* Encabezado de la página con título y descripción */}
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-primary)' }}>Recepción de Mercancía</h2>
          <p style={{ marginTop: '6px', fontSize: '13px', color: 'var(--text-muted)' }}>
            Registra la cantidad recibida, elige la bodega destino y confirma el ingreso.
          </p>
        </div>
        <span style={{ padding: '6px 10px', borderRadius: '999px', background: 'var(--bg-surface)', border: '1px solid var(--border)', color: 'var(--accent)', fontSize: '11px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          Admin / Bodega
        </span>
      </div>

      {/* Mensaje de error de carga si falla la petición inicial */}
      {loadError ? (
        <div style={{ padding: '16px', borderRadius: '12px', border: '1px solid rgba(239,68,68,0.18)', background: 'rgba(239,68,68,0.08)', color: 'var(--danger)', fontSize: '13px' }}>
          {loadError}
        </div>
      ) : null}

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 1fr) 340px', gap: '22px' }}>
        {/* Columna izquierda: buscador y lista de productos */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <Input
            label="Buscar producto por nombre o código"
            placeholder="Ej. Taladro o 7501234567890"
            value={busqueda}
            onChange={setBusqueda}
          />

          <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '14px', overflow: 'hidden' }}>
            <div style={{ padding: '16px 18px', borderBottom: '1px solid var(--border)', background: 'rgba(255,255,255,0.02)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap' }}>
                <div>
                  <p style={{ margin: 0, fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>Resultados</p>
                  <p style={{ margin: '6px 0 0', fontSize: '12px', color: 'var(--text-muted)' }}>
                    {loading ? 'Cargando productos...' : `${results.length} producto(s) encontrados`}
                  </p>
                </div>
                <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)' }}>
                  {sucursales.length} bodegas
                </span>
              </div>
            </div>

            <div style={{ minHeight: '180px' }}>
              {loading ? (
                <div style={{ padding: '28px', textAlign: 'center', color: 'var(--text-muted)' }}>Cargando productos...</div>
              ) : results.length === 0 ? (
                <div style={{ padding: '28px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  No se encontró ningún producto.
                </div>
              ) : (
                <div style={{ display: 'grid', gap: '1px' }}>
                  {results.slice(0, 12).map(producto => (
                    <button
                      key={producto.id}
                      type="button"
                      onClick={() => {
                        setSelectedProductId(String(producto.id));
                        setFormError(e => ({ ...e, producto: '' }));
                      }}
                      style={{
                        width: '100%',
                        textAlign: 'left',
                        padding: '14px 16px',
                        background: productoSeleccionado?.id === producto.id ? 'rgba(59,130,246,0.08)' : 'var(--bg-surface)',
                        color: 'var(--text-primary)',
                        border: 'none',
                        outline: 'none',
                        cursor: 'pointer',
                        display: 'grid',
                        gridTemplateColumns: '1fr auto',
                        gap: '8px',
                      }}
                    >
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: 700 }}>{producto.nombre}</div>
                        <div style={{ marginTop: '4px', fontSize: '12px', color: 'var(--text-muted)' }}>
                          {producto.codigoBarras ?? `ID ${producto.id}`} · {producto.categoria}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', minWidth: '80px' }}>
                        <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--accent)' }}>Total</div>
                        <div style={{ marginTop: '4px', fontFamily: 'JetBrains Mono, monospace', fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>
                          {producto.stockTotal}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {formError.producto ? (
            <span style={{ color: 'var(--danger)', fontSize: '12px' }}>{formError.producto}</span>
          ) : null}
        </section>

        {/* Columna derecha: formulario de ingreso y resumen del producto seleccionado */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '14px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)' }}>Detalles de ingreso</h3>
              <p style={{ margin: '8px 0 0', fontSize: '13px', color: 'var(--text-muted)' }}>
                Completa los datos para registrar la recepción de la mercancía.
              </p>
            </div>

            {productoSeleccionado ? (
              <div style={{ display: 'grid', gap: '12px' }}>
                <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '10px', padding: '14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                    <div>
                      <p style={{ margin: 0, fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>{productoSeleccionado.nombre}</p>
                      <p style={{ marginTop: '6px', fontSize: '12px', color: 'var(--text-muted)' }}>{productoSeleccionado.codigoBarras ?? `ID ${productoSeleccionado.id}`}</p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Stock total</span>
                      <span style={{ marginTop: '6px', display: 'block', fontSize: '20px', fontWeight: 700, fontFamily: 'JetBrains Mono, monospace', color: 'var(--accent)' }}>
                        {productoSeleccionado.stockTotal}
                      </span>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <Input
                    label="Cantidad recibida"
                    type="number"
                    placeholder="0"
                    value={cantidad}
                    onChange={setCantidad}
                    error={formError.cantidad}
                    min="1"
                  />
                  <Select
                    label="Bodega destino"
                    value={destinoId}
                    options={[{ value: '', label: 'Seleccionar bodega...' }, ...sucursales.map(s => ({ value: String(s.id), label: s.nombre }))]}
                    onChange={setDestinoId}
                    error={formError.destino}
                  />
                </div>

                <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '10px', padding: '14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Stock previo en destino</span>
                    <span style={{ fontSize: '16px', fontWeight: 700, fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-primary)' }}>
                      {destinoStock ? destinoStock.cantidad : '--'}
                    </span>
                  </div>
                  <p style={{ margin: '10px 0 0', fontSize: '12px', color: 'var(--text-muted)' }}>
                    {destinoStock
                      ? `Mínimo registrado: ${destinoStock.minimo}`
                      : 'Si no existe stock previo, se creará un registro nuevo.'}
                  </p>
                </div>

                <Button
                  loading={saving}
                  onClick={handleConfirm}
                  disabled={!productoSeleccionado || !cantidad || !destinoId}
                  icon={<span>✓</span>}
                >
                  Confirmar ingreso
                </Button>
              </div>
            ) : (
              <div style={{ padding: '24px', borderRadius: '12px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-muted)', fontSize: '13px' }}>
                Selecciona un producto para ver los datos y registrar la recepción.
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Componente de notificación flotante */}
      <Toast data={toast} />
    </div>
  );
}
