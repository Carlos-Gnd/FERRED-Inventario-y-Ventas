import { Router, Request, Response, NextFunction } from 'express';
import {
  PagoServiceError,
  RegistrarPagoSchema,
  registrarPago,
} from '../services/pagos.service';

export const pagosOnlineRoutes = Router();

pagosOnlineRoutes.post('/:id/pago', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const pedidoId = Number(req.params.id);
    if (!Number.isInteger(pedidoId) || pedidoId < 1) {
      return res.status(400).json({ error: 'pedidoId invalido' });
    }

    const parsed = RegistrarPagoSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: 'Datos de pago invalidos',
        detalle: parsed.error.flatten().fieldErrors,
      });
    }

    const pago = await registrarPago(pedidoId, parsed.data);
    const statusCode = pago.estado === 'RECHAZADO' ? 402 : 201;

    return res.status(statusCode).json({
      ok: pago.estado !== 'RECHAZADO',
      pago,
    });
  } catch (error) {
    if (error instanceof PagoServiceError) {
      return res.status(error.statusCode).json({ error: error.message });
    }

    return next(error);
  }
});
