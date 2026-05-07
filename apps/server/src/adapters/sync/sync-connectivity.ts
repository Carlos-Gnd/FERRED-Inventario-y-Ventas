// DT-01: Extraído de sync.service.ts — manejo del estado de conectividad.

let _online = true;
let _listeners: ((online: boolean) => void)[] = [];

export function onConnectivityChange(cb: (online: boolean) => void): () => void {
  _listeners.push(cb);
  return () => { _listeners = _listeners.filter(l => l !== cb); };
}

export function setOnline(value: boolean): void {
  if (value === _online) return;
  _online = value;
  _listeners.forEach(cb => cb(value));
}

export function isOnline(): boolean {
  return _online;
}
