-- Migration: add_cliente_email_a_facturas_dte
-- Correo del cliente para enviarle el comprobante de venta (obligatorio en CCF, opcional en CF).

ALTER TABLE "facturas_dte" ADD COLUMN "cliente_email" TEXT;
