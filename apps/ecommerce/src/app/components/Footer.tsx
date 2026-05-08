import { Mail, Phone, MapPin } from 'lucide-react';

export function Footer() {
  return (
    <footer className="bg-[#2B2D31] text-[#F5F2EB] mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 md:gap-12">
          {/* Info */}
          <div className="sm:col-span-2 lg:col-span-1">
            <h3 className="text-xl md:text-2xl font-bold mb-4">FERRED</h3>
            <p className="text-[#E5E2DA] text-sm md:text-base">
              Tu ferretería de confianza. Calidad y profesionalismo en herramientas y materiales.
            </p>
          </div>

          {/* Categorías */}
          <div>
            <h4 className="font-semibold mb-4 text-base md:text-lg">Categorías</h4>
            <ul className="space-y-2 text-[#E5E2DA] text-sm md:text-base">
              <li><a href="#" className="hover:text-[#D97706] transition-colors">Herramientas</a></li>
              <li><a href="#" className="hover:text-[#D97706] transition-colors">Construcción</a></li>
              <li><a href="#" className="hover:text-[#D97706] transition-colors">Electricidad</a></li>
              <li><a href="#" className="hover:text-[#D97706] transition-colors">Fontanería</a></li>
              <li><a href="#" className="hover:text-[#D97706] transition-colors">Pinturas</a></li>
            </ul>
          </div>

          {/* Contacto */}
          <div>
            <h4 className="font-semibold mb-4 text-base md:text-lg">Contacto</h4>
            <ul className="space-y-2 text-[#E5E2DA] text-sm md:text-base">
              <li className="flex items-center gap-2">
                <Phone size={16} className="flex-shrink-0" />
                <span>+1 234 567 8900</span>
              </li>
              <li className="flex items-center gap-2">
                <Mail size={16} className="flex-shrink-0" />
                <span>info@ferred.com</span>
              </li>
              <li className="flex items-center gap-2">
                <MapPin size={16} className="flex-shrink-0" />
                <span>Av. Industrial 123</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-[#5F6368] mt-8 md:mt-12 pt-8 md:pt-12 text-center text-[#E5E2DA] text-sm md:text-base">
          <p>&copy; 2026 FERRED. Todos los derechos reservados.</p>
        </div>
      </div>
    </footer>
  );
}
