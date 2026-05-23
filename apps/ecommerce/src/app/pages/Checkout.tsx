import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { Building2, ChevronRight, CreditCard, Home, MapPin, Truck, User } from 'lucide-react';
import { useEcommerce } from '../context/EcommerceContext';
import { useAuth } from '../context/AuthContext';

const checkoutSteps = [
  { label: 'Datos\nPersonales', icon: User },
  { label: 'Direccion', icon: MapPin },
  { label: 'Entrega', icon: Truck },
  { label: 'Pago', icon: CreditCard },
];

type CheckoutStep = 0 | 1 | 2 | 3;

export function Checkout() {
  const navigate = useNavigate();
  const { cartItems, subtotal, zonasEnvio, createOrder, clearCart, selectedSucursalId } = useEcommerce();
  const { cliente, isAuthenticated, loadingAuth } = useAuth();
  const [step, setStep] = useState<CheckoutStep>(0);
  const [firstName, setFirstName] = useState(cliente?.nombre?.split(' ')[0] ?? '');
  const [lastName, setLastName] = useState(cliente?.nombre?.split(' ').slice(1).join(' ') ?? '');
  const [telefono, setTelefono] = useState(cliente?.telefono ?? '');
  const [calle, setCalle] = useState(cliente?.direccion ?? '');
  const [ciudad, setCiudad] = useState('');
  const [codigoPostal, setCodigoPostal] = useState('');
  const [referencias, setReferencias] = useState('');
  const [tipoEntrega, setTipoEntrega] = useState<'RETIRO' | 'ENVIO'>('RETIRO');
  const [zonaEnvioId, setZonaEnvioId] = useState<number | null>(zonasEnvio[0]?.id ?? null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const nombre = `${firstName} ${lastName}`.trim();
  const direccionEnvio = [calle, ciudad, codigoPostal ? `CP ${codigoPostal}` : '', referencias].filter(Boolean).join(', ');

  const costoEnvio = useMemo(() => {
    if (tipoEntrega === 'RETIRO') return 0;
    return zonasEnvio.find((z) => z.id === zonaEnvioId)?.costoEnvio ?? 0;
  }, [tipoEntrega, zonaEnvioId, zonasEnvio]);

  const total = subtotal + costoEnvio;

  useEffect(() => {
    if (!loadingAuth && !isAuthenticated) {
      navigate('/login', { replace: true, state: { from: '/checkout' } });
    }
  }, [isAuthenticated, loadingAuth, navigate]);

  useEffect(() => {
    if (!cliente) return;
    const parts = cliente.nombre.split(' ').filter(Boolean);
    setFirstName((current) => current || parts[0] || cliente.nombre);
    setLastName((current) => current || parts.slice(1).join(' '));
    setTelefono((current) => current || cliente.telefono || '');
    setCalle((current) => current || cliente.direccion || '');
  }, [cliente]);

  const goNext = () => {
    setError(null);
    if (step === 0 && (!firstName.trim() || !telefono.trim())) {
      setError('Completa tus datos personales para continuar');
      return;
    }
    if (step === 1 && tipoEntrega === 'ENVIO' && !calle.trim()) {
      setError('Ingresa una direccion de entrega');
      return;
    }
    if (step === 2 && tipoEntrega === 'ENVIO' && !zonaEnvioId) {
      setError('Selecciona una zona de envio');
      return;
    }
    setStep((current) => Math.min(3, current + 1) as CheckoutStep);
  };

  const goBack = () => {
    setError(null);
    setStep((current) => Math.max(0, current - 1) as CheckoutStep);
  };

  const handleSubmit = async () => {
    if (cartItems.length === 0) return;

    setLoading(true);
    setError(null);
    try {
      const payload = {
        clienteNombre: nombre,
        clienteTel: telefono,
        tipoEntrega,
        observaciones: 'Pago pendiente de confirmacion en pasarela',
        ...(tipoEntrega === 'RETIRO'
          ? { sucursalId: selectedSucursalId }
          : { zonaEnvioId: zonaEnvioId ?? undefined, direccionEnvio }),
        items: cartItems.map((item) => ({ productoId: item.product.id, cantidad: item.quantity })),
      };
      const result = await createOrder(payload);
      clearCart();
      navigate(`/pago/${result.pedido.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear el pedido');
    } finally {
      setLoading(false);
    }
  };

  const renderStepContent = () => {
    if (step === 0) {
      return (
        <>
          <h2 className="text-2xl font-bold text-[#2B2D31] mb-6">Datos Personales</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
            <Field label="Nombre">
              <input value={firstName} onChange={(e) => setFirstName(e.target.value)} className="checkout-input" />
            </Field>
            <Field label="Apellido">
              <input value={lastName} onChange={(e) => setLastName(e.target.value)} className="checkout-input" />
            </Field>
          </div>
          <Field label="Email" className="mb-5">
            <input value={cliente?.email ?? ''} readOnly className="checkout-input bg-[#F5F2EB] text-[#5F6368]" />
          </Field>
          <Field label="Telefono" className="mb-8">
            <input value={telefono} onChange={(e) => setTelefono(e.target.value)} className="checkout-input" />
          </Field>
          <PrimaryButton onClick={goNext}>Continuar</PrimaryButton>
        </>
      );
    }

    if (step === 1) {
      return (
        <>
          <h2 className="text-2xl font-bold text-[#2B2D31] mb-6">Direccion de Entrega</h2>
          <Field label="Calle y Numero" className="mb-5">
            <input value={calle} onChange={(e) => setCalle(e.target.value)} className="checkout-input" />
          </Field>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
            <Field label="Ciudad">
              <input value={ciudad} onChange={(e) => setCiudad(e.target.value)} className="checkout-input" />
            </Field>
            <Field label="Codigo Postal">
              <input value={codigoPostal} onChange={(e) => setCodigoPostal(e.target.value)} className="checkout-input" />
            </Field>
          </div>
          <Field label="Referencias" className="mb-8">
            <textarea value={referencias} onChange={(e) => setReferencias(e.target.value)} rows={4} className="checkout-input resize-y" />
          </Field>
          <StepButtons onBack={goBack} onNext={goNext} />
        </>
      );
    }

    if (step === 2) {
      return (
        <>
          <h2 className="text-2xl font-bold text-[#2B2D31] mb-6">Entrega</h2>
          <h3 className="text-lg font-bold text-[#2B2D31] mb-4 flex items-center gap-2">
            <MapPin className="text-[#D97706]" size={20} /> Sucursal de origen
          </h3>
          <div className="space-y-3 mb-6">
            <SelectableCard selected>
              <div>
                <p className="font-bold text-[#2B2D31]">
                  FERRED Centro <span className="ml-2 rounded bg-green-500 px-2 py-1 text-xs text-white">Recomendado</span>
                </p>
                <p className="text-sm text-[#5F6368] mt-1">Sucursal #{selectedSucursalId}</p>
              </div>
            </SelectableCard>
            <SelectableCard>
              <div>
                <p className="font-bold text-[#2B2D31]">FERRED Norte</p>
                <p className="text-sm text-[#5F6368] mt-1">Sucursal alterna</p>
              </div>
            </SelectableCard>
          </div>

          <h3 className="text-lg font-bold text-[#2B2D31] mb-4">Metodo de entrega</h3>
          <div className="space-y-3 mb-8">
            <button type="button" onClick={() => setTipoEntrega('RETIRO')} className="w-full text-left">
              <SelectableCard selected={tipoEntrega === 'RETIRO'}>
                <div className="flex items-center justify-between gap-4 w-full">
                  <div className="flex items-center gap-2">
                    <Building2 className="text-[#D97706]" size={20} />
                    <span className="font-bold text-[#2B2D31]">Recoger en sucursal</span>
                  </div>
                  <span className="font-bold text-green-600">Gratis</span>
                </div>
              </SelectableCard>
            </button>
            <button type="button" onClick={() => setTipoEntrega('ENVIO')} className="w-full text-left">
              <SelectableCard selected={tipoEntrega === 'ENVIO'}>
                <div className="flex items-center justify-between gap-4 w-full">
                  <div className="flex items-center gap-2">
                    <Truck className="text-[#D97706]" size={20} />
                    <div>
                      <p className="font-bold text-[#2B2D31]">Envio a domicilio</p>
                      <p className="text-sm text-[#5F6368]">3-5 dias habiles</p>
                    </div>
                  </div>
                  <span className="font-bold text-[#D97706]">
                    {zonasEnvio.length > 0 ? `$${(zonasEnvio.find((z) => z.id === zonaEnvioId)?.costoEnvio ?? zonasEnvio[0].costoEnvio).toFixed(2)}` : '$0.00'}
                  </span>
                </div>
              </SelectableCard>
            </button>
          </div>

          {tipoEntrega === 'ENVIO' && (
            <Field label="Zona de envio" className="mb-8">
              <select value={zonaEnvioId ?? ''} onChange={(e) => setZonaEnvioId(Number(e.target.value))} className="checkout-input">
                <option value="" disabled>Selecciona una zona...</option>
                {zonasEnvio.map((zona) => (
                  <option key={zona.id} value={zona.id}>{zona.nombre} - ${zona.costoEnvio.toFixed(2)}</option>
                ))}
              </select>
            </Field>
          )}

          <StepButtons onBack={goBack} onNext={goNext} />
        </>
      );
    }

    return (
      <>
        <h2 className="text-2xl font-bold text-[#2B2D31] mb-6">Pago</h2>
        <div className="mb-8 rounded-xl border border-[#D8D3C8] bg-[#F9F8F6] p-4 text-sm text-[#5F6368]">
          El metodo de pago se selecciona y procesa en la siguiente pantalla segura.
        </div>

        <StepButtons onBack={goBack} onNext={handleSubmit} nextLabel={loading ? 'Procesando...' : 'Ir a pagar'} disabled={loading} />
      </>
    );
  };

  return (
    <div className="min-h-screen bg-[#F5F2EB]">
      <style>{`
        .checkout-input {
          width: 100%;
          border: 1px solid #D8D3C8;
          border-radius: 0.75rem;
          padding: 0.75rem 1rem;
          outline: none;
          background: white;
        }
        .checkout-input:focus {
          box-shadow: 0 0 0 2px #D97706;
        }
      `}</style>

      <section className="bg-[#2B2D31] text-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-12">
          <h1 className="text-3xl sm:text-4xl font-bold">Finalizar Compra</h1>
          <p className="text-[#E5E2DA] mt-2">Completa tu pedido en pocos pasos</p>
        </div>
      </section>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6 items-start">
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-md px-5 sm:px-8 py-5">
              <div className="grid grid-cols-4 items-start gap-2">
                {checkoutSteps.map((item, index) => {
                  const Icon = item.icon;
                  const active = index <= step;
                  return (
                    <div key={item.label} className="relative flex flex-col items-center gap-2 text-center">
                      {index < checkoutSteps.length - 1 && (
                        <div className={`hidden sm:block absolute left-[66%] right-[-34%] top-5 h-1 ${index < step ? 'bg-[#D97706]' : 'bg-[#E5E2DA]'}`} />
                      )}
                      <div className={`relative z-10 w-12 h-12 rounded-full flex items-center justify-center ${active ? 'bg-[#D97706] text-white' : 'bg-[#E5E2DA] text-[#5F6368]'}`}>
                        <Icon size={20} />
                      </div>
                      <span className={`whitespace-pre-line text-xs sm:text-sm font-semibold ${active ? 'text-[#2B2D31]' : 'text-[#5F6368]'}`}>
                        {item.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <section className="bg-white rounded-xl p-6 sm:p-8 shadow-md">
              {renderStepContent()}
              {error && <p className="text-red-600 text-sm mt-4">{error}</p>}
            </section>
          </div>

          <aside className="bg-white rounded-xl p-6 shadow-md h-fit">
            <h3 className="font-bold text-[#2B2D31] text-xl mb-5">Resumen del Pedido</h3>
            <div className="space-y-3 pb-5 border-b border-[#E5E2DA]">
              <div className="flex justify-between text-sm">
                <span className="text-[#5F6368]">Subtotal ({cartItems.length} productos)</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[#5F6368]">Envio</span>
                <span className={costoEnvio === 0 ? 'text-green-700 font-semibold' : ''}>
                  {costoEnvio === 0 ? 'Gratis' : `$${costoEnvio.toFixed(2)}`}
                </span>
              </div>
            </div>
            <div className="flex justify-between items-center pt-5">
              <span className="font-bold text-[#2B2D31]">Total</span>
              <span className="text-2xl font-bold text-[#D97706]">${total.toFixed(2)}</span>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}

function Field({ label, className = '', children }: { label: string; className?: string; children: React.ReactNode }) {
  return (
    <label className={`block ${className}`}>
      <span className="block text-sm font-semibold text-[#2B2D31] mb-2">{label}</span>
      {children}
    </label>
  );
}

function PrimaryButton({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="w-full bg-[#D97706] text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-[#B45309] transition-colors">
      {children} <ChevronRight size={18} />
    </button>
  );
}

function StepButtons({
  onBack,
  onNext,
  nextLabel = 'Continuar',
  disabled = false,
}: {
  onBack: () => void;
  onNext: () => void;
  nextLabel?: string;
  disabled?: boolean;
}) {
  return (
    <div className="grid grid-cols-[96px_1fr] gap-4">
      <button type="button" onClick={onBack} className="border border-[#D8D3C8] rounded-xl py-3 font-semibold text-[#2B2D31] hover:bg-[#F5F2EB]">
        Atras
      </button>
      <button type="button" onClick={onNext} disabled={disabled} className="bg-[#D97706] text-white rounded-xl py-3 font-semibold flex items-center justify-center gap-2 hover:bg-[#B45309] disabled:bg-[#E5E2DA] disabled:text-[#5F6368] transition-colors">
        {nextLabel} {!disabled && <ChevronRight size={18} />}
      </button>
    </div>
  );
}

function SelectableCard({ selected = false, children }: { selected?: boolean; children: React.ReactNode }) {
  return (
    <div className={`rounded-xl border p-4 ${selected ? 'border-[#D97706] bg-[#FFF7ED]' : 'border-[#D8D3C8] bg-white'}`}>
      <div className="flex items-start gap-3">
        <span className={`mt-1 h-3 w-3 rounded-full ${selected ? 'bg-[#0F8B8D]' : 'bg-[#5F6368]'}`} />
        {children}
      </div>
    </div>
  );
}

