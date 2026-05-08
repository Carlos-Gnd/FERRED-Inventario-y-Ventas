import { randomUUID } from 'crypto';
import fs from 'fs';
import path from 'path';
import { Router, Request, Response, NextFunction } from 'express';
import multer, { FileFilterCallback } from 'multer';

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

pagosRoutes.post('/comprobante', (req: Request, res: Response, next: NextFunction) => {
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

pagosRoutes.get('/comprobante/:archivo', (req: Request, res: Response, next: NextFunction) => {
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
