import { ChevronRight, Drill, Hammer, Paintbrush, Zap, Wrench, Package, MapPin, Store } from 'lucide-react';
import { Link } from 'react-router';
import { ProductCard } from '../components/ProductCard';
import { useEcommerce } from '../context/EcommerceContext';

export function Home() {
  const { products, addToCart, loadingProducts, productsError } = useEcommerce();
  const featuredProducts = products.slice(0, 4);

  return (
    <div className="min-h-screen">
      {/* Hero Banner */}
      <section className="relative bg-gradient-to-r from-[#2B2D31] to-[#5F6368] text-white py-12 sm:py-16 md:py-20 lg:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-12 items-center">
            <div>
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4 md:mb-6 leading-tight">
                Herramientas Profesionales de Alta Calidad
              </h1>
              <p className="text-base sm:text-lg md:text-xl text-[#E5E2DA] mb-6 md:mb-8">
                Las mejores marcas en herramientas, materiales y equipos para construcción.
                Calidad garantizada y asesoría profesional.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                <Link
                  to="/catalogo"
                  className="bg-[#D97706] text-white px-6 sm:px-8 py-2 sm:py-3 rounded-xl font-semibold hover:bg-[#B45309] transition-colors inline-flex items-center justify-center gap-2 text-sm sm:text-base"
                >
                  Ver Catálogo
                  <ChevronRight size={18} />
                </Link>
                <button type="button" className="border-2 border-white text-white px-6 sm:px-8 py-2 sm:py-3 rounded-xl font-semibold hover:bg-white/10 transition-colors text-sm sm:text-base">
                  Promociones
                </button>
              </div>
            </div>
            <div className="hidden lg:block">
              <img
                src="https://images.unsplash.com/photo-1581244277943-fe4a9c777189?w=600"
                alt="Herramientas profesionales"
                className="rounded-xl shadow-2xl w-full"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Categorías Populares */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
        <h2 className="text-2xl sm:text-3xl md:text-3xl font-bold text-[#2B2D31] mb-8">Categorías Populares</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
          {[
            { name: 'Taladros', icon: Drill, color: '#D97706' },
            { name: 'Herramientas', icon: Hammer, color: '#D97706' },
            { name: 'Pinturas', icon: Paintbrush, color: '#D97706' },
            { name: 'Electricidad', icon: Zap, color: '#D97706' },
            { name: 'Fontanería', icon: Wrench, color: '#D97706' },
            { name: 'Construcción', icon: Package, color: '#D97706' }
          ].map((category) => (
            <Link
              key={category.name}
              to="/catalogo"
              className="bg-white p-4 sm:p-6 rounded-lg sm:rounded-xl border border-[#E5E2DA] hover:border-[#D97706] hover:shadow-lg transition-all text-center group"
            >
              <category.icon
                size={32}
                className="mx-auto mb-2 sm:mb-3 text-[#5F6368] group-hover:text-[#D97706] transition-colors flex-shrink-0"
              />
              <h3 className="font-semibold text-[#2B2D31] text-xs sm:text-sm leading-tight">{category.name}</h3>
            </Link>
          ))}
        </div>
      </section>

      {/* Productos Destacados */}
      <section className="bg-white py-12 md:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
            <h2 className="text-2xl sm:text-3xl font-bold text-[#2B2D31]">Productos Destacados</h2>
            <Link
              to="/catalogo"
              className="text-[#D97706] hover:text-[#B45309] font-semibold flex items-center gap-1 text-sm sm:text-base"
            >
              Ver todos
              <ChevronRight size={18} />
            </Link>
          </div>
          {loadingProducts && <p className="text-[#5F6368]">Cargando productos…</p>}
          {productsError && <p className="text-red-600">{productsError}</p>}
          {!loadingProducts && !productsError && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 md:gap-4 lg:gap-6">
              {featuredProducts.map((product) => (
                <ProductCard key={product.id} product={product} onAddToCart={addToCart} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Banner Promocional */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {/* Banner Principal - Mejores Marcas */}
          <div className="lg:col-span-2 bg-gradient-to-br from-[#D97706] to-[#B45309] rounded-xl p-6 md:p-8 lg:p-12 text-white relative overflow-hidden">
            <div className="relative z-10">
              <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-3 md:mb-4 leading-tight">
                LAS MEJORES<br />MARCAS
              </h2>
              <p className="text-base sm:text-lg md:text-xl mb-4 md:mb-6 text-white/90 max-w-md">
                DeWalt • Makita • Stanley • Bosch<br />
                Calidad profesional garantizada
              </p>
              <Link
                to="/catalogo"
                className="bg-white text-[#D97706] px-6 md:px-8 py-2 md:py-3 rounded-xl font-semibold hover:bg-[#F5F2EB] transition-colors inline-block text-sm md:text-base"
              >
                Ver Catálogo
              </Link>
            </div>
            <div className="absolute right-0 bottom-0 opacity-10">
              <Hammer size={150} className="md:w-[200px] md:h-[200px]" />
            </div>
          </div>

          {/* Banner Descuento */}
          <div className="bg-[#2B2D31] rounded-xl p-6 md:p-8 text-white text-center flex flex-col justify-center">
            <div className="text-4xl sm:text-5xl md:text-6xl font-bold text-[#D97706] mb-2">30%</div>
            <h3 className="text-lg md:text-2xl font-bold mb-2">DESCUENTO</h3>
            <p className="text-[#E5E2DA] mb-4 text-sm md:text-base">
              En herramientas eléctricas seleccionadas
            </p>
            <Link
              to="/catalogo"
              className="text-[#D97706] font-semibold hover:text-white transition-colors text-sm md:text-base"
            >
              Ver Ofertas →
            </Link>
          </div>

          {/* Banner Pinturas */}
          <div className="bg-gradient-to-br from-[#5F6368] to-[#2B2D31] rounded-xl p-6 md:p-8 text-white">
            <div className="flex items-center gap-3 mb-3">
              <Paintbrush size={28} className="text-[#D97706] flex-shrink-0" />
              <div className="text-2xl md:text-3xl font-bold text-[#D97706]">10%</div>
            </div>
            <h3 className="text-lg md:text-xl font-bold mb-2">Pinturas Premium</h3>
            <p className="text-[#E5E2DA] text-xs md:text-sm">
              Descuento en toda la línea de pinturas de alta cobertura
            </p>
          </div>

          {/* Banner Expo */}
          <div className="lg:col-span-2 bg-white border-4 border-[#D97706] rounded-xl p-6 md:p-8 text-[#2B2D31]">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <h3 className="text-xl sm:text-2xl md:text-3xl font-bold mb-2">EXPO HERRAMIENTAS 2026</h3>
                <p className="text-[#5F6368] text-sm md:text-lg mb-2 md:mb-3">
                  + 40 Expositores de las mejores marcas
                </p>
                <p className="text-[#D97706] font-semibold text-sm md:text-base">
                  Mayo 15-20 • Showroom FERRED
                </p>
              </div>
              <div className="hidden md:block flex-shrink-0">
                <Package size={80} className="text-[#D97706]" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Garantías y Servicios */}
      <section className="bg-[#F5F2EB] py-12 md:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8 text-center">
            <div>
              <div className="w-14 h-14 sm:w-16 sm:h-16 bg-[#D97706] rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4 flex-shrink-0">
                <Package className="text-white" size={28} />
              </div>
              <h3 className="font-bold text-[#2B2D31] mb-2 text-base sm:text-lg">Envío Rápido</h3>
              <p className="text-[#5F6368] text-sm sm:text-base">Entregas en 24-48 horas en área metropolitana</p>
            </div>
            <div>
              <div className="w-14 h-14 sm:w-16 sm:h-16 bg-[#D97706] rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4 flex-shrink-0">
                <Hammer className="text-white" size={28} />
              </div>
              <h3 className="font-bold text-[#2B2D31] mb-2 text-base sm:text-lg">Garantía de Calidad</h3>
              <p className="text-[#5F6368] text-sm sm:text-base">Productos respaldados por las mejores marcas</p>
            </div>
            <div>
              <div className="w-14 h-14 sm:w-16 sm:h-16 bg-[#D97706] rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4 flex-shrink-0">
                <Zap className="text-white" size={28} />
              </div>
              <h3 className="font-bold text-[#2B2D31] mb-2 text-base sm:text-lg">Asesoría Profesional</h3>
              <p className="text-[#5F6368] text-sm sm:text-base">Expertos disponibles para ayudarte</p>
            </div>
          </div>
        </div>
      </section>

      {/* Encuentra tu FERRED */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
        <div className="bg-white rounded-xl shadow-xl overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
            <div className="bg-gradient-to-br from-[#2B2D31] to-[#5F6368] p-6 sm:p-8 md:p-12 flex flex-col justify-center text-white">
              <Store size={48} className="text-[#D97706] mb-4 md:mb-6" />
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3 md:mb-4 leading-tight">
                Encuentra tu FERRED más cercano
              </h2>
              <p className="text-base md:text-lg text-[#E5E2DA] mb-4 md:mb-6">
                Compra en línea y retira donde te quede más conveniente.
              </p>
              <ul className="space-y-2 md:space-y-3 mb-6 md:mb-8 text-sm md:text-base">
                <li className="flex items-center gap-3">
                  <MapPin className="text-[#D97706] flex-shrink-0" size={18} />
                  <span>19 sucursales en todo el país</span>
                </li>
                <li className="flex items-center gap-3">
                  <Package className="text-[#D97706] flex-shrink-0" size={18} />
                  <span>Retiro en tienda sin costo</span>
                </li>
                <li className="flex items-center gap-3">
                  <Zap className="text-[#D97706] flex-shrink-0" size={18} />
                  <span>Disponible en 2-4 horas</span>
                </li>
              </ul>
              <Link
                to="/como-comprar"
                className="bg-[#D97706] text-white px-6 sm:px-8 py-2 sm:py-3 rounded-xl font-semibold hover:bg-[#B45309] transition-colors inline-flex items-center gap-2 w-fit text-sm sm:text-base"
              >
                Ver Cómo Comprar
                <ChevronRight size={18} />
              </Link>
            </div>
            <div className="hidden lg:block">
              <img
                src="https://images.unsplash.com/photo-1504917595217-d4dc5ebe6122?w=800"
                alt="Tienda FERRED"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
