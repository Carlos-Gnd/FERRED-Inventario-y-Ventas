// Módulo de Ventas / POS
// T-02B.2   Vista previa del ticket (TicketPreviewModal)
// T-02B.3   Cobro exitoso: notificación con folio + botón imprimir (VentaExitosaModal)

import { useState } from 'react';
import { TicketPreviewModal, type TicketItem } from './components/TicketPreviewModal';
import { VentaExitosaModal } from './components/VentaExitosaModal';

// ── T-02B.3: función de impresión────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function imprimirTicket(_datosTicket: { items: TicketItem[]; total: number; folio: string }) {
  // feature:implementar envío de datos al módulo de imprecion(Electron IPC)
}
// ─────────────────────────────────────────────────────────────────────────────

// ── Demo / placeholder — reemplazar con el POS real ────────────────

const DEMO_ITEMS: TicketItem[] = [
  { id: 1, nombre: 'Taladro Perfotor 20V', cantidad: 1, precioUnitario: 159,   subtotal: 159   },
  { id: 2, nombre: 'Set de Llaves Allen',  cantidad: 2, precioUnitario: 22,    subtotal: 44    },
  { id: 3, nombre: 'Martillo Galpón 16oz', cantidad: 1, precioUnitario: 14.50, subtotal: 14.50 },
];

const IVA_RATE = 0.13;

export default function VentasPage() {
  const [previewOpen,  setPreviewOpen]  = useState(false);
  const [exitosaOpen,  setExitosaOpen]  = useState(false);
  const [folioActual,  setFolioActual]  = useState('');

  const subtotal  = DEMO_ITEMS.reduce((a, i) => a + i.subtotal, 0);
  const totalNeto = subtotal + subtotal * IVA_RATE;

  function handleConfirmar() {
    //enviar la venta al servidor y obtener el folio real
    const folioDemo = String(Math.floor(Math.random() * 90000) + 10000);

    setPreviewOpen(false);
    setFolioActual(folioDemo);
    setExitosaOpen(true);

    //limpiar el carrito tras el cobro exitoso
  }

  function handleImprimir() {
    imprimirTicket({ items: DEMO_ITEMS, total: totalNeto, folio: folioActual });
  }

  function handleNuevaVenta() {
    setExitosaOpen(false);
    // TODO: resetear el estado del carrito / POS

  }

  const now = new Date();
  const fechaEmision = now.toLocaleDateString('es-CR', { day: '2-digit', month: 'short', year: 'numeric' });
  const horaRegistro = now.toLocaleTimeString('es-CR', { hour: '2-digit', minute: '2-digit' });

  return (
    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>
        Ventas / POS
      </h2>

      {/* TODO: aquí irá el carrito y el flujo POS completo*/}

      <div style={{ display: 'flex', gap: '10px' }}>
        <button
          onClick={() => setPreviewOpen(true)}
          style={{
            padding: '10px 20px',
            background: 'var(--accent)',
            color: '#fff',
            border: 'none',
            borderRadius: 'var(--radius-md)',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          [DEMO] Abrir Vista Previa del Ticket
        </button>

        <button
          onClick={() => { setFolioActual('00022'); setExitosaOpen(true); }}
          style={{
            padding: '10px 20px',
            background: 'var(--success)',
            color: '#fff',
            border: 'none',
            borderRadius: 'var(--radius-md)',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          [DEMO] Ver Pantalla Cobro Exitoso
        </button>
      </div>

      {/* T-02B.2 — Modal Vista Previa */}
      <TicketPreviewModal
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        onConfirm={handleConfirmar}
        cliente="Consumidor Final"
        items={DEMO_ITEMS}
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
