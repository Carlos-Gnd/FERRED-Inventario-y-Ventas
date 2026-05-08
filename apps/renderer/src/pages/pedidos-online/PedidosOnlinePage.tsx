import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api, isOfflineError } from '../../services/api.client';
import { useAuthStore } from '../../store/authStore';
import { Modal } from '../../components/ui/Modal';
import './PedidosOnlinePage.css';

// ── Tipos ────────────────────────────────────────────────────

type EstadoPedido = 'RECIBIDO' | 'PREPARANDO' | 'LISTO' | 'ENTREGADO' | 'CANCELADO';
type TipoEntrega = 'RETIRO' | 'ENVIO';

interface DetallePedido {
  id: number;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
  producto: {
    id: number;
    nombre: string;
    codigoBarras: string | null;
    tipoUnidad: string;
  };
}

interface PedidoOnline {
  id: number;
  estado: EstadoPedido;
  tipoEntrega: TipoEntrega;
  clienteNombre: string | null;
  clienteTel: string | null;
  total: number;
  costoEnvio: number;
  sucursalId: number;
  creadoEn: string;
  sucursal: { id: number; nombre: string; direccion: string; telefono: string } | null;
  zonaEnvio: { id: number; nombre: string; costoEnvio: number } | null;
  detalles: DetallePedido[];
}

// ── Constantes ───────────────────────────────────────────────

const ESTADOS: EstadoPedido[] = ['RECIBIDO', 'PREPARANDO', 'LISTO', 'ENTREGADO', 'CANCELADO'];

const TRANSICIONES: Record<EstadoPedido, EstadoPedido[]> = {
  RECIBIDO:   ['PREPARANDO', 'CANCELADO'],
  PREPARANDO: ['LISTO', 'CANCELADO'],
  LISTO:      ['ENTREGADO', 'CANCELADO'],
  ENTREGADO:  [],
  CANCELADO:  [],
};

const ESTADO_CONFIG: Record<EstadoPedido, { label: string; color: string; bg: string }> = {
  RECIBIDO:   { label: 'Recibido',   color: '#6B7280', bg: 'rgba(107,114,128,0.12)' },
  PREPARANDO: { label: 'Preparando', color: '#D97706', bg: 'rgba(217,119,6,0.12)'  },
  LISTO:      { label: 'Listo',      color: '#2563EB', bg: 'rgba(37,99,235,0.12)'  },
  ENTREGADO:  { label: 'Entregado',  color: '#16A34A', bg: 'rgba(22,163,74,0.12)'  },
  CANCELADO:  { label: 'Cancelado',  color: '#DC2626', bg: 'rgba(220,38,38,0.12)'  },
};

const POLL_INTERVAL = 30_000;

// ── Helpers ──────────────────────────────────────────────────

function formatFecha(iso: string) {
  const d = new Date(iso);
  return new Intl.DateTimeFormat('es-SV', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
  }).format(d);
}

function EstadoBadge({ estado }: { estado: EstadoPedido }) {
  const cfg = ESTADO_CONFIG[estado];
  return (
    <span className="po-estado-badge" style={{ color: cfg.color, background: cfg.bg }}>
      {estado === 'ENTREGADO' && <span className="po-entregado-dot" />}
      {cfg.label}
    </span>
  );
}

// ── Componente principal ──────────────────────────────────────

