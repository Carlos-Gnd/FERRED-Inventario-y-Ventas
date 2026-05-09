import { Link, useLocation, useParams } from 'react-router';
import { CheckCircle, Home, Package, Truck } from 'lucide-react';
import type { PedidoOnline } from '../types';

export function PedidoExito() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const pedido = (location.state as { pedido?: PedidoOnline } | undefined)?.pedido;
  const pedidoId = pedido?.id ?? id ?? 'N/A';
  const detalles = pedido?.detalles ?? [];
  const total = Number(pedido?.total ?? 0);

  return (
    <div className="min-h-screen bg-[#F5F2EB] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg bg-white rounded-xl shadow-xl px-8 py-10 text-center">
        <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-5">
          <CheckCircle className="text-green-600" size={42} />
        </div>

        <h1 className="text-2xl font-bold text-[#2B2D31] mb-3">¡Compra Exitosa!</h1>
        <p className="text-[#5F6368] text-sm mb-6">Tu pedido ha sido confirmado y esta siendo procesado</p>

        <div className="bg-[#F5F2EB] rounded-xl px-6 py-5 mb-7">
          <p className="text-xs text-[#5F6368] mb-1">Numero de orden</p>
          <p className="text-xl font-bold text-[#D97706]">FERRED-{String(pedidoId).padStart(6, '0')}</p>
        </div>

        <div className="border-y border-[#E5E2DA] py-5 mb-6 text-left">
          <h2 className="font-bold text-[#2B2D31] text-center mb-4">Resumen del Pedido</h2>
          <div className="space-y-3">
            {detalles.length > 0 ? (
              detalles.map((detalle) => (
                <div key={detalle.id} className="flex justify-between gap-4 text-sm">
                  <span className="text-[#5F6368]">{detalle.producto?.nombre ?? `Producto #${detalle.productoId}`}</span>
                  <span className="font-semibold text-[#2B2D31]">${Number(detalle.subtotal).toFixed(2)}</span>
                </div>
              ))
            ) : (
              <div className="flex justify-between gap-4 text-sm">
                <span className="text-[#5F6368]">Pedido #{pedidoId}</span>
                <span className="font-semibold text-[#2B2D31]">${total.toFixed(2)}</span>
              </div>
            )}
          </div>
          <div className="flex justify-between items-center border-t border-[#E5E2DA] mt-4 pt-4">
            <span className="font-bold text-[#2B2D31]">Total</span>
            <span className="text-xl font-bold text-[#D97706]">${total.toFixed(2)}</span>
          </div>
        </div>

        <h2 className="font-bold text-[#2B2D31] mb-4">Estado del Pedido</h2>
        <div className="grid grid-cols-3 items-start mb-6">
          <StatusStep active icon={<CheckCircle size={18} />} label="Confirmado" />
          <StatusStep icon={<Package size={18} />} label="Preparando" />
          <StatusStep icon={<Truck size={18} />} label="En camino" />
        </div>

        <div className="bg-[#F5F2EB] rounded-xl text-[#5F6368] text-xs px-5 py-4 mb-6">
          Te enviaremos un correo a tu Gmail con todos los detalles de tu pedido. Recibiras notificaciones sobre el estado de tu envio.
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link to="/cliente" className="bg-[#D97706] text-white px-6 py-3 rounded-xl font-semibold inline-flex items-center justify-center gap-2">
            <Package size={18} /> Ver Mis Pedidos
          </Link>
          <Link to="/" className="border border-[#D97706] text-[#D97706] px-6 py-3 rounded-xl font-semibold inline-flex items-center justify-center gap-2">
            <Home size={18} /> Volver al Inicio
          </Link>
        </div>
      </div>
    </div>
  );
}

function StatusStep({ active = false, icon, label }: { active?: boolean; icon: React.ReactNode; label: string }) {
  return (
    <div className="relative flex flex-col items-center gap-2">
      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${active ? 'bg-[#D97706] text-white' : 'bg-[#E5E2DA] text-[#5F6368]'}`}>
        {icon}
      </div>
      <span className="text-[11px] text-[#5F6368]">{label}</span>
    </div>
  );
}
