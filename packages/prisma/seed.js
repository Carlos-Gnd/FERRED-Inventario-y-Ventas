const bcrypt = require('bcrypt');
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const branchId = process.env.BRANCH_ID || '1';
const dbPath = path.resolve(__dirname, `../../data/ferred_branch${branchId}.db`);

const dataDir = path.resolve(__dirname, '../../data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(dbPath);

// Activa foreign keys en SQLite
db.pragma('foreign_keys = ON');

// Crear tablas
db.exec(`
  CREATE TABLE IF NOT EXISTS sucursales (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre    VARCHAR(100) NOT NULL,
    direccion VARCHAR(255),
    telefono  VARCHAR(20)
  );

  CREATE TABLE IF NOT EXISTS categorias (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre      VARCHAR(100) NOT NULL UNIQUE,
    descripcion VARCHAR(255)
  );

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

  CREATE TABLE IF NOT EXISTS productos (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    categoria_id        INT REFERENCES categorias(id),
    nombre              VARCHAR(150) NOT NULL,
    codigo_barras       VARCHAR(100) UNIQUE,
    tipo_unidad         VARCHAR(20) CHECK (tipo_unidad IN (
                          'UNIDAD','CAJA','PESO','MEDIDA','LOTE'
                        )),
    precio_compra       REAL,
    porcentaje_ganancia REAL,
    precio_venta        REAL,
    precio_con_iva      REAL,
    tiene_iva           INTEGER DEFAULT 1,
    creado_en           TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

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
`);

console.log('✅ Tablas creadas');

// Insertar datos iniciales
const insertSucursal = db.prepare(
  `INSERT OR IGNORE INTO sucursales (nombre, direccion, telefono) VALUES (?, ?, ?)`
);
insertSucursal.run('Sucursal Central', 'Dirección Central FERRED', '0000-0000');
insertSucursal.run('Sucursal Norte',   'Dirección Norte FERRED',   '0000-0000');
console.log('✅ Sucursales insertadas');

const insertCategoria = db.prepare(
  `INSERT OR IGNORE INTO categorias (nombre, descripcion) VALUES (?, ?)`
);
const categorias = [
  ['Herramientas',               'Martillos, destornilladores, llaves'],
  ['Plomería',                   'Tuberías, llaves de paso, accesorios'],
  ['Electricidad',               'Cables, interruptores, tomacorrientes'],
  ['Materiales de Construcción', 'Cemento, bloques, varillas, arena'],
  ['Pintura',                    'Pinturas, brochas, rodillos, solventes'],
  ['Ferretería General',         'Artículos varios de ferretería'],
  ['Tornillería',                'Tornillos, tuercas, pernos, clavos'],
  ['Jardinería',                 'Mangueras, herramientas de jardín'],
];
categorias.forEach(([nombre, descripcion]) => insertCategoria.run(nombre, descripcion));
console.log('✅ Categorías insertadas');

// Usuario admin
const hash = bcrypt.hashSync('Admin1234', 12);
const insertAdmin = db.prepare(`
  INSERT OR IGNORE INTO usuarios (sucursal_id, nombre, email, contrasena_hash, rol)
  VALUES (1, 'Administrador', 'admin@ferred.com', ?, 'ADMIN')
`);
insertAdmin.run(hash);
console.log('✅ Usuario admin creado: admin@ferred.com / Admin1234');

db.close();
console.log('\n Base de datos SQLite lista en: ' + dbPath);