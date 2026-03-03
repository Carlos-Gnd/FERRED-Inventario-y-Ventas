import { Request, Response, NextFunction } from 'express';

export function roleGuard(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;
    if (!roles.includes(user?.role)) {
      return res.status(403).json({ error: 'Acceso denegado' });
    }
    next();
  };
}