export default function PedidosOnlinePage() {
  const { usuario, token } = useAuthStore();
  const esAdmin = usuario?.rol === 'ADMIN';
  const sucursalFija = !esAdmin ? (usuario?.sucursalId ?? null) : null;

  // ── Filtros ──
  const [filSucursal, setFilSucursal] = useState<string>(sucursalFija ? String(sucursalFija) : '');
  const [filEstado, setFilEstado]     = useState<string>('');
  const [filFechaIni, setFilFechaIni] = useState('');
  const [filFechaFin, setFilFechaFin] = useState('');
  const [applied, setApplied]         = useState({ sucursal: sucursalFija ? String(sucursalFija) : '', estado: '', fechaIni: '', fechaFin: '' });

  // ── Datos ──
  const [pedidos, setPedidos]   = useState<PedidoOnline[]>([]);
  const [total, setTotal]       = useState(0);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const mountedRef               = useRef(true);

  // ── Modal detalle ──
  const [selected, setSelected]       = useState<PedidoOnline | null>(null);
  const [nuevoEstado, setNuevoEstado] = useState<EstadoPedido | ''>('');
  const [cambiando, setCambiando]     = useState(false);
  const [cambioError, setCambioError] = useState<string | null>(null);

  // ── Carga ─────────────────────────────────────────────────
  const cargar = useCallback(async (params: typeof applied, silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const q = new URLSearchParams();
      if (params.sucursal) q.set('sucursalId', params.sucursal);
      if (params.estado)   q.set('estado', params.estado);
      if (params.fechaIni) q.set('fechaInicio', params.fechaIni);
      if (params.fechaFin) q.set('fechaFin', params.fechaFin);

      const { data } = await api.get<{ total: number; pedidos: PedidoOnline[] }>(
        `/pedidos-online?${q.toString()}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (!mountedRef.current) return;
      setPedidos(data.pedidos);
      setTotal(data.total);
    } catch (err) {
      if (!mountedRef.current) return;
      setError(isOfflineError(err) ? 'Sin conexion. No se pudo cargar pedidos.' : 'Error al cargar pedidos online.');
    } finally {
      if (mountedRef.current && !silent) setLoading(false);
    }
  }, [token]);

  // Carga inicial y al aplicar filtros
  useEffect(() => {
    void cargar(applied);
  }, [applied, cargar]);

  // Polling 30s
  useEffect(() => {
    mountedRef.current = true;
    const id = setInterval(() => void cargar(applied, true), POLL_INTERVAL);
    return () => {
      mountedRef.current = false;
      clearInterval(id);
    };
  }, [applied, cargar]);

  // ── Cambio de estado ─────────────────────────────────────
  async function handleCambiarEstado() {
    if (!selected || !nuevoEstado) return;
    setCambiando(true);
    setCambioError(null);
    try {
      const { data } = await api.patch<{ ok: boolean; pedido: PedidoOnline }>(
        `/pedidos-online/${selected.id}/estado`,
        { estado: nuevoEstado },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      setPedidos((prev) => prev.map((p) => (p.id === data.pedido.id ? data.pedido : p)));
      setSelected(data.pedido);
      setNuevoEstado('');
    } catch (err: any) {
      setCambioError(err?.response?.data?.error ?? 'Error al cambiar estado');
    } finally {
      setCambiando(false);
    }
  }

  // ── Abrir modal ──────────────────────────────────────────
  function abrirModal(pedido: PedidoOnline) {
    setSelected(pedido);
    setNuevoEstado('');
    setCambioError(null);
  }

  // ── Transiciones disponibles para el pedido seleccionado ──
  const transicionesDisponibles = useMemo(
    () => (selected ? TRANSICIONES[selected.estado] : []),
    [selected],
  );

  // ── Filtrado local por nombre de cliente (búsqueda rápida) ──
  const [busqueda, setBusqueda] = useState('');
  const pedidosFiltrados = useMemo(() => {
    if (!busqueda.trim()) return pedidos;
    const q = busqueda.toLowerCase();
    return pedidos.filter(
      (p) =>
        p.clienteNombre?.toLowerCase().includes(q) ||
        String(p.id).includes(q),
    );
  }, [pedidos, busqueda]);

  return (
    <div className="po-page">
      {/* Header */}
      <section className="po-header">
        <div>
          <h1 className="po-title">Pedidos Online</h1>
          <p className="po-subtitle">
            {esAdmin ? 'Todas las sucursales' : `Sucursal #${sucursalFija}`} — {total} pedido{total !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="po-poll-indicator" title="Actualizacion automatica cada 30 s">
          <span className="po-poll-dot" />
          <span>Auto-actualiza 30s</span>
        </div>
      </section>

      {error && <div className="po-alert">{error}</div>}

      {/* Filtros */}
      <section className="po-filters">
        {esAdmin && (
          <div className="po-field">
            <label>Sucursal ID</label>
            <input
              type="number"
              min={1}
              placeholder="Todas"
              value={filSucursal}
              onChange={(e) => setFilSucursal(e.target.value)}
              className="po-input"
            />
          </div>
        )}

        <div className="po-field">
          <label>Estado</label>
          <div className="po-select-wrap">
            <select value={filEstado} onChange={(e) => setFilEstado(e.target.value)} className="po-select">
              <option value="">Todos</option>
              {ESTADOS.map((e) => (
                <option key={e} value={e}>{ESTADO_CONFIG[e].label}</option>
              ))}
            </select>
            <span className="po-caret">▾</span>
          </div>
        </div>

        <div className="po-field">
          <label>Desde</label>
          <input type="date" value={filFechaIni} onChange={(e) => setFilFechaIni(e.target.value)} className="po-input" />
        </div>

        <div className="po-field">
          <label>Hasta</label>
          <input type="date" value={filFechaFin} onChange={(e) => setFilFechaFin(e.target.value)} className="po-input" />
        </div>

        <button
          className="po-btn-filter"
          onClick={() => setApplied({ sucursal: filSucursal, estado: filEstado, fechaIni: filFechaIni, fechaFin: filFechaFin })}
        >
          Filtrar
        </button>
      </section>

      {/* Búsqueda rápida */}
      <div className="po-search-wrap">
        <input
          type="text"
          placeholder="Buscar por cliente o # pedido..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="po-input po-search"
        />
      </div>

      {/* Tabla */}
      <section className="po-table-card">
        <div className="po-table-wrap">
          <table className="po-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Fecha</th>
                <th>Cliente</th>
                <th>Tipo</th>
                {esAdmin && <th>Sucursal</th>}
                <th>Total</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={esAdmin ? 8 : 7} className="po-empty">Cargando pedidos...</td></tr>
              ) : pedidosFiltrados.length === 0 ? (
                <tr><td colSpan={esAdmin ? 8 : 7} className="po-empty">No hay pedidos que coincidan con los filtros.</td></tr>
              ) : (
                pedidosFiltrados.map((p) => (
                  <tr key={p.id} className="po-row">
                    <td className="po-cell-id">#{p.id}</td>
                    <td className="po-cell-fecha">{formatFecha(p.creadoEn)}</td>
                    <td className="po-cell-cliente">
                      <div className="po-cliente-nombre">{p.clienteNombre ?? '—'}</div>
                      {p.clienteTel && <div className="po-cliente-tel">{p.clienteTel}</div>}
                    </td>
                    <td>
                      <span className={`po-tipo-badge po-tipo-${p.tipoEntrega.toLowerCase()}`}>
                        {p.tipoEntrega === 'RETIRO' ? 'Retiro' : 'Envio'}
                      </span>
                    </td>
                    {esAdmin && <td className="po-cell-sucursal">{p.sucursal?.nombre ?? `#${p.sucursalId}`}</td>}
                    <td className="po-cell-total">${Number(p.total).toFixed(2)}</td>
                    <td><EstadoBadge estado={p.estado} /></td>
                    <td>
                      <button className="po-btn-detalle" onClick={() => abrirModal(p)}>
                        Ver detalle
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Modal detalle */}
      <Modal
        open={!!selected}
        onClose={() => setSelected(null)}
        title={`Pedido #${selected?.id ?? ''}`}
        subtitle={selected ? `${ESTADO_CONFIG[selected.estado].label} · ${selected.tipoEntrega === 'RETIRO' ? 'Retiro' : 'Envio'}` : ''}
        maxWidth={560}
      >
        {selected && (
          <div className="po-modal-body">
            {/* Info cliente */}
            <div className="po-modal-section">
              <h4 className="po-modal-label">Cliente</h4>
              <p className="po-modal-value">{selected.clienteNombre ?? '—'}</p>
              {selected.clienteTel && <p className="po-modal-sub">{selected.clienteTel}</p>}
            </div>

            {/* Info entrega */}
            <div className="po-modal-section">
              <h4 className="po-modal-label">{selected.tipoEntrega === 'RETIRO' ? 'Sucursal de retiro' : 'Zona de envio'}</h4>
              {selected.tipoEntrega === 'RETIRO' ? (
                <p className="po-modal-value">{selected.sucursal?.nombre ?? `Sucursal #${selected.sucursalId}`}</p>
              ) : (
                <>
                  <p className="po-modal-value">{selected.zonaEnvio?.nombre ?? '—'}</p>
                  {selected.costoEnvio > 0 && (
                    <p className="po-modal-sub">Costo envio: ${Number(selected.costoEnvio).toFixed(2)}</p>
                  )}
                </>
              )}
            </div>

            {/* Items */}
            <div className="po-modal-section">
              <h4 className="po-modal-label">Items del pedido</h4>
              <div className="po-items-list">
                {selected.detalles.map((d) => (
                  <div key={d.id} className="po-item-row">
                    <span className="po-item-nombre">{d.producto.nombre}</span>
                    <span className="po-item-cant">×{d.cantidad}</span>
                    <span className="po-item-subtotal">${Number(d.subtotal).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Totales */}
            <div className="po-modal-totales">
              {selected.tipoEntrega === 'ENVIO' && (
                <div className="po-total-row">
                  <span>Costo envio</span>
                  <span>${Number(selected.costoEnvio).toFixed(2)}</span>
                </div>
              )}
              <div className="po-total-row po-total-final">
                <span>Total</span>
                <span>${Number(selected.total).toFixed(2)}</span>
              </div>
            </div>

            {/* Indicador de entrega */}
            <div className="po-entrega-indicator">
              <span
                className="po-entrega-dot"
                style={{ background: ESTADO_CONFIG[selected.estado].color }}
              />
              <span style={{ color: ESTADO_CONFIG[selected.estado].color, fontWeight: 600 }}>
                {ESTADO_CONFIG[selected.estado].label}
              </span>
              {selected.estado === 'ENTREGADO' && (
                <span className="po-entregado-check">✓ Entregado</span>
              )}
              {selected.estado === 'LISTO' && selected.tipoEntrega === 'RETIRO' && (
                <span className="po-listo-notice">Listo para retiro</span>
              )}
              {selected.estado === 'LISTO' && selected.tipoEntrega === 'ENVIO' && (
                <span className="po-listo-notice">Listo para despacho</span>
              )}
            </div>

            {/* Cambio de estado */}
            {transicionesDisponibles.length > 0 && (
              <div className="po-cambio-estado">
                <h4 className="po-modal-label">Cambiar estado</h4>
                <div className="po-cambio-row">
                  <div className="po-select-wrap" style={{ flex: 1 }}>
                    <select
                      value={nuevoEstado}
                      onChange={(e) => setNuevoEstado(e.target.value as EstadoPedido)}
                      className="po-select"
                    >
                      <option value="">Seleccionar...</option>
                      {transicionesDisponibles.map((e) => (
                        <option key={e} value={e}>{ESTADO_CONFIG[e].label}</option>
                      ))}
                    </select>
                    <span className="po-caret">▾</span>
                  </div>
                  <button
                    className="po-btn-cambiar"
                    onClick={handleCambiarEstado}
                    disabled={!nuevoEstado || cambiando}
                  >
                    {cambiando ? 'Guardando...' : 'Confirmar'}
                  </button>
                </div>
                {cambioError && <p className="po-cambio-error">{cambioError}</p>}
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
