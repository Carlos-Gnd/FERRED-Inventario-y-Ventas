import { useState, useEffect, useCallback } from 'react';
import { api } from '../../services/api.client';
import { Button } from '../../components/ui/Button';
import { Input }  from '../../components/ui/Input';
import { Modal }  from '../../components/ui/Modal';
import { Badge, Select, Toast, ConfirmDelete } from '../../components/ui';
import type { Producto, Categoria, TipoUnidad } from '../../types';
import { TIPO_UNIDAD_LABELS } from '../../types';
import type { ToastData } from '../../components/ui';

const UNIDAD_OPTIONS = Object.entries(TIPO_UNIDAD_LABELS).map(([v, l]) => ({ value: v, label: l }));
const EMPTY = { nombre: '', categoriaId: '', codigoBarras: '', tipoUnidad: 'UNIDAD', precioCompra: '', porcentajeGanancia: '30', tieneIva: true, stockActual: '0', stockMinimo: '0' };

function calcVenta(costo: number, ganancia: number, iva: boolean) {
  const venta = costo * (1 + ganancia / 100);
  return { venta: Math.round(venta * 100) / 100, conIva: iva ? Math.round(venta * 1.13 * 100) / 100 : venta };
}

function stockBadge(stock: number, min: number): { label: string; variant: 'success' | 'warning' | 'danger' } {
  if (stock === 0)        return { label: 'SIN STOCK', variant: 'danger' };
  if (stock <= min)       return { label: 'REVISAR',   variant: 'warning' };
  return                         { label: 'OK',         variant: 'success' };
}

