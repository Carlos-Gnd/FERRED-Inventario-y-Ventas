-- CreateTable
CREATE TABLE "sucursales" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nombre" TEXT NOT NULL,
    "direccion" TEXT,
    "telefono" TEXT
);

-- CreateTable
CREATE TABLE "categorias" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT
);

-- CreateTable
CREATE TABLE "usuarios" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "sucursal_id" INTEGER,
    "nombre" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "contrasena_hash" TEXT NOT NULL,
    "rol" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creado_en" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "usuarios_sucursal_id_fkey" FOREIGN KEY ("sucursal_id") REFERENCES "sucursales" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "productos" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "categoria_id" INTEGER,
    "nombre" TEXT NOT NULL,
    "codigo_barras" TEXT,
    "tipo_unidad" TEXT,
    "precio_compra" REAL,
    "porcentaje_ganancia" REAL,
    "precio_venta" REAL,
    "precio_con_iva" REAL,
    "tiene_iva" BOOLEAN NOT NULL DEFAULT true,
    "stock_actual" INTEGER NOT NULL DEFAULT 0,
    "stock_minimo" INTEGER NOT NULL DEFAULT 0,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creado_en" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "productos_categoria_id_fkey" FOREIGN KEY ("categoria_id") REFERENCES "categorias" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "facturas_dte" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "sucursal_id" INTEGER,
    "usuario_id" INTEGER,
    "codigo_generacion" TEXT,
    "numero_control" TEXT,
    "tipo_dte" TEXT NOT NULL DEFAULT '01',
    "cliente_nombre" TEXT NOT NULL DEFAULT 'Consumidor Final',
    "total_sin_iva" REAL,
    "iva" REAL,
    "total" REAL,
    "dte_json" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'SIMULADO',
    "creado_en" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "facturas_dte_sucursal_id_fkey" FOREIGN KEY ("sucursal_id") REFERENCES "sucursales" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "facturas_dte_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "detalles_venta" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "factura_id" INTEGER NOT NULL,
    "producto_id" INTEGER NOT NULL,
    "cantidad" REAL NOT NULL,
    "precio_unit" REAL NOT NULL,
    "subtotal" REAL NOT NULL,
    CONSTRAINT "detalles_venta_factura_id_fkey" FOREIGN KEY ("factura_id") REFERENCES "facturas_dte" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "detalles_venta_producto_id_fkey" FOREIGN KEY ("producto_id") REFERENCES "productos" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "sync_log" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "usuario_id" INTEGER,
    "tabla" TEXT NOT NULL,
    "operacion" TEXT NOT NULL,
    "payload" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDIENTE',
    "creado_en" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sinc_en" DATETIME,
    CONSTRAINT "sync_log_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "categorias_nombre_key" ON "categorias"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- CreateIndex
CREATE UNIQUE INDEX "productos_codigo_barras_key" ON "productos"("codigo_barras");

-- CreateIndex
CREATE UNIQUE INDEX "facturas_dte_codigo_generacion_key" ON "facturas_dte"("codigo_generacion");

-- CreateIndex
CREATE UNIQUE INDEX "facturas_dte_numero_control_key" ON "facturas_dte"("numero_control");
