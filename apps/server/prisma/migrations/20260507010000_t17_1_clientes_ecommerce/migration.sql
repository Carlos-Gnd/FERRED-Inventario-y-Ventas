-- T-17.1: Tabla clientes_ecommerce y FK desde pedidos_online.cliente_id
-- Depende de T-16.1 (20260507000000) — debe ejecutarse después de esa migración.

-- Cuenta del cliente del ecommerce (distinto al Usuario interno del POS)
CREATE TABLE "clientes_ecommerce" (
    "id"             SERIAL PRIMARY KEY,
    "nombre"         TEXT NOT NULL,
    "email"          TEXT NOT NULL,
    "password_hash"  TEXT NOT NULL,
    "telefono"       TEXT,
    "direccion"      TEXT,
    "activo"         BOOLEAN NOT NULL DEFAULT true,
    "fecha_registro" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX "clientes_ecommerce_email_key" ON "clientes_ecommerce"("email");

-- Agregar FK real desde pedidos_online.cliente_id → clientes_ecommerce
-- Los pedidos huérfanos (cliente_id IS NULL) creados antes de esta migración
-- permanecen válidos porque la columna sigue siendo nullable.
ALTER TABLE "pedidos_online"
    ADD CONSTRAINT "pedidos_online_cliente_id_fkey"
    FOREIGN KEY ("cliente_id") REFERENCES "clientes_ecommerce"("id")
    ON DELETE SET NULL;
