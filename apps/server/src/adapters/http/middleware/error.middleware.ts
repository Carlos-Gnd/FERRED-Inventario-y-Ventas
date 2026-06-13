import { Request, Response, NextFunction } from 'express';

/**
 * Error de dominio con código HTTP explícito. Lanzar `new AppError(404, '...')` para
 * que el {@link errorMiddleware} responda con ese status en vez de un 500 genérico.
 */
export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

/**
 * Manejador de errores central (último middleware del pipeline). Propaga el status de
 * un {@link AppError}; para cualquier otro error responde `500` y **oculta el mensaje
 * en producción** (nunca se filtra el stack al cliente).
 */
export function errorMiddleware(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  // propagar statusCode desde AppError en vez de siempre 500
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ error: err.message });
  }

  console.error('[ERROR]', err.message);
  const isProd = process.env.NODE_ENV === 'production';
  return res.status(500).json({
    error: isProd ? 'Error interno del servidor' : err.message,
  });
}
