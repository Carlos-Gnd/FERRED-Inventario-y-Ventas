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

export function logPendienteLocal(
  tabla: string,
  operacion: 'CREATE' | 'UPDATE' | 'DELETE',
  payload: object,
  usuarioId?: number
) {
  assertTablaSync(tabla);

  const db = getSqlite();

  const result = db.prepare(`
    INSERT INTO sync_log (tabla, operacion, payload, usuario_id, status)
    VALUES (?, ?, ?, ?, ?)
  `).run(tabla, operacion, JSON.stringify(payload), usuarioId ?? null, 'PENDIENTE');

  return Number(result.lastInsertRowid);
}

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
