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

// ─── API HELPERS ─────────────────────────────────────────────
export interface ApiError {
  error:   string;
  detalle?: string;
}