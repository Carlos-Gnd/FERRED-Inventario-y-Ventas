-- T-24.1: Gastos operativos — TipoGasto y Gasto
-- HU-24: Módulo de registro de gastos por sucursal

CREATE TABLE IF NOT EXISTS "tipos_gasto" (
    "id"          SERIAL NOT NULL,
    "nombre"      TEXT   NOT NULL,
    "descripcion" TEXT,
    CONSTRAINT "tipos_gasto_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "tipos_gasto_nombre_key" ON "tipos_gasto"("nombre");

CREATE TABLE IF NOT EXISTS "gastos" (
    "id"           SERIAL            NOT NULL,
    "tipo_gasto_id" INTEGER          NOT NULL,
    "monto"        DOUBLE PRECISION  NOT NULL,
    "descripcion"  TEXT,
    "fecha"        TIMESTAMP(3)      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sucursal_id"  INTEGER           NOT NULL,
    "usuario_id"   INTEGER           NOT NULL,
    CONSTRAINT "gastos_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "gastos_sucursal_id_fecha_idx" ON "gastos"("sucursal_id", "fecha");

ALTER TABLE "gastos"
    ADD CONSTRAINT "gastos_tipo_gasto_id_fkey"
    FOREIGN KEY ("tipo_gasto_id") REFERENCES "tipos_gasto"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "gastos"
    ADD CONSTRAINT "gastos_sucursal_id_fkey"
    FOREIGN KEY ("sucursal_id") REFERENCES "sucursales"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "gastos"
    ADD CONSTRAINT "gastos_usuario_id_fkey"
    FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
