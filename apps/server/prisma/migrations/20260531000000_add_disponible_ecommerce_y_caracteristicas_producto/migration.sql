-- Migration: add_disponible_ecommerce_y_caracteristicas_producto
-- Agrega a productos:
--   disponible_ecommerce: controla si el producto se muestra en el catálogo de la tienda online.
--   caracteristicas:      atributos dinámicos clave-valor (color, voltaje, material, etc.) como JSON.

ALTER TABLE "productos" ADD COLUMN "disponible_ecommerce" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "productos" ADD COLUMN "caracteristicas" JSONB;

-- Backfill: los productos activos actuales quedan visibles en la tienda para no vaciar el catálogo.
-- Lo nuevo arranca oculto (default false) y se activa manualmente desde el POS.
UPDATE "productos" SET "disponible_ecommerce" = true WHERE "activo" = true;
