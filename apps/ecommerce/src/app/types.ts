export interface Product {
  id: number;
  nombre: string;
  codigoBarras: string | null;
  tipoUnidad: string;
  precioVenta: number;
  precioConIva: number;
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
