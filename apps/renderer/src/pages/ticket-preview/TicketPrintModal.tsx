import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { TicketSimple } from './TicketSimple';

interface CartItem {
  producto: { nombre: string; precioConIva: number };
  cantidad: number;
}

interface TicketPrintModalProps {
  open: boolean;
  onClose: () => void;
  nroFactura: string;
  facturaId: number;
  fecha: Date;
  clienteNombre: string;
  cajero: string;
  sucursal: string;
  carrito: CartItem[];
  subtotalSinIva: number;
  ivaTotal: number;
  totalFinal: number;
}

const IcoPrint = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
    <polyline points="6 9 6 2 18 2 18 9" />
    <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
    <rect x="6" y="14" width="12" height="8" />
  </svg>
);

const IcoDownload = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </svg>
);

export function TicketPrintModal({
  open, onClose, nroFactura, facturaId, fecha, clienteNombre,
  cajero, sucursal, carrito, subtotalSinIva, ivaTotal, totalFinal,
}: TicketPrintModalProps) {
  async function handleDownloadPdf() {
    const html2pdf = (await import('html2pdf.js')).default;
    const el = document.getElementById('ticket-print');
    if (!el) return;
    await (html2pdf() as any)
      .set({
        margin: 0,
        filename: `ticket-F-${facturaId}.pdf`,
        html2canvas: { scale: 2, backgroundColor: '#ffffff' },
        jsPDF: { unit: 'mm', format: [85, 210], orientation: 'portrait' },
      })
      .from(el)
      .save();
  }

  const items = carrito.map(l => ({
    nombre:      l.producto.nombre,
    cantidad:    l.cantidad,
    precioConIva: l.producto.precioConIva,
  }));

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Comprobante de venta"
      maxWidth={380}
    >
      <div style={{ background: '#fff', borderRadius: '4px', display: 'flex', justifyContent: 'center', padding: '8px' }}>
        <TicketSimple
          nroFactura={nroFactura}
          facturaId={facturaId}
          fecha={fecha}
          clienteNombre={clienteNombre}
          cajero={cajero}
          sucursal={sucursal}
          items={items}
          subtotalSinIva={subtotalSinIva}
          ivaTotal={ivaTotal}
          totalFinal={totalFinal}
        />
      </div>

      <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
        <Button
          variant="secondary"
          onClick={() => window.print()}
          icon={<IcoPrint />}
          style={{ flex: 1, justifyContent: 'center' }}
        >
          Imprimir
        </Button>
        <Button
          variant="secondary"
          onClick={handleDownloadPdf}
          icon={<IcoDownload />}
          style={{ flex: 1, justifyContent: 'center' }}
        >
          Descargar PDF
        </Button>
        <Button
          variant="ghost"
          onClick={onClose}
          style={{ flex: 1, justifyContent: 'center' }}
        >
          Cerrar
        </Button>
      </div>
    </Modal>
  );
}
