-- T-10.1: Tabla cortes_caja para corte X (lectura), Y (cierre cajero) y Z (cierre del día)
-- Independiente de las HU de ecommerce — aplica en cualquier orden relativo a HU-16/17/18.

CREATE TABLE "cortes_caja" (
    "id"                  SERIAL PRIMARY KEY,
    "sucursal_id"         INTEGER NOT NULL REFERENCES "sucursales"("id"),
    -- cajero_id nullable: corte Z puede ser por toda la sucursal sin cajero específico
    "cajero_id"           INTEGER REFERENCES "usuarios"("id"),
    "tipo"                TEXT NOT NULL,              -- X | Y | Z
    "fecha_inicio"        TIMESTAMP(3) NOT NULL,
    "fecha_fin"           TIMESTAMP(3) NOT NULL,
    "total_efectivo"      DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total_tarjeta"       DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total_transferencia" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total_general"       DOUBLE PRECISION NOT NULL DEFAULT 0,
    "cantidad_ventas"     INTEGER NOT NULL DEFAULT 0,
    "observaciones"       TEXT,
    "creado_en"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Índice para historial: filtro por sucursal + tipo + fecha de cierre
CREATE INDEX "cortes_caja_sucursal_tipo_fechafin_idx"
    ON "cortes_caja"("sucursal_id", "tipo", "fecha_fin");
