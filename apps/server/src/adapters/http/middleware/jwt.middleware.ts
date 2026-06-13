import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../../../config/env';
import type { UserRole } from '../../../types/roles';

interface JwtPayload {
  id: number;
  rol: UserRole;
  sucursalId: number;
  email: string;
}

/**
 * Middleware de autenticación. Verifica el `Authorization: Bearer <token>`, y al ser
 * válido popula `req.usuario = { id, rol, sucursalId, email }` para el resto del pipeline.
 *
 * Montado GLOBALMENTE en `index.ts` después de las rutas públicas: toda ruta posterior
 * exige token. Responde `401` si falta el header o el token es inválido/expirado.
 */
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
      rol:        payload.rol,
      sucursalId: payload.sucursalId,
      email:      payload.email,
    };
    return next();
  } catch {
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }
}