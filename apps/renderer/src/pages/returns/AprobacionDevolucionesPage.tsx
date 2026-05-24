import { useState, useEffect } from 'react';
import { api } from '../../services/api.client';
import { Toast, type ToastData } from '../../components/ui';

interface DetalleDevolucion {
  id: number;
  productoId: number;
  nombre: string;
  codigoBarras: string | null;
  cantidad: number;
  precioUnit: number;
}

interface Devolucion {
  id: number;
  ventaId: number;
  numeroFactura: string;
  fecha: string;
  sucursal: { id: number; nombre: string } | null;
  clienteNombre: string | null;
  motivo: 'CAMBIO_PRODUCTO' | 'GARANTIA' | 'REEMBOLSO';
  creador: { id: number; nombre: string };
  monto: number;
  detalles: DetalleDevolucion[];
}

const MOTIVO_LABELS: Record<string, string> = {
  CAMBIO_PRODUCTO: 'Cambio de producto',
  GARANTIA: 'Garantía',
  REEMBOLSO: 'Reembolso',
};

const MOTIVO_COLORS: Record<string, string> = {
  CAMBIO_PRODUCTO: '#3B82F6',
  GARANTIA: '#F59E0B',
  REEMBOLSO: '#EF4444',
};

export default function AprobacionDevolucionesPage() {
  const [devoluciones, setDevoluciones] = useState<Devolucion[]>([]);
  const [loading, setLoading] = useState(true);
  const [procesando, setProcesando] = useState<number | null>(null);
  const [toast, setToast] = useState<ToastData | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  useEffect(() => {
    cargarDevoluciones();
  }, []);

  function showToast(msg: string, type: ToastData['type']) {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  async function cargarDevoluciones() {
    setLoading(true);
    try {
      const { data } = await api.get('/devoluciones/pendientes');
      setDevoluciones(data.devoluciones ?? []);
      if (!data.devoluciones?.length) {
        showToast('No hay devoluciones pendientes de aprobación', 'warning');
      }
    } catch (err: any) {
      showToast(err.response?.data?.error ?? 'Error al cargar devoluciones', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function aprobar(devolucionId: number) {
    setProcesando(devolucionId);
    try {
      await api.post(`/devoluciones/${devolucionId}/aprobar`);
      showToast('Devolucion aprobada exitosamente', 'success');
      setDevoluciones((prev) => prev.filter((dev) => dev.id !== devolucionId));
    } catch (err: any) {
      showToast(err.response?.data?.error ?? 'Error al aprobar devolucion', 'error');
    } finally {
      setProcesando(null);
    }
  }

  async function rechazar(devolucionId: number) {
    setProcesando(devolucionId);
    try {
      await api.post(`/devoluciones/${devolucionId}/rechazar`);
      showToast('Devolucion rechazada', 'success');
      setDevoluciones((prev) => prev.filter((dev) => dev.id !== devolucionId));
    } catch (err: any) {
      showToast(err.response?.data?.error ?? 'Error al rechazar devolucion', 'error');
    } finally {
      setProcesando(null);
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', animation: 'fadeUp 0.4s ease' }}>
        <header>
          <h2 style={{ fontSize: '22px', fontWeight: 700, color: 'var(--text-primary)' }}>Aprobación de Devoluciones</h2>
          <p style={{ marginTop: '4px', fontSize: '13px', color: 'var(--text-muted)' }}>
            Cargando devoluciones pendientes...
          </p>
        </header>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', animation: 'fadeUp 0.4s ease' }}>
      <header>
        <h2 style={{ fontSize: '22px', fontWeight: 700, color: 'var(--text-primary)' }}>Aprobación de Devoluciones</h2>
        <p style={{ marginTop: '4px', fontSize: '13px', color: 'var(--text-muted)' }}>
          Revisa y aprueba las devoluciones pendientes. {devoluciones.length > 0 && `Hay ${devoluciones.length} pendiente${devoluciones.length > 1 ? 's' : ''}.`}
        </p>
      </header>

      {devoluciones.length === 0 ? (
        <section style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '10px', padding: '40px', textAlign: 'center' }}>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>No hay devoluciones pendientes de aprobación</p>
        </section>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {devoluciones.map((dev) => (
            <section
              key={dev.id}
              style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border)',
                borderRadius: '10px',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  padding: '16px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  gap: '16px',
                  flexWrap: 'wrap',
                  cursor: 'pointer',
                  backgroundColor: expandedId === dev.id ? 'rgba(255,255,255,0.02)' : 'transparent',
                }}
                onClick={() => setExpandedId(expandedId === dev.id ? null : dev.id)}
              >
                <div style={{ flex: 1, minWidth: '250px' }}>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>
                      {dev.numeroFactura}
                    </h3>
                    <div
                      style={{
                        background: MOTIVO_COLORS[dev.motivo],
                        color: 'white',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: 600,
                      }}
                    >
                      {MOTIVO_LABELS[dev.motivo]}
                    </div>
                  </div>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                    {formatDate(dev.fecha)} · {dev.sucursal?.nombre ?? 'Sucursal'}
                  </p>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    Cliente: <strong style={{ color: 'var(--text-primary)' }}>{dev.clienteNombre ?? 'Sin nombre'}</strong>
                  </p>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    Solicitado por: <strong style={{ color: 'var(--text-primary)' }}>{dev.creador.nombre}</strong>
                  </p>
                </div>

                <div style={{ textAlign: 'right', minWidth: '180px' }}>
                  <p style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '4px' }}>
                    Monto a devolver
                  </p>
                  <p style={{ fontSize: '20px', fontWeight: 700, color: 'var(--accent)', marginBottom: '12px' }}>
                    ${dev.monto.toFixed(2)}
                  </p>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={(e: React.MouseEvent) => {
                        e.stopPropagation();
                        aprobar(dev.id);
                      }}
                      disabled={procesando !== null}
                      style={{
                        flex: 1,
                        background: 'var(--accent)',
                        color: 'white',
                        fontSize: '12px',
                        padding: '8px 12px',
                        border: 'none',
                        borderRadius: '6px',
                        fontFamily: 'inherit',
                        cursor: procesando !== null ? 'not-allowed' : 'pointer',
                        opacity: procesando !== null ? 0.6 : 1,
                        fontWeight: 600,
                      }}
                    >
                      {procesando === dev.id ? 'Procesando...' : 'Aprobar'}
                    </button>
                    <button
                      onClick={(e: React.MouseEvent) => {
                        e.stopPropagation();
                        rechazar(dev.id);
                      }}
                      disabled={procesando !== null}
                      style={{
                        flex: 1,
                        background: 'var(--text-subtle)',
                        color: 'var(--text-primary)',
                        fontSize: '12px',
                        padding: '8px 12px',
                        border: 'none',
                        borderRadius: '6px',
                        fontFamily: 'inherit',
                        cursor: procesando !== null ? 'not-allowed' : 'pointer',
                        opacity: procesando !== null ? 0.6 : 1,
                        fontWeight: 600,
                      }}
                    >
                      Rechazar
                    </button>
                  </div>
                </div>
              </div>

              {expandedId === dev.id && (
                <div style={{ padding: '16px', borderTop: '1px solid var(--border)', backgroundColor: 'rgba(255,255,255,0.01)' }}>
                  <p style={sectionLabelStyle}>Productos a devolver</p>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '600px' }}>
                      <thead>
                        <tr style={{ background: 'rgba(255,255,255,0.02)' }}>
                          {['PRODUCTO', 'CÓDIGO', 'CANTIDAD', 'PRECIO', 'SUBTOTAL'].map((header) => (
                            <th
                              key={header}
                              style={{
                                padding: '10px 12px',
                                textAlign: 'left',
                                fontSize: '10px',
                                fontWeight: 700,
                                color: 'var(--text-subtle)',
                                letterSpacing: '0.08em',
                              }}
                            >
                              {header}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {dev.detalles.map((detalle) => (
                          <tr key={detalle.id} className="tbl-row">
                            <td style={{ padding: '10px 12px', fontSize: '12px', color: 'var(--text-primary)' }}>
                              {detalle.nombre}
                            </td>
                            <td style={{ padding: '10px 12px', fontSize: '11px', color: 'var(--text-subtle)', fontFamily: 'JetBrains Mono, monospace' }}>
                              {detalle.codigoBarras ?? 'N/A'}
                            </td>
                            <td style={{ padding: '10px 12px', fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
                              {detalle.cantidad}
                            </td>
                            <td style={{ padding: '10px 12px', fontSize: '12px', fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-primary)' }}>
                              ${detalle.precioUnit.toFixed(2)}
                            </td>
                            <td style={{ padding: '10px 12px', fontSize: '12px', fontWeight: 700, fontFamily: 'JetBrains Mono, monospace', color: 'var(--accent)' }}>
                              ${(detalle.cantidad * detalle.precioUnit).toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </section>
          ))}
        </div>
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
