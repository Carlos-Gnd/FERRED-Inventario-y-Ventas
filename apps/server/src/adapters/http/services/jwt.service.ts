import jwt from 'jsonwebtoken';

export function issueJwt<TPayload extends object>(
  payload: TPayload,
  secret: string,
  expiresIn: string,
): string {
  return jwt.sign(payload, secret, { expiresIn } as jwt.SignOptions);
}
