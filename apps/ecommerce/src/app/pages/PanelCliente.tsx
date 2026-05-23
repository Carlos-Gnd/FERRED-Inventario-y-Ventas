import { useEffect, useState } from 'react';
import { Package, User, MapPin, ShoppingBag, Clock, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router';
import { useAuth } from '../context/AuthContext';
import { getMisPedidos } from '../services/ecommerceApi';
import type { PedidoOnline } from '../types';

// ── Badge de estado de pago ───────────────────────────────────────────────
type EstadoPago = 'PENDIENTE' | 'VALIDACION_PENDIENTE' | 'VALIDADO' | 'RECHAZADO';

const PAGO_BADGE: Record<EstadoPago, { label: string; classes: string }> = {
  PENDIENTE:            { label: 'Pago pendiente',  classes: 'bg-amber-100 text-amber-800' },
  VALIDACION_PENDIENTE: { label: 'En revisión',     classes: 'bg-blue-100 text-blue-800'   },
  VALIDADO:             { label: 'Pago aprobado',   classes: 'bg-green-100 text-green-800' },
  RECHAZADO:            { label: 'Pago rechazado',  classes: 'bg-red-100 text-red-800'     },
};

interface PagoResumen {
  id: number;
  estado: EstadoPago;
  metodo: string;
  monto: number;
}

interface PedidoConPagos extends PedidoOnline {
  pagos?: PagoResumen[];
}

// ── Helper ────────────────────────────────────────────────────────────────
function getPagoActivo(pagos?: PagoResumen[]): PagoResumen | null {
  if (!pagos || pagos.length === 0) return null;
  // Prioridad: VALIDADO > VALIDACION_PENDIENTE > RECHAZADO > PENDIENTE
  return (
    pagos.find((p) => p.estado === 'VALIDADO') ??
    pagos.find((p) => p.estado === 'VALIDACION_PENDIENTE') ??
    pagos.find((p) => p.estado === 'RECHAZADO') ??
    pagos[0]
  );
}

// ── Componente principal ──────────────────────────────────────────────────
export function PanelCliente() {
  const navigate = useNavigate();
  const { cliente, token, logout } = useAuth();
  const [activeTab, setActiveTab]   = useState<'pedidos' | 'perfil' | 'direcciones'>('pedidos');
  const [orders, setOrders]         = useState<PedidoConPagos[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [ordersError, setOrdersError]     = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    setLoadingOrders(true);
    setOrdersError(null);
    getMisPedidos(token)
      .then((response) => setOrders(response.pedidos as PedidoConPagos[]))
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

          {/* Sidebar */}
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
                {[
                  { tab: 'pedidos',     icon: ShoppingBag, label: 'Mis Pedidos'  },
                  { tab: 'perfil',      icon: User,        label: 'Mi Perfil'    },
                  { tab: 'direcciones', icon: MapPin,      label: 'Dirección'    },
                ].map(({ tab, icon: Icon, label }) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab as typeof activeTab)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
                      activeTab === tab
                        ? 'bg-[#D97706] text-white'
                        : 'text-[#5F6368] hover:bg-[#F5F2EB]'
                    }`}
                  >
                    <Icon size={20} />
                    {label}
                  </button>
                ))}
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors text-[#5F6368] hover:bg-[#F5F2EB]"
                >
                  <LogOut size={20} />
                  Cerrar sesión
                </button>
              </nav>
            </div>
          </aside>

          {/* Contenido */}
          <div className="lg:col-span-3">

            {/* ── Tab Pedidos ── */}
            {activeTab === 'pedidos' && (
              <div>
                <h2 className="text-2xl font-bold text-[#2B2D31] mb-6">Historial de Pedidos</h2>

                {loadingOrders && <p className="text-[#5F6368]">Cargando pedidos...</p>}
                {ordersError   && <p className="text-red-600">{ordersError}</p>}

                {!loadingOrders && !ordersError && orders.length === 0 && (
                  <div className="bg-white rounded-xl p-8 shadow-md text-[#5F6368]">
                    Todavía no tienes pedidos registrados.
                  </div>
                )}

                <div className="space-y-4">
                  {orders.map((order) => {
                    const pagoActivo  = getPagoActivo(order.pagos);

                    return (
                      <div key={order.id} className="bg-white rounded-xl p-6 shadow-md">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">

                          {/* Info del pedido */}
                          <div className="flex items-start gap-4">
                            <div className="w-12 h-12 bg-[#F5F2EB] rounded-xl flex items-center justify-center flex-shrink-0">
                              <Package className="text-[#D97706]" size={24} />
                            </div>
                            <div>
                              <p className="font-bold text-[#2B2D31]">Pedido #{order.id}</p>
                              <p className="text-sm text-[#5F6368] flex items-center gap-1 mt-1">
                                <Clock size={14} />
                                {new Date(order.creadoEn).toLocaleDateString('es-SV', {
                                  day: 'numeric', month: 'long', year: 'numeric',
                                })}
                              </p>
                              <p className="text-sm text-[#5F6368] mt-1">
                                {order.detalles?.length ?? 0} producto{(order.detalles?.length ?? 0) === 1 ? '' : 's'}
                              </p>

                              {/* Badge estado pago */}
                              {pagoActivo && (
                                <span className={`inline-block mt-2 text-xs font-semibold px-2 py-1 rounded-full ${PAGO_BADGE[pagoActivo.estado].classes}`}>
                                  {PAGO_BADGE[pagoActivo.estado].label}
                                </span>
                              )}

                              {/* Motivo rechazo */}
                              {pagoActivo?.estado === 'RECHAZADO' && (
                                <p className="text-xs text-red-600 mt-1">
                                  Pago rechazado. Intenta de nuevo.
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Derecha: total + estado */}
                          <div className="flex flex-col items-end gap-3">
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
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── Tab Perfil ── */}
            {activeTab === 'perfil' && (
              <div>
                <h2 className="text-2xl font-bold text-[#2B2D31] mb-6">Mi Perfil</h2>
                <div className="bg-white rounded-xl p-8 shadow-md space-y-5">
                  {[
                    { label: 'Nombre',   value: cliente?.nombre },
                    { label: 'Email',    value: cliente?.email  },
                    { label: 'Teléfono', value: cliente?.telefono || 'No registrado' },
                  ].map(({ label, value }) => (
                    <div key={label}>
                      <p className="text-sm font-semibold text-[#5F6368]">{label}</p>
                      <p className="text-lg text-[#2B2D31]">{value}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Tab Direcciones ── */}
            {activeTab === 'direcciones' && (
              <div>
                <h2 className="text-2xl font-bold text-[#2B2D31] mb-6">Dirección</h2>
                <div className="bg-white rounded-xl p-6 shadow-md">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-[#F5F2EB] rounded-xl flex items-center justify-center">
                      <MapPin className="text-[#D97706]" size={24} />
                    </div>
                    <div>
                      <p className="font-bold text-[#2B2D31] mb-2">Dirección registrada</p>
                      <p className="text-[#5F6368]">{cliente?.direccion || 'No hay dirección registrada.'}</p>
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