export default function ProductsPage() {
  const [productos,   setProductos]   = useState<Producto[]>([]);
  const [categorias,  setCategorias]  = useState<Categoria[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [buscar,      setBuscar]      = useState('');
  const [catFilter,   setCatFilter]   = useState('');
  const [selected,    setSelected]    = useState<number | null>(null);
  const [toast,       setToast]       = useState<ToastData | null>(null);
  const [criticos,    setCriticos]    = useState(0);

  const [modalNew,    setModalNew]    = useState(false);
  const [modalEdit,   setModalEdit]   = useState(false);
  const [modalDelete, setModalDelete] = useState(false);
  const [saving,      setSaving]      = useState(false);
  const [formErr,     setFormErr]     = useState<Record<string, string>>({});
  const [form,        setForm]        = useState({ ...EMPTY });

  const showToast = (msg: string, type: ToastData['type']) => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    api.get('/categorias').then(r => setCategorias(r.data)).catch(() => {});
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (buscar) params.buscar = buscar;
      if (catFilter) params.categoriaId = catFilter;
      const { data } = await api.get('/productos', { params });
      setProductos(data);
      setCriticos(data.filter((p: Producto) => p.stockActual === 0 || p.stockActual <= p.stockMinimo).length);
    } catch { showToast('Error al cargar productos', 'error'); }
    finally { setLoading(false); }
  }, [buscar, catFilter]);

  useEffect(() => { load(); }, [load]);

  const selectedProd = productos.find(p => p.id === selected);

  function openNew() { setForm({ ...EMPTY }); setFormErr({}); setModalNew(true); }
  function openEdit() {
    if (!selectedProd) return;
    setForm({
      nombre: selectedProd.nombre, categoriaId: String(selectedProd.categoriaId ?? ''),
      codigoBarras: selectedProd.codigoBarras ?? '', tipoUnidad: selectedProd.tipoUnidad ?? 'UNIDAD',
      precioCompra: String(selectedProd.precioCompra ?? ''), porcentajeGanancia: String(selectedProd.porcentajeGanancia ?? '30'),
      tieneIva: selectedProd.tieneIva, stockActual: String(selectedProd.stockActual), stockMinimo: String(selectedProd.stockMinimo),
    });
    setFormErr({});
    setModalEdit(true);
  }

  function validate() {
    const e: Record<string, string> = {};
    if (!form.nombre.trim()) e.nombre = 'Nombre requerido';
    setFormErr(e);
    return Object.keys(e).length === 0;
  }

  async function handleSave() {
    if (!validate()) return;
    setSaving(true);
    const payload = {
      nombre: form.nombre, codigoBarras: form.codigoBarras || undefined,
      tipoUnidad: form.tipoUnidad as TipoUnidad,
      categoriaId: form.categoriaId ? Number(form.categoriaId) : undefined,
      precioCompra: form.precioCompra ? Number(form.precioCompra) : undefined,
      porcentajeGanancia: form.porcentajeGanancia ? Number(form.porcentajeGanancia) : undefined,
      tieneIva: form.tieneIva,
      stockActual: Number(form.stockActual), stockMinimo: Number(form.stockMinimo),
    };
    try {
      if (modalNew) {
        await api.post('/productos', payload);
        showToast('Producto creado', 'success');
        setModalNew(false);
      } else {
        await api.put(`/productos/${selected}`, payload);
        showToast('Producto actualizado', 'success');
        setModalEdit(false);
      }
      setSelected(null); load();
    } catch (err: any) { showToast(err.response?.data?.error ?? 'Error al guardar', 'error'); }
    finally { setSaving(false); }
  }

  async function handleDelete() {
    if (!selected) return;
    setSaving(true);
    try {
      await api.delete(`/productos/${selected}`);
      showToast('Producto desactivado', 'success');
      setModalDelete(false); setSelected(null); load();
    } catch { showToast('Error al eliminar', 'error'); }
    finally { setSaving(false); }
  }

  const catOptions = [{ value: '', label: 'Todas las categorías' }, ...categorias.map(c => ({ value: String(c.id), label: c.nombre }))];

  const previewPrices = calcVenta(Number(form.precioCompra) || 0, Number(form.porcentajeGanancia) || 0, form.tieneIva);

  const ProductForm = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
        <div style={{ gridColumn: '1' }}>
          <Input label="Nombre del producto" placeholder="Ej: Martillo de Uña 16oz"
            value={form.nombre} onChange={v => { setForm(f => ({ ...f, nombre: v })); setFormErr(e => ({ ...e, nombre: '' })); }}
            error={formErr.nombre} />
        </div>
        <Select label="U. Medida" options={UNIDAD_OPTIONS} value={form.tipoUnidad} onChange={v => setForm(f => ({ ...f, tipoUnidad: v }))} />
        <Input label="Stock inicial" type="number" placeholder="0" value={form.stockActual} onChange={v => setForm(f => ({ ...f, stockActual: v }))} />
      </div>

      <Select label="Categoría" options={catOptions} value={form.categoriaId} onChange={v => setForm(f => ({ ...f, categoriaId: v }))} />

      <Input label="Descripción técnica" placeholder="Especificaciones, material, dimensiones..." rows={2}
        value={form.codigoBarras} onChange={v => setForm(f => ({ ...f, codigoBarras: v }))} />

      {/* Price structure */}
      <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '8px', padding: '14px' }}>
        <p style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '12px' }}>
          Estructura de precios
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
          <Input label="Costo base ($)" type="number" placeholder="0.00" value={form.precioCompra} onChange={v => setForm(f => ({ ...f, precioCompra: v }))} />
          <Input label="Ganancia %" type="number" placeholder="30" value={form.porcentajeGanancia} onChange={v => setForm(f => ({ ...f, porcentajeGanancia: v }))} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
          <input type="checkbox" id="iva" checked={form.tieneIva} onChange={e => setForm(f => ({ ...f, tieneIva: e.target.checked }))} style={{ accentColor: 'var(--accent)' }} />
          <label htmlFor="iva" style={{ fontSize: '12px', color: 'var(--text-muted)', cursor: 'pointer' }}>Incluir IVA (13%)</label>
        </div>
        <div style={{
          background: 'var(--accent-glow)', border: '1px solid var(--border)',
          borderRadius: '6px', padding: '10px 14px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--accent)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            Precio de venta {form.tieneIva ? '(con IVA)' : ''}
          </span>
          <span style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'JetBrains Mono, monospace' }}>
            ${form.tieneIva ? previewPrices.conIva.toFixed(2) : previewPrices.venta.toFixed(2)}
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
        <Button variant="ghost" onClick={() => { setModalNew(false); setModalEdit(false); }} style={{ flex: 1 }}>Cancelar</Button>
        <Button loading={saving} onClick={handleSave} style={{ flex: 1 }}
          icon={<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/></svg>}>
          Guardar Producto
        </Button>
      </div>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', animation: 'fadeUp 0.4s ease' }}>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h2 style={{ fontSize: '22px', fontWeight: 700, color: 'var(--text-primary)' }}>Gestión de Productos</h2>
          <p style={{ marginTop: '4px', fontSize: '13px', color: 'var(--text-muted)' }}>Administración y control de productos</p>
        </div>
        {criticos > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 14px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '6px' }}>
            <span>⚠</span>
            <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--danger)' }}>{criticos} CRÍTICOS</span>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
        <Button onClick={openNew} icon={<span>+</span>}>Nuevo</Button>
        <Button variant="secondary" onClick={openEdit} disabled={!selected}
          icon={<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>}>
          Modificar
        </Button>
        <Button variant="danger" onClick={() => setModalDelete(true)} disabled={!selected}
          icon={<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>}>
          Eliminar
        </Button>
        <div style={{ flex: 1 }} />
        <div style={{ width: '220px' }}>
          <Input value={buscar} onChange={setBuscar} placeholder="Buscar por SKU, nombre o categoría..."
            icon={<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>} />
        </div>
        <div style={{ width: '180px' }}>
          <Select value={catFilter} options={catOptions} onChange={setCatFilter} />
        </div>
      </div>

      <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '10px', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'rgba(255,255,255,0.02)' }}>
              <th style={{ width: '40px', padding: '12px 16px' }}><input type="checkbox" style={{ accentColor: 'var(--accent)' }} /></th>
              {['PRODUCTO', 'CATEGORÍA', 'PRECIO VENTA', 'STOCK', 'U. MEDIDA', 'ESTADO'].map(h => (
                <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '10px', fontWeight: 600, color: 'var(--text-subtle)', letterSpacing: '0.08em' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>Cargando...</td></tr>
            ) : productos.length === 0 ? (
              <tr><td colSpan={7} style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>No se encontraron productos</td></tr>
            ) : productos.map(p => {
              const sb = stockBadge(p.stockActual, p.stockMinimo);
              const isCrit = p.stockActual === 0;
              return (
                <tr
                  key={p.id}
                  onClick={() => setSelected(s => s === p.id ? null : p.id)}
                  style={{
                    borderTop: '1px solid var(--border)',
                    background: selected === p.id ? 'var(--accent-glow)' : isCrit ? 'rgba(239,68,68,0.04)' : 'transparent',
                    cursor: 'pointer', transition: 'background 0.12s ease',
                    borderLeft: isCrit ? '2px solid var(--danger)' : '2px solid transparent',
                  }}
                  onMouseEnter={e => { if (selected !== p.id) e.currentTarget.style.background = 'var(--bg-hover)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = selected === p.id ? 'var(--accent-glow)' : isCrit ? 'rgba(239,68,68,0.04)' : 'transparent'; }}
                >
                  <td style={{ padding: '12px 16px' }}><input type="checkbox" checked={selected === p.id} onChange={() => {}} style={{ accentColor: 'var(--accent)' }} /></td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: isCrit ? 'var(--danger)' : 'var(--text-primary)' }}>{p.nombre}</div>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    {p.categoria ? (
                      <span style={{ padding: '3px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 600, background: 'rgba(59,130,246,0.1)', color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                        {p.categoria.nombre}
                      </span>
                    ) : <span style={{ color: 'var(--text-subtle)', fontSize: '12px' }}>—</span>}
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: '13px', fontWeight: 700, fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-primary)' }}>
                    ${p.precioVenta?.toFixed(2) ?? '—'}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ fontSize: '14px', fontWeight: 700, fontFamily: 'JetBrains Mono, monospace', color: p.stockActual === 0 ? 'var(--danger)' : p.stockActual <= p.stockMinimo ? 'var(--warning)' : 'var(--text-primary)' }}>
                      {p.stockActual}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: '12px', color: 'var(--text-muted)' }}>
                    {p.tipoUnidad ? TIPO_UNIDAD_LABELS[p.tipoUnidad] : '—'}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <Badge variant={sb.variant}>{sb.label}</Badge>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-subtle)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            Mostrando {productos.length} de {productos.length} SKUs
          </span>
        </div>
      </div>

      <Modal open={modalNew} onClose={() => setModalNew(false)} title="Nuevo Producto" subtitle="Registro de inventario FERRED" maxWidth={600}
        icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/></svg>}>
        <ProductForm />
      </Modal>

      <Modal open={modalEdit} onClose={() => setModalEdit(false)} title="Modificar Producto" subtitle="Edición de datos" maxWidth={600}
        icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>}>
        <ProductForm />
      </Modal>

      <ConfirmDelete
        open={modalDelete} onClose={() => setModalDelete(false)}
        onConfirm={handleDelete} name={selectedProd?.nombre ?? ''}
        warning="Se desactivará el producto. El historial de ventas se conserva."
      />

      <Toast data={toast} />
    </div>
  );
}