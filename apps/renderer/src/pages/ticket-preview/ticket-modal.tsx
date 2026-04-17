import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';

// HU-08B Implementar el comprobante con codigo QR del DTE: ticket imprimible en impresora termica e historial digital de cada venta con el codigo QR vinculado al documento de Hacienda.

// Estructura minima que el modal necesita de cada linea del carrito.
// Se mantiene acotada para que el componente no dependa de todo el modelo de ventas.
interface TicketLineItem {
  producto: {
    id: number;
    nombre: string;
    precioConIva: number;
  };
  cantidad: number;
  subtotal: number;
}

// Props del modal de confirmacion previa al cobro.
// Todo el estado y las acciones vienen desde VentasPage para que este archivo
// se enfoque solo en presentar la informacion del ticket.
interface TicketModalProps {
  open: boolean;
  confirming: boolean;
  carrito: TicketLineItem[];
  subtotalSinIva: number;
  ivaTotal: number;
  totalFinal: number;
  onClose: () => void;
  onConfirm: () => void;
  fmt: (value: number) => string;
}

// Icono del boton de confirmacion.
const IcoCheck = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

// Icono del encabezado del modal para reforzar que se trata de un ticket.
const IcoPrint = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
    <polyline points="6 9 6 2 18 2 18 9" />
    <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
    <rect x="6" y="14" width="12" height="8" />
  </svg>
);

export function TicketModal({
  open,
  confirming,
  carrito,
  subtotalSinIva,
  ivaTotal,
  totalFinal,
  onClose,
  onConfirm,
  fmt,
}: TicketModalProps) {
  return (
    <Modal
      // Mientras la venta se esta confirmando, evitamos cierres accidentales
      // desde la X del modal o el clic fuera del contenedor.
      open={open}
      onClose={() => {
        if (!confirming) onClose();
      }}
      title="Vista previa del ticket"
      subtitle="Revisa los datos antes de confirmar"
      maxWidth={440}
      icon={<IcoPrint />}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {/* Resumen general del comprobante antes del cobro. */}
        <div
          style={{
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            padding: '12px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <p style={{ fontSize: '12px', color: 'var(--text-subtle)' }}>Cliente</p>
            <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>Consumidor Final</p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: '12px', color: 'var(--text-subtle)' }}>Fecha</p>
            <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
              {new Date().toLocaleDateString('es-SV')}
            </p>
          </div>
        </div>

        {/* Tabla visual simplificada con los productos cobrados. */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr auto auto',
              gap: '8px',
              padding: '6px 8px',
              fontSize: '10px',
              fontWeight: 600,
              color: 'var(--text-subtle)',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              borderBottom: '1px solid var(--border)',
            }}
          >
            <span>Producto</span>
            <span style={{ textAlign: 'center' }}>Cant.</span>
            <span style={{ textAlign: 'right' }}>Subtotal</span>
          </div>

          {/* Cada fila representa una linea del carrito ya calculada por VentasPage. */}
          {carrito.map((linea) => (
            <div
              key={linea.producto.id}
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr auto auto',
                gap: '8px',
                padding: '8px',
                borderRadius: '6px',
                background: 'var(--bg-elevated)',
              }}
            >
              <div>
                <p style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
                  {linea.producto.nombre}
                </p>
                <p style={{ fontSize: '11px', color: 'var(--text-subtle)' }}>
                  {fmt(linea.producto.precioConIva)} c/u
                </p>
              </div>
              <span
                style={{
                  fontSize: '13px',
                  fontWeight: 700,
                  textAlign: 'center',
                  fontFamily: 'JetBrains Mono, monospace',
                  color: 'var(--text-primary)',
                  alignSelf: 'center',
                }}
              >
                {linea.cantidad}
              </span>
              <span
                style={{
                  fontSize: '13px',
                  fontWeight: 700,
                  textAlign: 'right',
                  fontFamily: 'JetBrains Mono, monospace',
                  color: 'var(--text-primary)',
                  alignSelf: 'center',
                }}
              >
                {fmt(linea.subtotal)}
              </span>
            </div>
          ))}
        </div>

        {/* Desglose monetario final para validar subtotal, IVA y total. */}
        <div
          style={{
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            padding: '12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-muted)' }}>
            <span>Subtotal sin IVA</span>
            <span style={{ fontFamily: 'JetBrains Mono, monospace' }}>{fmt(subtotalSinIva)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-muted)' }}>
            <span>IVA (13%)</span>
            <span style={{ fontFamily: 'JetBrains Mono, monospace' }}>{fmt(ivaTotal)}</span>
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              paddingTop: '8px',
              borderTop: '1px solid var(--border)',
            }}
          >
            <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>TOTAL</span>
            <span
              style={{
                fontSize: '20px',
                fontWeight: 700,
                fontFamily: 'JetBrains Mono, monospace',
                color: 'var(--accent)',
              }}
            >
              {fmt(totalFinal)}
            </span>
          </div>
        </div>

        {/* Acciones principales: cancelar la previsualizacion o confirmar el cobro. */}
        <div style={{ display: 'flex', gap: '10px' }}>
          <Button variant="ghost" onClick={onClose} disabled={confirming} style={{ flex: 1 }}>
            Cancelar
          </Button>
          <Button
            loading={confirming}
            onClick={onConfirm}
            style={{ flex: 1, justifyContent: 'center' }}
            icon={<IcoCheck />}
          >
            Confirmar cobro
          </Button>
        </div>
      </div>
    </Modal>
  );
}
