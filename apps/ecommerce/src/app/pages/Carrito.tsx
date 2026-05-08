import { Link } from 'react-router';
import { Trash2, Plus, Minus, ShoppingBag, ArrowRight } from 'lucide-react';
import { useEcommerce } from '../context/EcommerceContext';

export function Carrito() {
  const { cartItems, updateQuantity, removeFromCart, subtotal } = useEcommerce();

  return (
    <div className="min-h-screen bg-[#F5F2EB]">
      <div className="bg-[#2B2D31] text-white py-12"><div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"><h1 className="text-4xl font-bold">Carrito de Compras</h1><p className="text-[#E5E2DA] mt-2">{cartItems.length} productos en tu carrito</p></div></div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {cartItems.length === 0 ? <div className="bg-white rounded-xl p-16 text-center"><ShoppingBag size={64} className="mx-auto text-[#E5E2DA] mb-4" /><h2 className="text-2xl font-bold text-[#2B2D31] mb-2">Tu carrito esta vacio</h2><Link to="/catalogo" className="inline-block bg-[#D97706] text-white px-8 py-3 rounded-xl font-semibold">Ver Catalogo</Link></div> : <div className="grid grid-cols-1 lg:grid-cols-3 gap-8"><div className="lg:col-span-2 space-y-4">{cartItems.map((item) => <div key={item.product.id} className="bg-white rounded-xl p-6 shadow-md"><div className="flex justify-between items-start"><div><h3 className="font-semibold text-[#2B2D31] text-lg">{item.product.nombre}</h3><p className="text-sm text-[#5F6368]">{item.product.categoria?.nombre}</p></div><button onClick={() => removeFromCart(item.product.id)} className="text-red-500"><Trash2 size={20} /></button></div><div className="flex items-center justify-between mt-4"><div className="flex items-center border border-[#E5E2DA] rounded-xl overflow-hidden"><button onClick={() => updateQuantity(item.product.id, item.quantity - 1)} className="p-2"><Minus size={16} /></button><span className="px-4 font-semibold">{item.quantity}</span><button onClick={() => updateQuantity(item.product.id, item.quantity + 1)} className="p-2"><Plus size={16} /></button></div><p className="text-xl font-bold text-[#D97706]">${(item.product.precioConIva * item.quantity).toFixed(2)}</p></div></div>)}</div><div className="bg-white rounded-xl p-6 shadow-md h-fit"><h2 className="font-bold text-[#2B2D31] text-xl mb-6">Resumen</h2><div className="flex justify-between mb-4"><span>Subtotal</span><span>${subtotal.toFixed(2)}</span></div><Link to="/checkout" className="w-full bg-[#D97706] text-white py-4 rounded-xl font-semibold flex items-center justify-center gap-2">Proceder al Pago <ArrowRight size={20} /></Link></div></div>}
      </div>
    </div>
  );
}
