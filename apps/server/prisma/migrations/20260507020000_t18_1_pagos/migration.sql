-- T-18.1: Tabla pagos para pedidos online
-- Depende de T-16.1 (20260507000000) y T-17.1 (20260507010000).
-- Métodos: EFECTIVO, TARJETA (simulada), TRANSFERENCIA (comprobante + validación manual).

CREATE TABLE "pagos" (
    "id"               SERIAL PRIMARY KEY,
    "pedido_id"        INTEGER NOT NULL REFERENCES "pedidos_online"("id"),
    "metodo"           TEXT NOT NULL,                    -- EFECTIVO | TARJETA | TRANSFERENCIA
    "referencia"       TEXT,                             -- últimos 4 dígitos, nro transferencia, etc.
    "comprobante_url"  TEXT,                             -- ruta imagen para transferencia
    "monto"            DOUBLE PRECISION NOT NULL,
    -- Estado inicial varía según método:
    --   EFECTIVO       → PENDIENTE
    --   TARJETA        → VALIDADO (aprobación simulada inmediata)
    --   TRANSFERENCIA  → VALIDACION_PENDIENTE
    "estado"           TEXT NOT NULL DEFAULT 'PENDIENTE',
    "motivo_rechazo"   TEXT,
    "creado_en"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validado_en"      TIMESTAMP(3)
);

-- Garantiza que un pedido no tenga dos pagos en estado VALIDADO
CREATE UNIQUE INDEX "pago_pedido_validado_unique" ON "pagos"("pedido_id", "estado")
    WHERE "estado" = 'VALIDADO';

CREATE INDEX "pagos_pedido_id_idx" ON "pagos"("pedido_id");
