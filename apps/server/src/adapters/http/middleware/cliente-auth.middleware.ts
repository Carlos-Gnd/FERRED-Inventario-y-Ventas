import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../../../config/env';
import { prisma } from '../../db/prisma/prisma.client';

interface ClienteJwtPayload {
  id: number;
  rol: 'CLIENTE';
  email: string;
}

export async function authenticateCliente(req: Request, res: Response, next: NextFunction) {
  const auth = req.headers.authorization;

  if (!auth?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token de cliente requerido' });
  }

  try {
    const token = auth.slice(7);
    const payload = jwt.verify(token, env.ecommerceJwt.secret) as ClienteJwtPayload;

    if (payload.rol !== 'CLIENTE') {
      return res.status(401).json({ error: 'Token de cliente invalido' });
    }

    const cliente = await prisma.clienteEcommerce.findFirst({
      where: { id: payload.id, email: payload.email, activo: true },
      select: { id: true, email: true },
    });

    if (!cliente) {
      return res.status(401).json({ error: 'Cliente no encontrado o inactivo' });
    }

    req.cliente = {
      id: cliente.id,
      rol: 'CLIENTE',
      email: cliente.email,
    };

    return next();
  } catch {
    return res.status(401).json({ error: 'Token de cliente invalido o expirado' });
  }
}
