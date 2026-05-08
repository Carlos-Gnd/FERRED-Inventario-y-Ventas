import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { useEcommerce } from '../context/EcommerceContext';
import { useAuth } from '../context/AuthContext';

export function Checkout() {
  const navigate = useNavigate();
  const { cartItems, subtotal, zonasEnvio, createOrder, clearCart, selectedSucursalId } = useEcommerce();
  const { cliente, isAuthenticated, loadingAuth } = useAuth();
  const [nombre, setNombre] = useState(cliente?.nombre ?? '');
  const [telefono, setTelefono] = useState(cliente?.telefono ?? '');
  const [direccion, setDireccion] = useState(cliente?.direccion ?? '');
  const [tipoEntrega, setTipoEntrega] = useState<'RETIRO' | 'ENVIO'>('RETIRO');
  const [zonaEnvioId, setZonaEnvioId] = useState<number | null>(zonasEnvio[0]?.id ?? null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const costoEnvio = useMemo(() => {
    if (tipoEntrega === 'RETIRO') return 0;
    return zonasEnvio.find((z) => z.id === zonaEnvioId)?.costoEnvio ?? 0;
  }, [tipoEntrega, zonaEnvioId, zonasEnvio]);

  const total = subtotal + costoEnvio;

  useEffect(() => {
    if (!loadingAuth && !isAuthenticated) {
      navigate('/login', { replace: true, state: { from: '/checkout' } });
    }
  }, [isAuthenticated, loadingAuth, navigate]);

  useEffect(() => {
    if (!cliente) return;
    setNombre((current) => current || cliente.nombre);
    setTelefono((current) => current || cliente.telefono || '');
    setDireccion((current) => current || cliente.direccion || '');
  }, [cliente]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cartItems.length === 0) return;
    setLoading(true);
    setError(null);
    try {
      const payload = {
        clienteNombre: nombre,
        clienteTel: telefono,
        tipoEntrega,
        ...(tipoEntrega === 'RETIRO'
          ? { sucursalId: selectedSucursalId }
          : { zonaEnvioId: zonaEnvioId ?? undefined, direccionEnvio: direccion }),
        items: cartItems.map((item) => ({ productoId: item.product.id, cantidad: item.quantity })),
      };
      const result = await createOrder(payload);
      clearCart();
      navigate(`/pedido/${result.pedido.id}/exito`, { state: { pedido: result.pedido } });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear el pedido');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F2EB]">
      <div className="bg-[#2B2D31] text-white py-12"><div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"><h1 className="text-4xl font-bold">Finalizar Compra</h1></div></div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        <form onSubmit={handleSubmit} className="lg:col-span-2 bg-white rounded-xl p-8 space-y-5">
          <h2 className="text-2xl font-bold text-[#2B2D31]">Datos del pedido</h2>
          <input value={nombre} onChange={(e) => setNombre(e.target.value)} required placeholder="Nombre completo" className="w-full px-4 py-3 border border-[#E5E2DA] rounded-xl" />
          <input value={telefono} onChange={(e) => setTelefono(e.target.value)} required placeholder="Telefono" className="w-full px-4 py-3 border border-[#E5E2DA] rounded-xl" />

          <div className="flex gap-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="radio" checked={tipoEntrega === 'RETIRO'} onChange={() => setTipoEntrega('RETIRO')} />
              <span className="font-medium">Retiro en sucursal</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="radio" checked={tipoEntrega === 'ENVIO'} onChange={() => setTipoEntrega('ENVIO')} />
              <span className="font-medium">Envio a domicilio</span>
            </label>
          </div>

          {tipoEntrega === 'RETIRO' ? (
            <div className="px-4 py-3 bg-[#F5F2EB] rounded-xl text-sm text-[#5F6368]">
              Retiras en la sucursal #{selectedSucursalId} &mdash; <span className="font-semibold text-green-700">Costo: $0.00</span>
            </div>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium text-[#2B2D31] mb-1">Zona de envio</label>
                <select
                  value={zonaEnvioId ?? ''}
                  onChange={(e) => setZonaEnvioId(Number(e.target.value))}
                  className="w-full px-4 py-3 border border-[#E5E2DA] rounded-xl"
                  required
                >
                  <option value="" disabled>Selecciona una zona...</option>
                  {zonasEnvio.map((zona) => (
                    <option key={zona.id} value={zona.id}>
                      {zona.nombre} — ${zona.costoEnvio.toFixed(2)}
                    </option>
                  ))}
                </select>
              </div>
              <textarea
                value={direccion}
                onChange={(e) => setDireccion(e.target.value)}
                required
                rows={3}
                placeholder="Direccion de entrega"
                className="w-full px-4 py-3 border border-[#E5E2DA] rounded-xl"
              />
            </>
          )}

          {error && <p className="text-red-600 text-sm">{error}</p>}
          <button
            disabled={loading || cartItems.length === 0}
            className="w-full bg-[#D97706] text-white py-3 rounded-xl font-semibold disabled:bg-[#E5E2DA] disabled:text-[#5F6368]"
          >
            {loading ? 'Procesando...' : 'Confirmar Pedido'}
          </button>
        </form>

        <div className="bg-white rounded-xl p-6 shadow-md h-fit">
          <h3 className="font-bold text-[#2B2D31] mb-4">Resumen</h3>
          <div className="space-y-2 pb-4 border-b border-[#E5E2DA]">
            {cartItems.map((item) => (
              <div key={item.product.id} className="flex justify-between text-sm">
                <span className="text-[#5F6368]">{item.product.nombre} x{item.quantity}</span>
                <span>${(item.product.precioConIva * item.quantity).toFixed(2)}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 space-y-2">
            <div className="flex justify-between text-sm"><span>Subtotal</span><span>${subtotal.toFixed(2)}</span></div>
            <div className="flex justify-between text-sm">
              <span>Envio</span>
              <span className={costoEnvio === 0 ? 'text-green-700 font-medium' : ''}>
                {costoEnvio === 0 ? 'Gratis' : `$${costoEnvio.toFixed(2)}`}
              </span>
            </div>
            <div className="flex justify-between font-bold text-xl pt-2 border-t border-[#E5E2DA]">
              <span>Total</span>
              <span className="text-[#D97706]">${total.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
