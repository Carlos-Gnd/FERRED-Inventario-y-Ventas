import { MapPin, Phone, Clock } from 'lucide-react';

export function Sucursales() {
  const sucursales = [
    {
      id: 1,
      nombre: 'FERRED Centro',
      direccion: 'Av. Juárez 234, Col. Centro, CP 06000',
      telefono: '+52 55 1234 5678',
      horario: 'Lun - Vie: 8:00 AM - 8:00 PM | Sáb: 9:00 AM - 6:00 PM | Dom: 10:00 AM - 3:00 PM',
      abierto: true
    },
    {
      id: 2,
      nombre: 'FERRED Norte',
      direccion: 'Blvd. Norte 789, Col. Industrial Norte, CP 07500',
      telefono: '+52 55 8765 4321',
      horario: 'Lun - Vie: 8:00 AM - 8:00 PM | Sáb: 9:00 AM - 6:00 PM | Dom: 10:00 AM - 3:00 PM',
      abierto: false
    }
  ];

  return (
    <div className="min-h-screen bg-[#F5F2EB]">
      <div className="bg-[#2B2D31] text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-5xl font-bold mb-4">Nuestras Sucursales</h1>
          <p className="text-xl text-[#E5E2DA]">Encuentra la tienda FERRED más cercana a ti</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {sucursales.map((sucursal) => (
            <div key={sucursal.id} className="bg-white rounded-xl shadow-lg p-8 relative">
              {sucursal.abierto && (
                <span className="absolute top-6 right-6 bg-green-500 text-white px-4 py-2 rounded-lg text-sm font-semibold">
                  Abierto ahora
                </span>
              )}

              <h2 className="text-3xl font-bold text-[#2B2D31] mb-6">
                {sucursal.nombre}
              </h2>

              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <div className="size-12 bg-[#F5F2EB] rounded-xl flex items-center justify-center flex-shrink-0">
                    <MapPin className="text-[#D97706]" size={24} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-[#2B2D31] mb-1">Dirección</h3>
                    <p className="text-[#5F6368]">{sucursal.direccion}</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="size-12 bg-[#F5F2EB] rounded-xl flex items-center justify-center flex-shrink-0">
                    <Phone className="text-[#D97706]" size={24} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-[#2B2D31] mb-1">Teléfono</h3>
                    <p className="text-[#5F6368]">{sucursal.telefono}</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="size-12 bg-[#F5F2EB] rounded-xl flex items-center justify-center flex-shrink-0">
                    <Clock className="text-[#D97706]" size={24} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-[#2B2D31] mb-1">Horario de atención</h3>
                    <p className="text-[#5F6368]">{sucursal.horario}</p>
                  </div>
                </div>
              </div>

              <button type="button" className="mt-6 w-full bg-[#D97706] text-white py-3 rounded-xl font-semibold hover:bg-[#B45309] transition-colors">
                Cómo llegar
              </button>
            </div>
          ))}
        </div>

        <div className="mt-12 bg-white rounded-xl p-8 text-center shadow-lg">
          <h3 className="text-2xl font-bold text-[#2B2D31] mb-4">
            ¿No encuentras una sucursal cerca?
          </h3>
          <p className="text-[#5F6368] mb-6">
            Contamos con envío a domicilio a todo el país. Compra en línea y recibe tus productos donde estés.
          </p>
          <button type="button" className="bg-[#2B2D31] text-white px-8 py-3 rounded-xl font-semibold hover:bg-[#5F6368] transition-colors">
            Comprar en línea
          </button>
        </div>
      </div>
    </div>
  );
}
