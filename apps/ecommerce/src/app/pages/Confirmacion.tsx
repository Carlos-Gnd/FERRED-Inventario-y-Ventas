import { Link, useLocation, useParams } from 'react-router';
import { CheckCircle, Home, Package } from 'lucide-react';

export function PedidoExito() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const pedido = (location.state as { pedido?: any } | undefined)?.pedido;
  const pedidoId = pedido?.id ?? id ?? 'N/A';

  return (
    <div className="min-h-screen bg-[#F5F2EB] flex items-center justify-center py-12">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="bg-white rounded-xl shadow-xl p-8 md:p-12 text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6"><CheckCircle size={48} className="text-green-600" /></div>
          <h1 className="text-3xl font-bold text-[#2B2D31] mb-4">Pedido confirmado</h1>
          <div className="bg-[#F5F2EB] rounded-xl p-6 mb-8">
            <p className="text-sm text-[#5F6368] mb-2">Numero de pedido</p>
            <p className="text-2xl font-bold text-[#D97706]">#{pedidoId}</p>
            <p className="text-sm text-[#5F6368] mt-2">Estado: {pedido?.estado ?? 'RECIBIDO'}</p>
            {pedido?.tipoEntrega && (
              <p className="text-sm text-[#5F6368]">
                Entrega: {pedido.tipoEntrega === 'RETIRO' ? 'Retiro en sucursal' : 'Envio a domicilio'}
              </p>
            )}
            <p className="text-sm text-[#5F6368]">Total: ${Number(pedido?.total ?? 0).toFixed(2)}</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/catalogo" className="bg-[#D97706] text-white px-8 py-3 rounded-xl font-semibold inline-flex items-center justify-center gap-2"><Package size={20} />Seguir comprando</Link>
            <Link to="/" className="border-2 border-[#D97706] text-[#D97706] px-8 py-3 rounded-xl font-semibold inline-flex items-center justify-center gap-2"><Home size={20} />Volver al Inicio</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
