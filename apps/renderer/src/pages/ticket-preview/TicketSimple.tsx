import { QRCodeSVG } from 'qrcode.react';

export interface TicketSimpleItem {
  nombre: string;
  cantidad: number;
  precioConIva: number;
}

export interface TicketSimpleProps {
  nroFactura: string;
  facturaId: number;
  fecha: Date;
  clienteNombre: string;
  cajero: string;
  sucursal: string;
  items: TicketSimpleItem[];
  subtotalSinIva: number;
  ivaTotal: number;
  totalFinal: number;
}

const pad2 = (n: number) => String(n).padStart(2, '0');

const SEP  = '================================';
const DASH = '--------------------------------';

export function TicketSimple({
  nroFactura, facturaId, fecha, clienteNombre, cajero, sucursal,
  items, subtotalSinIva, ivaTotal, totalFinal,
}: TicketSimpleProps) {
  const dd   = pad2(fecha.getDate());
  const mm   = pad2(fecha.getMonth() + 1);
  const yyyy = fecha.getFullYear();
  const hh   = pad2(fecha.getHours());
  const min  = pad2(fecha.getMinutes());
  const ss   = pad2(fecha.getSeconds());

  const fechaStr = `${dd}/${mm}/${yyyy}`;
  const horaStr  = `${hh}:${min}:${ss}`;
  const qrData   = `FERRED|${nroFactura}|${totalFinal.toFixed(2)}|${fechaStr}`;

  const base: React.CSSProperties = {
    fontFamily: "'Courier New', Courier, monospace",
    fontSize: '11px',
    width: '320px',
    background: '#fff',
    color: '#000',
    padding: '16px',
    lineHeight: '1.6',
    boxSizing: 'border-box',
  };

  return (
    <div id="ticket-print" style={base}>
      <div style={{ textAlign: 'center' }}>{SEP}</div>
      <div style={{ textAlign: 'center', fontWeight: 900, fontSize: '18px', letterSpacing: '4px', margin: '4px 0' }}>
        FERRED
      </div>
      <div style={{ textAlign: 'center' }}>{SEP}</div>

      <div>NIT: 0614-010101-001-1</div>
      <div>Sucursal: {sucursal}</div>
      <div>Cajero: {cajero}</div>

      <div>{DASH}</div>
      <div>FOLIO: F-{facturaId}</div>
      <div>FECHA: {fechaStr} {horaStr}</div>
      <div>CLIENTE: {clienteNombre}</div>
      <div>{DASH}</div>

      <div style={{ display: 'flex' }}>
        <span style={{ flex: 1 }}>ARTÍCULO</span>
        <span style={{ width: '38px', textAlign: 'right' }}>CANT.</span>
        <span style={{ width: '72px', textAlign: 'right' }}>PRECIO</span>
      </div>
      <div>{DASH}</div>

      {items.map((item, i) => (
        <div key={i} style={{ display: 'flex' }}>
          <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: '4px' }}>
            {item.nombre}
          </span>
          <span style={{ width: '38px', textAlign: 'right' }}>{item.cantidad}</span>
          <span style={{ width: '72px', textAlign: 'right' }}>${item.precioConIva.toFixed(2)}</span>
        </div>
      ))}

      <div>{DASH}</div>

      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span>SUBTOTAL SIN IVA:</span>
        <span>${subtotalSinIva.toFixed(2)}</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span>IVA (13%):</span>
        <span>${ivaTotal.toFixed(2)}</span>
      </div>

      <div style={{ textAlign: 'center' }}>{SEP}</div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
        <span>TOTAL A PAGAR:</span>
        <span>${totalFinal.toFixed(2)}</span>
      </div>
      <div style={{ textAlign: 'center' }}>{SEP}</div>

      <div style={{ display: 'flex', justifyContent: 'center', margin: '12px 0 6px' }}>
        <QRCodeSVG value={qrData} size={100} />
      </div>
      <div style={{ textAlign: 'center' }}>VALIDACIÓN INTERNA FERRED</div>
      <div style={{ textAlign: 'center' }}>No. {nroFactura}</div>

      <div style={{ textAlign: 'center', marginTop: '12px' }}>Gracias por su compra</div>
      <div style={{ textAlign: 'center' }}>FERRED - Su solución inmediata</div>
      <div style={{ textAlign: 'center' }}>{SEP}</div>
    </div>
  );
}
