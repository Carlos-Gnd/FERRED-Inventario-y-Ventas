// ─── ROLES ───────────────────────────────────────────────────
// Espejo exacto del backend — SIEMPRE en mayúsculas
export type UserRole = 'ADMIN' | 'CAJERO' | 'BODEGA';

export const ROLE_LABELS: Record<UserRole, string> = {
  ADMIN:  'Administrador',
  CAJERO: 'Cajero',
  BODEGA: 'Bodeguero',
};

// ─── USUARIO ─────────────────────────────────────────────────
export interface AuthUser {
  id:         number;
  nombre:     string;
  email:      string;
  rol:        UserRole;
  sucursalId: number | null;
}

export interface Usuario {
  id:         number;
  nombre:     string;
  email:      string;
  rol:        UserRole;
  sucursalId: number | null;
  activo:     boolean;
  creadoEn?:  string;
}

// ─── CATEGORÍA ───────────────────────────────────────────────
export interface Categoria {
  id:          number;
  nombre:      string;
  descripcion: string | null;
  nProductos:  number;
}

// ─── PRODUCTO ────────────────────────────────────────────────
export type TipoUnidad = 'UNIDAD' | 'CAJA' | 'PESO' | 'MEDIDA' | 'LOTE';

export const TIPO_UNIDAD_LABELS: Record<TipoUnidad, string> = {
  UNIDAD: 'Unidades',
  CAJA:   'Cajas',
  PESO:   'Libras',
  MEDIDA: 'Metros',
  LOTE:   'Lote',
};

export interface Producto {
  id:                 number;
  nombre:             string;
  codigoBarras:       string | null;
  tipoUnidad:         TipoUnidad | null;
  precioCompra:       number | null;
  porcentajeGanancia: number | null;
  precioVenta:        number | null;
  precioConIva:       number | null;
  tieneIva:           boolean;
  stockActual:        number;
  stockMinimo:        number;
  activo:             boolean;
  categoriaId:        number | null;
  categoria:          { id: number; nombre: string } | null;
}

// ─── INVENTARIO MULTI-SUCURSAL (T-06.1) ──────────────────────
// Estado de stock de un producto en una sucursal específica
export type EstadoStock = 'critico' | 'bajo' | 'disponible';

export interface StockPorSucursal {
  sucursalId:     number;
  sucursalNombre: string;
  cantidad:       number;
  minimo:         number;
  estado:         EstadoStock;
}

// Respuesta de GET /api/inventario/stock-comparativo
// Un item por cada producto activo, con el detalle de cada sucursal
export interface ProductoComparativo {
  id:           number;
  nombre:       string;
  codigoBarras: string | null;
  tipoUnidad:   TipoUnidad | null;
  stockMinimo:  number;
  precioVenta:  number | null;
  categoria:    string;
  stockTotal:   number;
  sucursales:   StockPorSucursal[];
}

export interface AlertaStockDetalle {
  id:            number;
  productoId:    number;
  sucursalId:    number;
  producto:      string;
  codigoBarras:  string | null;
  sucursalNombre: string;
  cantidad:      number;
  minimo:        number;
  tipoUnidad:    TipoUnidad | null;
  estado:        Extract<EstadoStock, 'critico' | 'bajo'>;
}

// ─── API HELPERS ─────────────────────────────────────────────
export interface ApiError {
  error:   string;
  detalle?: string;
}
