import type { Product } from '../types';

type OfertaPriceProps = {
  product: Pick<Product, 'precioConIva' | 'precioOferta' | 'oferta'>;
  size?: 'card' | 'detail';
};

export function tieneOfertaVigente(product: Pick<Product, 'precioOferta' | 'oferta'>) {
  return Number(product.precioOferta ?? product.oferta?.precioOferta ?? 0) > 0;
}

export function obtenerPrecioFinal(product: Pick<Product, 'precioConIva' | 'precioOferta' | 'oferta'>) {
  return tieneOfertaVigente(product)
    ? Number(product.precioOferta ?? product.oferta?.precioOferta)
    : Number(product.precioConIva ?? 0);
}

export function OfertaBadge({ className = '' }: { className?: string }) {
  return (
    <span className={`inline-flex items-center rounded-full bg-red-600 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-white shadow-sm ${className}`}>
      Oferta
    </span>
  );
}

export function OfertaPrice({ product, size = 'card' }: OfertaPriceProps) {
  const hasOffer = tieneOfertaVigente(product);
  const finalPrice = obtenerPrecioFinal(product);
  const originalPrice = Number(product.precioConIva ?? 0);
  const finalClass = size === 'detail'
    ? 'text-4xl font-bold text-[#D97706]'
    : 'text-sm sm:text-lg md:text-2xl font-bold text-[#D97706]';
  const originalClass = size === 'detail'
    ? 'text-lg text-[#8A8175] line-through'
    : 'text-xs sm:text-sm text-[#8A8175] line-through';

  if (!hasOffer) {
    return <p className={finalClass}>${originalPrice.toFixed(2)}</p>;
  }

  return (
    <div className="flex flex-wrap items-baseline gap-2">
      <p className={finalClass}>${finalPrice.toFixed(2)}</p>
      <p className={originalClass}>${originalPrice.toFixed(2)}</p>
    </div>
  );
}
