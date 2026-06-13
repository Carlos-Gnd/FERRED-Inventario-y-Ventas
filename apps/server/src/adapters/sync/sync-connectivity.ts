// DT-01: Extraído de sync.service.ts — manejo del estado de conectividad.

let _online = true;
let _listeners: ((online: boolean) => void)[] = [];

/**
 * Suscribe un callback a los cambios de conectividad.
 * @returns Función para desuscribir.
 */
export function onConnectivityChange(cb: (online: boolean) => void): () => void {
  _listeners.push(cb);
  return () => { _listeners = _listeners.filter(l => l !== cb); };
}

/** Fija el estado online/offline y notifica a los suscriptores solo si cambió. */
export function setOnline(value: boolean): void {
  if (value === _online) return;
  _online = value;
  _listeners.forEach(cb => cb(value));
}

/** Último estado de conectividad conocido (no sondea). */
export function isOnline(): boolean {
  return _online;
}
