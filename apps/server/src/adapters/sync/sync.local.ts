import { getSqlite } from '../db/sqlite/sqlite.client';

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
  const db = getSqlite();

  const result = db.prepare(`
    INSERT INTO sync_log (tabla, operacion, payload, usuario_id, status)
    VALUES (?, ?, ?, ?, 'PENDIENTE')
  `).run(tabla, operacion, JSON.stringify(payload), usuarioId ?? null);

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
    WHERE status = 'PENDIENTE'
    ORDER BY creado_en ASC, id ASC
    LIMIT ?
  `).all(limit) as SyncLocalLog[];
}

export function marcarSincronizado(id: number) {
  const db = getSqlite();

  db.prepare(`
    UPDATE sync_log
    SET status = 'SINCRONIZADO',
        error = NULL,
        sinc_en = datetime('now')
    WHERE id = ?
  `).run(id);
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
    WHERE status = 'PENDIENTE'
  `).get() as { count: number };

  const errores = db.prepare(`
    SELECT COUNT(*) AS count
    FROM sync_log
    WHERE status = 'ERROR'
  `).get() as { count: number };

  return {
    pendientes: pendientes?.count ?? 0,
    errores: errores?.count ?? 0,
  };
}
