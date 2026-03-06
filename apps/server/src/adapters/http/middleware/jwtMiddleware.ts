import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export function jwtMiddleware(req: Request, res: Response, next: NextFunction) {
  const auth = req.headers.authorization;

  if (!auth?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token requerido' });
  }

  try {
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      return res.status(500).json({ error: 'Configuracion JWT incompleta' });
    }

    const token = auth.slice(7);
    const payload = jwt.verify(token, jwtSecret) as any;
    (req as any).usuario = payload;
    // Compatibilidad con middlewares existentes (roleGuard y branchGuard)
    (req as any).user = payload;
    next();
  } catch {
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }
}
