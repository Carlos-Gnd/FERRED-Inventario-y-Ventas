import { PrismaClient } from '@prisma/client';
import axios from 'axios';

const INTERVAL_MS = 60_000; // 60 segundos
let prisma: PrismaClient | null = null;
let prismaInitError: Error | null = null;

function getPrismaClient(): PrismaClient | null {
  if (prisma) return prisma;
  if (prismaInitError) return null;

  try {
    prisma = new PrismaClient();
    return prisma;
  } catch (error) {
    prismaInitError = error instanceof Error ? error : new Error(String(error));
    console.error('SyncService: Prisma no inicializado. Ejecuta `pnpm prisma:generate`.', prismaInitError);
    return null;
  }
}

export const SyncService = {
  async start() {
    console.log('SyncService: iniciado');
    setInterval(() => this.run(), INTERVAL_MS);
  },

  async run() {
    const db = getPrismaClient();
    if (!db) return;

    const online = await this.isOnline();
    if (!online) return;

    const pending = await db.syncLog.findMany({ where: { status: 'PENDING' } });
    if (pending.length === 0) return;

    try {
      await axios.post(`${process.env.API_CLOUD_URL}/sync/push`, { records: pending });
      await db.syncLog.updateMany({
        where: { id: { in: pending.map((r: { id: number }) => r.id) } },
        data: { status: 'SYNCED', syncedAt: new Date() },
      });
      console.log(`SyncService: ${pending.length} registros sincronizados`);
    } catch (err) {
      console.error('SyncService: error al sincronizar', err);
    }
  },

  async isOnline(): Promise<boolean> {
    try {
      await axios.get(`${process.env.API_CLOUD_URL}/health`, { timeout: 3000 });
      return true;
    } catch {
      return false;
    }
  },
};
