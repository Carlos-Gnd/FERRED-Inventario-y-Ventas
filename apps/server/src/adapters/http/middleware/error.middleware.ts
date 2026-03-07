import { Request, Response, NextFunction } from 'express';

export function errorMiddleware(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  console.error('[ERROR]', err.message);
  const isProd = process.env.NODE_ENV === 'production';
  return res.status(500).json({
    error: isProd ? 'Error interno del servidor' : err.message,
  });
}