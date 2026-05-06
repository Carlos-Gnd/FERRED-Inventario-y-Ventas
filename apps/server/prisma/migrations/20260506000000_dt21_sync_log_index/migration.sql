-- DT-21: índice compuesto en sync_log para acelerar el loop de drenaje offline
-- pushPendientes() filtra: WHERE status = 'PENDIENTE' (y opcionalmente por tabla)
-- Sin este índice el loop hace full-scan sobre toda la tabla en cada tick de 30s.

CREATE INDEX IF NOT EXISTS "sync_log_tabla_status_idx"
ON "sync_log" ("tabla", "status");
