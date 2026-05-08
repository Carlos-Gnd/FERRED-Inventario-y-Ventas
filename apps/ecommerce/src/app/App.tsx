import { BrowserRouter, Routes, Route } from 'react-router';
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
            <Route path="/cliente" element={<PanelCliente />} />
            <Route path="/como-comprar" element={<ComoComprar />} />
            <Route path="/sucursales" element={<Sucursales />} />
            <Route path="/acerca-de-nosotros" element={<AcercaDeNosotros />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </BrowserRouter>
  );
}