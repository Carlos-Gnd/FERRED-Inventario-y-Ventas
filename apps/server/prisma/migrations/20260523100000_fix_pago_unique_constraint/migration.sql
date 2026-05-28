-- Fix: reemplazar índice parcial por constraint completa en pagos(pedido_id, estado)
-- El índice parcial (WHERE estado='VALIDADO') no es compatible con el upsert de Prisma.

DROP INDEX IF EXISTS "pago_pedido_validado_unique";

-- Eliminar duplicados conservando solo el registro más reciente (mayor id) por (pedido_id, estado)
DELETE FROM "pagos"
WHERE id NOT IN (
  SELECT MAX(id) FROM "pagos" GROUP BY "pedido_id", "estado"
);

ALTER TABLE "pagos"
  ADD CONSTRAINT "pago_pedido_validado_unique"
  UNIQUE ("pedido_id", "estado");
