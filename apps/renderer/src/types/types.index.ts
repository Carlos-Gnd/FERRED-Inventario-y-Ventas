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
export type TipoUnidad =
  | 'UND' | 'CAJA' | 'PAQ' | 'BOLSA' | 'JUEGO' | 'KIT' | 'PAR'
  | 'SACO' | 'TUBO' | 'ROLLO' | 'PLACA' | 'LATA' | 'DOC' | 'CIEN' | 'MIL'
  | 'M' | 'M2' | 'PULG' | 'PIE' | 'YD'
  | 'LB' | 'KG' | 'GR' | 'GAL' | 'LT' | 'BARRIL';

export const TIPO_UNIDAD_LABELS: Record<TipoUnidad, string> = {
  UND:    'Unidades',
  CAJA:   'Cajas',
  PAQ:    'Paquetes',
  BOLSA:  'Bolsas',
  JUEGO:  'Juegos/conjuntos',
  KIT:    'Kits',
  PAR:    'Pares',
  SACO:   'Sacos',
  TUBO:   'Tubos',
  ROLLO:  'Rollos',
  PLACA:  'Placas',
  LATA:   'Latas',
  DOC:    'Docenas',
  CIEN:   'Cientos',
  MIL:    'Millares',
  M:      'Metros',
  M2:     'Metros²',
  PULG:   'Pulgadas',
  PIE:    'Pies',
  YD:     'Yardas',
  LB:     'Libras',
  KG:     'Kilogramos',
  GR:     'Gramos',
  GAL:    'Galones',
  LT:     'Litros',
  BARRIL: 'Barriles',
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
  disponibleEcommerce: boolean;
  caracteristicas:    Record<string, string | number | boolean> | null;
  imageUrl:           string | null;
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
export interface VentaSemanalPunto {
  date:   string;
  label:  string;
  total:  number;
  ventas: number;
}

export interface VentaSemanalResumen {
  dias:         VentaSemanalPunto[];
  totalPeriodo: number;
  totalVentas:  number;
}

export interface ApiError {
  error:   string;
  detalle?: string;
}
