import { ShoppingCart } from 'lucide-react';
import { Link } from 'react-router';
import type { Product } from '../types';
import { OfertaBadge, OfertaPrice } from './OfertaBadge';
import { tieneOfertaVigente, getProductImage } from '../utils/product.utils';

type ProductCardProps = {
  product?: Product;
  id?: string;
  name?: string;
  price?: number;
  image?: string;
  stock?: number;
  category?: string;
  onAddToCart?: (product: Product) => void;
};

export function ProductCard(props: ProductCardProps) {
  const { product, onAddToCart } = props;
  const id = product?.id ?? Number(props.id ?? 0);
  const nombre = product?.nombre ?? props.name ?? 'Producto';
  const price = product?.precioConIva ?? props.price ?? 0;
  const stock = product?.stockDisponible ?? props.stock ?? 0;
  const category = product?.categoria?.nombre ?? props.category ?? 'Sin categoria';
  const image = props.image ?? getProductImage(product?.imageUrl);
  const hasOffer = product ? tieneOfertaVigente(product) : false;

  return (
    <div className="bg-white rounded-lg sm:rounded-xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 border border-[#E5E2DA] flex flex-col h-full">
      <Link to={`/producto/${id}`} className="flex-shrink-0">
        <div className="aspect-square bg-[#F5F2EB] overflow-hidden relative">
          {hasOffer && <OfertaBadge className="absolute left-2 top-2 z-10" />}
          <img
            src={image}
            alt={nombre}
            loading="lazy"
            className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
          />
        </div>
      </Link>

      <div className="p-2 sm:p-3 md:p-4 flex flex-col flex-grow">
        <span className="text-xs text-[#5F6368] uppercase tracking-wide font-medium">{category}</span>
        <Link to={`/producto/${id}`}>
          <h3 className="font-semibold text-[#2B2D31] mt-1 sm:mt-2 hover:text-[#D97706] transition-colors line-clamp-2 text-xs sm:text-sm md:text-base">
            {nombre}
          </h3>
        </Link>

        <div className="mt-2 sm:mt-3 md:mt-4 flex items-center justify-between flex-grow">
          <div>
            {product ? <OfertaPrice product={product} /> : <p className="text-sm sm:text-lg md:text-2xl font-bold text-[#D97706]">${price.toFixed(2)}</p>}
            <p className={`text-xs ${stock > 0 ? 'text-green-600' : 'text-red-600'}`}>
              {stock > 0 ? `Stock: ${stock}` : 'Sin stock'}
            </p>
          </div>

          <button
            type="button"
            onClick={() => product && onAddToCart?.(product)}
            disabled={stock === 0 || !product}
            className="bg-[#D97706] text-white p-1.5 sm:p-2 md:p-3 rounded-lg sm:rounded-xl hover:bg-[#B45309] transition-colors disabled:bg-[#E5E2DA] disabled:cursor-not-allowed flex-shrink-0"
            aria-label={stock === 0 ? 'Sin stock' : `Agregar ${nombre} al carrito`}
          >
            <ShoppingCart size={16} className="sm:w-4 sm:h-4 md:w-5 md:h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
