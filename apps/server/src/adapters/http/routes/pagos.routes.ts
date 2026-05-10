import { randomUUID } from 'crypto';
import fs from 'fs';
import path from 'path';
import { Router, Request, Response, NextFunction } from 'express';
import multer, { FileFilterCallback } from 'multer';
import jwt from 'jsonwebtoken';
import { env } from '../../../config/env';
import { prisma } from '../../db/prisma/prisma.client';
import type { UserRole } from '../../../types/roles';
import {
  PagoServiceError,
  ValidarPagoSchema,
  validarPago,
} from '../services/pagos.service';
import { roleMiddleware } from '../middleware/role.middleware';
import { assertSameSucursal } from '../middleware/sucursal.guard';
import { OfflineCache } from '../../sync/sync.service';

const MAX_COMPROBANTE_BYTES = 2 * 1024 * 1024;
const COMPROBANTES_DIR = path.resolve(process.cwd(), 'uploads', 'comprobantes');
const COMPROBANTE_FILENAME_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(jpg|jpeg|png)$/i;

const mimeToExtension: Readonly<Record<string, 'jpg' | 'png'>> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
};

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => {
    fs.mkdirSync(COMPROBANTES_DIR, { recursive: true });
    callback(null, COMPROBANTES_DIR);
  },
  filename: (_req, file, callback) => {
    const extension = mimeToExtension[file.mimetype];
    callback(null, `${randomUUID()}.${extension}`);
  },
});

const fileFilter = (_req: Request, file: Express.Multer.File, callback: FileFilterCallback): void => {
  if (file.mimetype in mimeToExtension) {
    callback(null, true);
    return;
  }

  callback(new Error('Solo se permiten comprobantes JPG o PNG'));
};

const uploadComprobante = multer({
  storage,
  limits: { fileSize: MAX_COMPROBANTE_BYTES, files: 1 },
  fileFilter,
}).single('comprobante');

export const pagosRoutes = Router();

type AdminJwtPayload = {
  id: number;
  rol: UserRole;
  sucursalId: number;
  email: string;
};

type ClienteJwtPayload = {
  id: number;
  rol: 'CLIENTE';
  email: string;
};

function getBearerToken(req: Request): string | null {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) return null;
  return auth.slice(7);
}

async function authenticatePago(req: Request, res: Response, next: NextFunction) {
  const token = getBearerToken(req);
  if (!token) return res.status(401).json({ error: 'Token requerido' });

  try {
    const payload = jwt.verify(token, env.jwt.secret) as AdminJwtPayload;
    if (!['ADMIN', 'CAJERO', 'BODEGA'].includes(payload.rol)) {
      throw new Error('Rol administrativo invalido');
    }
    req.usuario = {
      id: payload.id,
      rol: payload.rol,
      sucursalId: payload.sucursalId,
      email: payload.email,
    };
    return next();
  } catch {
    // Si no es token administrativo, se intenta como token de cliente ecommerce.
  }

  try {
    const payload = jwt.verify(token, env.ecommerceJwt.secret) as ClienteJwtPayload;
    if (payload.rol !== 'CLIENTE') return res.status(401).json({ error: 'Token invalido' });

    const cliente = await prisma.clienteEcommerce.findFirst({
      where: { id: payload.id, email: payload.email, activo: true },
      select: { id: true, email: true },
    });
    if (!cliente) return res.status(401).json({ error: 'Cliente no encontrado o inactivo' });

    req.cliente = { id: cliente.id, rol: 'CLIENTE', email: cliente.email };
    return next();
  } catch {
    return res.status(401).json({ error: 'Token invalido o expirado' });
  }
}

async function authorizeComprobanteRead(req: Request, res: Response, next: NextFunction) {
  if (req.usuario) return next();
  if (!req.cliente) return res.status(401).json({ error: 'Token requerido' });

  const archivo = req.params.archivo;
  const comprobanteUrl = `/api/pagos/comprobante/${archivo}`;
  try {
    const pago = await prisma.pago.findFirst({
      where: {
        comprobanteUrl,
        pedido: { is: { clienteId: req.cliente.id } },
      },
      select: { id: true },
    });

    if (!pago) return res.status(404).json({ error: 'Comprobante no encontrado' });
    return next();
  } catch (error) {
    return next(error);
  }
}

pagosRoutes.patch(
  '/:id/validar',
  authenticatePago,
  roleMiddleware('ADMIN', 'CAJERO'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const pagoId = Number(req.params.id);
      if (!Number.isInteger(pagoId) || pagoId < 1) {
        return res.status(400).json({ error: 'id invalido' });
      }

      const parsed = ValidarPagoSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          error: 'Datos de validacion invalidos',
          detalle: parsed.error.flatten().fieldErrors,
        });
      }

      const pagoActual = await prisma.pago.findUnique({
        where: { id: pagoId },
        select: {
          pedido: {
            select: {
              sucursalId: true,
            },
          },
        },
      });

      if (!pagoActual) {
        return res.status(404).json({ error: 'Pago no encontrado' });
      }
      if (!assertSameSucursal(req, res, pagoActual.pedido.sucursalId)) return;

      const pago = await validarPago(pagoId, parsed.data);

      if (parsed.data.accion === 'RECHAZAR') {
        OfflineCache.invalidate(`stock:${pago.pedido.sucursalId}`);
        OfflineCache.invalidate('productos:');
      }

      return res.json({ ok: true, pago });
    } catch (error) {
      if (error instanceof PagoServiceError) {
        return res.status(error.statusCode).json({ error: error.message });
      }

      return next(error);
    }
  },
);

pagosRoutes.post('/comprobante', authenticatePago, (req: Request, res: Response, next: NextFunction) => {
  uploadComprobante(req, res, (error: unknown) => {
    if (error instanceof multer.MulterError) {
      if (error.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'El comprobante no puede superar 2MB' });
      }

      return res.status(400).json({ error: 'Comprobante invalido' });
    }

    if (error instanceof Error) {
      return res.status(400).json({ error: error.message });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'comprobante es requerido' });
    }

    return res.status(201).json({
      ok: true,
      comprobanteUrl: `/api/pagos/comprobante/${req.file.filename}`,
      archivo: req.file.filename,
    });
  });
});

pagosRoutes.get('/comprobante/:archivo', authenticatePago, authorizeComprobanteRead, (req: Request, res: Response, next: NextFunction) => {
  const archivo = req.params.archivo;
  if (!COMPROBANTE_FILENAME_PATTERN.test(archivo)) {
    return res.status(400).json({ error: 'Nombre de comprobante invalido' });
  }

  const absolutePath = path.join(COMPROBANTES_DIR, archivo);

  return res.sendFile(absolutePath, (error) => {
    if (!error) return;

    if ('code' in error && error.code === 'ENOENT') {
      return res.status(404).json({ error: 'Comprobante no encontrado' });
    }

    return next(error);
  });
});
