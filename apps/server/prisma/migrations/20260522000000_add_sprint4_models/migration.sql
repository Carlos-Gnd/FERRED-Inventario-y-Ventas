-- Sprint 4: nuevas tablas y columnas
-- T-22.1: imageUrl en Producto
ALTER TABLE "productos" ADD COLUMN IF NOT EXISTS "image_url" TEXT;

-- T-20.1: ConfiguracionNegocio
CREATE TABLE IF NOT EXISTS "configuracion_negocio" (
    "id" SERIAL NOT NULL,
    "clave" TEXT NOT NULL,
    "valor" TEXT NOT NULL,
    "tipo" TEXT NOT NULL DEFAULT 'TEXT',
    "actualizado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "configuracion_negocio_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "configuracion_negocio_clave_key" ON "configuracion_negocio"("clave");

-- T-23.1: Ofertas web
CREATE TABLE IF NOT EXISTS "ofertas" (
    "id" SERIAL NOT NULL,
    "producto_id" INTEGER NOT NULL,
    "precio_oferta" DOUBLE PRECISION NOT NULL,
    "fecha_inicio" TIMESTAMP(3) NOT NULL,
    "fecha_fin" TIMESTAMP(3) NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ofertas_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "ofertas_producto_id_activo_idx" ON "ofertas"("producto_id", "activo");
ALTER TABLE "ofertas" ADD CONSTRAINT "ofertas_producto_id_fkey" FOREIGN KEY ("producto_id") REFERENCES "productos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- T-25.1: Kardex — MovimientoInventario
CREATE TABLE IF NOT EXISTS "movimientos_inventario" (
    "id" SERIAL NOT NULL,
    "producto_id" INTEGER NOT NULL,
    "sucursal_id" INTEGER NOT NULL,
    "tipo" TEXT NOT NULL,
    "cantidad" DOUBLE PRECISION NOT NULL,
    "saldo_anterior" INTEGER NOT NULL,
    "saldo_nuevo" INTEGER NOT NULL,
    "referencia" TEXT,
    "usuario_id" INTEGER,
    "fecha_movimiento" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "movimientos_inventario_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "movimientos_inventario_producto_id_sucursal_id_fecha_movimient_idx"
  ON "movimientos_inventario"("producto_id", "sucursal_id", "fecha_movimiento");
ALTER TABLE "movimientos_inventario" ADD CONSTRAINT "movimientos_inventario_producto_id_fkey" FOREIGN KEY ("producto_id") REFERENCES "productos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "movimientos_inventario" ADD CONSTRAINT "movimientos_inventario_sucursal_id_fkey" FOREIGN KEY ("sucursal_id") REFERENCES "sucursales"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "movimientos_inventario" ADD CONSTRAINT "movimientos_inventario_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- T-12.1: Devoluciones y garantias
CREATE TABLE IF NOT EXISTS "devoluciones" (
    "id" SERIAL NOT NULL,
    "venta_id" INTEGER NOT NULL,
    "motivo" TEXT NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'APROBADA',
    "aprobado_por" INTEGER,
    "creado_por" INTEGER NOT NULL,
    "fecha_devolucion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "devoluciones_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "devoluciones_venta_id_idx" ON "devoluciones"("venta_id");
ALTER TABLE "devoluciones" ADD CONSTRAINT "devoluciones_venta_id_fkey" FOREIGN KEY ("venta_id") REFERENCES "facturas_dte"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "devoluciones" ADD CONSTRAINT "devoluciones_aprobado_por_fkey" FOREIGN KEY ("aprobado_por") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "devoluciones" ADD CONSTRAINT "devoluciones_creado_por_fkey" FOREIGN KEY ("creado_por") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "detalles_devolucion" (
    "id" SERIAL NOT NULL,
    "devolucion_id" INTEGER NOT NULL,
    "producto_id" INTEGER NOT NULL,
    "cantidad" DOUBLE PRECISION NOT NULL,
    CONSTRAINT "detalles_devolucion_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "detalles_devolucion" ADD CONSTRAINT "detalles_devolucion_devolucion_id_fkey" FOREIGN KEY ("devolucion_id") REFERENCES "devoluciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "detalles_devolucion" ADD CONSTRAINT "detalles_devolucion_producto_id_fkey" FOREIGN KEY ("producto_id") REFERENCES "productos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Renombrar indices que Prisma espera con nombres estándar (si existen con nombres viejos)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'cortes_caja_sucursal_tipo_fechafin_idx') THEN
    ALTER INDEX "cortes_caja_sucursal_tipo_fechafin_idx" RENAME TO "cortes_caja_sucursal_id_tipo_fecha_fin_idx";
  END IF;
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'uq_producto_sucursal') THEN
    ALTER INDEX "uq_producto_sucursal" RENAME TO "stock_sucursal_producto_id_sucursal_id_key";
  END IF;
END $$;
