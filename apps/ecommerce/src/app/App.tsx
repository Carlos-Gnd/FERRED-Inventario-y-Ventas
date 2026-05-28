import { BrowserRouter, Navigate, Routes, Route, useLocation, Link } from 'react-router';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { Home } from './pages/Home';
import { Catalogo } from './pages/Catalogo';
import { ProductoDetalle } from './pages/ProductoDetalle';
import { Carrito } from './pages/Carrito';
import { Checkout } from './pages/Checkout';
import { PedidoExito } from './pages/Confirmacion';
import { PanelCliente } from './pages/PanelCliente';
import { ComoComprar } from './pages/ComoComprar';
import { Sucursales } from './pages/Sucursales';
import { AcercaDeNosotros } from './pages/AcercaDeNosotros';
import { AuthPage } from './pages/AuthPage';
import { useAuth } from './context/AuthContext';
import { PagoPage } from './pages/PagoPage';


function RequireCliente({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const { isAuthenticated, loadingAuth } = useAuth();

  if (loadingAuth) {
    return <div className="min-h-screen bg-[#F5F2EB] flex items-center justify-center text-[#5F6368]">Cargando...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/catalogo" element={<Catalogo />} />
            <Route path="/producto/:id" element={<ProductoDetalle />} />
            <Route path="/carrito" element={<Carrito />} />
            <Route path="/checkout" element={<Checkout />} />
            <Route path="/pedido/:id/exito" element={<PedidoExito />} />
            <Route path="/login" element={<AuthPage mode="login" />} />
            <Route path="/registro" element={<AuthPage mode="registro" />} />
            <Route path="/cliente" element={<RequireCliente><PanelCliente /></RequireCliente>} />
            <Route path="/como-comprar" element={<ComoComprar />} />
            <Route path="/sucursales" element={<Sucursales />} />
            <Route path="/acerca-de-nosotros" element={<AcercaDeNosotros />} />
            <Route path="/pago/:pedidoId" element={<RequireCliente><PagoPage /></RequireCliente>} />
            <Route path="*" element={
              <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 text-center px-4">
                <span className="text-7xl font-bold text-[#D97706]">404</span>
                <h1 className="text-2xl font-bold text-[#2B2D31]">Página no encontrada</h1>
                <p className="text-[#5F6368]">La dirección que buscas no existe o fue movida.</p>
                <Link to="/" className="mt-2 bg-[#D97706] text-white px-6 py-3 rounded-xl font-semibold hover:bg-[#B45309] transition-colors">
                  Volver al inicio
                </Link>
              </div>
            } />
          </Routes>
        </main>
        <Footer />
      </div>
    </BrowserRouter>
  );
}
