import { MousePointer, ShoppingCart, CreditCard, Store, Clock, Truck, MapPin } from 'lucide-react';

export function ComoComprar() {
  return (
    <div className="min-h-screen bg-[#F5F2EB]">
      <div className="bg-[#2B2D31] text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-5xl font-bold mb-4 text-[#D97706]">¿CÓMO COMPRAR EN LÍNEA?</h1>
          <p className="text-2xl text-[#E5E2DA]">¡Fácil, práctico y seguro!</p>
        </div>
      </div>

      {/* Pasos para comprar */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Paso 1: Navega */}
          <div className="bg-white rounded-xl p-8 shadow-md">
            <div className="size-16 bg-[#D97706] rounded-xl flex items-center justify-center mb-4">
              <MousePointer className="text-white" size={32} />
            </div>
            <h3 className="text-xl font-bold text-[#2B2D31] mb-4">Navega</h3>
            <ul className="space-y-2 text-[#5F6368]">
              <li className="flex items-start gap-2">
                <span className="text-[#D97706] mt-1">✓</span>
                <span>Selecciona tu tienda preferida.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#D97706] mt-1">✓</span>
                <span>Navega por el sitio o busca los productos que deseas comprar.</span>
              </li>
            </ul>
          </div>

          {/* Paso 2: Agrega */}
          <div className="bg-white rounded-xl p-8 shadow-md">
            <div className="size-16 bg-[#D97706] rounded-xl flex items-center justify-center mb-4">
              <ShoppingCart className="text-white" size={32} />
            </div>
            <h3 className="text-xl font-bold text-[#2B2D31] mb-4">Agrega</h3>
            <ul className="space-y-2 text-[#5F6368]">
              <li className="flex items-start gap-2">
                <span className="text-[#D97706] mt-1">✓</span>
                <span>Elige tu producto y agrégalo al carrito de compras.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#D97706] mt-1">✓</span>
                <span>Cambia las cantidades o elimina productos que no desees.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#D97706] mt-1">✓</span>
                <span>Procede a pagar cuando estés listo para iniciar el proceso de compra.</span>
              </li>
            </ul>
          </div>

          {/* Paso 3: Inicia tu pago */}
          <div className="bg-white rounded-xl p-8 shadow-md">
            <div className="size-16 bg-[#D97706] rounded-xl flex items-center justify-center mb-4">
              <CreditCard className="text-white" size={32} />
            </div>
            <h3 className="text-xl font-bold text-[#2B2D31] mb-4">Inicia tu pago</h3>
            <ul className="space-y-2 text-[#5F6368]">
              <li className="flex items-start gap-2">
                <span className="text-[#D97706] mt-1">✓</span>
                <span>Inicia sesión o continúa el proceso de pago como invitado.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#D97706] mt-1">✓</span>
                <span>Actualiza o completa tus datos de compra.</span>
              </li>
            </ul>
          </div>

          {/* Paso 4: Modalidad de entrega */}
          <div className="bg-white rounded-xl p-8 shadow-md">
            <div className="size-16 bg-[#D97706] rounded-xl flex items-center justify-center mb-4">
              <Store className="text-white" size={32} />
            </div>
            <h3 className="text-xl font-bold text-[#2B2D31] mb-4">Modalidad de entrega</h3>
            <ul className="space-y-2 text-[#5F6368]">
              <li className="flex items-start gap-2">
                <span className="text-[#D97706] mt-1">✓</span>
                <span>Retirar en sucursal.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#D97706] mt-1">✓</span>
                <span>Envío a domicilio.</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* Modalidades de entrega detalladas */}
      <section className="bg-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-[#2B2D31] mb-12 text-center">
            Opciones de Entrega
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Retiro en sucursal */}
            <div className="border-2 border-[#E5E2DA] rounded-xl p-8 hover:border-[#D97706] transition-all">
              <div className="flex items-center gap-3 mb-4">
                <Store size={32} className="text-[#D97706]" />
                <h3 className="text-xl font-bold text-[#2B2D31]">Retiro en sucursal</h3>
              </div>
              <p className="text-[#5F6368] mb-4">
                Selecciona retiro en sucursal. Retira en la ferretería de tu preferencia. Contamos con 19 tiendas a tu disposición. Preséntate en atención al cliente cuando tu compra esté lista para retiro.
              </p>
              <div className="bg-[#F5F2EB] rounded-lg p-4">
                <p className="text-sm text-[#5F6368]">
                  <strong className="text-[#2B2D31]">Encuentra tu FERRED más cercano</strong><br />
                  Compra en línea y retira donde te quede más conveniente.
                </p>
              </div>
            </div>

            {/* Flash delivery */}
            <div className="border-2 border-[#E5E2DA] rounded-xl p-8 hover:border-[#D97706] transition-all">
              <div className="flex items-center gap-3 mb-4">
                <Clock size={32} className="text-[#D97706]" />
                <h3 className="text-xl font-bold text-[#2B2D31]">Flash delivery</h3>
              </div>
              <p className="text-[#5F6368] mb-4">
                Entrega el mismo día para pedidos realizados antes de las 2:00 pm. Aplica para compras en áreas metropolitanas cercanas a nuestras sucursales.
              </p>
              <div className="bg-[#F5F2EB] rounded-lg p-4">
                <p className="text-sm font-semibold text-[#D97706]">
                  Entrega Express disponible
                </p>
              </div>
            </div>

            {/* Envío a domicilio estándar */}
            <div className="border-2 border-[#E5E2DA] rounded-xl p-8 hover:border-[#D97706] transition-all">
              <div className="flex items-center gap-3 mb-4">
                <Truck size={32} className="text-[#D97706]" />
                <h3 className="text-xl font-bold text-[#2B2D31]">Envío a domicilio (estándar)</h3>
              </div>
              <p className="text-[#5F6368] mb-4">
                Entregas de 3-5 días hábiles. Gratis en áreas metropolitanas cercanas a nuestras sucursales. Entregas en todo el país con cargo adicional.
              </p>
              <div className="bg-green-100 rounded-lg p-4">
                <p className="text-sm font-semibold text-green-700">
                  ¡Envío gratis en compras +$500!
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Encuentra tu tienda */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="bg-gradient-to-r from-[#2B2D31] to-[#5F6368] rounded-xl p-12 text-white text-center">
          <MapPin size={64} className="mx-auto mb-6 text-[#D97706]" />
          <h2 className="text-4xl font-bold mb-4">Encuentra tu FERRED más cercano</h2>
          <p className="text-xl text-[#E5E2DA] mb-8">
            Compra en línea y retira donde te quede más conveniente.<br />
            19 sucursales en todo el país a tu disposición.
          </p>
          <button type="button" className="bg-[#D97706] text-white px-8 py-3 rounded-xl font-semibold hover:bg-[#B45309] transition-colors">
            Ver Mapa de Tiendas
          </button>
        </div>
      </section>
    </div>
  );
}
