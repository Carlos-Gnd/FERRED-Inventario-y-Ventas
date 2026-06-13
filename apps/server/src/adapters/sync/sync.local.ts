/**
 * sync.local.ts — Cola de pendientes en SQLite (`sync_log`).
 *
 * Capa de persistencia local del motor offline-first: encola mutaciones, las lee para
 * el drenaje y registra su resultado. Es la única fuente de verdad mientras no hay red.
 */
import { getSqlite } from '../db/sqlite/sqlite.client';

const TABLAS_SYNC = new Set([
  'producto',
  'categoria',
  'usuario',
  'stockSucursal',
  'facturaDte',
  'detalleVenta',
  'proveedor',
  'recepcionMercancia',
  'detalleRecepcion',
  'corteCaja',
]);

export interface SyncLocalLog {
  id: number;
  tabla: string;
  operacion: 'CREATE' | 'UPDATE' | 'DELETE';
  payload: string;
  usuarioId: number | null;
  status: string;
  intentos: number;
  error: string | null;
  creadoEn: string;
  sincEn: string | null;
}

/**
 * Inserta una operación pendiente en el `sync_log` de SQLite con status `PENDIENTE`.
 *
 * Valida que `tabla` esté en `TABLAS_SYNC`. El `usuarioId` se conserva solo si el
 * usuario existe en la réplica local (FK segura); de lo contrario se guarda `null`
 * para no romper la inserción cuando el snapshot aún no trajo al autor.
 *
 * @returns El `id` autoincremental del registro insertado.
 * @throws  Si `tabla` no está permitida para sync local.
 */
export function logPendienteLocal(
  tabla: string,
  operacion: 'CREATE' | 'UPDATE' | 'DELETE',
  payload: object,
  usuarioId?: number
) {
  assertTablaSync(tabla);

  const db = getSqlite();
  const usuarioIdSeguro = existeUsuarioLocal(db, usuarioId) ? usuarioId ?? null : null;

  const result = db.prepare(`
    INSERT INTO sync_log (tabla, operacion, payload, usuario_id, status)
    VALUES (?, ?, ?, ?, ?)
  `).run(tabla, operacion, JSON.stringify(payload), usuarioIdSeguro, 'PENDIENTE');

  return Number(result.lastInsertRowid);
}

/**
 * Lee los pendientes (`status = 'PENDIENTE'`) en orden FIFO para su drenaje.
 *
 * @param limit Máximo de registros a devolver (default 50).
 */
export function leerPendientesLocal(limit = 50) {
  const db = getSqlite();

  return db.prepare(`
    SELECT
      id,
      tabla,
      operacion,
      payload,
      usuario_id AS usuarioId,
      status,
      intentos,
      error,
      creado_en AS creadoEn,
      sinc_en AS sincEn
    FROM sync_log
    WHERE status = ?
    ORDER BY creado_en ASC, id ASC
    LIMIT ?
  `).all('PENDIENTE', limit) as SyncLocalLog[];
}

function assertTablaSync(tabla: string) {
  if (!TABLAS_SYNC.has(tabla)) {
    throw new Error(`Tabla no permitida para sync local: ${tabla}`);
  }
}

function existeUsuarioLocal(db: ReturnType<typeof getSqlite>, usuarioId?: number) {
  if (!usuarioId || !Number.isFinite(usuarioId)) return false;

  const row = db.prepare(`
    SELECT id
    FROM usuarios
    WHERE id = ?
  `).get(usuarioId);

  return Boolean(row);
}

/** Marca un pendiente como `SINCRONIZADO`, limpia el error y sella `sinc_en`. */
export function marcarSincronizado(id: number) {
  const db = getSqlite();

  db.prepare(`
    UPDATE sync_log
    SET status = ?,
        error = NULL,
        sinc_en = datetime('now')
    WHERE id = ?
  `).run('SINCRONIZADO', id);
}

/**
 * Incrementa el contador de intentos de un pendiente y registra el error.
 *
 * Si los intentos alcanzan `limiteIntentos` el registro pasa a `ERROR` (deja de
 * reintentarse); si no, vuelve a `PENDIENTE` para el próximo ciclo.
 */
export function marcarError(id: number, error: string, limiteIntentos: number) {
  const db = getSqlite();

  const row = db.prepare(`
    SELECT intentos
    FROM sync_log
    WHERE id = ?
  `).get(id) as { intentos: number } | undefined;

  const intentos = (row?.intentos ?? 0) + 1;
  const status = intentos >= limiteIntentos ? 'ERROR' : 'PENDIENTE';

  db.prepare(`
    UPDATE sync_log
    SET intentos = ?,
        error = ?,
        status = ?
    WHERE id = ?
  `).run(intentos, error, status, id);
}

/**
 * Cuenta los registros pendientes y en error del `sync_log`.
 *
 * Expuesto por el endpoint `/sync/pendientes-local` para mostrar el badge de
 * "pendientes por sincronizar" en el frontend.
 *
 * @returns `{ pendientes, errores }`.
 */
export function contarPendientes() {
  const db = getSqlite();

  const pendientes = db.prepare(`
    SELECT COUNT(*) AS count
    FROM sync_log
    WHERE status = ?
  `).get('PENDIENTE') as { count: number };

  const errores = db.prepare(`
    SELECT COUNT(*) AS count
    FROM sync_log
    WHERE status = ?
  `).get('ERROR') as { count: number };

  return {
    pendientes: pendientes?.count ?? 0,
    errores: errores?.count ?? 0,
  };
}
