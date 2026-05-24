import { ShoppingCart } from 'lucide-react';
import { Link } from 'react-router';
import type { Product } from '../types';
import { OfertaBadge, OfertaPrice, tieneOfertaVigente } from './OfertaBadge';

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

const PRODUCT_IMAGES = {
  drill: 'https://images.unsplash.com/photo-1504148455328-c376907d081c?w=700&auto=format&fit=crop',
  handTools: 'https://sv.epaenlinea.com/media/catalog/product/cache/5de4529773a62b1ec261a5eaed8abd55/f/1/f1e18d22-e3c1-46fd-ba95-07654787229d.jpg',
  electrical: 'https://images.unsplash.com/photo-1621905252507-b35492cc74b4?w=700&auto=format&fit=crop',
  hardware: 'https://images.unsplash.com/photo-1530124566582-a618bc2615dc?w=700&auto=format&fit=crop',
  paint: 'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=700&auto=format&fit=crop',
  construction: 'https://images.unsplash.com/photo-1504917595217-d4dc5ebe6122?w=700&auto=format&fit=crop',
};

const FALLBACK_IMAGES = [
  PRODUCT_IMAGES.handTools,
  PRODUCT_IMAGES.hardware,
  PRODUCT_IMAGES.electrical,
  PRODUCT_IMAGES.construction,
];

export function getProductImage(nombre: string, category: string, id: number) {
  const text = `${nombre} ${category}`.toLowerCase();

  if (text.includes('taladro') || text.includes('drill')) return PRODUCT_IMAGES.drill;
  if (text.includes('martillo') || text.includes('hammer')) return PRODUCT_IMAGES.handTools;
  if (text.includes('gancho') || text.includes('tornillo') || text.includes('clavo')) return PRODUCT_IMAGES.hardware;
  if (text.includes('electr') || text.includes('cable') || text.includes('volt')) return PRODUCT_IMAGES.electrical;
  if (text.includes('pint') || text.includes('brocha')) return PRODUCT_IMAGES.paint;
  if (text.includes('cement') || text.includes('constru')) return PRODUCT_IMAGES.construction;

  return FALLBACK_IMAGES[Math.abs(id) % FALLBACK_IMAGES.length];
}

export function ProductCard(props: ProductCardProps) {
  const { product, onAddToCart } = props;
  const id = product?.id ?? Number(props.id ?? 0);
  const nombre = product?.nombre ?? props.name ?? 'Producto';
  const price = product?.precioConIva ?? props.price ?? 0;
  const stock = product?.stockDisponible ?? props.stock ?? 0;
  const category = product?.categoria?.nombre ?? props.category ?? 'Sin categoria';
  const image = props.image ?? getProductImage(nombre, category, id);
  const hasOffer = product ? tieneOfertaVigente(product) : false;

  return (
    <div className="bg-white rounded-lg sm:rounded-xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 border border-[#E5E2DA] flex flex-col h-full">
      <Link to={`/producto/${id}`} className="flex-shrink-0">
        <div className="aspect-square bg-[#F5F2EB] overflow-hidden relative">
          {hasOffer && <OfertaBadge className="absolute left-2 top-2 z-10" />}
          <img src={image} alt={nombre} className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" />
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
