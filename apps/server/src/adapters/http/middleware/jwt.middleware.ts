import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../../../config/env';

interface JwtPayload {
  id: number;
  rol: string;
  sucursalId: number;
  email: string;
}

export function jwtMiddleware(req: Request, res: Response, next: NextFunction) {
  const auth = req.headers.authorization;

  if (!auth?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token requerido' });
  }

  try {
    const token   = auth.slice(7);
    const payload = jwt.verify(token, env.jwt.secret) as JwtPayload;
    req.usuario   = {
      id:         payload.id,
      rol:        payload.rol as any,
      sucursalId: payload.sucursalId,
      email:      payload.email,
    };
    return next();
  } catch {
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }
}