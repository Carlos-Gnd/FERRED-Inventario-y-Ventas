// Módulo de Ventas / POS
// T-02B.2   Vista previa del ticket (TicketPreviewModal)

import { useState } from 'react';
import { TicketPreviewModal, type TicketItem } from './components/TicketPreviewModal';

const DEMO_ITEMS: TicketItem[] = [
  { id: 1, nombre: 'Taladro Perfotor 20V', cantidad: 1, precioUnitario: 159, subtotal: 159 },
  { id: 2, nombre: 'Set de Llaves Allen', cantidad: 2, precioUnitario: 22, subtotal: 44 },
  { id: 3, nombre: 'Martillo Galpón 16oz', cantidad: 1, precioUnitario: 14.5, subtotal: 14.5 },
];

export default function VentasPage() {
  const [previewOpen, setPreviewOpen] = useState(false);

  function handleConfirmar() {
    setPreviewOpen(false);
    // TODO: integrar confirmación de cobro con flujo real de ventas
  }

  return (
    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>
        Ventas / POS
      </h2>

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
          Abrir Vista Previa del Ticket
        </button>
      </div>

      <TicketPreviewModal
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        onConfirm={handleConfirmar}
        cliente="Consumidor Final"
        items={DEMO_ITEMS}
      />
    </div>
  );
}
