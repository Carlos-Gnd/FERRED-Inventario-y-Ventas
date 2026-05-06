/**
 * sucursal.guard.ts
 * Autorización cross-sucursal.
 *
 * Regla: un usuario no-ADMIN solo puede operar sobre recursos de su sucursal
 * asignada. Un ADMIN puede operar sobre cualquier sucursal.
 *
 * Fail-closed: si el usuario no-ADMIN no tiene sucursal asignada, se deniega.
 *
 * DT-08: Dos formas de uso:
 *   1. assertSameSucursal(req, res, id) — llamada manual dentro del handler
 *   2. sucursalGuard('sucursalId')      — middleware Express declarativo
 */
import { Request, Response, NextFunction } from 'express';

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

/**
 * Middleware factory que extrae sucursalId de params o body
 * y ejecuta assertSameSucursal automáticamente.
 *
 * Uso: router.get('/stock/:sucursalId', sucursalGuard('sucursalId'), handler)
 */
export function sucursalGuard(paramName: string = 'sucursalId') {
  return (req: Request, res: Response, next: NextFunction) => {
    const id = Number(req.params[paramName] ?? req.body?.[paramName]);

    if (isNaN(id) || id < 1) {
      return res.status(400).json({ error: `${paramName} inválido` });
    }

    if (!assertSameSucursal(req, res, id)) return;

    return next();
  };
}
