import type { PedidoPayload, Product, ZonaEnvio } from '../types';

const API_BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:3001/api';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const message = body?.error ?? `Error HTTP ${res.status}`;
    throw new Error(message);
  }

  return res.json() as Promise<T>;
}

export function getProductosPublicos(sucursalId: number): Promise<Product[]> {
  return request<Product[]>(`/productos/publico/${sucursalId}`);
}

export function getZonasEnvio(): Promise<ZonaEnvio[]> {
  return request<ZonaEnvio[]>('/zonas-envio');
}

export function crearPedidoOnline(payload: PedidoPayload): Promise<{ ok: true; pedido: any }> {
  return request<{ ok: true; pedido: any }>('/pedidos-online', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
