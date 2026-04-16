/**
 * sucursal.guard.ts
 * Helper de autorización cross-sucursal.
 *
 * Regla: un usuario no-ADMIN solo puede operar sobre recursos de su sucursal
 * asignada. Un ADMIN puede operar sobre cualquier sucursal.
 *
 * Fail-closed: si el usuario no-ADMIN no tiene sucursal asignada, se deniega.
 */
import { Request, Response } from 'express';

export function assertSameSucursal(
  req: Request,
  res: Response,
  recursoSucursalId: number | null | undefined,
): boolean {
  if (req.usuario?.rol === 'ADMIN') return true;

  if (!req.usuario?.sucursalId) {
    res.status(403).json({ error: 'Tu usuario no tiene sucursal asignada' });
    return false;
  }

  if (recursoSucursalId !== req.usuario.sucursalId) {
    res.status(403).json({ error: 'No podés acceder a recursos de otra sucursal' });
    return false;
  }

  return true;
}
