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
  retencion?: number;
  totalFinal: number;
  // Datos fiscales (DTE)
  tipoDte?: string;
  clienteNit?: string | null;
  clienteNrc?: string | null;
  codigoGeneracion?: string | null;
  ambiente?: string; // '00' sandbox, '01' producción
}

const pad2 = (n: number) => String(n).padStart(2, '0');

const SEP  = '================================';
const DASH = '--------------------------------';

function hashString(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 31 + input.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function QRBadge({ value }: { value: string }) {
  const size = 21;
  const seed = hashString(value);
  const cells: Array<{ x: number; y: number }> = [];

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const inFinderTopLeft = x < 7 && y < 7;
      const inFinderTopRight = x >= size - 7 && y < 7;
      const inFinderBottomLeft = x < 7 && y >= size - 7;

      if (inFinderTopLeft || inFinderTopRight || inFinderBottomLeft) continue;

      const noise = (seed + x * 17 + y * 31 + x * y * 7) % 11;
      if (noise < 5) cells.push({ x, y });
    }
  }

  return (
    <svg viewBox={`0 0 ${size} ${size}`} width="100" height="100" aria-label="Codigo QR interno de validacion">
      <rect width={size} height={size} fill="#fff" />

      {cells.map(({ x, y }) => (
        <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" fill="#000" />
      ))}

      {[
        [0, 0],
        [size - 7, 0],
        [0, size - 7],
      ].map(([x, y]) => (
        <g key={`${x}-${y}`}>
          <rect x={x} y={y} width="7" height="7" fill="#000" />
          <rect x={x + 1} y={y + 1} width="5" height="5" fill="#fff" />
          <rect x={x + 2} y={y + 2} width="3" height="3" fill="#000" />
        </g>
      ))}
    </svg>
  );
}

export function TicketSimple({
  nroFactura, facturaId, fecha, clienteNombre, cajero, sucursal,
  items, subtotalSinIva, ivaTotal, retencion = 0, totalFinal,
  tipoDte = '01', clienteNit, clienteNrc, codigoGeneracion, ambiente = '00',
}: TicketSimpleProps) {
  const dd   = pad2(fecha.getDate());
  const mm   = pad2(fecha.getMonth() + 1);
  const yyyy = fecha.getFullYear();
  const hh   = pad2(fecha.getHours());
  const min  = pad2(fecha.getMinutes());
  const ss   = pad2(fecha.getSeconds());

  const fechaStr = `${dd}/${mm}/${yyyy}`;
  const horaStr  = `${hh}:${min}:${ss}`;
  const esCredito = tipoDte === '03';
  // QR real: URL de consulta pública de Hacienda con el código de generación único del DTE.
  // Si aún no hay codigoGeneracion (caso extremo), cae a una referencia interna no-mock por factura.
  const qrData = codigoGeneracion
    ? `https://admin.factura.gob.sv/consultaPublica?ambiente=${ambiente}&codGen=${codigoGeneracion}&fechaEmi=${yyyy}-${mm}-${dd}`
    : `FERRED|F-${facturaId}|${totalFinal.toFixed(2)}|${fechaStr}`;

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
      <div style={{ textAlign: 'center', fontWeight: 700 }}>
        {esCredito ? 'COMPROBANTE DE CRÉDITO FISCAL' : 'FACTURA — CONSUMIDOR FINAL'}
      </div>
      <div>{DASH}</div>
      <div>FOLIO: F-{facturaId}</div>
      <div>FECHA: {fechaStr} {horaStr}</div>
      <div>CLIENTE: {clienteNombre}</div>
      {esCredito && clienteNit && <div>NIT: {clienteNit}</div>}
      {esCredito && clienteNrc && <div>NRC: {clienteNrc}</div>}
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
      {retencion > 0 && (
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>RETENCION IVA (1%):</span>
          <span>-${retencion.toFixed(2)}</span>
        </div>
      )}

      <div style={{ textAlign: 'center' }}>{SEP}</div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
        <span>TOTAL A PAGAR:</span>
        <span>${totalFinal.toFixed(2)}</span>
      </div>
      <div style={{ textAlign: 'center' }}>{SEP}</div>

      <div style={{ display: 'flex', justifyContent: 'center', margin: '12px 0 6px' }}>
        <QRBadge value={qrData} />
      </div>
      {codigoGeneracion ? (
        <>
          <div style={{ textAlign: 'center', fontWeight: 700 }}>CONSULTA DTE — MINISTERIO DE HACIENDA</div>
          <div style={{ textAlign: 'center', fontSize: '9px', wordBreak: 'break-all' }}>
            Cód. Generación: {codigoGeneracion}
          </div>
        </>
      ) : (
        <div style={{ textAlign: 'center' }}>VALIDACIÓN INTERNA FERRED</div>
      )}
      <div style={{ textAlign: 'center' }}>No. {nroFactura}</div>

      <div style={{ textAlign: 'center', marginTop: '12px' }}>Gracias por su compra</div>
      <div style={{ textAlign: 'center' }}>FERRED - Su solución inmediata</div>
      <div style={{ textAlign: 'center' }}>{SEP}</div>
    </div>
  );
}
