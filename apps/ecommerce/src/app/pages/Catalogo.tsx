import { useMemo, useState } from 'react';
import { SlidersHorizontal } from 'lucide-react';
import { ProductCard } from '../components/ProductCard';
import { obtenerPrecioFinal } from '../utils/product.utils';
import { useEcommerce } from '../context/EcommerceContext';

export function Catalogo() {
  const { products, addToCart, loadingProducts, productsError } = useEcommerce();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [inStock, setInStock] = useState(false);
  const [sortBy, setSortBy] = useState<'nombre-asc' | 'precio-asc' | 'precio-desc'>('nombre-asc');

  const categories = ['all', ...new Set(products.map((p) => p.categoria?.nombre ?? 'Sin categoria'))];

  const filteredProducts = useMemo(() => {
    const base = products.filter((product) => {
      const categoryName = product.categoria?.nombre ?? 'Sin categoria';
      if (selectedCategory !== 'all' && categoryName !== selectedCategory) return false;
      if (inStock && product.stockDisponible <= 0) return false;
      return true;
    });

    if (sortBy === 'precio-asc') return base.toSorted((a, b) => obtenerPrecioFinal(a) - obtenerPrecioFinal(b));
    if (sortBy === 'precio-desc') return base.toSorted((a, b) => obtenerPrecioFinal(b) - obtenerPrecioFinal(a));
    return base.toSorted((a, b) => a.nombre.localeCompare(b.nombre));
  }, [products, selectedCategory, inStock, sortBy]);

  return (
    <div className="min-h-screen bg-[#F5F2EB]">
      <div className="bg-[#2B2D31] text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl font-bold">Catálogo de Productos</h1>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Cinta de filtros horizontal (sticky) */}
        <div className="bg-white rounded-xl p-4 shadow-md sticky top-16 z-10 mb-6">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 text-[#2B2D31] font-semibold mr-1">
              <SlidersHorizontal size={18} className="text-[#D97706]" />
              <span>Filtros</span>
            </div>

            {/* Categorías como chips */}
            <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
              {categories.map((cat) => {
                const active = selectedCategory === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                    aria-pressed={active}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                      active
                        ? 'bg-[#D97706] text-white'
                        : 'bg-[#F5F2EB] text-[#5F6368] hover:bg-[#E5E2DA]'
                    }`}
                  >
                    {cat === 'all' ? 'Todas' : cat}
                  </button>
                );
              })}
            </div>

            {/* Solo en stock */}
            <label className="flex items-center gap-2 cursor-pointer text-sm text-[#5F6368] whitespace-nowrap">
              <input
                type="checkbox"
                checked={inStock}
                onChange={(e) => setInStock(e.target.checked)}
                aria-label="Mostrar solo productos en stock"
                className="accent-[#D97706]"
              />
              Solo en stock
            </label>

            {/* Orden */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="border border-[#E5E2DA] rounded-lg px-3 py-1.5 text-sm"
              aria-label="Ordenar productos"
            >
              <option value="nombre-asc">Nombre A-Z</option>
              <option value="precio-asc">Precio: Menor a Mayor</option>
              <option value="precio-desc">Precio: Mayor a Menor</option>
            </select>
          </div>
        </div>

        <p className="text-sm text-[#5F6368] mb-4">{filteredProducts.length} productos encontrados</p>

        {loadingProducts && <p className="text-[#5F6368]">Cargando productos…</p>}
        {productsError && <p className="text-red-600">{productsError}</p>}
        {!loadingProducts && !productsError && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {filteredProducts.map((product) => <ProductCard key={product.id} product={product} onAddToCart={addToCart} />)}
          </div>
        )}
      </div>
    </div>
  );
}
