type OfertaBadgeProps = {
  className?: string;
};

type OfertaPriceProps = {
  precioOriginal: number;
  precioOferta?: number | null;
  size?: 'card' | 'detail';
};

export function tieneOfertaVigente(precioOferta?: number | null) {
  return Number(precioOferta ?? 0) > 0;
}

export function OfertaBadge({ className = '' }: OfertaBadgeProps) {
  return (
    <span className={`inline-flex items-center rounded-full bg-red-600 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-white shadow-sm ${className}`}>
      Oferta
    </span>
  );
}

export function OfertaPrice({ precioOriginal, precioOferta, size = 'card' }: OfertaPriceProps) {
  const hasOffer = tieneOfertaVigente(precioOferta);
  const finalPrice = hasOffer ? Number(precioOferta) : precioOriginal;
  const finalClass = size === 'detail'
    ? 'text-4xl font-bold text-[#D97706]'
    : 'text-sm sm:text-lg md:text-2xl font-bold text-[#D97706]';
  const originalClass = size === 'detail'
    ? 'text-lg text-[#8A8175] line-through'
    : 'text-xs sm:text-sm text-[#8A8175] line-through';

  if (!hasOffer) {
    return <p className={finalClass}>${precioOriginal.toFixed(2)}</p>;
  }

  return (
    <div className="flex flex-wrap items-baseline gap-2">
      <p className={finalClass}>${finalPrice.toFixed(2)}</p>
      <p className={originalClass}>${precioOriginal.toFixed(2)}</p>
    </div>
  );
}
