/**
 * VentasPage.tsx
 * HU-02A: Modulo POS — conectado al API real
 *   T-02A.2: Escaneo de codigo de barras via GET /api/productos/barcode/:codigo
 *   T-02A.3: Busqueda manual con debounce 300ms via GET /api/productos?buscar=...
 *   T-02A.4: Carrito con calculo de subtotal, IVA 13% y total; venta via POST /api/ventas
 *   T-02A.5: Validacion de stock real de la sucursal activa
 * HU-02B: Registro de venta y comprobante
 * HU-08B / T-08B.2: Impresion de ticket con QR via Electron
 * T-09B.2: CantidadInput adaptativo segun tipo de unidad
 */
import { useState, useRef, useEffect, useCallback } from 'react';
import { Button }  from '../../components/ui/Button';
import { Input }   from '../../components/ui/Input';
import { Modal }   from '../../components/ui/Modal';
import { Toast }   from '../../components/ui';
import type { ToastData } from '../../components/ui';
import type { TipoUnidad } from '../../types';
import { TIPO_UNIDAD_LABELS } from '../../types';
import { CantidadInput } from './components/CantidadInput';
import { TicketModal } from '../ticket-preview/ticket-modal';
import { api } from '../../services/api.client';
import { useAuthStore } from '../../store/authStore';
import { useElectron } from '../../hooks/useElectron';

// ── Tipos ───────────────────────────────────────────────────
interface ProductoPOS {
  id:            number;
  nombre:        string;
  codigoBarras:  string | null;
  precioVenta:   number;
  precioConIva:  number;
  tieneIva:      boolean;
  tipoUnidad:    TipoUnidad;
  stockActual:   number;
  categoria:     string;
}

interface LineaCarrito {
  producto:  ProductoPOS;
  cantidad:  number;
  subtotal:  number;
}

// ── Helpers ───────────────────────────────────────────────────
const fmt = (n: number) => `$${n.toFixed(2)}`;

function calcLinea(prod: ProductoPOS, cantidad: number): number {
  return parseFloat((prod.precioConIva * cantidad).toFixed(2));
}

/** Normaliza la respuesta del API de productos al formato que usa el POS */
function normalizarProducto(raw: any, sucursalId: number | null): ProductoPOS {
  // El stock de la sucursal activa viene en raw.stocks[0] cuando se filtra por sucursalId
  const stockSucursal = raw.stocks?.[0];
  const stockActual   = stockSucursal?.cantidad ?? raw.stockActual ?? 0;

  return {
    id:           raw.id,
    nombre:       raw.nombre,
    codigoBarras: raw.codigoBarras ?? null,
    precioVenta:  raw.precioVenta ?? 0,
    precioConIva: raw.precioConIva ?? raw.precioVenta ?? 0,
    tieneIva:     raw.tieneIva ?? true,
    tipoUnidad:   (raw.tipoUnidad as TipoUnidad) ?? 'UNIDAD',
    stockActual,
    categoria:    raw.categoria?.nombre ?? 'Sin categoría',
  };
}

// ── Iconos SVG ────────────────────────────────────────────────
const IcoBarcodeScanner = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/>
    <path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/>
    <line x1="7" y1="7" x2="7" y2="17"/><line x1="10" y1="7" x2="10" y2="17"/>
    <line x1="13" y1="7" x2="13" y2="17"/><line x1="16" y1="7" x2="16" y2="17"/>
    <line x1="19" y1="7" x2="19" y2="17"/>
  </svg>
);
const IcoSearch = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
  </svg>
);
const IcoTrash = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
    <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
    <path d="M10 11v6"/><path d="M14 11v6"/>
  </svg>
);
const IcoCart = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
    <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
  </svg>
);
const IcoClear = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);
const IcoCheck = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);
const IcoPrint = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
    <polyline points="6 9 6 2 18 2 18 9"/>
    <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
    <rect x="6" y="14" width="12" height="8"/>
  </svg>
);

