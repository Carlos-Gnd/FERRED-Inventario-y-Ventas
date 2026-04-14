/**
 * dte.routes.ts
 * T-08A.3: Endpoints de gestión de DTEs
 * T-08B.1: Endpoint de QR
 */
import { Router, Request, Response, NextFunction } from 'express';
import { roleMiddleware } from '../middleware/role.middleware';
import {
  enviarDteHacienda,
  reenviarDTE,
  obtenerEstadoDTE,
  listarDTEsSucursal,
  generarQRDte,
} from '../../dte/dte.service';
import { prisma } from '../../db/prisma/prisma.client';

export const dteRoutes = Router();

// GET /api/dte/sucursal/:sucursalId?limit=50&offset=0
dteRoutes.get(
  '/sucursal/:sucursalId',
  roleMiddleware('ADMIN', 'CAJERO'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const sucursalId = Number(req.params.sucursalId);
      const limit      = Math.min(Number(req.query.limit  ?? 50), 200);
      const offset     = Number(req.query.offset ?? 0);

      if (isNaN(sucursalId) || sucursalId < 1) {
        return res.status(400).json({ error: 'sucursalId inválido' });
      }

      const resultado = await listarDTEsSucursal(sucursalId, limit, offset);
      return res.json(resultado);
    } catch (err) { return next(err); }
  },
);

// GET /api/dte/:id
dteRoutes.get(
  '/:id',
  roleMiddleware('ADMIN', 'CAJERO'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const facturaId = Number(req.params.id);
      if (isNaN(facturaId) || facturaId < 1) {
        return res.status(400).json({ error: 'id inválido' });
      }

      const estado = await obtenerEstadoDTE(facturaId);
      return res.json(estado);
    } catch (err: any) {
      if (err.message?.includes('no encontrada')) return res.status(404).json({ error: err.message });
      return next(err);
    }
  },
);

// GET /api/dte/:id/qr
// Devuelve el QR base64 del DTE (genera uno nuevo si ya tiene codigoGeneracion)
dteRoutes.get(
  '/:id/qr',
  roleMiddleware('ADMIN', 'CAJERO'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const facturaId = Number(req.params.id);
      if (isNaN(facturaId) || facturaId < 1) {
        return res.status(400).json({ error: 'id inválido' });
      }

      const factura = await prisma.facturaDte.findUnique({
        where:  { id: facturaId },
        select: { codigoGeneracion: true, creadoEn: true },
      });

      if (!factura) return res.status(404).json({ error: 'Factura no encontrada' });

      if (!factura.codigoGeneracion) {
        return res.status(409).json({ error: 'La factura aún no tiene codigoGeneracion (enviar DTE primero)' });
      }

      const fechaEmi = factura.creadoEn.toISOString().split('T')[0];
      const qrBase64 = await generarQRDte(factura.codigoGeneracion, fechaEmi);

      return res.json({ qrBase64 });
    } catch (err) { return next(err); }
  },
);

// POST /api/dte/:id/enviar
dteRoutes.post(
  '/:id/enviar',
  roleMiddleware('ADMIN', 'CAJERO'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const facturaId = Number(req.params.id);
      if (isNaN(facturaId) || facturaId < 1) {
        return res.status(400).json({ error: 'id inválido' });
      }

      const resultado = await enviarDteHacienda(facturaId);
      const status    = resultado.ok ? 200 : 502;
      return res.status(status).json(resultado);
    } catch (err: any) {
      if (err.message?.includes('no encontrada')) return res.status(404).json({ error: err.message });
      return next(err);
    }
  },
);

// POST /api/dte/:id/reenviar
dteRoutes.post(
  '/:id/reenviar',
  roleMiddleware('ADMIN', 'CAJERO'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const facturaId = Number(req.params.id);
      if (isNaN(facturaId) || facturaId < 1) {
        return res.status(400).json({ error: 'id inválido' });
      }

      const resultado = await reenviarDTE(facturaId);
      const status    = resultado.ok ? 200 : 502;
      return res.status(status).json(resultado);
    } catch (err: any) {
      if (err.message?.includes('no encontrada')) return res.status(404).json({ error: err.message });
      return next(err);
    }
  },
);
