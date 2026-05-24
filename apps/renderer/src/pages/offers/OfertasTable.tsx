import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../../services/api.client';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge, Toast, type ToastData } from '../../components/ui';
import type { Producto } from '../../types';

interface Oferta {
  id: number;
  productoId: number;
  precioOferta: number;
  fechaInicio: string;
  fechaFin: string;
  activo: boolean;
  producto: Pick<Producto, 'id' | 'nombre' | 'precioVenta' | 'precioConIva'>;
}

const EMPTY_FORM = {
  productoId: '',
  productoQuery: '',
  precioOferta: '',
  fechaInicio: '',
  fechaFin: '',
};

type OfertaEstado = 'vigente' | 'programada' | 'vencida' | 'desactivada';

export default function OfertasTable() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [ofertas, setOfertas] = useState<Oferta[]>([]);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [formErr, setFormErr] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<ToastData | null>(null);

  const productosFiltrados = useMemo(() => {
    const query = normalizar(form.productoQuery);
    return productos
      .filter((producto) => !query || normalizar(producto.nombre).includes(query) || String(producto.id).includes(query))
      .slice(0, 8);
  }, [form.productoQuery, productos]);

  const productoSeleccionado = productos.find((producto) => producto.id === Number(form.productoId)) ?? null;

  const resumen = useMemo(() => {
    return ofertas.reduce((acc, oferta) => {
      acc[obtenerEstadoOferta(oferta)] += 1;
      return acc;
    }, { vigente: 0, programada: 0, vencida: 0, desactivada: 0 } as Record<OfertaEstado, number>);
  }, [ofertas]);

  const showToast = useCallback((msg: string, type: ToastData['type']) => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [productosRes, ofertasRes] = await Promise.all([
        api.get('/productos', { params: { limit: '1000' } }),
        api.get('/ofertas', { params: { take: '200' } }),
      ]);
      setProductos(productosRes.data);
      setOfertas(ofertasRes.data.ofertas ?? []);
    } catch {
      showToast('No se pudieron cargar las ofertas', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => { load(); }, [load]);

  function updateForm(key: keyof typeof EMPTY_FORM, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
    setFormErr((current) => ({ ...current, [key]: '' }));
  }

  function selectProducto(producto: Producto) {
    setForm((current) => ({
      ...current,
      productoId: String(producto.id),
      productoQuery: producto.nombre,
    }));
    setFormErr((current) => ({ ...current, productoId: '', productoQuery: '' }));
  }

  function validate() {
    const errors: Record<string, string> = {};
    if (!form.productoId) errors.productoQuery = 'Selecciona un producto';
    if (!form.precioOferta || Number(form.precioOferta) <= 0) errors.precioOferta = 'Precio requerido';
    if (!form.fechaInicio) errors.fechaInicio = 'Fecha requerida';
    if (!form.fechaFin) errors.fechaFin = 'Fecha requerida';
    if (form.fechaInicio && form.fechaFin && new Date(form.fechaFin) <= new Date(form.fechaInicio)) {
      errors.fechaFin = 'Debe ser posterior al inicio';
    }

    const precioOriginal = obtenerPrecioOriginal(productoSeleccionado);
    if (precioOriginal > 0 && Number(form.precioOferta) >= precioOriginal) {
      errors.precioOferta = 'Debe ser menor al precio original';
    }

    setFormErr(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleCreate() {
    if (!validate()) return;
    setSaving(true);
    try {
      await api.post('/ofertas', {
        productoId: Number(form.productoId),
        precioOferta: Number(form.precioOferta),
        fechaInicio: new Date(form.fechaInicio).toISOString(),
        fechaFin: new Date(form.fechaFin).toISOString(),
        activo: true,
      });
      setForm({ ...EMPTY_FORM });
      showToast('Oferta creada', 'success');
      await load();
    } catch (err: any) {
      showToast(err.response?.data?.error ?? 'Error al crear oferta', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleDeactivate(oferta: Oferta) {
    setSaving(true);
    try {
      await api.delete(`/ofertas/${oferta.id}`);
      showToast('Oferta desactivada', 'success');
      await load();
    } catch (err: any) {
      showToast(err.response?.data?.error ?? 'Error al desactivar oferta', 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', animation: 'fadeUp 0.4s ease' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ fontSize: '22px', fontWeight: 700, color: 'var(--text-primary)' }}>Ofertas</h2>
          <p style={{ marginTop: '4px', fontSize: '13px', color: 'var(--text-muted)' }}>
            Promociones para tienda online y productos destacados
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <Badge variant="success">VIGENTES {resumen.vigente}</Badge>
          <Badge variant="warning">VENCIDAS {resumen.vencida}</Badge>
          <Badge variant="neutral">DESACTIVADAS {resumen.desactivada}</Badge>
        </div>
      </header>

      <section style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '10px', padding: '16px' }}>
        <p style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '14px' }}>
          Crear oferta
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(240px, 1.5fr) repeat(3, minmax(150px, 1fr)) auto', gap: '12px', alignItems: 'start' }}>
          <div style={{ position: 'relative' }}>
            <Input
              label="Producto"
              value={form.productoQuery}
              onChange={(value) => {
                updateForm('productoQuery', value);
                updateForm('productoId', '');
              }}
              placeholder="Buscar por nombre o id"
              error={formErr.productoQuery}
            />
            {form.productoQuery && !form.productoId && productosFiltrados.length > 0 && (
              <div style={{
                position: 'absolute',
                zIndex: 20,
                left: 0,
                right: 0,
                top: '64px',
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                overflow: 'hidden',
                boxShadow: 'var(--shadow-card)',
              }}>
                {productosFiltrados.map((producto) => (
                  <button
                    key={producto.id}
                    type="button"
                    onClick={() => selectProducto(producto)}
                    style={{
                      width: '100%',
                      display: 'flex',
                      justifyContent: 'space-between',
                      gap: '10px',
                      padding: '10px 12px',
                      background: 'transparent',
                      border: 'none',
                      borderBottom: '1px solid var(--border)',
                      color: 'var(--text-primary)',
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                      textAlign: 'left',
                    }}
                  >
                    <span style={{ fontSize: '13px', fontWeight: 600 }}>{producto.nombre}</span>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace' }}>
                      ${obtenerPrecioOriginal(producto).toFixed(2)}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <Input label="Precio oferta" type="number" min="0" placeholder="0.00"
            value={form.precioOferta} onChange={(value) => updateForm('precioOferta', value)} error={formErr.precioOferta} />
          <Input label="Fecha inicio" type="datetime-local"
            value={form.fechaInicio} onChange={(value) => updateForm('fechaInicio', value)} error={formErr.fechaInicio} />
          <Input label="Fecha fin" type="datetime-local"
            value={form.fechaFin} onChange={(value) => updateForm('fechaFin', value)} error={formErr.fechaFin} />
          <Button loading={saving} onClick={handleCreate} style={{ marginTop: '22px', height: '38px' }}>Crear</Button>
        </div>

        {productoSeleccionado && (
          <div style={{ marginTop: '10px', fontSize: '12px', color: 'var(--text-muted)' }}>
            Precio original: <strong style={{ color: 'var(--text-primary)' }}>${obtenerPrecioOriginal(productoSeleccionado).toFixed(2)}</strong>
          </div>
        )}
      </section>

      <section style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '10px', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '820px' }}>
          <thead>
            <tr style={{ background: 'rgba(255,255,255,0.02)' }}>
              {['PRODUCTO', 'PRECIO ORIGINAL', 'PRECIO OFERTA', 'INICIO', 'FIN', 'ESTADO', 'ACCION'].map((header) => (
                <th key={header} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '10px', fontWeight: 700, color: 'var(--text-subtle)', letterSpacing: '0.08em' }}>
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>Cargando ofertas...</td></tr>
            ) : ofertas.length === 0 ? (
              <tr><td colSpan={7} style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>No hay ofertas registradas</td></tr>
            ) : ofertas.map((oferta) => {
              const estado = obtenerEstadoOferta(oferta);
              return (
                <tr key={oferta.id} className="tbl-row">
                  <td style={{ padding: '12px 16px', fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>{oferta.producto.nombre}</td>
                  <td style={priceCellStyle}>${obtenerPrecioOriginal(oferta.producto).toFixed(2)}</td>
                  <td style={{ ...priceCellStyle, color: 'var(--success)' }}>${Number(oferta.precioOferta).toFixed(2)}</td>
                  <td style={dateCellStyle}>{formatDate(oferta.fechaInicio)}</td>
                  <td style={dateCellStyle}>{formatDate(oferta.fechaFin)}</td>
                  <td style={{ padding: '12px 16px' }}><EstadoBadge estado={estado} /></td>
                  <td style={{ padding: '12px 16px' }}>
                    <Button
                      variant="danger"
                      size="sm"
                      disabled={!oferta.activo || saving}
                      onClick={() => handleDeactivate(oferta)}
                    >
                      Desactivar
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      <Toast data={toast} />
    </div>
  );
}

function EstadoBadge({ estado }: { estado: OfertaEstado }) {
  const config = {
    vigente: { label: 'VIGENTE', variant: 'success' },
    programada: { label: 'PROGRAMADA', variant: 'info' },
    vencida: { label: 'VENCIDA', variant: 'warning' },
    desactivada: { label: 'DESACTIVADA', variant: 'neutral' },
  } as const;

  return <Badge variant={config[estado].variant}>{config[estado].label}</Badge>;
}

function obtenerEstadoOferta(oferta: Pick<Oferta, 'activo' | 'fechaInicio' | 'fechaFin'>): OfertaEstado {
  if (!oferta.activo) return 'desactivada';
  const ahora = Date.now();
  const inicio = new Date(oferta.fechaInicio).getTime();
  const fin = new Date(oferta.fechaFin).getTime();
  if (inicio > ahora) return 'programada';
  if (fin < ahora) return 'vencida';
  return 'vigente';
}

function obtenerPrecioOriginal(producto?: Pick<Producto, 'precioConIva' | 'precioVenta'> | null) {
  return Number(producto?.precioConIva ?? producto?.precioVenta ?? 0);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('es-SV', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function normalizar(value: string) {
  return value.trim().toLowerCase();
}

const priceCellStyle = {
  padding: '12px 16px',
  fontSize: '13px',
  fontWeight: 700,
  fontFamily: 'JetBrains Mono, monospace',
  color: 'var(--text-primary)',
};

const dateCellStyle = {
  padding: '12px 16px',
  fontSize: '12px',
  color: 'var(--text-muted)',
};
