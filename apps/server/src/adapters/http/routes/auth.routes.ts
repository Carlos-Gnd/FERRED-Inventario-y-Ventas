import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { prisma } from '../../db/prisma/prisma.client';
import { env } from '../../../config/env';
import type { UserRole } from '../../../types/roles';
import { getSqliteDb } from '../../db/sqlite.client';

export const authRoutes = Router();

const loginSchema = z.object({
  email:    z.string().email('Email inválido'),
  password: z.string().min(1, 'Contraseña requerida'),
});

//Helper reutilizable para verificar el rol del usuario
interface UsuarioPayload {
  id:         number;
  rol:        UserRole;
  sucursalId: number | null;
  email:      string;
  nombre:    string;
}
/**
 * T-07F.1 – Extrae la generación del JWT a un helper reutilizable.
 * Mismo secret y misma estructura que usa jwtMiddleware.
 */

function issueJwt(usuario: UsuarioPayload): string {
  return jwt.sign(
    {
      id:         usuario.id,
      rol:        usuario.rol,
      sucursalId: usuario.sucursalId,
      email:      usuario.email,
    },
    env.jwt.secret,
    { expiresIn: env.jwt.expiresIn } as jwt.SignOptions,
  );
}

interface ErrorConCode extends Error {
  code?: string;
}

// -- T-07F.1 Login Contra SQLite local
/**
 * Valida credenciales contra la tabla `usuarios` del espejo SQLite local.
 * Solo se invoca cuando Prisma no está disponible por fallo de red.
 *
 * throws Error con code 'INVALID_CREDENTIALS' si las credenciales son malas.
 */

// BUG-NUEVO-J: better-sqlite3 es síncrono — eliminado await espurio
async function loginOffline(
  email: string,
  password: string
): Promise<{token: string, usuario: UsuarioPayload}> {
  const db = getSqliteDb();

  const row = db.prepare(
    `SELECT id,
            nombre,
            email,
            contrasena_hash,
            rol,
            sucursal_id,
            activo
     FROM usuarios
     WHERE email = ?
     LIMIT 1`
  ).get(email) as {
    id: number;
    nombre: string;
    email: string;
    contrasena_hash: string;
    rol: UserRole;
    sucursal_id: number | null;
    activo: number;
  } | undefined;

  if (!row || !row.activo) {
    const err = new Error('Credenciales incorrectas');
    (err as ErrorConCode).code = 'INVALID_CREDENTIALS';
    throw err;
  }

  const esValida = await bcrypt.compare(password, row.contrasena_hash);
  if (!esValida) {
    const err = new Error('Credenciales incorrectas');
    (err as ErrorConCode).code = 'INVALID_CREDENTIALS';
    throw err;
  }

  const payload: UsuarioPayload = {
    id:         row.id,
    rol:        row.rol as UserRole,
    sucursalId: row.sucursal_id,
    email:      row.email,
    nombre:     row.nombre,
  };
  return { token: issueJwt(payload), usuario: payload };
}

// Detecta error de red vs error de credenciales
/**
 * Devuelve true solo si el error proviene de un fallo de conexión con la BD,
 * NO de credenciales incorrectas. Esto protege el fallback offline de ser
 * bypasseado cuando las credenciales son inválidas (T-07F.2).
 */
function esErrorDeRed(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const msg = err.message ?? '';
  const maybeCode = (err as ErrorConCode).code ?? '';
 
  // Códigos de Prisma por fallo de conexión
  if (['P1001', 'P1002', 'P1017'].some((code) => maybeCode === code || msg.includes(code))) return true;
 
  // Errores de red de Node.js
  return ['ECONNREFUSED', 'ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND', 'socket hang up']
    .some((token) => msg.includes(token));
}

// ─── POST /api/auth/login ───────────────────────────────────────────────────
 
/**
 * T-07F.2 – Flujo con fallback offline:
 *  1. Intentar Prisma (online).
 *  2. Si Prisma falla por CREDENCIALES → 401, sin fallback (no bypass seguridad).
 *  3. Si Prisma falla por RED → loginOffline() contra SQLite local.
 *  4. Si loginOffline también falla por credenciales → 401.
 *  5. Si SQLite no disponible → 503.
 */
authRoutes.post('/login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0].message });
    }
 
    const { email, password } = parsed.data;
    const emailNorm = email.trim().toLowerCase();
 
    // ── Intento online (Prisma)
    try {
      const usuario = await prisma.usuario.findUnique({ where: { email: emailNorm } });
 
      if (!usuario || !usuario.activo) {
        return res.status(401).json({ error: 'Credenciales incorrectas' });
      }
 
      const esValida = await bcrypt.compare(password, usuario.contrasenaHash);
      if (!esValida) {
        return res.status(401).json({ error: 'Credenciales incorrectas' });
      }
 
      const payload: UsuarioPayload = {
        id:         usuario.id,
        rol:        usuario.rol as UserRole,
        sucursalId: usuario.sucursalId,
        email:      usuario.email,
        nombre:     usuario.nombre,
      };
 
      return res.json({
        token:   issueJwt(payload),
        usuario: {
          id:         payload.id,
          nombre:     payload.nombre,
          email:      payload.email,
          rol:        payload.rol,
          sucursalId: payload.sucursalId,
        },
      });
 
    } catch (prismaErr) {
      // Si NO es error de red, lo propagamos normalmente (no aplicar fallback)
      if (!esErrorDeRed(prismaErr)) throw prismaErr;
 
      // Prisma caído por red → fallback offline
      console.warn('[auth] Prisma no disponible, intentando login offline...');
 
      try {
        const result = await loginOffline(emailNorm, password);
        res.setHeader('X-Auth-Mode', 'offline');
        return res.json({
          token:   result.token,
          usuario: {
            id:         result.usuario.id,
            nombre:     result.usuario.nombre,
            email:      result.usuario.email,
            rol:        result.usuario.rol,
            sucursalId: result.usuario.sucursalId,
          },
        });
      } catch (offlineErr: unknown) {
        if ((offlineErr as ErrorConCode | undefined)?.code === 'INVALID_CREDENTIALS') {
          return res.status(401).json({ error: 'Credenciales incorrectas' });
        }
        console.error('[auth] Error en login offline:', offlineErr);
        return res.status(503).json({
          error: 'Servicio no disponible. Intente de nuevo cuando haya conexión.',
        });
      }
    }
 
  } catch (err) {
    return next(err);
  }
});
 
// POST /api/auth/logout — el cliente simplemente descarta el token
authRoutes.post('/logout', (_req: Request, res: Response) => res.json({ ok: true }));
 
