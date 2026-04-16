import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DB_PATH = path.join(process.cwd(), 'local.db');

let _db: Database.Database | null = null;

export interface SyncQueueItem {
  id: number;
  tabla: string;
  operacion: 'CREATE' | 'UPDATE' | 'DELETE';
  payload: string;
  intentos: number;
  status: string;
}

export function getSqliteDb(): Database.Database {
  if (_db) return _db;

  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  _db = new Database(DB_PATH);

  _db.pragma('journal_mode = WAL');
  _db.pragma('foreign_keys = ON');

  _db.exec(`
    CREATE TABLE IF NOT EXISTS productos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      categoria_id INTEGER,
      nombre TEXT NOT NULL,
      codigo_barras TEXT,
      tipo_unidad TEXT,
      precio_compra REAL,
      porcentaje_ganancia REAL,
      precio_venta REAL,
      precio_con_iva REAL,
      tiene_iva INTEGER DEFAULT 1,
      stock_actual INTEGER DEFAULT 0,
      stock_minimo INTEGER DEFAULT 0,
      activo INTEGER DEFAULT 1
    );
  `);

  _db.exec(`
    CREATE TABLE IF NOT EXISTS stock_sucursal (
      producto_id INTEGER,
      sucursal_id INTEGER,
      cantidad INTEGER DEFAULT 0,
      minimo INTEGER DEFAULT 0,
      PRIMARY KEY (producto_id, sucursal_id)
    );
  `);

  _db.exec(`
    CREATE TABLE IF NOT EXISTS sync_queue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tabla TEXT,
      operacion TEXT,
      payload TEXT,
      intentos INTEGER DEFAULT 0,
      status TEXT DEFAULT 'PENDIENTE'
    );
  `);

  console.log('[SQLite] OK ->', DB_PATH);

  return _db;
}

export function guardarEnColaSync(
  tabla: string,
  operacion: 'CREATE' | 'UPDATE' | 'DELETE',
  payload: object
) {
  const db = getSqliteDb();

  db.prepare(`
    INSERT INTO sync_queue (tabla, operacion, payload)
    VALUES (?, ?, ?)
  `).run(tabla, operacion, JSON.stringify(payload));
}

export function crearProductoSqlite(data: any, sucursalId?: number) {
  const db = getSqliteDb();

  const result = db.prepare(`
    INSERT INTO productos (
      categoria_id, nombre, codigo_barras, tipo_unidad,
      precio_compra, porcentaje_ganancia, precio_venta, precio_con_iva,
      tiene_iva, stock_actual, stock_minimo, activo
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
  `).run(
    data.categoriaId ?? null,
    data.nombre,
    data.codigoBarras ?? null,
    data.tipoUnidad ?? 'UNIDAD',
    data.precioCompra ?? 0,
    data.porcentajeGanancia ?? 0,
    data.precioVenta ?? 0,
    data.precioConIva ?? 0,
    data.tieneIva ?? true ? 1 : 0,
    data.stockActual ?? 0,
    data.stockMinimo ?? 0
  );

  const id = Number(result.lastInsertRowid);

  if (sucursalId) {
    db.prepare(`
      INSERT OR IGNORE INTO stock_sucursal
      (producto_id, sucursal_id, cantidad, minimo)
      VALUES (?, ?, ?, ?)
    `).run(id, sucursalId, data.stockActual ?? 0, data.stockMinimo ?? 0);
  }

  guardarEnColaSync('producto', 'CREATE', { ...data });

  return productoLocalResponse({
    id,
    categoriaId: data.categoriaId ?? null,
    nombre: data.nombre,
    codigoBarras: data.codigoBarras ?? null,
    tipoUnidad: data.tipoUnidad ?? 'UNIDAD',
    precioCompra: data.precioCompra ?? 0,
    porcentajeGanancia: data.porcentajeGanancia ?? 0,
    precioVenta: data.precioVenta ?? 0,
    precioConIva: data.precioConIva ?? 0,
    tieneIva: Boolean(data.tieneIva ?? true),
    stockActual: data.stockActual ?? 0,
    stockMinimo: data.stockMinimo ?? 0,
    activo: true,
  });
}

export function obtenerProductosSqlite() {
  const db = getSqliteDb();

  const productos = db.prepare(`
    SELECT
      id,
      categoria_id AS categoriaId,
      nombre,
      codigo_barras AS codigoBarras,
      tipo_unidad AS tipoUnidad,
      precio_compra AS precioCompra,
      porcentaje_ganancia AS porcentajeGanancia,
      precio_venta AS precioVenta,
      precio_con_iva AS precioConIva,
      tiene_iva AS tieneIva,
      stock_actual AS stockActual,
      stock_minimo AS stockMinimo,
      activo
    FROM productos
    WHERE activo = 1
    ORDER BY nombre ASC
  `).all();

  return productos.map(productoLocalResponse);
}

export function eliminarProductoSqlite(id: number) {
  const db = getSqliteDb();

  db.prepare(`
    UPDATE productos
    SET activo = 0
    WHERE id = ?
  `).run(id);

  guardarEnColaSync('producto', 'DELETE', { id });
}

export function obtenerPendientesSqlite() {
  const db = getSqliteDb();

  return db.prepare(`
    SELECT * FROM sync_queue
    WHERE status = 'PENDIENTE'
    ORDER BY id ASC
  `).all() as SyncQueueItem[];
}

export function marcarSincronizado(id: number) {
  const db = getSqliteDb();

  db.prepare(`
    UPDATE sync_queue
    SET status = 'SINCRONIZADO'
    WHERE id = ?
  `).run(id);
}

export function marcarErrorSync(id: number, status: 'PENDIENTE' | 'ERROR' = 'PENDIENTE') {
  const db = getSqliteDb();

  db.prepare(`
    UPDATE sync_queue
    SET intentos = intentos + 1,
        status = ?
    WHERE id = ?
  `).run(status, id);
}

function productoLocalResponse(row: any) {
  return {
    id: Number(row.id),
    categoriaId: row.categoriaId ?? null,
    categoria: null,
    nombre: row.nombre,
    codigoBarras: row.codigoBarras ?? null,
    tipoUnidad: row.tipoUnidad ?? 'UNIDAD',
    precioCompra: Number(row.precioCompra ?? 0),
    porcentajeGanancia: Number(row.porcentajeGanancia ?? 0),
    precioVenta: Number(row.precioVenta ?? 0),
    precioConIva: Number(row.precioConIva ?? 0),
    tieneIva: Boolean(row.tieneIva),
    stockActual: Number(row.stockActual ?? 0),
    stockMinimo: Number(row.stockMinimo ?? 0),
    activo: Boolean(row.activo),
  };
}
