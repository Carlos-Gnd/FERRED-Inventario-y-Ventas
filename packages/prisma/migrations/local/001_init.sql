CREATE TABLE IF NOT EXISTS sucursales (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre    VARCHAR(100) NOT NULL,
  direccion VARCHAR(255),
  telefono  VARCHAR(20)
);

-- 2. CATEGORIAS
CREATE TABLE IF NOT EXISTS categorias (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre      VARCHAR(100) NOT NULL UNIQUE,
  descripcion VARCHAR(255)
);

-- 3. USUARIOS
CREATE TABLE IF NOT EXISTS usuarios (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  sucursal_id     INT REFERENCES sucursales(id),
  nombre          VARCHAR(100) NOT NULL,
  email           VARCHAR(150) NOT NULL UNIQUE,
  contrasena_hash VARCHAR(255) NOT NULL,
  rol             VARCHAR(20)  NOT NULL CHECK (rol IN ('ADMIN','CAJERO','BODEGA')),
  activo          INTEGER DEFAULT 1,
  creado_en       TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. PRODUCTOS
CREATE TABLE IF NOT EXISTS productos (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  categoria_id        INT REFERENCES categorias(id),
  nombre              VARCHAR(150) NOT NULL,
  codigo_barras       VARCHAR(100) UNIQUE,
  tipo_unidad         VARCHAR(20)  CHECK (tipo_unidad IN (
                        'UNIDAD','CAJA','PESO','MEDIDA','LOTE'
                      )),
  precio_compra       REAL,
  porcentaje_ganancia REAL,
  precio_venta        REAL,
  precio_con_iva      REAL,
  tiene_iva           INTEGER DEFAULT 1,
  creado_en           TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. FACTURAS DTE
CREATE TABLE IF NOT EXISTS facturas_dte (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  sucursal_id       INT REFERENCES sucursales(id),
  usuario_id        INT REFERENCES usuarios(id),
  codigo_generacion VARCHAR(50) UNIQUE,
  numero_control    VARCHAR(50) UNIQUE,
  tipo_dte          VARCHAR(5)  DEFAULT '01',
  cliente_nombre    VARCHAR(100) DEFAULT 'Consumidor Final',
  total_sin_iva     REAL,
  iva               REAL,
  total             REAL,
  dte_json          TEXT,
  estado            VARCHAR(20) DEFAULT 'SIMULADO',
  creado_en         TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
