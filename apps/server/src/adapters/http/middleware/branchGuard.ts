import { Request, Response, NextFunction } from 'express';

// Inyecta el sucursalId en cada request para separar datos por sucursal.
export function branchGuard(req: Request, _res: Response, next: NextFunction) {
  const usuario = (req as any).usuario ?? (req as any).user;
  if (!usuario) {
    throw new Error('Usuario no autenticado');
  }

  // Admin puede ver otras sucursales via query param
  // El resto solo ve su propia sucursal
  const rolUsuario = usuario?.rol ?? usuario?.role;
  const sucursalBase = usuario?.sucursalId ?? usuario?.branchId;
  const sucursalQuery = req.query.sucursalId ?? req.query.branchId;
  const sucursalId = rolUsuario === 'ADMIN' && sucursalQuery
    ? Number(sucursalQuery)
    : Number(sucursalBase);
  if (!Number.isFinite(sucursalId) || sucursalId <= 0) {
    throw new Error('Sucursal invalida');
  }

  (req as any).sucursalId = sucursalId;
  // Compatibilidad con código existente
  (req as any).branchId = sucursalId;

  next();
}
