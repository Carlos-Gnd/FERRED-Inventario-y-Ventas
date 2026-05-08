import { useState } from 'react';
import { Package, User, MapPin, ShoppingBag, Clock } from 'lucide-react';

export function PanelCliente() {
  const [activeTab, setActiveTab] = useState<'pedidos' | 'perfil' | 'direcciones'>('pedidos');

  const orders = [
    {
      id: 'FERRED-A8KL9M2P',
      date: '2026-05-03',
      status: 'En camino',
      total: 379.96,
      items: 3,
      statusColor: 'bg-blue-500'
    },
    {
      id: 'FERRED-B3FG7H1K',
      date: '2026-04-28',
      status: 'Entregado',
      total: 124.99,
      items: 2,
      statusColor: 'bg-green-500'
    },
    {
      id: 'FERRED-C9XT5N4R',
      date: '2026-04-15',
      status: 'Entregado',
      total: 89.99,
      items: 1,
      statusColor: 'bg-green-500'
    }
  ];

  const addresses = [
    {
      id: 1,
      name: 'Casa',
      street: 'Av. Principal 123',
      city: 'Ciudad de México',
      zip: '06100',
      isDefault: true
    },
    {
      id: 2,
      name: 'Oficina',
      street: 'Calle Reforma 456',
      city: 'Ciudad de México',
      zip: '06700',
      isDefault: false
    }
  ];

  return (
    <div className="min-h-screen bg-[#F5F2EB]">
      <div className="bg-[#2B2D31] text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl font-bold">Mi Cuenta</h1>
          <p className="text-[#E5E2DA] mt-2">Gestiona tus pedidos y configuración</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <aside className="lg:col-span-1">
            <div className="bg-white rounded-xl p-6 shadow-md">
              <div className="flex items-center gap-4 mb-6 pb-6 border-b border-[#E5E2DA]">
                <div className="w-16 h-16 bg-[#D97706] rounded-full flex items-center justify-center text-white text-2xl font-bold">
                  JD
                </div>
                <div>
                  <p className="font-bold text-[#2B2D31]">Juan Pérez</p>
                  <p className="text-sm text-[#5F6368]">juan@email.com</p>
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
                  Direcciones
                </button>
              </nav>
            </div>
          </aside>

          {/* Contenido Principal */}
          <div className="lg:col-span-3">
            {activeTab === 'pedidos' && (
              <div>
                <h2 className="text-2xl font-bold text-[#2B2D31] mb-6">Historial de Pedidos</h2>
                <div className="space-y-4">
                  {orders.map((order) => (
                    <div key={order.id} className="bg-white rounded-xl p-6 shadow-md">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-start gap-4">
                          <div className="w-12 h-12 bg-[#F5F2EB] rounded-xl flex items-center justify-center">
                            <Package className="text-[#D97706]" size={24} />
                          </div>
                          <div>
                            <p className="font-bold text-[#2B2D31]">{order.id}</p>
                            <p className="text-sm text-[#5F6368] flex items-center gap-1 mt-1">
                              <Clock size={14} />
                              {new Date(order.date).toLocaleDateString('es-ES', {
                                day: 'numeric',
                                month: 'long',
                                year: 'numeric'
                              })}
                            </p>
                            <p className="text-sm text-[#5F6368] mt-1">
                              {order.items} producto{order.items > 1 ? 's' : ''}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="text-sm text-[#5F6368]">Total</p>
                            <p className="text-xl font-bold text-[#D97706]">
                              ${order.total.toFixed(2)}
                            </p>
                          </div>
                          <div>
                            <span
                              className={`${order.statusColor} text-white px-4 py-2 rounded-lg text-sm font-semibold`}
                            >
                              {order.status}
                            </span>
                          </div>
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
                <div className="bg-white rounded-xl p-8 shadow-md">
                  <form className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-semibold text-[#2B2D31] mb-2">
                          Nombre
                        </label>
                        <input
                          type="text"
                          defaultValue="Juan"
                          className="w-full px-4 py-3 border border-[#E5E2DA] rounded-xl focus:ring-2 focus:ring-[#D97706] outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-[#2B2D31] mb-2">
                          Apellido
                        </label>
                        <input
                          type="text"
                          defaultValue="Pérez"
                          className="w-full px-4 py-3 border border-[#E5E2DA] rounded-xl focus:ring-2 focus:ring-[#D97706] outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-[#2B2D31] mb-2">
                        Email
                      </label>
                      <input
                        type="email"
                        defaultValue="juan@email.com"
                        className="w-full px-4 py-3 border border-[#E5E2DA] rounded-xl focus:ring-2 focus:ring-[#D97706] outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-[#2B2D31] mb-2">
                        Teléfono
                      </label>
                      <input
                        type="tel"
                        defaultValue="+52 55 1234 5678"
                        className="w-full px-4 py-3 border border-[#E5E2DA] rounded-xl focus:ring-2 focus:ring-[#D97706] outline-none"
                      />
                    </div>

                    <button
                      type="submit"
                      className="bg-[#D97706] text-white px-8 py-3 rounded-xl font-semibold hover:bg-[#B45309] transition-colors"
                    >
                      Guardar Cambios
                    </button>
                  </form>
                </div>
              </div>
            )}

            {activeTab === 'direcciones' && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-[#2B2D31]">Mis Direcciones</h2>
                  <button className="bg-[#D97706] text-white px-6 py-2 rounded-xl font-semibold hover:bg-[#B45309] transition-colors">
                    + Agregar Nueva
                  </button>
                </div>

                <div className="space-y-4">
                  {addresses.map((address) => (
                    <div
                      key={address.id}
                      className="bg-white rounded-xl p-6 shadow-md relative"
                    >
                      {address.isDefault && (
                        <span className="absolute top-4 right-4 bg-[#D97706] text-white px-3 py-1 rounded-lg text-xs font-semibold">
                          Por defecto
                        </span>
                      )}
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 bg-[#F5F2EB] rounded-xl flex items-center justify-center">
                          <MapPin className="text-[#D97706]" size={24} />
                        </div>
                        <div className="flex-1">
                          <p className="font-bold text-[#2B2D31] mb-2">{address.name}</p>
                          <p className="text-[#5F6368]">{address.street}</p>
                          <p className="text-[#5F6368]">
                            {address.city}, CP {address.zip}
                          </p>
                          <div className="flex gap-3 mt-4">
                            <button className="text-[#D97706] hover:text-[#B45309] font-semibold text-sm">
                              Editar
                            </button>
                            <button className="text-red-500 hover:text-red-700 font-semibold text-sm">
                              Eliminar
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
