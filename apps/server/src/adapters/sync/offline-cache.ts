// DT-01: Extraído de sync.service.ts — caché en memoria con TTL para modo offline.

interface CacheEntry {
  data: unknown;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry>();
const CACHE_TTL = 5 * 60 * 1000;

export const OfflineCache = {
  set(key: string, data: unknown): void {
    cache.set(key, { data, expiresAt: Date.now() + CACHE_TTL });
  },

  get<T>(key: string): T | null {
    const entry = cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) { cache.delete(key); return null; }
    return entry.data as T;
  },

  invalidate(prefix: string): void {
    for (const key of cache.keys()) {
      if (key.startsWith(prefix)) cache.delete(key);
    }
  },

  clear(): void {
    cache.clear();
  },
};
