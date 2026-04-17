/**
 * VentasPage.tsx
 * HU-02A / HU-02B: Modulo POS — diseño completo con datos mock
 * HU-08B: Ticket imprimible con QR
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

// ── Tipos locales ────────────────────────────────────────────
interface ProductoMock {
  id:            number;
  nombre:        string;
  codigoBarras: string;
  precioVenta:  number;
  precioConIva: number;
  tieneIva:      boolean;
  tipoUnidad:    TipoUnidad;
  stockActual:  number;
  categoria:    string;
}

interface LineaCarrito {
  producto:  ProductoMock;
  cantidad:  number;
  subtotal:  number;
}

// ── Datos mock ───────────────────────────────────────────────
const PRODUCTOS_MOCK: ProductoMock[] = [
  { id: 1, nombre: 'Taladro Percutor 20V',     codigoBarras: '7501001001',  precioVenta: 114.16, precioConIva: 129.00, tieneIva: true,  tipoUnidad: 'UNIDAD', stockActual: 8,   categoria: 'Herramientas Electricas' },
  { id: 2, nombre: 'Set de Llaves Allen',      codigoBarras: '7501001002',  precioVenta: 19.47,  precioConIva: 22.00,  tieneIva: true,  tipoUnidad: 'LOTE',   stockActual: 1,   categoria: 'Ferreteria General' },
  { id: 3, nombre: 'Martillo Galpon 16oz',     codigoBarras: '7501001003',  precioVenta: 12.83,  precioConIva: 14.50,  tieneIva: true,  tipoUnidad: 'UNIDAD', stockActual: 142, categoria: 'Ferreteria General' },
  { id: 4, nombre: 'Pintura Latex 4L',         codigoBarras: '7501001004',  precioVenta: 39.82,  precioConIva: 45.00,  tieneIva: true,  tipoUnidad: 'UNIDAD', stockActual: 0,   categoria: 'Pinturas y Acabados' },
  { id: 5, nombre: 'Cinta Metrica 5m',         codigoBarras: '7501001005',  precioVenta: 7.08,   precioConIva: 8.00,   tieneIva: true,  tipoUnidad: 'UNIDAD', stockActual: 55,  categoria: 'Ferreteria General' },
  { id: 6, nombre: 'Disco de Corte 4.5"',      codigoBarras: '7501001006',  precioVenta: 3.54,   precioConIva: 4.00,   tieneIva: true,  tipoUnidad: 'UNIDAD', stockActual: 30,  categoria: 'Herramientas Electricas' },
  { id: 7, nombre: 'Cable THW #12 (m)',         codigoBarras: '7501001007',  precioVenta: 0.88,   precioConIva: 1.00,   tieneIva: true,  tipoUnidad: 'MEDIDA', stockActual: 200, categoria: 'Electricidad' },
  { id: 8, nombre: 'Tubo PVC 1/2" x 3m',       codigoBarras: '7501001008',  precioVenta: 4.42,   precioConIva: 5.00,   tieneIva: true,  tipoUnidad: 'UNIDAD', stockActual: 40,  categoria: 'Plomeria' },
  { id: 9, nombre: 'Cemento 42.5kg',            codigoBarras: '7501001009',  precioVenta: 8.85,   precioConIva: 10.00,  tieneIva: true,  tipoUnidad: 'PESO',   stockActual: 20,  categoria: 'Construccion' },
  { id: 10, nombre: 'Broca de Concreto 1/2"',   codigoBarras: '7501001010',  precioVenta: 2.65,   precioConIva: 3.00,   tieneIva: true,  tipoUnidad: 'UNIDAD', stockActual: 15,  categoria: 'Ferreteria General' },
];

// ── Helpers ───────────────────────────────────────────────────
const fmt = (n: number) => `$${n.toFixed(2)}`;

function calcLinea(prod: ProductoMock, cantidad: number): number {
  return parseFloat((prod.precioConIva * cantidad).toFixed(2));
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
const IcoWarning = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
    <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
  </svg>
);

// ── Componente principal ─────────────────────────────────────
export default function VentasPage() {
  // Escaneo y búsqueda
  const [barcode,      setBarcode]      = useState('');
  const [busqueda,     setBusqueda]     = useState('');
  const [resultados,   setResultados]   = useState<ProductoMock[]>([]);
  const [prodSelec,    setProdSelec]    = useState<ProductoMock | null>(null);
  const barcodeRef = useRef<HTMLInputElement>(null);
  const busqTimer  = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Carrito
  const [carrito, setCarrito] = useState<LineaCarrito[]>([]);

  // UI state
  const [modalTicket,  setModalTicket]  = useState(false);
  const [modalConfirm, setModalConfirm] = useState(false);
  const [confirming,   setConfirming]   = useState(false);
  const [nroFactura,   setNroFactura]   = useState<string | null>(null);
  const [toast,        setToast]        = useState<ToastData | null>(null);

  const showToast = (msg: string, type: ToastData['type']) => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Focus automático en barcode al montar
  useEffect(() => { barcodeRef.current?.focus(); }, []);

  // Búsqueda con debounce
  useEffect(() => {
    if (busqTimer.current) clearTimeout(busqTimer.current);
    if (!busqueda.trim()) { setResultados([]); return; }
    busqTimer.current = setTimeout(() => {
      const q = busqueda.toLowerCase();
      setResultados(
        PRODUCTOS_MOCK.filter(p =>
          p.nombre.toLowerCase().includes(q) ||
          p.codigoBarras.includes(q) ||
          p.categoria.toLowerCase().includes(q)
        ).slice(0, 10)
      );
    }, 300);
  }, [busqueda]);

  // Agregar producto al carrito
  const agregarAlCarrito = useCallback((prod: ProductoMock) => {
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
          showToast(`Stock insuficiente (queda ${prod.stockActual})`, 'warning');
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

  // Escaneo de código de barras
  function handleBarcode(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== 'Enter' || !barcode.trim()) return;
    const prod = PRODUCTOS_MOCK.find(p => p.codigoBarras === barcode.trim());
    if (prod) {
      agregarAlCarrito(prod);
    } else {
      setBusqueda(barcode.trim());
      setBarcode('');
      showToast('Código no encontrado — buscando por nombre', 'warning');
    }
  }

  // Cambiar cantidad en carrito (valor absoluto desde CantidadInput)
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
    setTimeout(() => barcodeRef.current?.focus(), 50);
  }

  // Totales
  const subtotalSinIva = carrito.reduce((acc, l) => acc + (l.producto.precioVenta * l.cantidad), 0);
  const ivaTotal       = carrito.reduce((acc, l) => acc + ((l.producto.precioConIva - l.producto.precioVenta) * l.cantidad), 0);
  const totalFinal     = carrito.reduce((acc, l) => acc + l.subtotal, 0);

  // Confirmar venta
  async function confirmarVenta() {
    setConfirming(true);
    await new Promise(r => setTimeout(r, 1200)); // simula latencia
    const nro = `F-${Date.now().toString().slice(-6)}`;
    setNroFactura(nro);
    setConfirming(false);
    setModalConfirm(false);
    setModalTicket(true);
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
                Escaneo de barra o búsqueda manual
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

          {/* Búsqueda manual */}
          <div style={{
            background: 'var(--bg-surface)', border: '1px solid var(--border)',
            borderRadius: '10px', padding: '14px', flex: 1,
          }}>
            <p style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-subtle)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '8px' }}>
              Búsqueda manual
            </p>
            <Input
              value={busqueda}
              onChange={setBusqueda}
              placeholder="Nombre, código o categoría..."
              icon={<IcoSearch />}
            />

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
                        <span style={{ fontSize: '11px', color: 'var(--text-subtle)' }}>Stock: {prod.stockActual}</span>
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
                <span>El carrito está vacío</span>
              </div>
            ) : (
              carrito.map((linea, idx) => (
                <div key={linea.producto.id} style={{ padding: '10px 8px', borderRadius: '8px', marginBottom: '4px', border: '1px solid transparent' }}>
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

      {/* ── Modal: vista previa del ticket (Ahora modularizado) ── */}
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
        title="¡Venta registrada!"
        subtitle={`Factura ${nroFactura ?? ''}`}
        maxWidth={400}
        icon={<IcoCheck />}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(16,185,129,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px' }}>✓</div>
          <p style={{ fontWeight: 600 }}>Venta completada por {fmt(totalFinal)}</p>
          <div style={{ display: 'flex', gap: '10px', width: '100%' }}>
            <Button variant="ghost" onClick={() => { setModalTicket(false); vaciarCarrito(); }} style={{ flex: 1 }}>Nueva venta</Button>
            <Button variant="secondary" onClick={() => showToast('Enviando a impresora...', 'success')} icon={<IcoPrint />} style={{ flex: 1 }}>Imprimir ticket</Button>
          </div>
        </div>
      </Modal>

      <Toast data={toast} />
    </div>
  );
}