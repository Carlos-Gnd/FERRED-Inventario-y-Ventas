import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export function jwtMiddleware(req: Request, res: Response, next: NextFunction) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) return res.status(401).json({ error: 'Token requerido' });

  try {
    const payload = jwt.verify(auth.slice(7), process.env.JWT_SECRET!) as any;
    // Adjunta el usuario y el branchId al request para que lo use branchGuard
    (req as any).user = payload;
    next();
  } catch {
    res.status(401).json({ error: 'Token inválido' });
  }
}
