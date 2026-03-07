import { Request, Response, NextFunction } from 'express';
import { UserRole } from '../../../types/roles';

// Uso: roleMiddleware('ADMIN') o roleMiddleware('ADMIN', 'CAJERO')
export function roleMiddleware(...rolesPermitidos: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.usuario) {
      return res.status(401).json({ error: 'No autenticado' });
    }

    const rolUsuario = req.usuario.rol as UserRole;

    if (!rolesPermitidos.includes(rolUsuario)) {
      return res.status(403).json({
        error: 'Acceso denegado',
        detalle: `Tu rol (${rolUsuario}) no tiene permiso para esta acción`,
      });
    }

    return next();
  };
}