// ── Componente principal ─────────────────────────────────────
export default function VentasPage() {
  const usuario    = useAuthStore(s => s.usuario);
  const sucursalId = usuario?.sucursalId ?? null;
  const { printTicket } = useElectron();

  // Escaneo y búsqueda
  const [barcode,      setBarcode]      = useState('');
  const [busqueda,     setBusqueda]     = useState('');
  const [resultados,   setResultados]   = useState<ProductoPOS[]>([]);
  const [buscando,     setBuscando]     = useState(false);
  const [prodSelec,    setProdSelec]    = useState<ProductoPOS | null>(null);
  const barcodeRef = useRef<HTMLInputElement>(null);
  const busqTimer  = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Carrito
  const [carrito, setCarrito] = useState<LineaCarrito[]>([]);

  // UI state
  const [modalTicket,  setModalTicket]  = useState(false);
  const [modalConfirm, setModalConfirm] = useState(false);
  const [confirming,   setConfirming]   = useState(false);
  const [nroFactura,   setNroFactura]   = useState<string | null>(null);
  const [facturaId,    setFacturaId]    = useState<number | null>(null);
  const [toast,        setToast]        = useState<ToastData | null>(null);

  const showToast = (msg: string, type: ToastData['type']) => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Focus automatico en barcode al montar
  useEffect(() => { barcodeRef.current?.focus(); }, []);

  // T-02A.3: Busqueda manual con debounce 300ms via API
  useEffect(() => {
    if (busqTimer.current) clearTimeout(busqTimer.current);
    if (!busqueda.trim()) { setResultados([]); setBuscando(false); return; }

    setBuscando(true);
    busqTimer.current = setTimeout(async () => {
      try {
        const params: Record<string, string> = { buscar: busqueda.trim() };
        if (sucursalId) params.sucursalId = String(sucursalId);

        const { data } = await api.get('/productos', { params });
        const productos: ProductoPOS[] = (data as any[])
          .slice(0, 10)
          .map(p => normalizarProducto(p, sucursalId));
        setResultados(productos);
      } catch {
        setResultados([]);
        showToast('Error al buscar productos', 'error');
      } finally {
        setBuscando(false);
      }
    }, 300);
  }, [busqueda, sucursalId]);

  // T-02A.5: Agregar producto al carrito con validacion de stock real
  const agregarAlCarrito = useCallback((prod: ProductoPOS) => {
    if (prod.stockActual === 0) {
      showToast(`Sin stock: ${prod.nombre}`, 'error');
      return;
    }
    setCarrito(prev => {
      const idx = prev.findIndex(l => l.producto.id === prod.id);
      if (idx >= 0) {
        const linea = prev[idx];
        const nuevaCant = linea.cantidad + 1;
        if (nuevaCant > prod.stockActual) {
          showToast(`Stock insuficiente (disponible: ${prod.stockActual})`, 'warning');
          return prev;
        }
        const copia = [...prev];
        copia[idx] = { ...linea, cantidad: nuevaCant, subtotal: calcLinea(prod, nuevaCant) };
        return copia;
      }
      return [...prev, { producto: prod, cantidad: 1, subtotal: calcLinea(prod, 1) }];
    });
    setProdSelec(prod);
    setBusqueda('');
    setResultados([]);
    setBarcode('');
    setTimeout(() => barcodeRef.current?.focus(), 50);
  }, []);

  // T-02A.2: Escaneo de codigo de barras via API
  async function handleBarcode(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== 'Enter' || !barcode.trim()) return;

    const codigo = barcode.trim();
    try {
      const { data } = await api.get(`/productos/barcode/${encodeURIComponent(codigo)}`);
      // Si tiene sucursalId, obtener el stock de esa sucursal
      let stockSucursal = data.stockActual ?? 0;
      if (sucursalId) {
        try {
          const { data: stockData } = await api.get(`/productos/${data.id}/stock/${sucursalId}`);
          stockSucursal = stockData.cantidad ?? 0;
        } catch {
          // Si falla, usar stockActual global
        }
      }

      const prod = normalizarProducto({ ...data, stocks: [{ cantidad: stockSucursal }] }, sucursalId);
      agregarAlCarrito(prod);
    } catch (err: any) {
      if (err.response?.status === 404) {
        // Codigo no encontrado: activar busqueda por nombre
        setBusqueda(codigo);
        setBarcode('');
        showToast('Codigo no encontrado — buscando por nombre', 'warning');
      } else {
        showToast('Error al buscar producto', 'error');
        setBarcode('');
      }
    }
  }

  // Cambiar cantidad en carrito
  function setCantidadLinea(idx: number, nuevaCantidad: number) {
    setCarrito(prev => {
      const linea = prev[idx];
      if (nuevaCantidad <= 0) return prev.filter((_, i) => i !== idx);
      const copia = [...prev];
      copia[idx] = { ...linea, cantidad: nuevaCantidad, subtotal: calcLinea(linea.producto, nuevaCantidad) };
      return copia;
    });
  }

  function eliminarLinea(idx: number) {
    setCarrito(prev => prev.filter((_, i) => i !== idx));
  }

  function vaciarCarrito() {
    setCarrito([]);
    setProdSelec(null);
    setNroFactura(null);
    setFacturaId(null);
    setTimeout(() => barcodeRef.current?.focus(), 50);
  }

  // T-02A.4: Totales calculados en tiempo real
  const subtotalSinIva = carrito.reduce((acc, l) => acc + (l.producto.precioVenta * l.cantidad), 0);
  const ivaTotal       = carrito.reduce((acc, l) => acc + ((l.producto.precioConIva - l.producto.precioVenta) * l.cantidad), 0);
  const totalFinal     = carrito.reduce((acc, l) => acc + l.subtotal, 0);

  // T-02A.4: Confirmar venta via POST /api/ventas
  async function confirmarVenta() {
    if (!sucursalId) {
      showToast('Tu usuario no tiene sucursal asignada', 'error');
      return;
    }

    setConfirming(true);
    try {
      const { data } = await api.post('/ventas', {
        sucursalId,
        items: carrito.map(l => ({
          productoId: l.producto.id,
          cantidad:   l.cantidad,
          precioUnit: l.producto.precioVenta,
        })),
        clienteNombre: 'Consumidor Final',
        tipoPago:      'efectivo',
      });

      const factura = data.factura;
      setNroFactura(`F-${factura.id}`);
      setFacturaId(factura.id);
      setConfirming(false);
      setModalConfirm(false);
      setModalTicket(true);
    } catch (err: any) {
      setConfirming(false);
      const detalle = err.response?.data?.detalle;
      const mensaje = err.response?.data?.error ?? 'Error al registrar la venta';

      if (Array.isArray(detalle)) {
        showToast(detalle[0], 'error');
      } else {
        showToast(mensaje, 'error');
      }
    }
  }

  // T-08B.2: Imprimir ticket con QR via Electron
  async function handlePrintTicket() {
    if (!facturaId) {
      showToast('No hay factura para imprimir', 'error');
      return;
    }

    try {
      // Obtener datos completos del ticket desde el API
      const { data: ticket } = await api.get(`/ventas/${facturaId}/ticket`);

      const result = await printTicket({
        sucursal:    ticket.sucursal?.nombre,
        cajero:      ticket.cajero,
        fecha:       ticket.fecha,
        tipoDte:     ticket.tipoDte,
        total:       ticket.resumen.total,
        items:       ticket.items.map((item: any) => ({
          nombre:   item.nombre,
          cantidad: item.cantidad,
          precio:   item.precioUnit,
        })),
      });

      if (result.ok) {
        showToast(result.simulated ? 'Ticket simulado (no hay impresora)' : 'Ticket enviado a impresora', 'success');
      } else {
        showToast(result.error ?? 'Error al imprimir', 'error');
      }
    } catch {
      showToast('Error al obtener datos del ticket', 'error');
    }
  }

  const hayCarrito = carrito.length > 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '0', animation: 'fadeUp 0.35s ease' }}>

      {/* ── Layout de dos paneles ─────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '16px', flex: 1, minHeight: 0 }}>

        {/* PANEL IZQUIERDO — Ingreso de productos */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', minHeight: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '34px', height: '34px', borderRadius: '8px',
              background: 'var(--accent-glow)', border: '1px solid var(--border)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--accent)',
            }}>
              <IcoBarcodeScanner />
            </div>
            <div>
              <h2 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>
                Ingreso de productos
              </h2>
              <p style={{ fontSize: '11px', color: 'var(--text-subtle)', marginTop: '1px' }}>
                Escaneo de barra o busqueda manual
              </p>
            </div>
          </div>

          {/* Escaneo de barras */}
          <div style={{
            background: 'var(--bg-surface)', border: '1px solid var(--border)',
            borderRadius: '10px', padding: '14px',
          }}>
            <p style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-subtle)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '8px' }}>
              Escaneo de barra
            </p>
            <div style={{ position: 'relative' }}>
              <span style={{
                position: 'absolute', left: '11px', top: '50%', transform: 'translateY(-50%)',
                color: 'var(--accent)', display: 'flex', alignItems: 'center', pointerEvents: 'none',
              }}>
                <IcoBarcodeScanner />
              </span>
              <input
                ref={barcodeRef}
                value={barcode}
                onChange={e => setBarcode(e.target.value)}
                onKeyDown={handleBarcode}
                placeholder="Esperando escaneo..."
                style={{
                  width: '100%', padding: '10px 12px 10px 38px',
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-focus)',
                  borderRadius: '7px', color: 'var(--text-primary)',
                  fontSize: '13px', fontFamily: 'JetBrains Mono, monospace',
                  outline: 'none', boxShadow: '0 0 0 3px var(--accent-glow)',
                }}
              />
            </div>
          </div>

          {/* Busqueda manual */}
          <div style={{
            background: 'var(--bg-surface)', border: '1px solid var(--border)',
            borderRadius: '10px', padding: '14px', flex: 1,
          }}>
            <p style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-subtle)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '8px' }}>
              Busqueda manual
            </p>
            <Input
              value={busqueda}
              onChange={setBusqueda}
              placeholder="Nombre, codigo o categoria..."
              icon={<IcoSearch />}
            />

            {/* Indicador de carga */}
            {buscando && (
              <p style={{ marginTop: '10px', fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center' }}>
                Buscando...
              </p>
            )}

            {/* Resultados */}
            {resultados.length > 0 && (
              <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {resultados.map(prod => (
                  <button
                    key={prod.id}
                    onClick={() => agregarAlCarrito(prod)}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '10px 12px', borderRadius: '8px',
                      background: prodSelec?.id === prod.id ? 'var(--accent-glow)' : 'var(--bg-elevated)',
                      border: `1px solid ${prodSelec?.id === prod.id ? 'rgba(59,130,246,0.3)' : 'var(--border)'}`,
                      cursor: prod.stockActual === 0 ? 'not-allowed' : 'pointer',
                      opacity: prod.stockActual === 0 ? 0.6 : 1,
                      textAlign: 'left', fontFamily: 'inherit', width: '100%',
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>{prod.nombre}</span>
                        <span style={{
                          fontSize: '9px', fontWeight: 700, padding: '2px 6px', borderRadius: '4px',
                          background: 'rgba(59,130,246,0.1)', color: 'var(--accent)',
                          textTransform: 'uppercase', letterSpacing: '0.06em',
                        }}>
                          {TIPO_UNIDAD_LABELS[prod.tipoUnidad]}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '3px' }}>
                        <span style={{
                          fontSize: '11px',
                          color: prod.stockActual === 0 ? 'var(--danger)' : prod.stockActual <= 5 ? 'var(--warning)' : 'var(--text-subtle)',
                          fontWeight: prod.stockActual <= 5 ? 600 : 400,
                        }}>
                          Stock: {prod.stockActual}
                        </span>
                      </div>
                    </div>
                    <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--accent)', fontFamily: 'JetBrains Mono, monospace' }}>
                      {fmt(prod.precioConIva)}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* PANEL DERECHO — Carrito */}
        <div style={{
          display: 'flex', flexDirection: 'column',
          background: 'var(--bg-surface)', border: '1px solid var(--border)',
          borderRadius: '10px', overflow: 'hidden',
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '14px 16px', borderBottom: '1px solid var(--border)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ color: 'var(--accent)' }}><IcoCart /></span>
              <div>
                <p style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>Carrito de ventas</p>
                <p style={{ fontSize: '11px', color: 'var(--accent)' }}>Cliente: Consumidor Final</p>
              </div>
            </div>
            {hayCarrito && (
              <button onClick={vaciarCarrito} style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '6px', padding: '5px 8px', color: 'var(--danger)', cursor: 'pointer' }}>
                <IcoClear />
              </button>
            )}
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
            {!hayCarrito ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '180px', color: 'var(--text-subtle)', gap: '8px' }}>
                <span style={{ fontSize: '32px', opacity: 0.25 }}>🛒</span>
                <span>El carrito esta vacio</span>
              </div>
            ) : (
              carrito.map((linea, idx) => (
                <div
                  key={linea.producto.id}
                  style={{
                    padding: '10px 8px', borderRadius: '8px', marginBottom: '4px',
                    border: linea.cantidad > linea.producto.stockActual
                      ? '1px solid rgba(239,68,68,0.3)'
                      : '1px solid transparent',
                    background: linea.cantidad > linea.producto.stockActual
                      ? 'rgba(239,68,68,0.04)'
                      : 'transparent',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: '13px', fontWeight: 600 }}>{linea.producto.nombre}</p>
                      <p style={{ fontSize: '11px', color: 'var(--text-subtle)' }}>{fmt(linea.producto.precioConIva)} x {linea.cantidad}</p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '14px', fontWeight: 700, fontFamily: 'JetBrains Mono' }}>{fmt(linea.subtotal)}</span>
                      <button onClick={() => eliminarLinea(idx)} style={{ background: 'none', border: 'none', color: 'var(--text-subtle)', cursor: 'pointer' }}>
                        <IcoTrash />
                      </button>
                    </div>
                  </div>
                  <CantidadInput
                    tipoUnidad={linea.producto.tipoUnidad}
                    valor={linea.cantidad}
                    onChange={v => setCantidadLinea(idx, v)}
                    min={1}
                    max={linea.producto.stockActual}
                  />
                  {/* T-02A.5: Advertencia visual si cantidad excede stock */}
                  {linea.cantidad > linea.producto.stockActual && (
                    <p style={{ fontSize: '11px', color: 'var(--danger)', fontWeight: 600, marginTop: '4px' }}>
                      Stock insuficiente — disponible: {linea.producto.stockActual}
                    </p>
                  )}
                </div>
              ))
            )}
          </div>

          <div style={{ padding: '14px 16px', borderTop: '1px solid var(--border)' }}>
            {hayCarrito && (
              <div style={{ marginBottom: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-muted)' }}>
                  <span>Subtotal sin IVA</span>
                  <span>{fmt(subtotalSinIva)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-muted)' }}>
                  <span>IVA (13%)</span>
                  <span>{fmt(ivaTotal)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border)', paddingTop: '8px' }}>
                  <span style={{ fontWeight: 700 }}>TOTAL</span>
                  <span style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)' }}>{fmt(totalFinal)}</span>
                </div>
              </div>
            )}
            <Button
              onClick={() => setModalConfirm(true)}
              disabled={!hayCarrito || carrito.some(l => l.cantidad > l.producto.stockActual)}
              style={{ width: '100%', justifyContent: 'center', height: '44px' }}
              icon={<IcoCheck />}
            >
              Confirmar venta
            </Button>
          </div>
        </div>
      </div>

      {/* ── Modal: vista previa del ticket ── */}
      <TicketModal
        open={modalConfirm}
        confirming={confirming}
        carrito={carrito}
        subtotalSinIva={subtotalSinIva}
        ivaTotal={ivaTotal}
        totalFinal={totalFinal}
        onClose={() => setModalConfirm(false)}
        onConfirm={confirmarVenta}
        fmt={fmt}
      />

      {/* ── Modal: venta exitosa ─────────────────── */}
      <Modal
        open={modalTicket}
        onClose={() => { setModalTicket(false); vaciarCarrito(); }}
        title="Venta registrada!"
        subtitle={`Factura ${nroFactura ?? ''}`}
        maxWidth={400}
        icon={<IcoCheck />}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(16,185,129,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px' }}>✓</div>
          <p style={{ fontWeight: 600 }}>Venta completada por {fmt(totalFinal)}</p>
          <div style={{ display: 'flex', gap: '10px', width: '100%' }}>
            <Button variant="ghost" onClick={() => { setModalTicket(false); vaciarCarrito(); }} style={{ flex: 1 }}>Nueva venta</Button>
            <Button variant="secondary" onClick={handlePrintTicket} icon={<IcoPrint />} style={{ flex: 1 }}>Imprimir ticket</Button>
          </div>
        </div>
      </Modal>

      <Toast data={toast} />
    </div>
  );
}
