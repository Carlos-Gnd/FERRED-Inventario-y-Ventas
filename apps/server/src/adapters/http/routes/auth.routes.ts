import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { prisma } from '../../db/prisma/prisma.client';
import { env } from '../../../config/env';

export const authRoutes = Router();

const loginSchema = z.object({
  email:    z.string().email('Email inválido'),
  password: z.string().min(1, 'Contraseña requerida'),
});

// POST /api/auth/login
authRoutes.post('/login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0].message });
    }

    const { email, password } = parsed.data;

    const usuario = await prisma.usuario.findUnique({ where: { email } });
    if (!usuario || !usuario.activo) {
      return res.status(401).json({ error: 'Credenciales incorrectas' });
    }

    const esValida = await bcrypt.compare(password, usuario.contrasenaHash);
    if (!esValida) {
      return res.status(401).json({ error: 'Credenciales incorrectas' });
    }

    const token = jwt.sign(
      {
        id:         usuario.id,
        rol:        usuario.rol,
        sucursalId: usuario.sucursalId,
        email:      usuario.email,
      },
      env.jwt.secret,
      { expiresIn: env.jwt.expiresIn as any }
    );

    return res.json({
      token,
      usuario: {
        id:         usuario.id,
        nombre:     usuario.nombre,
        email:      usuario.email,
        rol:        usuario.rol,
        sucursalId: usuario.sucursalId,
      },
    });
  } catch (err) {
    return next(err);
  }
});

// POST /api/auth/logout — el cliente simplemente descarta el token
authRoutes.post('/logout', (_req, res) => res.json({ ok: true }));