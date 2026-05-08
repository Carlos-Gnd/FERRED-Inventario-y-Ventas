import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../../db/prisma/prisma.client';
import { env } from '../../../config/env';
import { issueJwt } from '../services/jwt.service';
import { authenticateCliente } from '../middleware/cliente-auth.middleware';

export const ecommerceAuthRoutes = Router();

const ClienteRegistroSchema = z.object({
  nombre: z.string().trim().min(2, 'Nombre requerido'),
  email: z.string().trim().email('Email invalido'),
  password: z.string().min(8, 'La contrasena debe tener al menos 8 caracteres'),
  telefono: z.string().trim().min(7).optional(),
  direccion: z.string().trim().min(5).optional(),
});

const ClienteLoginSchema = z.object({
  email: z.string().trim().email('Email invalido'),
  password: z.string().min(1, 'Contrasena requerida'),
});

function toClienteResponse(cliente: {
  id: number;
  nombre: string;
  email: string;
  telefono: string | null;
  direccion: string | null;
  fechaRegistro: Date;
}) {
  return {
    id: cliente.id,
    nombre: cliente.nombre,
    email: cliente.email,
    rol: 'CLIENTE' as const,
    telefono: cliente.telefono,
    direccion: cliente.direccion,
    fechaRegistro: cliente.fechaRegistro,
  };
}

function issueClienteJwt(cliente: { id: number; email: string }) {
  return issueJwt(
    {
      id: cliente.id,
      rol: 'CLIENTE',
      email: cliente.email,
    },
    env.ecommerceJwt.secret,
    env.ecommerceJwt.expiresIn,
  );
}

ecommerceAuthRoutes.post('/register', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = ClienteRegistroSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: 'Datos de cliente invalidos',
        detalle: parsed.error.flatten().fieldErrors,
      });
    }

    const data = parsed.data;
    const email = data.email.toLowerCase();
    const passwordHash = await bcrypt.hash(data.password, 10);

    const cliente = await prisma.clienteEcommerce.create({
      data: {
        nombre: data.nombre,
        email,
        passwordHash,
        telefono: data.telefono,
        direccion: data.direccion,
      },
      select: {
        id: true,
        nombre: true,
        email: true,
        telefono: true,
        direccion: true,
        fechaRegistro: true,
      },
    });

    return res.status(201).json({
      token: issueClienteJwt(cliente),
      cliente: toClienteResponse(cliente),
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return res.status(409).json({ error: 'Ya existe un cliente con ese email' });
    }

    return next(error);
  }
});

ecommerceAuthRoutes.post('/login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = ClienteLoginSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: 'Credenciales invalidas',
        detalle: parsed.error.flatten().fieldErrors,
      });
    }

    const email = parsed.data.email.toLowerCase();
    const cliente = await prisma.clienteEcommerce.findUnique({
      where: { email },
    });

    if (!cliente || !cliente.activo) {
      return res.status(401).json({ error: 'Credenciales incorrectas' });
    }

    const passwordOk = await bcrypt.compare(parsed.data.password, cliente.passwordHash);
    if (!passwordOk) {
      return res.status(401).json({ error: 'Credenciales incorrectas' });
    }

    return res.json({
      token: issueClienteJwt(cliente),
      cliente: toClienteResponse(cliente),
    });
  } catch (error) {
    return next(error);
  }
});

ecommerceAuthRoutes.get('/me', authenticateCliente, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const clienteId = req.cliente?.id;
    if (!clienteId) return res.status(401).json({ error: 'Token de cliente requerido' });

    const cliente = await prisma.clienteEcommerce.findUnique({
      where: { id: clienteId },
      select: {
        id: true,
        nombre: true,
        email: true,
        telefono: true,
        direccion: true,
        fechaRegistro: true,
      },
    });

    if (!cliente) return res.status(404).json({ error: 'Cliente no encontrado' });

    return res.json({ cliente: toClienteResponse(cliente) });
  } catch (error) {
    return next(error);
  }
});
