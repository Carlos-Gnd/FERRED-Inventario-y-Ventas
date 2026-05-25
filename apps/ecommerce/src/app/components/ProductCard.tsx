import { ShoppingCart } from 'lucide-react';
import { Link } from 'react-router';
import type { Product } from '../types';
import { OfertaBadge, OfertaPrice, tieneOfertaVigente } from './OfertaBadge';

const API_ORIGIN = ((import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:3001/api').replace(/\/api\/?$/, '');

type ProductCardProps = {
  product?: Product;
  id?: string;
  name?: string;
  price?: number;
  image?: string;
  stock?: number;
  category?: string;
  brand?: string;
  description?: string;
  onAddToCart?: (product: Product) => void;
};

export const PRODUCT_PLACEHOLDER_IMAGE =
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

export function getProductImage(imageUrl?: string | null) {
  if (!imageUrl) return PRODUCT_PLACEHOLDER_IMAGE;
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://') || imageUrl.startsWith('data:')) return imageUrl;
  if (imageUrl.startsWith('/')) return `${API_ORIGIN}${imageUrl}`;
  return imageUrl;
}

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
            onClick={() => product && onAddToCart?.(product)}
            disabled={stock === 0 || !product}
            className="bg-[#D97706] text-white p-1.5 sm:p-2 md:p-3 rounded-lg sm:rounded-xl hover:bg-[#B45309] transition-colors disabled:bg-[#E5E2DA] disabled:cursor-not-allowed flex-shrink-0"
            title={stock === 0 ? 'Sin stock' : 'Agregar al carrito'}
          >
            <ShoppingCart size={16} className="sm:w-4 sm:h-4 md:w-5 md:h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
