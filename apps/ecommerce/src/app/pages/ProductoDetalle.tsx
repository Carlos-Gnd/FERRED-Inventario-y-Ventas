import { useMemo, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router';
import { Minus, Plus, ArrowLeft } from 'lucide-react';
import { ProductCard } from '../components/ProductCard';
import { useEcommerce } from '../context/EcommerceContext';

export function ProductoDetalle() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { products, addToCart } = useEcommerce();
  const product = products.find((p) => p.id === Number(id));
  const [quantity, setQuantity] = useState(1);

  const relatedProducts = useMemo(() => {
    if (!product) return [];
    return products.filter((p) => p.categoria?.id === product.categoria?.id && p.id !== product.id).slice(0, 4);
  }, [products, product]);

  if (!product) return <div className="min-h-screen flex items-center justify-center"><p className="text-xl text-[#5F6368]">Producto no encontrado</p></div>;

  return (
    <div className="min-h-screen bg-[#F5F2EB]"><div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Link to="/catalogo" className="flex items-center gap-2 text-[#5F6368] hover:text-[#D97706] mb-6"><ArrowLeft size={20} />Volver al catalogo</Link>
      <div className="bg-white rounded-xl shadow-lg overflow-hidden p-8">
        <h1 className="text-3xl font-bold text-[#2B2D31] mb-3">{product.nombre}</h1>
        <p className="text-[#5F6368] mb-2">{product.categoria?.nombre}</p>
        <p className="text-4xl font-bold text-[#D97706] mb-6">${product.precioConIva.toFixed(2)}</p>
        <div className="flex items-center gap-4 mb-6"><div className="flex items-center border border-[#E5E2DA] rounded-xl overflow-hidden"><button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="p-3"><Minus size={20} /></button><span className="px-6 font-semibold">{quantity}</span><button onClick={() => setQuantity(Math.min(product.stockDisponible, quantity + 1))} className="p-3"><Plus size={20} /></button></div><span className="text-sm text-[#5F6368]">Disponibles: {product.stockDisponible}</span></div>
        <div className="flex gap-4"><button onClick={() => addToCart(product, quantity)} className="flex-1 bg-[#D97706] text-white py-4 rounded-xl font-semibold">Agregar al carrito</button><button onClick={() => { addToCart(product, quantity); navigate('/checkout'); }} className="border-2 border-[#D97706] text-[#D97706] px-6 py-4 rounded-xl font-semibold">Comprar ahora</button></div>
      </div>
      {relatedProducts.length > 0 && <section className="mt-16"><h2 className="text-2xl font-bold text-[#2B2D31] mb-6">Productos Relacionados</h2><div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">{relatedProducts.map((p) => <ProductCard key={p.id} product={p} onAddToCart={addToCart} />)}</div></section>}
    </div></div>
  );
}
