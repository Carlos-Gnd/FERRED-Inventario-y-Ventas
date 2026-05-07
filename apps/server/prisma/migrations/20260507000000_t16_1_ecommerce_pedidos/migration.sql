-- T-16.1: Tablas para ecommerce — zonas_envio, pedidos_online, pedidos_online_detalle
-- Agrega stock_reservado a stock_sucursal para reservas atómicas sin afectar stock disponible.
-- cliente_id en pedidos_online queda nullable hasta que T-17.1 cree clientes_ecommerce.

-- Columna stock_reservado en tabla existente
ALTER TABLE "stock_sucursal" ADD COLUMN "stock_reservado" INTEGER NOT NULL DEFAULT 0;

-- Zonas geográficas mapeadas a una sucursal preferente para despacho
CREATE TABLE "zonas_envio" (
    "id"                     SERIAL PRIMARY KEY,
    "nombre"                 TEXT NOT NULL,
    "descripcion"            TEXT,
    "sucursal_id_preferente" INTEGER REFERENCES "sucursales"("id"),
    "costo_envio"            DOUBLE PRECISION NOT NULL DEFAULT 0,
    "activo"                 BOOLEAN NOT NULL DEFAULT true
);

-- Pedidos realizados desde la app ecommerce
CREATE TABLE "pedidos_online" (
    "id"              SERIAL PRIMARY KEY,
    "cliente_id"      INTEGER,                          -- FK a clientes_ecommerce (T-17.1)
    "sucursal_id"     INTEGER NOT NULL REFERENCES "sucursales"("id"),
    "zona_envio_id"   INTEGER REFERENCES "zonas_envio"("id"),
    "tipo_entrega"    TEXT NOT NULL DEFAULT 'RETIRO',   -- RETIRO | ENVIO
    "estado"          TEXT NOT NULL DEFAULT 'RECIBIDO', -- RECIBIDO | PREPARANDO | LISTO | ENTREGADO | CANCELADO
    "cliente_nombre"  TEXT,
    "cliente_tel"     TEXT,
    "direccion_envio" TEXT,
    "subtotal"        DOUBLE PRECISION NOT NULL DEFAULT 0,
    "costo_envio"     DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total"           DOUBLE PRECISION NOT NULL DEFAULT 0,
    "observaciones"   TEXT,
    "creado_en"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "pedidos_online_sucursal_id_estado_idx" ON "pedidos_online"("sucursal_id", "estado");
CREATE INDEX "pedidos_online_cliente_id_idx"         ON "pedidos_online"("cliente_id");

-- Líneas de cada pedido online
CREATE TABLE "pedidos_online_detalle" (
    "id"          SERIAL PRIMARY KEY,
    "pedido_id"   INTEGER NOT NULL REFERENCES "pedidos_online"("id") ON DELETE CASCADE,
    "producto_id" INTEGER NOT NULL REFERENCES "productos"("id"),
    "cantidad"    DOUBLE PRECISION NOT NULL,
    "precio_unit" DOUBLE PRECISION NOT NULL,
    "subtotal"    DOUBLE PRECISION NOT NULL
);

-- Seed: 5 zonas mapeadas a las sucursales existentes (sucursal_id 1 a 5 si existen)
-- La FK usa ON DELETE SET NULL implícito al ser nullable — no se define aquí para evitar
-- fallo si hay menos de 5 sucursales en el entorno de prueba.
INSERT INTO "zonas_envio" ("nombre", "descripcion", "sucursal_id_preferente", "costo_envio") VALUES
    ('Zona Centro',        'Centro histórico y alrededores',   1, 3.00),
    ('Zona Norte',         'Apopa, Mejicanos, Cuscatancingo',  1, 4.50),
    ('Zona Sur',           'Soyapango, Ilopango, San Marcos',  1, 4.50),
    ('Zona Oriente',       'San Miguel, Usulután, La Unión',   1, 8.00),
    ('Zona Occidente',     'Santa Ana, Sonsonate, Ahuachapán', 1, 8.00)
ON CONFLICT DO NOTHING;
