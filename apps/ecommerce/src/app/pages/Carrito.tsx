import { Link } from 'react-router';
import { Trash2, Plus, Minus, ShoppingBag, ArrowRight } from 'lucide-react';
import { getProductImage } from '../utils/product.utils';
import { useEcommerce } from '../context/EcommerceContext';

export function Carrito() {
  const { cartItems, updateQuantity, removeFromCart, subtotal } = useEcommerce();

  return (
    <div className="min-h-screen bg-[#F5F2EB]">
      <section className="bg-[#2B2D31] text-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-12">
          <h1 className="text-3xl sm:text-4xl font-bold">Carrito de Compras</h1>
          <p className="text-[#E5E2DA] mt-2">
            {cartItems.length} producto{cartItems.length === 1 ? '' : 's'} en tu carrito
          </p>
        </div>
      </section>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {cartItems.length === 0 ? (
          <div className="bg-white rounded-xl p-12 sm:p-16 text-center shadow-md">
            <ShoppingBag size={64} className="mx-auto text-[#E5E2DA] mb-4" />
            <h2 className="text-2xl font-bold text-[#2B2D31] mb-4">Tu carrito esta vacio</h2>
            <Link to="/catalogo" className="inline-block bg-[#D97706] text-white px-8 py-3 rounded-xl font-semibold">
              Ver Catalogo
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
            <div className="space-y-5">
              {cartItems.map((item) => {
                const category = item.product.categoria?.nombre ?? 'Sin categoria';
                const image = getProductImage(item.product.imageUrl);
                const lineTotal = item.product.precioConIva * item.quantity;

                return (
                  <article key={item.product.id} className="bg-white rounded-xl shadow-md p-4 sm:p-5">
                    <div className="grid grid-cols-[96px_1fr_auto] gap-4 sm:gap-5 items-start">
                      <Link to={`/producto/${item.product.id}`} className="block size-24 rounded-lg overflow-hidden bg-[#F5F2EB]">
                        <img src={image} alt={item.product.nombre} loading="lazy" className="w-full h-full object-cover" />
                      </Link>

                      <div className="min-w-0">
                        <Link to={`/producto/${item.product.id}`} className="font-bold text-[#2B2D31] hover:text-[#D97706] line-clamp-2">
                          {item.product.nombre}
                        </Link>
                        <p className="text-sm text-[#5F6368] mt-1">{category}</p>

                        <div className="inline-flex items-center border border-[#E5E2DA] rounded-full overflow-hidden mt-5">
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                            className="w-9 h-8 flex items-center justify-center text-[#5F6368] hover:bg-[#F5F2EB]"
                            aria-label="Reducir cantidad"
                          >
                            <Minus size={14} />
                          </button>
                          <span className="w-9 h-8 flex items-center justify-center text-sm font-semibold">{item.quantity}</span>
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                            className="w-9 h-8 flex items-center justify-center text-[#5F6368] hover:bg-[#F5F2EB]"
                            aria-label="Aumentar cantidad"
                          >
                            <Plus size={14} />
                          </button>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-6">
                        <button
                          type="button"
                          onClick={() => removeFromCart(item.product.id)}
                          className="text-red-500 hover:text-red-700"
                          aria-label="Eliminar producto"
                        >
                          <Trash2 size={18} />
                        </button>
                        <div className="text-right">
                          <p className="text-xs text-[#5F6368]">${item.product.precioConIva.toFixed(2)} c/u</p>
                          <p className="text-xl font-bold text-[#D97706]">${lineTotal.toFixed(2)}</p>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}

              <div className="text-center pt-2">
                <Link to="/catalogo" className="text-[#D97706] hover:text-[#B45309] font-semibold">
                  Continuar comprando
                </Link>
              </div>
            </div>

            <aside className="bg-white rounded-xl p-6 shadow-md h-fit">
              <h2 className="font-bold text-[#2B2D31] text-xl mb-6">Resumen de Compra</h2>
              <div className="flex justify-between text-sm text-[#5F6368] pb-5 border-b border-[#E5E2DA]">
                <span>Subtotal</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center mt-5 mb-5">
                <span className="font-bold text-[#2B2D31]">Total</span>
                <span className="text-2xl font-bold text-[#D97706]">${subtotal.toFixed(2)}</span>
              </div>
              <Link to="/checkout" className="w-full bg-[#D97706] text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-[#B45309] transition-colors">
                Proceder al Pago <ArrowRight size={18} />
              </Link>
              <div className="bg-[#F5F2EB] text-[#5F6368] text-xs text-center rounded-lg p-4 mt-5">
                Aceptamos todas las tarjetas de credito y debito
              </div>
            </aside>
          </div>
        )}
      </main>
    </div>
  );
}
