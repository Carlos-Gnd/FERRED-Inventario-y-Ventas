-- CreateTable
CREATE TABLE "proveedores" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "nit" TEXT,
    "telefono" TEXT,
    "email" TEXT,
    "direccion" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "proveedores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recepciones_mercancia" (
    "id" SERIAL NOT NULL,
    "proveedor_id" INTEGER NOT NULL,
    "sucursal_id" INTEGER NOT NULL,
    "usuario_id" INTEGER,
    "numero_factura" TEXT,
    "total" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "observaciones" TEXT,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recepciones_mercancia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "detalles_recepcion" (
    "id" SERIAL NOT NULL,
    "recepcion_id" INTEGER NOT NULL,
    "producto_id" INTEGER NOT NULL,
    "cantidad" DOUBLE PRECISION NOT NULL,
    "costo_unit" DOUBLE PRECISION NOT NULL,
    "subtotal" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "detalles_recepcion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "proveedores_nit_key" ON "proveedores"("nit");

-- AddForeignKey
ALTER TABLE "recepciones_mercancia" ADD CONSTRAINT "recepciones_mercancia_proveedor_id_fkey" FOREIGN KEY ("proveedor_id") REFERENCES "proveedores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recepciones_mercancia" ADD CONSTRAINT "recepciones_mercancia_sucursal_id_fkey" FOREIGN KEY ("sucursal_id") REFERENCES "sucursales"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recepciones_mercancia" ADD CONSTRAINT "recepciones_mercancia_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "detalles_recepcion" ADD CONSTRAINT "detalles_recepcion_recepcion_id_fkey" FOREIGN KEY ("recepcion_id") REFERENCES "recepciones_mercancia"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "detalles_recepcion" ADD CONSTRAINT "detalles_recepcion_producto_id_fkey" FOREIGN KEY ("producto_id") REFERENCES "productos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

