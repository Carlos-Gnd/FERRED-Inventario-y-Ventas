import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';

type AuthMode = 'login' | 'registro';

export function AuthPage({ mode }: { mode: AuthMode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, register } = useAuth();
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [telefono, setTelefono] = useState('');
  const [direccion, setDireccion] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isRegistro = mode === 'registro';
  const redirectTo = (location.state as { from?: string } | null)?.from ?? '/cliente';

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!email.includes('@') || !email.includes('.')) {
      setError('Ingresa un correo electrónico válido');
      return;
    }
    if (isRegistro && nombre.trim().length < 2) {
      setError('Ingresa tu nombre completo (mínimo 2 caracteres)');
      return;
    }
    if (isRegistro && password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres');
      return;
    }

    setLoading(true);
    try {
      if (isRegistro) {
        await register({
          nombre,
          email,
          password,
          telefono: telefono || undefined,
          direccion: direccion || undefined,
        });
        toast.success('¡Cuenta creada con éxito! Bienvenido a FERRED.');
      } else {
        await login({ email, password });
        toast.success('¡Bienvenido de vuelta!');
      }
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo completar la autenticación');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F2EB]">
      <div className="bg-[#2B2D31] text-white py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl font-bold">{isRegistro ? 'Crear cuenta' : 'Iniciar sesion'}</h1>
          <p className="text-[#E5E2DA] mt-2">
            {isRegistro ? 'Registra tu cuenta para guardar tu historial de pedidos.' : 'Accede para comprar y revisar tus pedidos.'}
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <form onSubmit={handleSubmit} className="bg-white rounded-xl p-8 shadow-md space-y-5">
          {isRegistro && (
            <input
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              required
              minLength={2}
              placeholder="Nombre completo"
              aria-label="Nombre completo"
              className="w-full px-4 py-3 border border-[#E5E2DA] rounded-xl"
            />
          )}

          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            required
            placeholder="Correo electrónico"
            aria-label="Correo electrónico"
            className="w-full px-4 py-3 border border-[#E5E2DA] rounded-xl"
          />

          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            required
            minLength={isRegistro ? 8 : 1}
            placeholder="Contraseña"
            aria-label="Contraseña"
            className="w-full px-4 py-3 border border-[#E5E2DA] rounded-xl"
          />

          {isRegistro && (
            <>
              <input
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                placeholder="Teléfono"
                aria-label="Teléfono"
                className="w-full px-4 py-3 border border-[#E5E2DA] rounded-xl"
              />
              <textarea
                value={direccion}
                onChange={(e) => setDireccion(e.target.value)}
                rows={3}
                placeholder="Dirección"
                aria-label="Dirección"
                className="w-full px-4 py-3 border border-[#E5E2DA] rounded-xl"
              />
            </>
          )}

          {error && <p className="text-red-600 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#D97706] text-white py-3 rounded-xl font-semibold disabled:bg-[#E5E2DA] disabled:text-[#5F6368]"
          >
            {loading ? 'Procesando...' : isRegistro ? 'Crear cuenta' : 'Entrar'}
          </button>

          <p className="text-sm text-[#5F6368] text-center">
            {isRegistro ? 'Ya tienes cuenta?' : 'Aun no tienes cuenta?'}{' '}
            <Link className="text-[#D97706] font-semibold" to={isRegistro ? '/login' : '/registro'} state={{ from: redirectTo }}>
              {isRegistro ? 'Inicia sesion' : 'Registrate'}
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
