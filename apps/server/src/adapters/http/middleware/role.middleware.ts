import { Request, Response, NextFunction } from 'express';
import { UserRole } from '../../../types/roles';

/**
 * Middleware factory que restringe una ruta a los roles indicados.
 *
 * Requiere que `jwtMiddleware` ya haya corrido (`req.usuario`). Responde `401` si no
 * hay usuario autenticado, o `403` si su rol no está en la lista permitida.
 *
 * @param rolesPermitidos Roles autorizados, p.ej. `roleMiddleware('ADMIN', 'CAJERO')`.
 */
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