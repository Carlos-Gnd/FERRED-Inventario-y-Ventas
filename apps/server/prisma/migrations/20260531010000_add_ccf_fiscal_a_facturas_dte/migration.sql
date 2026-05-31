-- Migration: add_ccf_fiscal_a_facturas_dte
-- Agrega a facturas_dte los datos fiscales del receptor para Comprobante de Crédito Fiscal (DTE tipo 03)
-- y el monto de Retención IVA 1%.

ALTER TABLE "facturas_dte" ADD COLUMN "cliente_nit"  TEXT;
ALTER TABLE "facturas_dte" ADD COLUMN "cliente_nrc"  TEXT;
ALTER TABLE "facturas_dte" ADD COLUMN "cliente_giro" TEXT;
ALTER TABLE "facturas_dte" ADD COLUMN "iva_rete1"    DOUBLE PRECISION DEFAULT 0;
