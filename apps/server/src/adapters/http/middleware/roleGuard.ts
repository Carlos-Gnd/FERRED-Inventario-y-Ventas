import { Request, Response, NextFunction } from 'express';

export function roleGuard(...rolesPermitidos: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const usuario = (req as any).usuario ?? (req as any).user;

    if (!usuario) {
      return res.status(401).json({ error: 'No autenticado' });
    }

    const rolUsuario = usuario.rol ?? usuario.role;

    if (!rolesPermitidos.includes(rolUsuario)) {
      return res.status(403).json({
        error: 'Acceso denegado',
        mensaje: `Tu rol (${rolUsuario}) no tiene permiso para esta acción`,
      });
    }

    next();
  };
}
