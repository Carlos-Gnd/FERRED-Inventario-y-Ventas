-- Schema SQLite local para operacion offline del server.

CREATE TABLE IF NOT EXISTS sucursales (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL,
  direccion TEXT,
  telefono TEXT
);

CREATE TABLE IF NOT EXISTS categorias (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL UNIQUE,
  descripcion TEXT,
  activo INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS usuarios (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sucursal_id INTEGER REFERENCES sucursales(id),
  nombre TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  contrasena_hash TEXT NOT NULL,
  rol TEXT NOT NULL,
  activo INTEGER NOT NULL DEFAULT 1,
  creado_en TEXT NOT NULL DEFAULT (datetime('now')),
  last_synced_at TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);


CREATE TABLE IF NOT EXISTS unidades_medida (
  codigo      TEXT PRIMARY KEY,
  nombre      TEXT NOT NULL,
  descripcion TEXT,
  activo      INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS productos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  categoria_id INTEGER,
  nombre TEXT NOT NULL,
  codigo_barras TEXT UNIQUE,
  tipo_unidad TEXT REFERENCES unidades_medida(codigo) ON UPDATE CASCADE ON DELETE SET NULL,
  precio_compra REAL NOT NULL DEFAULT 0,
  porcentaje_ganancia REAL NOT NULL DEFAULT 0,
  precio_venta REAL NOT NULL DEFAULT 0,
  precio_con_iva REAL NOT NULL DEFAULT 0,
  tiene_iva INTEGER NOT NULL DEFAULT 1,
  stock_actual INTEGER NOT NULL DEFAULT 0,
  stock_minimo INTEGER NOT NULL DEFAULT 0,
  activo INTEGER NOT NULL DEFAULT 1,
  disponible_ecommerce INTEGER NOT NULL DEFAULT 0,
  caracteristicas TEXT,
  image_url TEXT,
  creado_en TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS stock_sucursal (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  producto_id INTEGER NOT NULL REFERENCES productos(id),
  sucursal_id INTEGER NOT NULL REFERENCES sucursales(id),
  cantidad INTEGER NOT NULL DEFAULT 0,
  minimo INTEGER NOT NULL DEFAULT 0,
  stock_reservado INTEGER NOT NULL DEFAULT 0,
  actualizado_en TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(producto_id, sucursal_id)
);

CREATE TABLE IF NOT EXISTS facturas_dte (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sucursal_id INTEGER,
  usuario_id INTEGER,
  codigo_generacion TEXT UNIQUE,
  numero_control TEXT UNIQUE,
  tipo_dte TEXT NOT NULL DEFAULT '01',
  cliente_nombre TEXT NOT NULL DEFAULT 'Consumidor Final',
  cliente_email TEXT,
  cliente_nit TEXT,
  cliente_nrc TEXT,
  cliente_giro TEXT,
  total_sin_iva REAL NOT NULL DEFAULT 0,
  iva REAL NOT NULL DEFAULT 0,
  iva_rete1 REAL NOT NULL DEFAULT 0,
  total REAL NOT NULL DEFAULT 0,
  dte_json TEXT,
  estado TEXT NOT NULL DEFAULT 'SIMULADO',
  sincronizado INTEGER NOT NULL DEFAULT 0,
  creado_en TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS detalles_venta (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  factura_id INTEGER NOT NULL REFERENCES facturas_dte(id),
  producto_id INTEGER NOT NULL REFERENCES productos(id),
  cantidad REAL NOT NULL,
  precio_unit REAL NOT NULL,
  subtotal REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS proveedores (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL,
  nit TEXT UNIQUE,
  telefono TEXT,
  email TEXT,
  direccion TEXT,
  activo INTEGER NOT NULL DEFAULT 1,
  creado_en TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS recepciones_mercancia (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  proveedor_id INTEGER NOT NULL REFERENCES proveedores(id),
  sucursal_id INTEGER NOT NULL,
  usuario_id INTEGER,
  numero_factura TEXT,
  total REAL NOT NULL DEFAULT 0,
  observaciones TEXT,
  creado_en TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS detalles_recepcion (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  recepcion_id INTEGER NOT NULL REFERENCES recepciones_mercancia(id) ON DELETE CASCADE,
  producto_id INTEGER NOT NULL REFERENCES productos(id),
  cantidad REAL NOT NULL,
  costo_unit REAL NOT NULL,
  subtotal REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS sync_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tabla TEXT NOT NULL,
  operacion TEXT NOT NULL,
  payload TEXT NOT NULL,
  usuario_id INTEGER,
  status TEXT NOT NULL DEFAULT 'PENDIENTE',
  intentos INTEGER NOT NULL DEFAULT 0,
  error TEXT,
  creado_en TEXT NOT NULL DEFAULT (datetime('now')),
  sinc_en TEXT
);

-- GAP-3: persiste el último refresh por sucursal para sobrevivir reinicios del server
CREATE TABLE IF NOT EXISTS snapshot_meta (
  sucursal_id INTEGER PRIMARY KEY,
  last_refresh TEXT NOT NULL
);

-- HU-20: Configuracion centralizada del negocio (NIT, NRC, banco, etc.)
CREATE TABLE IF NOT EXISTS configuracion_negocio (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  clave         TEXT NOT NULL UNIQUE,
  valor         TEXT NOT NULL,
  tipo          TEXT NOT NULL DEFAULT 'TEXT',
  actualizado_en TEXT NOT NULL DEFAULT (datetime('now'))
);

-- HU-25: Kardex — historial cronologico de movimientos de inventario
CREATE TABLE IF NOT EXISTS movimientos_inventario (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  producto_id      INTEGER NOT NULL REFERENCES productos(id),
  sucursal_id      INTEGER NOT NULL REFERENCES sucursales(id),
  tipo             TEXT NOT NULL,
  cantidad         REAL NOT NULL,
  saldo_anterior   INTEGER NOT NULL,
  saldo_nuevo      INTEGER NOT NULL,
  referencia       TEXT,
  usuario_id       INTEGER,
  fecha_movimiento TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_movimientos_kardex
  ON movimientos_inventario(producto_id, sucursal_id, fecha_movimiento);

-- HU-12: Devoluciones y garantias
CREATE TABLE IF NOT EXISTS devoluciones (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  venta_id         INTEGER NOT NULL REFERENCES facturas_dte(id),
  motivo           TEXT NOT NULL,
  estado           TEXT NOT NULL DEFAULT 'APROBADA',
  aprobado_por     INTEGER,
  creado_por       INTEGER NOT NULL,
  fecha_devolucion TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_devoluciones_venta ON devoluciones(venta_id);

CREATE TABLE IF NOT EXISTS detalles_devolucion (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  devolucion_id INTEGER NOT NULL REFERENCES devoluciones(id) ON DELETE CASCADE,
  producto_id   INTEGER NOT NULL REFERENCES productos(id),
  cantidad      REAL NOT NULL
);
