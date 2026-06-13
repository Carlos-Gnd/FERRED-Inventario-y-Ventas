/**
 * keepalive.service.ts
 *
 * Mantiene el servicio despierto en hosts que duermen por inactividad (Render free):
 * cada INTERVAL_MS hace un GET a su propia URL pública /health, generando tráfico
 * entrante que evita el spin-down (~15 min de inactividad en Render).
 *
 * Se activa SOLO si hay una URL pública conocida:
 *   - KEEPALIVE_URL        (override manual, ej. https://ferred.onrender.com)
 *   - RENDER_EXTERNAL_URL  (la inyecta Render automáticamente)
 * En local/Electron no hay ninguna → queda desactivado.
 *
 * Nota: el self-ping PREVIENE el sueño mientras el proceso está vivo; si llegara a
 * dormirse (deploy, crash, hueco > intervalo) no puede auto-despertarse. Para eso
 * sirve además un pinger externo (UptimeRobot / cron-job.org).
 */
const INTERVAL_MS = Number(process.env.KEEPALIVE_INTERVAL_MS ?? 3 * 60 * 1000); // 3 minutos

function resolveSelfUrl(): string | null {
  const url = process.env.KEEPALIVE_URL || process.env.RENDER_EXTERNAL_URL;
  return url ? url.replace(/\/+$/, '') : null;
}

export const KeepAliveService = {
  start() {
    const base = resolveSelfUrl();
    if (!base) {
      if (process.env.NODE_ENV !== 'production') {
        console.log('[KeepAlive] Sin KEEPALIVE_URL/RENDER_EXTERNAL_URL — desactivado.');
      }
      return;
    }

    const ping = async () => {
      try {
        const res = await fetch(`${base}/health`, { method: 'GET' });
        if (process.env.NODE_ENV !== 'production') {
          console.log(`[KeepAlive] ${base}/health → ${res.status}`);
        }
      } catch (err: unknown) {
        console.error('[KeepAlive] ping falló:', (err as Error).message);
      }
    };

    // No pingeamos de inmediato (el server acaba de arrancar); arrancamos el intervalo.
    setInterval(ping, INTERVAL_MS);
    console.log(`[KeepAlive] activo: GET ${base}/health cada ${Math.round(INTERVAL_MS / 1000)}s`);
  },
};
