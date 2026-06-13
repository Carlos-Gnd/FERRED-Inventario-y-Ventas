// DT-01: Extraído de sync.service.ts — caché en memoria con TTL para modo offline.

interface CacheEntry {
  data: unknown;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry>();
const CACHE_TTL = 5 * 60 * 1000;

/**
 * Caché en memoria con TTL ({@link CACHE_TTL}, 5 min) para servir lecturas mientras no
 * hay red. El `SyncService` la limpia con {@link OfflineCache.clear} al drenar pendientes.
 */
export const OfflineCache = {
  /** Guarda `data` bajo `key` con expiración a {@link CACHE_TTL} desde ahora. */
  set(key: string, data: unknown): void {
    cache.set(key, { data, expiresAt: Date.now() + CACHE_TTL });
  },

  /** Devuelve el valor de `key`, o `null` si no existe o ya expiró (lazy eviction). */
  get<T>(key: string): T | null {
    const entry = cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) { cache.delete(key); return null; }
    return entry.data as T;
  },

  /** Elimina todas las entradas cuya clave empieza con `prefix`. */
  invalidate(prefix: string): void {
    for (const key of cache.keys()) {
      if (key.startsWith(prefix)) cache.delete(key);
    }
  },

  /** Vacía la caché completa. */
  clear(): void {
    cache.clear();
  },
};
