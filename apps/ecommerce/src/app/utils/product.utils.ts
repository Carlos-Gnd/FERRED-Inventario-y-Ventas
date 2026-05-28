import type { Product } from '../types';

const API_ORIGIN = ((import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:3001/api').replace(/\/api\/?$/, '');

const PRODUCT_PLACEHOLDER_IMAGE =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600">
      <rect width="600" height="600" fill="#F5F2EB"/>
      <rect x="96" y="96" width="408" height="408" rx="32" fill="#FFF9EF" stroke="#D8D3C8" stroke-width="4"/>
      <path d="M210 347h180l-47-62-42 47-28-34-63 49Z" fill="#D97706" opacity=".9"/>
      <circle cx="236" cy="242" r="31" fill="#2B2D31" opacity=".85"/>
      <text x="300" y="430" text-anchor="middle" font-family="Arial, sans-serif" font-size="54" font-weight="700" fill="#2B2D31">FERRED</text>
      <text x="300" y="468" text-anchor="middle" font-family="Arial, sans-serif" font-size="22" fill="#5F6368">Imagen no disponible</text>
    </svg>
  `);

export function tieneOfertaVigente(product: Pick<Product, 'precioOferta' | 'oferta'>) {
  return Number(product.precioOferta ?? product.oferta?.precioOferta ?? 0) > 0;
}

export function obtenerPrecioFinal(product: Pick<Product, 'precioConIva' | 'precioOferta' | 'oferta'>) {
  return tieneOfertaVigente(product)
    ? Number(product.precioOferta ?? product.oferta?.precioOferta)
    : Number(product.precioConIva ?? 0);
}

export function getProductImage(imageUrl?: string | null) {
  if (!imageUrl) return PRODUCT_PLACEHOLDER_IMAGE;
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://') || imageUrl.startsWith('data:')) return imageUrl;
  if (imageUrl.startsWith('/')) return `${API_ORIGIN}${imageUrl}`;
  return imageUrl;
}
