import Database from 'better-sqlite3';
import path from 'node:path';
import fs from 'node:fs';
import { env } from '../../../config/env';

let _db: Database.Database | null = null;

export function initSqlite(): Database.Database {
  if (_db) return _db;

  const dbPath = env.sqlite.path;
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });

  _db = new Database(dbPath);
  _db.pragma('journal_mode = WAL');
  _db.pragma('foreign_keys = ON');

  const schema = readSchema();
  _db.exec(schema);

  return _db;
}

export function getSqlite(): Database.Database {
  if (!_db) {
    throw new Error('SQLite no inicializado. Llamar initSqlite() en el bootstrap');
  }

  return _db;
}

export function closeSqlite() {
  _db?.close();
  _db = null;
}

function readSchema() {
  const schemaPaths = [
    path.join(__dirname, 'sqlite.schema.sql'),
    path.resolve(process.cwd(), 'src/adapters/db/sqlite/sqlite.schema.sql'),
  ];

  const schemaPath = schemaPaths.find((candidate) => fs.existsSync(candidate));
  if (schemaPath) return fs.readFileSync(schemaPath, 'utf8');

  return SQLITE_SCHEMA;
}

const SQLITE_SCHEMA = `
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
  activo INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS usuarios (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sucursal_id INTEGER,
  nombre TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  contrasena_hash TEXT NOT NULL,
  rol TEXT NOT NULL,
  activo INTEGER DEFAULT 1,
  creado_en TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS productos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  categoria_id INTEGER,
  nombre TEXT NOT NULL,
  codigo_barras TEXT UNIQUE,
  tipo_unidad TEXT DEFAULT 'UNIDAD',
  precio_compra REAL,
  porcentaje_ganancia REAL,
  precio_venta REAL,
  precio_con_iva REAL,
  tiene_iva INTEGER DEFAULT 1,
  stock_actual INTEGER DEFAULT 0,
  stock_minimo INTEGER DEFAULT 0,
  activo INTEGER DEFAULT 1,
  creado_en TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS stock_sucursal (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  producto_id INTEGER NOT NULL,
  sucursal_id INTEGER NOT NULL,
  cantidad INTEGER DEFAULT 0,
  minimo INTEGER DEFAULT 0,
  actualizado_en TEXT DEFAULT (datetime('now')),
  UNIQUE(producto_id, sucursal_id)
);

CREATE TABLE IF NOT EXISTS facturas_dte (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sucursal_id INTEGER,
  usuario_id INTEGER,
  codigo_generacion TEXT UNIQUE,
  numero_control TEXT UNIQUE,
  tipo_dte TEXT DEFAULT '01',
  cliente_nombre TEXT DEFAULT 'Consumidor Final',
  total_sin_iva REAL,
  iva REAL,
  total REAL,
  dte_json TEXT,
  estado TEXT DEFAULT 'SIMULADO',
  sincronizado INTEGER DEFAULT 0,
  creado_en TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS detalles_venta (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  factura_id INTEGER NOT NULL,
  producto_id INTEGER NOT NULL,
  cantidad REAL NOT NULL,
  precio_unit REAL NOT NULL,
  subtotal REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS sync_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tabla TEXT NOT NULL,
  operacion TEXT NOT NULL,
  payload TEXT NOT NULL,
  usuario_id INTEGER,
  status TEXT DEFAULT 'PENDIENTE',
  intentos INTEGER DEFAULT 0,
  error TEXT,
  creado_en TEXT DEFAULT (datetime('now')),
  sinc_en TEXT
);
`;
