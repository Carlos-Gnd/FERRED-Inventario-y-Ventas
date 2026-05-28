import { Target, Eye, Award, Users, Shield } from 'lucide-react';

export function AcercaDeNosotros() {
  return (
    <div className="min-h-screen bg-[#F5F2EB]">
      <div className="bg-[#2B2D31] text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-5xl font-bold mb-4">Acerca de Nosotros</h1>
          <p className="text-xl text-[#E5E2DA]">Tu ferretería de confianza en El Salvador</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Descripción */}
        <div className="bg-white rounded-xl shadow-lg p-12 mb-12">
          <h2 className="text-4xl font-bold text-[#2B2D31] mb-6 text-center">
            FERRED - Tu Ferretería de Confianza
          </h2>
          <p className="text-lg text-[#5F6368] leading-relaxed text-center max-w-4xl mx-auto">
            FERRED es una empresa salvadoreña especializada en la distribución y venta de herramientas,
            materiales de construcción y equipos industriales de alta calidad. Desde nuestros inicios,
            nos hemos comprometido a ofrecer productos de las mejores marcas mundiales, respaldados por
            un servicio profesional y personalizado. Atendemos tanto a profesionales de la construcción
            como a personas que buscan herramientas confiables para sus proyectos personales. Con 19
            sucursales estratégicamente ubicadas y nuestra plataforma de comercio electrónico, llevamos
            calidad y profesionalismo a cada rincón del país.
          </p>
        </div>

        {/* Misión y Visión */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
          <div className="bg-white rounded-xl shadow-lg p-8">
            <div className="size-16 bg-[#D97706] rounded-xl flex items-center justify-center mb-6">
              <Target className="text-white" size={32} />
            </div>
            <h3 className="text-3xl font-bold text-[#2B2D31] mb-4">Nuestra Misión</h3>
            <p className="text-[#5F6368] leading-relaxed">
              Proveer a nuestros clientes herramientas y materiales de construcción de la más alta
              calidad, garantizando un servicio profesional, asesoría técnica especializada y soluciones
              integrales que impulsen el éxito de sus proyectos. Nos comprometemos a ser el socio
              estratégico de constructores, profesionales y particulares, ofreciendo productos confiables
              que superen sus expectativas.
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-8">
            <div className="size-16 bg-[#D97706] rounded-xl flex items-center justify-center mb-6">
              <Eye className="text-white" size={32} />
            </div>
            <h3 className="text-3xl font-bold text-[#2B2D31] mb-4">Nuestra Visión</h3>
            <p className="text-[#5F6368] leading-relaxed">
              Ser la ferretería líder en El Salvador, reconocida por nuestra excelencia en productos,
              innovación en servicios y compromiso con la satisfacción del cliente. Aspiramos a expandir
              nuestra presencia nacional, fortalecer nuestra plataforma digital y convertirnos en la
              primera opción para profesionales y entusiastas de la construcción, siendo referente en
              calidad, confianza y asesoría técnica especializada.
            </p>
          </div>
        </div>

        {/* Valores */}
        <div className="bg-white rounded-xl shadow-lg p-12">
          <h3 className="text-3xl font-bold text-[#2B2D31] mb-8 text-center">
            Nuestros Valores
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="size-20 bg-[#D97706] rounded-full flex items-center justify-center mx-auto mb-4">
                <Award className="text-white" size={40} />
              </div>
              <h4 className="text-xl font-bold text-[#2B2D31] mb-3">Calidad</h4>
              <p className="text-[#5F6368]">
                Ofrecemos exclusivamente productos de las mejores marcas, garantizando durabilidad
                y rendimiento superior en cada herramienta y material.
              </p>
            </div>

            <div className="text-center">
              <div className="size-20 bg-[#D97706] rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="text-white" size={40} />
              </div>
              <h4 className="text-xl font-bold text-[#2B2D31] mb-3">Servicio</h4>
              <p className="text-[#5F6368]">
                Nuestro equipo de expertos brinda asesoría personalizada y profesional, acompañando
                a cada cliente en la selección de las soluciones ideales para sus proyectos.
              </p>
            </div>

            <div className="text-center">
              <div className="size-20 bg-[#D97706] rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="text-white" size={40} />
              </div>
              <h4 className="text-xl font-bold text-[#2B2D31] mb-3">Confianza</h4>
              <p className="text-[#5F6368]">
                Construimos relaciones duraderas basadas en la transparencia, honestidad y cumplimiento
                de nuestros compromisos con clientes y proveedores.
              </p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="mt-12 bg-gradient-to-r from-[#2B2D31] to-[#5F6368] rounded-xl p-12 text-white text-center">
          <h3 className="text-3xl font-bold mb-4">¿Listo para tu próximo proyecto?</h3>
          <p className="text-xl text-[#E5E2DA] mb-8">
            Descubre nuestro catálogo completo de herramientas y materiales profesionales
          </p>
          <div className="flex gap-4 justify-center">
            <button type="button" className="bg-[#D97706] text-white px-8 py-3 rounded-xl font-semibold hover:bg-[#B45309] transition-colors">
              Ver Catálogo
            </button>
            <button type="button" className="bg-white text-[#2B2D31] px-8 py-3 rounded-xl font-semibold hover:bg-[#F5F2EB] transition-colors">
              Visitar Sucursal
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
