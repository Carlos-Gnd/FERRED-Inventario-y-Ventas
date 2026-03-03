import { PrismaClient } from '@prisma/client';
import axios from 'axios';

const prisma = new PrismaClient();
const INTERVAL_MS = 60_000; // 60 segundos

export const SyncService = {
  async start() {
    console.log('SyncService: iniciado');
    setInterval(() => this.run(), INTERVAL_MS);
  },

  async run() {
    const online = await this.isOnline();
    if (!online) return;

    const pending = await prisma.syncLog.findMany({ where: { status: 'PENDING' } });
    if (pending.length === 0) return;

    try {
      await axios.post(`${process.env.API_CLOUD_URL}/sync/push`, { records: pending });
      await prisma.syncLog.updateMany({
        where: { id: { in: pending.map(r => r.id) } },
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
