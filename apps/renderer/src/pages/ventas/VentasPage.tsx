// Módulo de Ventas / POS
// T-02B.2   Vista previa del ticket (TicketPreviewModal)
// T-02B.3   Cobro exitoso: notificación con folio + botón imprimir (VentaExitosaModal)

import { useState } from 'react';
import { TicketPreviewModal, type TicketItem } from './components/TicketPreviewModal';
import { VentaExitosaModal } from './components/VentaExitosaModal';
import { CantidadInput, type TipoUnidad } from '../cantidades/CantidadImput';

// ── T-02B.3: función de impresión ────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function imprimirTicket(_datosTicket: { items: TicketItem[]; total: number; folio: string }) {
  // feature: implementar envío de datos al módulo de impresión (Electron IPC)
}

// ── Tipos extendidos para el carrito ─────────────────────────────────────────

interface CartItem extends TicketItem {
  tipoUnidad: TipoUnidad;
  unidadSimbolo?: string;
  stockDisponible?: number;
  precioBase: number; // precio por unidad/kg/m sin modificar
}

// ── Demo: productos con distintos tipos de unidad ────────────────────────────

const DEMO_PRODUCTOS: CartItem[] = [
  {
    id: 1,
    nombre:          'Taladro Perfotor 20V',
    cantidad:        1,
    precioBase:      159,
    precioUnitario:  159,
    subtotal:        159,
    tipoUnidad:      'unidad',
    stockDisponible: 8,
  },
  {
    id: 2,
    nombre:          'Set de Llaves Allen',
    cantidad:        2,
    precioBase:      22,
    precioUnitario:  22,
    subtotal:        44,
    tipoUnidad:      'lote',
    stockDisponible: 5,
  },
  {
    id: 3,
    nombre:          'Cable Eléctrico THHN',
    cantidad:        3.50,
    precioBase:      14.50,
    precioUnitario:  14.50,
    subtotal:        50.75,
    tipoUnidad:      'medida',
    unidadSimbolo:   'm',
    stockDisponible: 100,
  },
  {
    id: 4,
    nombre:          'Masilla para Metal',
    cantidad:        0.75,
    precioBase:      18,
    precioUnitario:  18,
    subtotal:        13.50,
    tipoUnidad:      'peso',
    unidadSimbolo:   'kg',
    stockDisponible: 10,
  },
];

const IVA_RATE = 0.13;

// ── Página ────────────────────────────────────────────────────────────────────

