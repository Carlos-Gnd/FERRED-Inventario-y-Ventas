/**
 * sync.routes.ts — T-07E.4
 * POST /api/sync/snapshot  → dispara refreshSnapshot() manualmente.
 * Útil para el botón "Sincronizar ahora" del frontend (T-07E.5).
 */
import { Router, Request, Response, NextFunction } from 'express';
import { roleMiddleware } from '../middleware/role.middleware';
import { bootstrapSnapshot, getLastSnapshotAt, refreshSnapshot } from '../../sync/snapshot.service';
import { SyncService } from '../../sync/sync.service';

export const syncRoutes = Router();

syncRoutes.get(
  '/snapshot/status',
  roleMiddleware('ADMIN', 'BODEGA', 'CAJERO'),
  async (req: Request, res: Response) => {
    const sucursalId = req.usuario?.sucursalId;

    if (!sucursalId) {
      return res.status(400).json({ error: 'Tu usuario no tiene sucursal asignada' });
    }

    const lastSyncAt = getLastSnapshotAt(sucursalId);
    const online = await SyncService.checkConnectivity();

    return res.json({
      online,
      sucursalId,
      lastSyncAt: lastSyncAt ? lastSyncAt.toISOString() : null,
    });
  },
);

syncRoutes.post(
  '/snapshot',
  roleMiddleware('ADMIN', 'BODEGA', 'CAJERO'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const sucursalId = req.usuario?.sucursalId;

      if (!sucursalId) {
        return res.status(400).json({ error: 'Tu usuario no tiene sucursal asignada' });
      }

      if (!SyncService.isOnline()) {
        return res.status(503).json({ error: 'Sin conexión a la nube — no se puede sincronizar ahora' });
      }

      const full   = req.query.full === 'true';
      const counts = full
        ? await bootstrapSnapshot(sucursalId)
        : await refreshSnapshot(sucursalId);
      const lastSyncAt = getLastSnapshotAt(sucursalId);

      return res.json({
        ok: true,
        counts,
        lastSyncAt: lastSyncAt ? lastSyncAt.toISOString() : null,
      });
    } catch (err) {
      return next(err);
    }
  },
);
