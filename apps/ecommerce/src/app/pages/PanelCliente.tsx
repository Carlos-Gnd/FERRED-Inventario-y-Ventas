import { useEffect, useState } from 'react';
import { Package, User, MapPin, ShoppingBag, Clock, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router';
import { useAuth } from '../context/AuthContext';
import { getMisPedidos } from '../services/ecommerceApi';
import type { PedidoOnline } from '../types';

export function PanelCliente() {
  const navigate = useNavigate();
  const { cliente, token, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<'pedidos' | 'perfil' | 'direcciones'>('pedidos');
  const [orders, setOrders] = useState<PedidoOnline[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [ordersError, setOrdersError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    setLoadingOrders(true);
    setOrdersError(null);
    getMisPedidos(token)
      .then((response) => setOrders(response.pedidos))
      .catch((error) => setOrdersError(error instanceof Error ? error.message : 'No se pudieron cargar tus pedidos'))
      .finally(() => setLoadingOrders(false));
  }, [token]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const initials = cliente?.nombre
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'CL';

  return (
    <div className="min-h-screen bg-[#F5F2EB]">
      <div className="bg-[#2B2D31] text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl font-bold">Mi Cuenta</h1>
          <p className="text-[#E5E2DA] mt-2">Gestiona tus pedidos y datos de cliente</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <aside className="lg:col-span-1">
            <div className="bg-white rounded-xl p-6 shadow-md">
              <div className="flex items-center gap-4 mb-6 pb-6 border-b border-[#E5E2DA]">
                <div className="w-16 h-16 bg-[#D97706] rounded-full flex items-center justify-center text-white text-2xl font-bold">
                  {initials}
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-[#2B2D31] truncate">{cliente?.nombre}</p>
                  <p className="text-sm text-[#5F6368] truncate">{cliente?.email}</p>
                </div>
              </div>

              <nav className="space-y-2">
                <button
                  onClick={() => setActiveTab('pedidos')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
                    activeTab === 'pedidos'
                      ? 'bg-[#D97706] text-white'
                      : 'text-[#5F6368] hover:bg-[#F5F2EB]'
                  }`}
                >
                  <ShoppingBag size={20} />
                  Mis Pedidos
                </button>
                <button
                  onClick={() => setActiveTab('perfil')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
                    activeTab === 'perfil'
                      ? 'bg-[#D97706] text-white'
                      : 'text-[#5F6368] hover:bg-[#F5F2EB]'
                  }`}
                >
                  <User size={20} />
                  Mi Perfil
                </button>
                <button
                  onClick={() => setActiveTab('direcciones')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
                    activeTab === 'direcciones'
                      ? 'bg-[#D97706] text-white'
                      : 'text-[#5F6368] hover:bg-[#F5F2EB]'
                  }`}
                >
                  <MapPin size={20} />
                  Direccion
                </button>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors text-[#5F6368] hover:bg-[#F5F2EB]"
                >
                  <LogOut size={20} />
                  Cerrar sesion
                </button>
              </nav>
            </div>
          </aside>

          <div className="lg:col-span-3">
            {activeTab === 'pedidos' && (
              <div>
                <h2 className="text-2xl font-bold text-[#2B2D31] mb-6">Historial de Pedidos</h2>
                {loadingOrders && <p className="text-[#5F6368]">Cargando pedidos...</p>}
                {ordersError && <p className="text-red-600">{ordersError}</p>}
                {!loadingOrders && !ordersError && orders.length === 0 && (
                  <div className="bg-white rounded-xl p-8 shadow-md text-[#5F6368]">
                    Todavia no tienes pedidos registrados.
                  </div>
                )}
                <div className="space-y-4">
                  {orders.map((order) => (
                    <div key={order.id} className="bg-white rounded-xl p-6 shadow-md">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-start gap-4">
                          <div className="w-12 h-12 bg-[#F5F2EB] rounded-xl flex items-center justify-center">
                            <Package className="text-[#D97706]" size={24} />
                          </div>
                          <div>
                            <p className="font-bold text-[#2B2D31]">Pedido #{order.id}</p>
                            <p className="text-sm text-[#5F6368] flex items-center gap-1 mt-1">
                              <Clock size={14} />
                              {new Date(order.creadoEn).toLocaleDateString('es-SV', {
                                day: 'numeric',
                                month: 'long',
                                year: 'numeric',
                              })}
                            </p>
                            <p className="text-sm text-[#5F6368] mt-1">
                              {order.detalles?.length ?? 0} producto{(order.detalles?.length ?? 0) === 1 ? '' : 's'}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="text-sm text-[#5F6368]">Total</p>
                            <p className="text-xl font-bold text-[#D97706]">
                              ${Number(order.total).toFixed(2)}
                            </p>
                          </div>
                          <span className="bg-[#2B2D31] text-white px-4 py-2 rounded-lg text-sm font-semibold">
                            {order.estado}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'perfil' && (
              <div>
                <h2 className="text-2xl font-bold text-[#2B2D31] mb-6">Mi Perfil</h2>
                <div className="bg-white rounded-xl p-8 shadow-md space-y-5">
                  <div>
                    <p className="text-sm font-semibold text-[#5F6368]">Nombre</p>
                    <p className="text-lg text-[#2B2D31]">{cliente?.nombre}</p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[#5F6368]">Email</p>
                    <p className="text-lg text-[#2B2D31]">{cliente?.email}</p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[#5F6368]">Telefono</p>
                    <p className="text-lg text-[#2B2D31]">{cliente?.telefono || 'No registrado'}</p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'direcciones' && (
              <div>
                <h2 className="text-2xl font-bold text-[#2B2D31] mb-6">Direccion</h2>
                <div className="bg-white rounded-xl p-6 shadow-md">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-[#F5F2EB] rounded-xl flex items-center justify-center">
                      <MapPin className="text-[#D97706]" size={24} />
                    </div>
                    <div>
                      <p className="font-bold text-[#2B2D31] mb-2">Direccion registrada</p>
                      <p className="text-[#5F6368]">{cliente?.direccion || 'No hay direccion registrada.'}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
