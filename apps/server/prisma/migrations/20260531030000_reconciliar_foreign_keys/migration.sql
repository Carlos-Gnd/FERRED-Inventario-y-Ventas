-- Migration: reconciliar_foreign_keys
-- Saneamiento de drift: re-crea las 19 foreign keys que el esquema define pero que se habían
-- eliminado de la BD de producción fuera del flujo de migraciones (db push / cambios manuales).
-- Verificado: 0 datos huérfanos, así que la creación no falla por integridad.
-- Cada FK se elimina antes (IF EXISTS) para que la migración sea idempotente y segura ante estados parciales.

ALTER TABLE "usuarios" DROP CONSTRAINT IF EXISTS "usuarios_sucursal_id_fkey";
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_sucursal_id_fkey" FOREIGN KEY ("sucursal_id") REFERENCES "sucursales"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "productos" DROP CONSTRAINT IF EXISTS "productos_categoria_id_fkey";
ALTER TABLE "productos" ADD CONSTRAINT "productos_categoria_id_fkey" FOREIGN KEY ("categoria_id") REFERENCES "categorias"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "productos" DROP CONSTRAINT IF EXISTS "productos_tipo_unidad_fkey";
ALTER TABLE "productos" ADD CONSTRAINT "productos_tipo_unidad_fkey" FOREIGN KEY ("tipo_unidad") REFERENCES "unidades_medida"("codigo") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "stock_sucursal" DROP CONSTRAINT IF EXISTS "stock_sucursal_producto_id_fkey";
ALTER TABLE "stock_sucursal" ADD CONSTRAINT "stock_sucursal_producto_id_fkey" FOREIGN KEY ("producto_id") REFERENCES "productos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "stock_sucursal" DROP CONSTRAINT IF EXISTS "stock_sucursal_sucursal_id_fkey";
ALTER TABLE "stock_sucursal" ADD CONSTRAINT "stock_sucursal_sucursal_id_fkey" FOREIGN KEY ("sucursal_id") REFERENCES "sucursales"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "facturas_dte" DROP CONSTRAINT IF EXISTS "facturas_dte_sucursal_id_fkey";
ALTER TABLE "facturas_dte" ADD CONSTRAINT "facturas_dte_sucursal_id_fkey" FOREIGN KEY ("sucursal_id") REFERENCES "sucursales"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "facturas_dte" DROP CONSTRAINT IF EXISTS "facturas_dte_usuario_id_fkey";
ALTER TABLE "facturas_dte" ADD CONSTRAINT "facturas_dte_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "detalles_venta" DROP CONSTRAINT IF EXISTS "detalles_venta_factura_id_fkey";
ALTER TABLE "detalles_venta" ADD CONSTRAINT "detalles_venta_factura_id_fkey" FOREIGN KEY ("factura_id") REFERENCES "facturas_dte"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "detalles_venta" DROP CONSTRAINT IF EXISTS "detalles_venta_producto_id_fkey";
ALTER TABLE "detalles_venta" ADD CONSTRAINT "detalles_venta_producto_id_fkey" FOREIGN KEY ("producto_id") REFERENCES "productos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "sync_log" DROP CONSTRAINT IF EXISTS "sync_log_usuario_id_fkey";
ALTER TABLE "sync_log" ADD CONSTRAINT "sync_log_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "cortes_caja" DROP CONSTRAINT IF EXISTS "cortes_caja_sucursal_id_fkey";
ALTER TABLE "cortes_caja" ADD CONSTRAINT "cortes_caja_sucursal_id_fkey" FOREIGN KEY ("sucursal_id") REFERENCES "sucursales"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "cortes_caja" DROP CONSTRAINT IF EXISTS "cortes_caja_cajero_id_fkey";
ALTER TABLE "cortes_caja" ADD CONSTRAINT "cortes_caja_cajero_id_fkey" FOREIGN KEY ("cajero_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "zonas_envio" DROP CONSTRAINT IF EXISTS "zonas_envio_sucursal_id_preferente_fkey";
ALTER TABLE "zonas_envio" ADD CONSTRAINT "zonas_envio_sucursal_id_preferente_fkey" FOREIGN KEY ("sucursal_id_preferente") REFERENCES "sucursales"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "pedidos_online" DROP CONSTRAINT IF EXISTS "pedidos_online_sucursal_id_fkey";
ALTER TABLE "pedidos_online" ADD CONSTRAINT "pedidos_online_sucursal_id_fkey" FOREIGN KEY ("sucursal_id") REFERENCES "sucursales"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "pedidos_online" DROP CONSTRAINT IF EXISTS "pedidos_online_zona_envio_id_fkey";
ALTER TABLE "pedidos_online" ADD CONSTRAINT "pedidos_online_zona_envio_id_fkey" FOREIGN KEY ("zona_envio_id") REFERENCES "zonas_envio"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "pedidos_online" DROP CONSTRAINT IF EXISTS "pedidos_online_cliente_id_fkey";
ALTER TABLE "pedidos_online" ADD CONSTRAINT "pedidos_online_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "clientes_ecommerce"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "pedidos_online_detalle" DROP CONSTRAINT IF EXISTS "pedidos_online_detalle_pedido_id_fkey";
ALTER TABLE "pedidos_online_detalle" ADD CONSTRAINT "pedidos_online_detalle_pedido_id_fkey" FOREIGN KEY ("pedido_id") REFERENCES "pedidos_online"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "pedidos_online_detalle" DROP CONSTRAINT IF EXISTS "pedidos_online_detalle_producto_id_fkey";
ALTER TABLE "pedidos_online_detalle" ADD CONSTRAINT "pedidos_online_detalle_producto_id_fkey" FOREIGN KEY ("producto_id") REFERENCES "productos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "pagos" DROP CONSTRAINT IF EXISTS "pagos_pedido_id_fkey";
ALTER TABLE "pagos" ADD CONSTRAINT "pagos_pedido_id_fkey" FOREIGN KEY ("pedido_id") REFERENCES "pedidos_online"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
