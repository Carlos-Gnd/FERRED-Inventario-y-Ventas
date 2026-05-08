import { ShoppingCart, User, Search, Menu, X } from 'lucide-react';
import { Link } from 'react-router';
import { useState } from 'react';
import { useEcommerce } from '../context/EcommerceContext';

export function Navbar() {
  const { cartCount } = useEcommerce();
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const toggleMenu = () => setIsOpen(!isOpen);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Buscar:', searchQuery);
    // Aquí puedes agregar lógica de búsqueda
  };

  const navLinks = [
    { to: '/catalogo', label: 'Catálogo' },
    { to: '/sucursales', label: 'Sucursales' },
    { to: '/acerca-de-nosotros', label: 'Acerca de nosotros' },
    { to: '/como-comprar', label: '¿Cómo comprar?' }
  ];

  return (
    <nav className="bg-[#2B2D31] text-[#F5F2EB] sticky top-0 z-50 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo y Menu Burger */}
          <div className="flex items-center gap-4">
            <Link to="/" className="flex items-center">
              <h1 className="text-2xl font-bold tracking-tight">FERRED</h1>
            </Link>
            <button
              onClick={toggleMenu}
              className="lg:hidden text-[#F5F2EB] hover:text-[#D97706] transition-colors"
            >
              {isOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>

          {/* Menu Desktop */}
          <div className="hidden lg:flex items-center gap-6">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="hover:text-[#D97706] transition-colors text-sm"
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Search y Icons */}
          <div className="flex items-center gap-2 sm:gap-4">
            <form onSubmit={handleSearch} className="hidden sm:flex items-center gap-0">
              <div className="flex items-center bg-[#5F6368] rounded-l-xl px-3 sm:px-4 py-2 min-w-[200px] sm:min-w-[300px]">
                <Search size={18} className="text-[#E5E2DA] flex-shrink-0" />
                <input
                  type="text"
                  placeholder="Buscar..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-transparent border-none outline-none ml-2 text-[#F5F2EB] placeholder-[#E5E2DA] w-full text-sm"
                />
              </div>
              <button
                type="submit"
                className="bg-[#D97706] hover:bg-[#B45309] text-white px-3 sm:px-4 py-2 rounded-r-xl font-semibold transition-colors flex-shrink-0"
                title="Buscar"
              >
                <Search size={18} />
              </button>
            </form>

            <Link
              to="/carrito"
              className="relative hover:text-[#D97706] transition-colors flex-shrink-0"
            >
              <ShoppingCart size={20} />
              {cartCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-[#D97706] text-[#F5F2EB] rounded-full min-w-5 h-5 px-1 flex items-center justify-center text-xs font-bold">
                  {cartCount}
                </span>
              )}
            </Link>

            <Link
              to="/cliente"
              className="hover:text-[#D97706] transition-colors flex-shrink-0"
            >
              <User size={20} />
            </Link>
          </div>
        </div>

        {/* Menu Mobile */}
        {isOpen && (
          <div className="lg:hidden pb-4 border-t border-[#5F6368]">
            <div className="flex flex-col gap-3 pt-4">
              {/* Search Mobile */}
              <form onSubmit={handleSearch} className="flex items-center gap-0">
                <div className="flex items-center bg-[#5F6368] rounded-l-xl px-3 py-2 flex-1">
                  <Search size={18} className="text-[#E5E2DA]" />
                  <input
                    type="text"
                    placeholder="Buscar productos..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="bg-transparent border-none outline-none ml-2 text-[#F5F2EB] placeholder-[#E5E2DA] w-full text-sm"
                  />
                </div>
                <button
                  type="submit"
                  className="bg-[#D97706] hover:bg-[#B45309] text-white px-3 py-2 rounded-r-xl font-semibold transition-colors flex-shrink-0"
                  title="Buscar"
                >
                  <Search size={18} />
                </button>
              </form>

              {/* Links Mobile */}
              {navLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className="text-[#E5E2DA] hover:text-[#D97706] hover:pl-2 transition-all py-2"
                  onClick={() => setIsOpen(false)}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