export default function VentasPage() {
  const [carrito,      setCarrito]      = useState<CartItem[]>(DEMO_PRODUCTOS);
  const [previewOpen,  setPreviewOpen]  = useState(false);
  const [exitosaOpen,  setExitosaOpen]  = useState(false);
  const [folioActual,  setFolioActual]  = useState('');

  // Recalcula subtotal y precioUnitario al cambiar cantidad
  function actualizarCantidad(id: number, nuevaCantidad: number) {
    setCarrito(prev =>
      prev.map(item => {
        if (item.id !== id) return item;
        const subtotal = parseFloat((item.precioBase * nuevaCantidad).toFixed(2));
        return { ...item, cantidad: nuevaCantidad, subtotal };
      }),
    );
  }

  const subtotalBruto = carrito.reduce((a, i) => a + i.subtotal, 0);
  const iva           = parseFloat((subtotalBruto * IVA_RATE).toFixed(2));
  const totalNeto     = parseFloat((subtotalBruto + iva).toFixed(2));

  // Los TicketItem que esperan los modales (solo los campos que definen la interfaz)
  const ticketItems: TicketItem[] = carrito.map(({ id, nombre, cantidad, precioUnitario, subtotal }) => ({
    id, nombre, cantidad, precioUnitario, subtotal,
  }));

  function handleConfirmar() {
    const folioDemo = String(Math.floor(Math.random() * 90000) + 10000);
    setPreviewOpen(false);
    setFolioActual(folioDemo);
    setExitosaOpen(true);
    // TODO: enviar venta al servidor y limpiar carrito
  }

  function handleImprimir() {
    imprimirTicket({ items: ticketItems, total: totalNeto, folio: folioActual });
  }

  function handleNuevaVenta() {
    setExitosaOpen(false);
    setCarrito(DEMO_PRODUCTOS);
    // TODO: resetear el estado del carrito / POS completo
  }

  const now           = new Date();
  const fechaEmision  = now.toLocaleDateString('es-CR', { day: '2-digit', month: 'short', year: 'numeric' });
  const horaRegistro  = now.toLocaleTimeString('es-CR', { hour: '2-digit', minute: '2-digit' });

  // ── Estilos ──────────────────────────────────────────────────────────────

  const tableHeaderStyle: React.CSSProperties = {
    fontSize:    '11px',
    fontWeight:  600,
    color:       'var(--text-secondary)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    padding:     '8px 12px',
    background:  'var(--bg-secondary, #f9fafb)',
    borderBottom: '1px solid var(--border-color, #e5e7eb)',
  };

  const tdStyle: React.CSSProperties = {
    padding:     '12px',
    borderBottom: '1px solid var(--border-color, #e5e7eb)',
    verticalAlign: 'middle',
  };

  const badgeTipoStyle = (tipo: TipoUnidad): React.CSSProperties => {
    const map: Record<TipoUnidad, { bg: string; color: string }> = {
      unidad:  { bg: 'var(--accent-muted, #eff6ff)',  color: 'var(--accent, #2563eb)' },
      lote:    { bg: 'var(--info-muted, #ecfdf5)',    color: 'var(--success, #059669)' },
      peso:    { bg: 'var(--warning-muted, #fff7ed)', color: 'var(--warning, #d97706)' },
      medida:  { bg: 'var(--danger-muted, #faf5ff)',  color: '#7c3aed' },
    };
    return {
      fontSize:     '10px',
      fontWeight:   600,
      padding:      '2px 6px',
      borderRadius: 'var(--radius-sm, 4px)',
      display:      'inline-block',
      ...map[tipo],
    };
  };

  return (
    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
        Ventas / POS
      </h2>

      {/* ── Tabla del carrito ── */}
      <div style={{
        border:       '1px solid var(--border-color, #e5e7eb)',
        borderRadius: 'var(--radius-md, 8px)',
        overflow:     'hidden',
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ ...tableHeaderStyle, textAlign: 'left' }}>Producto</th>
              <th style={{ ...tableHeaderStyle, textAlign: 'center' }}>Cantidad</th>
              <th style={{ ...tableHeaderStyle, textAlign: 'right' }}>Precio unit.</th>
              <th style={{ ...tableHeaderStyle, textAlign: 'right' }}>Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {carrito.map(item => (
              <tr key={item.id}>
                <td style={tdStyle}>
                  <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-primary)', marginBottom: '4px' }}>
                    {item.nombre}
                  </div>
                  <span style={badgeTipoStyle(item.tipoUnidad)}>
                    {item.tipoUnidad}
                  </span>
                </td>

                <td style={{ ...tdStyle, textAlign: 'center' }}>
                  <div style={{ display: 'flex', justifyContent: 'center' }}>
                    <CantidadInput
                      tipoUnidad={item.tipoUnidad}
                      unidadSimbolo={item.unidadSimbolo}
                      valor={item.cantidad}
                      onChange={v => actualizarCantidad(item.cantidad, v)}
                      min={0.01}
                      max={item.stockDisponible}
                    />
                  </div>
                </td>

                <td style={{ ...tdStyle, textAlign: 'right', fontSize: '14px', color: 'var(--text-secondary)' }}>
                  ${item.precioBase.toFixed(2)}
                  {(item.tipoUnidad === 'peso' || item.tipoUnidad === 'medida') && (
                    <span style={{ fontSize: '11px', marginLeft: '2px' }}>
                      /{item.unidadSimbolo ?? (item.tipoUnidad === 'peso' ? 'kg' : 'm')}
                    </span>
                  )}
                </td>

                <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 700, fontSize: '14px', color: 'var(--text-primary)' }}>
                  ${item.subtotal.toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* ── Totales ── */}
        <div style={{
          padding:     '16px 12px',
          background:  'var(--bg-secondary, #f9fafb)',
          borderTop:   '1px solid var(--border-color, #e5e7eb)',
          display:     'flex',
          flexDirection: 'column',
          alignItems:  'flex-end',
          gap:         '6px',
        }}>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'flex', gap: '24px' }}>
            <span>Subtotal</span>
            <span>${subtotalBruto.toFixed(2)}</span>
          </div>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'flex', gap: '24px' }}>
            <span>IVA (13%)</span>
            <span>${iva.toFixed(2)}</span>
          </div>
          <div style={{
            fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)',
            display: 'flex', gap: '24px', paddingTop: '8px',
            borderTop: '1px solid var(--border-color, #e5e7eb)', marginTop: '4px',
          }}>
            <span>Total</span>
            <span style={{ color: 'var(--accent)' }}>${totalNeto.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* ── Botones de acción ── */}
      <div style={{ display: 'flex', gap: '10px' }}>
        <button
          onClick={() => setPreviewOpen(true)}
          style={{
            padding:      '10px 20px',
            background:   'var(--accent)',
            color:        '#fff',
            border:       'none',
            borderRadius: 'var(--radius-md)',
            fontWeight:   600,
            cursor:       'pointer',
          }}
        >
          Vista Previa del Ticket
        </button>

        <button
          onClick={() => { setFolioActual('00022'); setExitosaOpen(true); }}
          style={{
            padding:      '10px 20px',
            background:   'var(--success)',
            color:        '#fff',
            border:       'none',
            borderRadius: 'var(--radius-md)',
            fontWeight:   600,
            cursor:       'pointer',
          }}
        >
          [DEMO] Ver Cobro Exitoso
        </button>
      </div>

      {/* T-02B.2 — Modal Vista Previa */}
      <TicketPreviewModal
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        onConfirm={handleConfirmar}
        cliente="Consumidor Final"
        items={ticketItems}
      />

      {/* T-02B.3 — Modal Venta Exitosa */}
      <VentaExitosaModal
        open={exitosaOpen}
        folio={folioActual}
        fechaEmision={fechaEmision}
        horaRegistro={horaRegistro}
        totalNeto={totalNeto}
        onImprimir={handleImprimir}
        onNuevaVenta={handleNuevaVenta}
      />
    </div>
  );
}