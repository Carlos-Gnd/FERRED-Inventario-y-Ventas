import { useMemo, useState } from 'react';
import { api } from '../../services/api.client';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge, Select, Toast, type ToastData } from '../../components/ui';

type MotivoDevolucion = 'CAMBIO_PRODUCTO' | 'GARANTIA' | 'REEMBOLSO';

interface VentaDevolucionItem {
  detalleId: number;
  productoId: number;
  nombre: string;
  codigoBarras: string | null;
  tipoUnidad: string | null;
  cantidadVendida: number;
  cantidadDevuelta: number;
  cantidadDisponible: number;
  precioUnit: number;
  subtotal: number;
}

interface VentaDevolucion {
  id: number;
  numeroFactura: string;
  numeroControl: string | null;
  codigoGeneracion: string | null;
  fecha: string;
  sucursal: { id: number; nombre: string } | null;
  cajero: string;
  clienteNombre: string | null;
  total: number | null;
  items: VentaDevolucionItem[];
}

interface ReturnLineState {
  selected: boolean;
  cantidad: string;
  motivo: MotivoDevolucion;
}

const MOTIVO_OPTIONS: Array<{ value: MotivoDevolucion; label: string }> = [
  { value: 'CAMBIO_PRODUCTO', label: 'Cambio de producto' },
  { value: 'GARANTIA', label: 'Garantia' },
  { value: 'REEMBOLSO', label: 'Reembolso' },
];

