import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

export default function LoginPage() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);

  function handleLogin() {
    setAuth(
      {
        id: 1,
        name: 'Admin FERRED',
        email: 'admin@ferred.local',
        role: 'ADMIN',
        branchId: 1,
      },
      'dev-token'
    );
    navigate('/admin/users');
  }

  return (
    <main className="app-shell login-page">
      <section className="surface-card login-card">
        <h2 className="login-title">Inicio de Sesion</h2>
        <p className="login-subtitle">Modo desarrollo: entra para abrir Gestion de Usuarios.</p>
        <button onClick={handleLogin} className="btn btn-primary">
          Entrar como Admin
        </button>
      </section>
    </main>
  );
}
