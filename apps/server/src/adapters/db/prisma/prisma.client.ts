import { PrismaClient } from '@prisma/client';

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