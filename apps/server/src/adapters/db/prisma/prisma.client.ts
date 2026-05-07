import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import path from 'path';

// Cargar variables de entorno antes de crear el cliente
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
// También intentar cargar el .env raíz como fallback
dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });

// Singleton para evitar múltiples conexiones durante hot-reload en dev
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    // pgBouncer en modo transaction no soporta prepared statements.
    // Desactivarlos aquí es la solución definitiva al error 42P05.
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}