-- DT-NUEVA-B: Agregar updated_at a proveedores y usuarios para delta sync
-- Sin esta columna el snapshot.service solo capturaba proveedores NUEVOS (por creadoEn)
-- y re-sincronizaba TODOS los usuarios en cada refresh (costoso y sin delta real).
-- Con @updatedAt Prisma actualiza el campo automáticamente en cada update,
-- lo que permite filtrar por fecha en refreshSnapshot().

ALTER TABLE "proveedores"
  ADD COLUMN "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "usuarios"
  ADD COLUMN "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
