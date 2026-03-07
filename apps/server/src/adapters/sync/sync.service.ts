import axios from 'axios';
import { prisma } from '../db/prisma/prisma.client';
import { env } from '../../config/env';

const INTERVAL_MS = 60_000; // cada 60 segundos

export const SyncService = {
  start() {
    console.log('🔄 SyncService: iniciado');
    setInterval(() => this.run(), INTERVAL_MS);
  },

  async run() {
    const online = await this.isOnline();
    if (!online) return;

    const pendientes = await prisma.syncLog.findMany({
      where:   { status: 'PENDIENTE' },
      orderBy: { creadoEn: 'asc' },
      take:    100,
    });

    if (pendientes.length === 0) return;

    try {
      await axios.post(
        `${env.supabase.url}/rest/v1/rpc/sync_push`,
        { records: pendientes },
        { headers: { apikey: env.supabase.serviceKey, Authorization: `Bearer ${env.supabase.serviceKey}` } }
      );

      await prisma.syncLog.updateMany({
        where: { id: { in: pendientes.map(r => r.id) } },
        data:  { status: 'SINCRONIZADO', sincEn: new Date() },
      });

      console.log(`✅ SyncService: ${pendientes.length} registros sincronizados`);
    } catch (err) {
      console.error('⚠️ SyncService: error al sincronizar', (err as any).message);
    }
  },

  async isOnline(): Promise<boolean> {
    try {
      await axios.get(`${env.supabase.url}/health`, { timeout: 3000 });
      return true;
    } catch {
      return false;
    }
  },
};