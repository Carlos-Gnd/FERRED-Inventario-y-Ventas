import { useEffect, useMemo, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router';
import { Minus, Plus, ArrowLeft } from 'lucide-react';
import { getProductImage, ProductCard } from '../components/ProductCard';
import { OfertaBadge, OfertaPrice, tieneOfertaVigente } from '../components/OfertaBadge';
import { useEcommerce } from '../context/EcommerceContext';

export function ProductoDetalle() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { products, addToCart } = useEcommerce();
  const product = products.find((p) => p.id === Number(id));
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [id]);

  const relatedProducts = useMemo(() => {
    if (!product) return [];
    return products.filter((p) => p.categoria?.id === product.categoria?.id && p.id !== product.id).slice(0, 4);
  }, [products, product]);

  if (!product) return <div className="min-h-screen flex items-center justify-center"><p className="text-xl text-[#5F6368]">Producto no encontrado</p></div>;

  const image = getProductImage(product.imageUrl);

  return (
    <div className="min-h-screen bg-[#F5F2EB]"><div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Link to="/catalogo" className="flex items-center gap-2 text-[#5F6368] hover:text-[#D97706] mb-6"><ArrowLeft size={20} />Volver al catalogo</Link>
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div className="relative aspect-square bg-[#F5F2EB]">
            {tieneOfertaVigente(product) && <OfertaBadge className="absolute left-4 top-4 z-10" />}
            <img
              src={image}
              alt={product.nombre}
              loading="lazy"
              className="h-full w-full object-cover"
            />
          </div>

          <div className="p-6 sm:p-8">
            <h1 className="text-3xl font-bold text-[#2B2D31] mb-3">{product.nombre}</h1>
            <div className="mb-2 flex flex-wrap items-center gap-3">
              <p className="text-[#5F6368]">{product.categoria?.nombre ?? 'Sin categoria'}</p>
              {tieneOfertaVigente(product) && <OfertaBadge />}
            </div>
            <div className="mb-6">
              <OfertaPrice product={product} size="detail" />
            </div>
            <div className="flex items-center gap-4 mb-6"><div className="flex items-center border border-[#E5E2DA] rounded-xl overflow-hidden"><button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="p-3"><Minus size={20} /></button><span className="px-6 font-semibold">{quantity}</span><button onClick={() => setQuantity(Math.min(product.stockDisponible, quantity + 1))} className="p-3"><Plus size={20} /></button></div><span className="text-sm text-[#5F6368]">Disponibles: {product.stockDisponible}</span></div>
            <div className="flex gap-4"><button onClick={() => addToCart(product, quantity)} className="flex-1 bg-[#D97706] text-white py-4 rounded-xl font-semibold">Agregar al carrito</button><button onClick={() => { addToCart(product, quantity); navigate('/checkout'); }} className="border-2 border-[#D97706] text-[#D97706] px-6 py-4 rounded-xl font-semibold">Comprar ahora</button></div>
          </div>
        </div>
      </div>
      {relatedProducts.length > 0 && <section className="mt-16"><h2 className="text-2xl font-bold text-[#2B2D31] mb-6">Productos Relacionados</h2><div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">{relatedProducts.map((p) => <ProductCard key={p.id} product={p} onAddToCart={addToCart} />)}</div></section>}
    </div></div>
  );
}
