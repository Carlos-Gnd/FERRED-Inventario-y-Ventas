-- T-07E.2: columnas updated_at para sincronizacion incremental por delta.

ALTER TABLE "categorias"
ADD COLUMN "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "productos"
ADD COLUMN "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "stock_sucursal"
ADD COLUMN "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

UPDATE "stock_sucursal"
SET "updated_at" = "actualizado_en"
WHERE "actualizado_en" IS NOT NULL;
