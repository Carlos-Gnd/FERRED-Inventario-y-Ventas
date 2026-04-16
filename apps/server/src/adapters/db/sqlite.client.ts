import {
  getSqlite,
  initSqlite,
  closeSqlite,
} from './sqlite/sqlite.client';
import { logPendienteLocal } from '../sync/sync.local';

export { getSqlite, initSqlite, closeSqlite };

export interface SyncQueueItem {
  id: number;
  tabla: string;
  operacion: 'CREATE' | 'UPDATE' | 'DELETE';
  payload: string;
  intentos: number;
  status: string;
}

export function getSqliteDb() {
  try {
    return getSqlite();
  } catch {
    return initSqlite();
  }
}

export function guardarEnColaSync(
  tabla: string,
  operacion: 'CREATE' | 'UPDATE' | 'DELETE',
  payload: object
) {
  logPendienteLocal(tabla, operacion, payload);
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

  logPendienteLocal('producto', 'CREATE', { ...data });

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

  logPendienteLocal('producto', 'DELETE', { id });
}

export function obtenerPendientesSqlite() {
  const db = getSqliteDb();

  return db.prepare(`
    SELECT
      id,
      tabla,
      operacion,
      payload,
      intentos,
      status
    FROM sync_log
    WHERE status = 'PENDIENTE'
    ORDER BY creado_en ASC, id ASC
  `).all() as SyncQueueItem[];
}

export function marcarSincronizado(id: number) {
  const db = getSqliteDb();

  db.prepare(`
    UPDATE sync_log
    SET status = 'SINCRONIZADO',
        error = NULL,
        sinc_en = datetime('now')
    WHERE id = ?
  `).run(id);
}

export function marcarErrorSync(id: number, status: 'PENDIENTE' | 'ERROR' = 'PENDIENTE') {
  const db = getSqliteDb();

  db.prepare(`
    UPDATE sync_log
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
