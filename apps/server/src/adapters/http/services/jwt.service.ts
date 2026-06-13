import jwt from 'jsonwebtoken';

/**
 * Firma un JWT genérico. Usado tanto por el login interno (staff) como por el de
 * clientes ecommerce, cada uno con su propio `secret` y `expiresIn` desde `env`.
 *
 * @param payload   Datos a embeber (p.ej. `{ id, rol, sucursalId, email }`).
 * @param secret    Secreto de firma.
 * @param expiresIn Vigencia en formato `jsonwebtoken` (p.ej. `'2h'`, `'7d'`).
 * @returns El token firmado.
 */
export function issueJwt<TPayload extends object>(
  payload: TPayload,
  secret: string,
  expiresIn: string,
): string {
  return jwt.sign(payload, secret, { expiresIn } as jwt.SignOptions);
}
