import dotenv from 'dotenv';
import path from 'node:path';

const envPaths = [
  path.resolve(process.cwd(), '.env'),
  path.resolve(process.cwd(), '../../.env'),
];

for (const envPath of envPaths) {
  dotenv.config({ path: envPath, override: false });
}

function required(name: string): string {
  const val = process.env[name];
  if (!val) throw new Error(`Variable de entorno requerida: ${name}`);
  return val;
}

export const env = {
  port:     Number(process.env.PORT ?? 3001),
  branchId: Number(process.env.BRANCH_ID ?? 1),
  nodeEnv:  process.env.NODE_ENV ?? 'development',

  jwt: {
    secret:    required('JWT_SECRET'),
    expiresIn: (process.env.JWT_EXPIRES_IN ?? '90d') as string,
  },

  crypto: {
    secret: required('CRYPTO_SECRET'),
  },

  supabase: {
    url:        required('SUPABASE_URL'),
    serviceKey: required('SUPABASE_SERVICE_KEY'),
  },

  dte: {
    env:        process.env.DTE_ENV ?? 'sandbox',
    sandboxUrl: process.env.DTE_SANDBOX_URL ?? 'https://apitest.dtes.mh.gob.sv',
  },

  sqlite: {
    path: process.env.SQLITE_PATH ?? path.resolve(process.cwd(), 'data/ferred_offline.db'),
  },
} as const;
