import type { AuthResponse, PedidoOnline, PedidoPayload, Product, ZonaEnvio } from '../types';

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

export function getAuthHeader(token: string | null): HeadersInit {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export function getProductosPublicos(sucursalId: number): Promise<Product[]> {
  return request<Product[]>(`/productos/publico/${sucursalId}`);
}

export function getZonasEnvio(): Promise<ZonaEnvio[]> {
  return request<ZonaEnvio[]>('/zonas-envio');
}

export function registerCliente(payload: {
  nombre: string;
  email: string;
  password: string;
  telefono?: string;
  direccion?: string;
}): Promise<AuthResponse> {
  return request<AuthResponse>('/ecommerce/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function loginCliente(payload: { email: string; password: string }): Promise<AuthResponse> {
  return request<AuthResponse>('/ecommerce/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function getClienteActual(token: string): Promise<{ cliente: AuthResponse['cliente'] }> {
  return request<{ cliente: AuthResponse['cliente'] }>('/ecommerce/auth/me', {
    headers: getAuthHeader(token),
  });
}

export function getMisPedidos(token: string): Promise<{ total: number; pedidos: PedidoOnline[] }> {
  return request<{ total: number; pedidos: PedidoOnline[] }>('/pedidos-online/mis', {
    headers: getAuthHeader(token),
  });
}

export function crearPedidoOnline(payload: PedidoPayload, token: string): Promise<{ ok: true; pedido: PedidoOnline }> {
  return request<{ ok: true; pedido: PedidoOnline }>('/pedidos-online', {
    method: 'POST',
    headers: getAuthHeader(token),
    body: JSON.stringify(payload),
  });
}
