import { useState, useEffect, useCallback } from 'react';
import { api } from '../../services/api.client';
import { Button } from '../../components/ui/Button';
import { Input }  from '../../components/ui/Input';
import { Modal }  from '../../components/ui/Modal';
import { Select, Toast } from '../../components/ui';
import type { ToastData } from '../../components/ui';

interface Sucursal {
  id: number;
  nombre: string;
}

interface ProductoStock {
  id: number;
  nombre: string;
  codigoBarras: string | null;
  tipoUnidad: string;
  stockTotal: number;
  stockMinimo: number;
  precioVenta: number;
  categoria: string;
  sucursales: {
    sucursalId: number;
    sucursalNombre: string;
    cantidad: number;
    minimo: number;
    estado: string;
  }[];
}

const EMPTY_FORM = {
  productoId: '',
  origenId: '',
  destinoId: '',
  cantidad: '',
};

function estadoColor(estado: string) {
  if (estado === 'critico') return 'var(--danger)';
  if (estado === 'bajo')    return 'var(--warning)';
  return 'var(--success)';
}

export default function TransfersPage() {
  const [productos,    setProductos]    = useState<ProductoStock[]>([]);
  const [sucursales,   setSucursales]   = useState<Sucursal[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [modalOpen,    setModalOpen]    = useState(false);
  const [saving,       setSaving]       = useState(false);
  const [form,         setForm]         = useState({ ...EMPTY_FORM });
  const [formErr,      setFormErr]      = useState<Record<string, string>>({});
  const [toast,        setToast]        = useState<ToastData | null>(null);
  const [stockOrigen,  setStockOrigen]  = useState<number | null>(null);

  const showToast = (msg: string, type: ToastData['type']) => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/inventario/stock-comparativo');
      setProductos(data);

      // Extraer sucursales unicas
      const suc = new Map<number, Sucursal>();
      data.forEach((p: ProductoStock) => {
        p.sucursales.forEach(s => {
          if (!suc.has(s.sucursalId)) {
            suc.set(s.sucursalId, { id: s.sucursalId, nombre: s.sucursalNombre });
          }
        });
      });
      setSucursales([...suc.values()]);
    } catch {
      showToast('Error al cargar el stock', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Actualizar stock disponible en origen cuando cambia producto u origen
  useEffect(() => {
    if (!form.productoId || !form.origenId) { setStockOrigen(null); return; }
    const prod = productos.find(p => p.id === Number(form.productoId));
    const suc  = prod?.sucursales.find(s => s.sucursalId === Number(form.origenId));
    setStockOrigen(suc?.cantidad ?? 0);
  }, [form.productoId, form.origenId, productos]);

  function openModal() {
    setForm({ ...EMPTY_FORM });
    setFormErr({});
    setStockOrigen(null);
    setModalOpen(true);
  }

  function handleChange(key: keyof typeof EMPTY_FORM, value: string) {
    setForm(f => ({ ...f, [key]: value }));
    setFormErr(e => ({ ...e, [key]: '' }));
  }

  function validate() {
    const e: Record<string, string> = {};
    if (!form.productoId)  e.productoId = 'Selecciona un producto';
    if (!form.origenId)    e.origenId   = 'Selecciona sucursal origen';
    if (!form.destinoId)   e.destinoId  = 'Selecciona sucursal destino';
    if (!form.cantidad || Number(form.cantidad) <= 0) e.cantidad = 'Cantidad debe ser mayor a 0';
    if (form.origenId && form.destinoId && form.origenId === form.destinoId)
      e.destinoId = 'Origen y destino no pueden ser iguales';
    if (stockOrigen !== null && Number(form.cantidad) > stockOrigen)
      e.cantidad = `Stock insuficiente. Disponible: ${stockOrigen}`;
    setFormErr(e);
    return Object.keys(e).length === 0;
  }

  async function handleSave() {
    if (!validate()) return;
    setSaving(true);
    try {
      await api.post('/inventario/transferencia', {
        productoId: Number(form.productoId),
        origenId:   Number(form.origenId),
        destinoId:  Number(form.destinoId),
        cantidad:   Number(form.cantidad),
      });
      showToast('Transferencia realizada exitosamente', 'success');
      setModalOpen(false);
      load();
    } catch (err: any) {
      showToast(err.response?.data?.error ?? 'Error al realizar la transferencia', 'error');
    } finally {
      setSaving(false);
    }
  }

  const productoOptions = [
    { value: '', label: 'Seleccionar producto...' },
    ...productos.map(p => ({ value: String(p.id), label: p.nombre }))
  ];

  const sucursalOptions = [
    { value: '', label: 'Seleccionar sucursal...' },
    ...sucursales.map(s => ({ value: String(s.id), label: s.nombre }))
  ];

  const productoSeleccionado = productos.find(p => p.id === Number(form.productoId));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', animation: 'fadeUp 0.4s ease' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <h2 style={{ fontSize: '22px', fontWeight: 700, color: 'var(--text-primary)' }}>Transferencia entre Sucursales</h2>
          <p style={{ marginTop: '4px', fontSize: '13px', color: 'var(--text-muted)' }}>
            Mueve productos de una sucursal a otra de forma segura
          </p>
        </div>
        <Button onClick={openModal} icon={<span>⇄</span>}>Nueva Transferencia</Button>
      </div>

      {/* Tabla de stock comparativo */}
      <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '10px', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '600px' }}>
          <thead>
            <tr style={{ background: 'rgba(255,255,255,0.02)' }}>
              {['PRODUCTO', 'CATEGORÍA', 'STOCK TOTAL', ...sucursales.map(s => s.nombre.toUpperCase())].map(h => (
                <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '10px', fontWeight: 600, color: 'var(--text-subtle)', letterSpacing: '0.08em' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={10} style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>Cargando...</td></tr>
            ) : productos.length === 0 ? (
              <tr><td colSpan={10} style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>No hay productos</td></tr>
            ) : productos.map(p => (
              <tr key={p.id} style={{ borderTop: '1px solid var(--border)' }}>
                <td style={{ padding: '12px 16px', fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>{p.nombre}</td>
                <td style={{ padding: '12px 16px', fontSize: '12px', color: 'var(--text-muted)' }}>{p.categoria}</td>
                <td style={{ padding: '12px 16px', fontSize: '13px', fontWeight: 700, fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-primary)' }}>{p.stockTotal}</td>
                {sucursales.map(s => {
                  const sStock = p.sucursales.find(ss => ss.sucursalId === s.id);
                  return (
                    <td key={s.id} style={{ padding: '12px 16px' }}>
                      {sStock ? (
                        <span style={{ fontSize: '13px', fontWeight: 700, fontFamily: 'JetBrains Mono, monospace', color: estadoColor(sStock.estado) }}>
                          {sStock.cantidad}
                        </span>
                      ) : <span style={{ color: 'var(--text-subtle)' }}>—</span>}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-subtle)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            {productos.length} productos
          </span>
        </div>
      </div>

      {/* Modal de transferencia */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Nueva Transferencia" subtitle="Mover stock entre sucursales" maxWidth={500}
        icon={<span>⇄</span>}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* Producto */}
          <Select
            label="Producto"
            options={productoOptions}
            value={form.productoId}
            onChange={v => handleChange('productoId', v)}
            error={formErr.productoId}
          />

          {/* Stock disponible por sucursal */}
          {productoSeleccionado && (
            <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '8px', padding: '12px' }}>
              <p style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '8px' }}>
                Stock disponible
              </p>
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                {productoSeleccionado.sucursales.map(s => (
                  <div key={s.sucursalId} style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{s.sucursalNombre}</span>
                    <span style={{ fontSize: '16px', fontWeight: 700, fontFamily: 'JetBrains Mono, monospace', color: estadoColor(s.estado) }}>
                      {s.cantidad}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Sucursal origen y destino */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <Select
              label="Sucursal origen"
              options={sucursalOptions}
              value={form.origenId}
              onChange={v => handleChange('origenId', v)}
              error={formErr.origenId}
            />
            <Select
              label="Sucursal destino"
              options={sucursalOptions}
              value={form.destinoId}
              onChange={v => handleChange('destinoId', v)}
              error={formErr.destinoId}
            />
          </div>

          {/* Cantidad */}
          <div>
            <Input
              label={`Cantidad${stockOrigen !== null ? ` (máx. ${stockOrigen})` : ''}`}
              type="number"
              placeholder="0"
              value={form.cantidad}
              onChange={v => handleChange('cantidad', v)}
              error={formErr.cantidad}
            />
            {/* Barra de validación en tiempo real */}
            {stockOrigen !== null && Number(form.cantidad) > 0 && (
              <div style={{ marginTop: '6px' }}>
                <div style={{ height: '4px', background: 'var(--border)', borderRadius: '2px', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    width: `${Math.min((Number(form.cantidad) / stockOrigen) * 100, 100)}%`,
                    background: Number(form.cantidad) > stockOrigen ? 'var(--danger)' : 'var(--accent)',
                    borderRadius: '2px',
                    transition: 'width 0.2s ease',
                  }} />
                </div>
                <p style={{ fontSize: '11px', color: Number(form.cantidad) > stockOrigen ? 'var(--danger)' : 'var(--text-muted)', marginTop: '4px' }}>
                  {Number(form.cantidad) > stockOrigen
                    ? `Excede el stock disponible en ${Number(form.cantidad) - stockOrigen} unidades`
                    : `Quedarán ${stockOrigen - Number(form.cantidad)} unidades en origen`
                  }
                </p>
              </div>
            )}
          </div>

          {/* Botones */}
          <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
            <Button variant="ghost" onClick={() => setModalOpen(false)} style={{ flex: 1 }}>Cancelar</Button>
            <Button loading={saving} onClick={handleSave} style={{ flex: 1 }}
              icon={<span>⇄</span>}>
              Confirmar Transferencia
            </Button>
          </div>
        </div>
      </Modal>

      <Toast data={toast} />
    </div>
  );
}