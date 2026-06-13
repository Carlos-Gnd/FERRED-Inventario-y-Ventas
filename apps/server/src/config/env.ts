/**
 * env.ts — Única fuente de verdad para variables de entorno.
 *
 * Carga el `.env` (busca primero `cwd/.env` y luego `../../.env` para cubrir tanto
 * `apps/server/` como la raíz del monorepo) y expone un objeto `env` tipado e inmutable.
 * Lanza al importarse si falta una variable requerida (fail-fast en el arranque).
 */
import dotenv from 'dotenv';
import path from 'node:path';

const envPaths = [
  path.resolve(process.cwd(), '.env'),
  path.resolve(process.cwd(), '../../.env'),
];

for (const envPath of envPaths) {
  dotenv.config({ path: envPath, override: false });
}

/** Devuelve la variable `name` o lanza si no está definida. */
function required(name: string): string {
  const val = process.env[name];
  if (!val) throw new Error(`Variable de entorno requerida: ${name}`);
  return val;
}

/** Devuelve la primera de `names` que esté definida, o lanza si ninguna lo está. */
function requiredAny(...names: string[]): string {
  for (const name of names) {
    const val = process.env[name];
    if (val) return val;
  }
  throw new Error(`Variable de entorno requerida: ${names.join(' o ')}`);
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

  ecommerceJwt: {
    secret:    requiredAny('JWT_ECOMMERCE_SECRET', 'ECOMMERCE_SECRET'),
    expiresIn: process.env.ECOMMERCE_JWT_EXPIRES_IN ?? '7d',
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

  offline: {
    // T-07F.3: días máximos sin sincronizar antes de rechazar login offline
    authMaxDays: Number(process.env.OFFLINE_AUTH_MAX_DAYS ?? 30),
  },

  // T-19.1: Stripe — secretKey requerida; publicKey expuesta al frontend vía endpoint
  payment: {
    secretKey:    required('STRIPE_SECRET_KEY'),
    webhookSecret: required('STRIPE_WEBHOOK_SECRET'),
    publicKey:    process.env.STRIPE_PUBLISHABLE_KEY ?? '',
  },

  // T-19.5 / T-03.2: Nodemailer — opcional; sin vars → modo simulado (solo consola)
  smtp: {
    host:   process.env.SMTP_HOST,
    port:   Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_SECURE === 'true',
    user:   process.env.SMTP_USER,
    pass:   process.env.SMTP_PASS,
  },
} as const;
