import { Request, Response, NextFunction } from 'express';

// Este middleware inyecta el branchId en cada request protegido.
// Los controladores y repositorios lo leen de req.branchId.
// RB-03: garantiza que cada sucursal solo opera sobre sus propios datos.
export function branchGuard(req: Request, _res: Response, next: NextFunction) {
  const user = (req as any).user;
  // Si el usuario es ADMIN puede recibir branchId por query param para reportes
  (req as any).branchId = user.role === 'ADMIN' && req.query.branchId
    ? Number(req.query.branchId)
    : Number(user.branchId);
  next();
}