export default function DevolucionesPage() {
  const [query, setQuery] = useState('');
  const [fecha, setFecha] = useState('');
  const [ventas, setVentas] = useState<VentaDevolucion[]>([]);
  const [selectedVentaId, setSelectedVentaId] = useState<number | null>(null);
  const [lineState, setLineState] = useState<Record<number, ReturnLineState>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<ToastData | null>(null);

  const selectedVenta = ventas.find((venta) => venta.id === selectedVentaId) ?? null;

  const selectedItems = useMemo(() => {
    if (!selectedVenta) return [];
    return selectedVenta.items
      .filter((item) => lineState[item.productoId]?.selected)
      .map((item) => ({
        productoId: item.productoId,
        cantidad: Number(lineState[item.productoId]?.cantidad ?? 0),
        motivo: lineState[item.productoId]?.motivo ?? 'REEMBOLSO',
        max: item.cantidadDisponible,
        nombre: item.nombre,
      }));
  }, [lineState, selectedVenta]);

  const totalDevolucion = useMemo(() => {
    if (!selectedVenta) return 0;
    return selectedVenta.items.reduce((acc, item) => {
      const state = lineState[item.productoId];
      if (!state?.selected) return acc;
      return acc + Number(state.cantidad || 0) * item.precioUnit;
    }, 0);
  }, [lineState, selectedVenta]);

  function showToast(msg: string, type: ToastData['type']) {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  async function buscarVenta() {
    if (!query.trim() && !fecha) {
      showToast('Ingresa numero de factura, QR o fecha', 'warning');
      return;
    }

    setLoading(true);
    try {
      const { data } = await api.get('/devoluciones/ventas', {
        params: {
          ...(query.trim() ? { query: query.trim() } : {}),
          ...(fecha ? { fecha } : {}),
        },
      });
      const found = data.ventas ?? [];
      setVentas(found);
      selectVenta(found[0] ?? null);
      if (!found.length) showToast('No se encontraron ventas', 'warning');
    } catch (err: any) {
      showToast(err.response?.data?.error ?? 'Error al buscar venta', 'error');
    } finally {
      setLoading(false);
    }
  }

  function selectVenta(venta: VentaDevolucion | null) {
    setSelectedVentaId(venta?.id ?? null);
    const initial: Record<number, ReturnLineState> = {};
    for (const item of venta?.items ?? []) {
      initial[item.productoId] = {
        selected: false,
        cantidad: item.cantidadDisponible > 0 ? '1' : '0',
        motivo: 'REEMBOLSO',
      };
    }
    setLineState(initial);
  }

  function updateLine(productoId: number, changes: Partial<ReturnLineState>) {
    setLineState((current) => ({
      ...current,
      [productoId]: {
        ...current[productoId],
        ...changes,
      },
    }));
  }

  async function registrarDevolucion() {
    if (!selectedVenta) return;
    if (!selectedItems.length) {
      showToast('Selecciona al menos un producto', 'warning');
      return;
    }

    const invalido = selectedItems.find((item) => item.cantidad <= 0 || item.cantidad > item.max);
    if (invalido) {
      showToast(`Cantidad invalida para ${invalido.nombre}`, 'error');
      return;
    }

    setSaving(true);
    try {
      const { data } = await api.post('/devoluciones', {
        ventaId: selectedVenta.id,
        items: selectedItems.map(({ productoId, cantidad, motivo }) => ({ productoId, cantidad, motivo })),
      });

      showToast('Devolucion registrada', 'success');
      const updated = data.venta as VentaDevolucion | null;
      if (updated) {
        setVentas((current) => current.map((venta) => venta.id === updated.id ? updated : venta));
        selectVenta(updated);
      } else {
        await buscarVenta();
      }
    } catch (err: any) {
      showToast(err.response?.data?.error ?? 'Error al registrar devolucion', 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', animation: 'fadeUp 0.4s ease' }}>
      <header>
        <h2 style={{ fontSize: '22px', fontWeight: 700, color: 'var(--text-primary)' }}>Devoluciones</h2>
        <p style={{ marginTop: '4px', fontSize: '13px', color: 'var(--text-muted)' }}>
          Busca una venta por numero de factura, QR o fecha para registrar productos devueltos.
        </p>
      </header>

      <section style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '10px', padding: '16px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(260px, 1fr) 180px auto', gap: '12px', alignItems: 'end' }}>
          <Input
            label="Factura o QR"
            value={query}
            onChange={setQuery}
            placeholder="F-123, numero de control, codigo o QR"
          />
          <Input
            label="Fecha"
            type="date"
            value={fecha}
            onChange={setFecha}
          />
          <Button loading={loading} onClick={buscarVenta} style={{ height: '38px' }}>
            Buscar
          </Button>
        </div>
      </section>

      {ventas.length > 1 && (
        <section style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '10px', padding: '12px' }}>
          <p style={sectionLabelStyle}>Ventas encontradas</p>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {ventas.map((venta) => (
              <button
                key={venta.id}
                onClick={() => selectVenta(venta)}
                style={{
                  padding: '8px 12px',
                  borderRadius: '7px',
                  border: `1px solid ${venta.id === selectedVentaId ? 'var(--accent)' : 'var(--border)'}`,
                  background: venta.id === selectedVentaId ? 'var(--accent-glow)' : 'var(--bg-elevated)',
                  color: venta.id === selectedVentaId ? 'var(--accent)' : 'var(--text-muted)',
                  fontFamily: 'inherit',
                  cursor: 'pointer',
                }}
              >
                {venta.numeroFactura} · {formatDate(venta.fecha)} · ${Number(venta.total ?? 0).toFixed(2)}
              </button>
            ))}
          </div>
        </section>
      )}

      {selectedVenta && (
        <section style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '10px', overflow: 'hidden' }}>
          <div style={{ padding: '16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
            <div>
              <p style={sectionLabelStyle}>Venta seleccionada</p>
              <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>{selectedVenta.numeroFactura}</h3>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                {formatDate(selectedVenta.fecha)} · {selectedVenta.sucursal?.nombre ?? 'Sucursal'} · {selectedVenta.cajero}
              </p>
              {selectedVenta.numeroControl && (
                <p style={{ fontSize: '11px', color: 'var(--text-subtle)', marginTop: '4px', fontFamily: 'JetBrains Mono, monospace' }}>
                  {selectedVenta.numeroControl}
                </p>
              )}
            </div>
            <div style={{ textAlign: 'right' }}>
              <Badge variant="info">TOTAL ${Number(selectedVenta.total ?? 0).toFixed(2)}</Badge>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px' }}>
                A devolver: <strong style={{ color: 'var(--text-primary)' }}>${totalDevolucion.toFixed(2)}</strong>
              </p>
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '860px' }}>
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.02)' }}>
                  {['', 'PRODUCTO', 'VENDIDO', 'DEVUELTO', 'DISPONIBLE', 'CANTIDAD', 'MOTIVO', 'SUBTOTAL'].map((header) => (
                    <th key={header} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '10px', fontWeight: 700, color: 'var(--text-subtle)', letterSpacing: '0.08em' }}>
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {selectedVenta.items.map((item) => {
                  const state = lineState[item.productoId] ?? { selected: false, cantidad: '1', motivo: 'REEMBOLSO' as MotivoDevolucion };
                  const disabled = item.cantidadDisponible <= 0;
                  return (
                    <tr key={item.detalleId} className="tbl-row">
                      <td style={{ padding: '12px 16px' }}>
                        <input
                          type="checkbox"
                          checked={state.selected}
                          disabled={disabled}
                          onChange={(event) => updateLine(item.productoId, { selected: event.target.checked })}
                          style={{ accentColor: 'var(--accent)' }}
                        />
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ fontSize: '13px', fontWeight: 700, color: disabled ? 'var(--text-subtle)' : 'var(--text-primary)' }}>{item.nombre}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-subtle)', marginTop: '2px' }}>{item.codigoBarras ?? 'Sin codigo'}</div>
                      </td>
                      <td style={numberCellStyle}>{item.cantidadVendida}</td>
                      <td style={numberCellStyle}>{item.cantidadDevuelta}</td>
                      <td style={numberCellStyle}>{item.cantidadDisponible}</td>
                      <td style={{ padding: '10px 16px', width: '130px' }}>
                        <Input
                          type="number"
                          min="0"
                          max={item.cantidadDisponible}
                          value={state.cantidad}
                          onChange={(value) => updateLine(item.productoId, { cantidad: value })}
                          disabled={disabled || !state.selected}
                        />
                      </td>
                      <td style={{ padding: '10px 16px', width: '190px' }}>
                        <Select
                          value={state.motivo}
                          options={MOTIVO_OPTIONS}
                          onChange={(value) => updateLine(item.productoId, { motivo: value as MotivoDevolucion })}
                          disabled={disabled || !state.selected}
                        />
                      </td>
                      <td style={numberCellStyle}>${(Number(state.cantidad || 0) * item.precioUnit).toFixed(2)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div style={{ padding: '14px 16px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end' }}>
            <Button loading={saving} onClick={registrarDevolucion} disabled={selectedItems.length === 0}>
              Registrar devolucion
            </Button>
          </div>
        </section>
      )}

      <Toast data={toast} />
    </div>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('es-SV', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

const sectionLabelStyle = {
  fontSize: '10px',
  fontWeight: 700,
  color: 'var(--text-muted)',
  letterSpacing: '0.12em',
  textTransform: 'uppercase' as const,
  marginBottom: '8px',
};

const numberCellStyle = {
  padding: '12px 16px',
  fontSize: '13px',
  fontWeight: 700,
  fontFamily: 'JetBrains Mono, monospace',
  color: 'var(--text-primary)',
};
