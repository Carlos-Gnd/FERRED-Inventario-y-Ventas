export interface Product {
  id: number;
  nombre: string;
  codigoBarras: string | null;
  tipoUnidad: string;
  precioVenta: number;
  precioConIva: number;
  precioOferta?: number | null;
  oferta?: {
    id: number;
    precioOferta: number;
    fechaInicio: string;
    fechaFin: string;
  } | null;
  categoria: { id: number; nombre: string } | null;
  sucursalId: number;
  stockDisponible: number;
}

export interface ZonaEnvio {
  id: number;
  nombre: string;
  descripcion: string | null;
  costoEnvio: number;
  sucursalPreferente: number | null;
}

export interface ClienteEcommerce {
  id: number;
  nombre: string;
  email: string;
  rol: 'CLIENTE';
  telefono: string | null;
  direccion: string | null;
  fechaRegistro: string;
}

export interface AuthResponse {
  token: string;
  cliente: ClienteEcommerce;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export type TipoEntrega = 'RETIRO' | 'ENVIO';

export interface PedidoPayload {
  clienteNombre: string;
  clienteTel: string;
  tipoEntrega: TipoEntrega;
  sucursalId?: number;
  zonaEnvioId?: number;
  direccionEnvio?: string;
  observaciones?: string;
  items: Array<{ productoId: number; cantidad: number }>;
}

export interface PedidoOnline {
  id: number;
  clienteId: number | null;
  sucursalId: number;
  tipoEntrega: TipoEntrega;
  estado: string;
  clienteNombre: string | null;
  clienteTel: string | null;
  direccionEnvio: string | null;
  subtotal: number;
  costoEnvio: number;
  total: number;
  creadoEn: string;
  detalles?: Array<{
    id: number;
    productoId: number;
    cantidad: number;
    precioUnit: number;
    subtotal: number;
    producto?: Product;
  }>;
}
