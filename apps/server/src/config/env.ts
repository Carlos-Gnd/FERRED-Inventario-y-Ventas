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

// BUG-A09: usar el mismo patrón de nombre que Electron (ferred_branch{BRANCH_ID}.db)
const branchId = Number(process.env.BRANCH_ID ?? 1);
const sqliteFallback = path.resolve(process.cwd(), `data/ferred_branch${branchId}.db`);

export const env = {
  port:     Number(process.env.PORT ?? 3001),
  branchId,
  nodeEnv:  process.env.NODE_ENV ?? 'development',

  jwt: {
    secret:    required('JWT_SECRET'),
    expiresIn: process.env.JWT_EXPIRES_IN ?? '2h',
  },

  crypto: {
    secret: required('CRYPTO_SECRET'),
  },

  supabase: {
    url:        required('SUPABASE_URL'),
    serviceKey: required('SUPABASE_SERVICE_KEY'),
  },

  dte: {
    env:         process.env.DTE_ENV ?? 'sandbox',
    sandboxUrl:  process.env.DTE_SANDBOX_URL ?? 'https://apitest.dtes.mh.gob.sv',
    authToken:   process.env.DTE_AUTH_TOKEN,
    sandboxUser: process.env.DTE_SANDBOX_USER,
    sandboxPass: process.env.DTE_SANDBOX_PASS,
  },

  sqlite: {
    // BUG-A09: fallback unificado con ferred_branch{BRANCH_ID}.db igual que Electron
    path: process.env.SQLITE_PATH ?? sqliteFallback,
  },
} as const;