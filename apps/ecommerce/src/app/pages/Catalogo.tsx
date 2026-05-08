import { useMemo, useState } from 'react';
import { SlidersHorizontal } from 'lucide-react';
import { ProductCard } from '../components/ProductCard';
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

    if (sortBy === 'precio-asc') return [...base].sort((a, b) => a.precioConIva - b.precioConIva);
    if (sortBy === 'precio-desc') return [...base].sort((a, b) => b.precioConIva - a.precioConIva);
    return [...base].sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [products, selectedCategory, inStock, sortBy]);

  return (
    <div className="min-h-screen bg-[#F5F2EB]">
      <div className="bg-[#2B2D31] text-white py-12"><div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"><h1 className="text-4xl font-bold">Catalogo de Productos</h1></div></div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <aside className="lg:col-span-1">
            <div className="bg-white rounded-xl p-6 shadow-md sticky top-24">
              <div className="flex items-center gap-2 mb-6"><SlidersHorizontal size={20} className="text-[#D97706]" /><h2 className="font-bold text-[#2B2D31]">Filtros</h2></div>
              <div className="mb-6">
                <h3 className="font-semibold text-[#2B2D31] mb-3">Categoria</h3>
                <div className="space-y-2">
                  {categories.map((cat) => (
                    <label key={cat} className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="category" checked={selectedCategory === cat} onChange={() => setSelectedCategory(cat)} />
                      <span className="text-[#5F6368]">{cat === 'all' ? 'Todas' : cat}</span>
                    </label>
                  ))}
                </div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={inStock} onChange={(e) => setInStock(e.target.checked)} /><span className="text-[#5F6368]">Solo en stock</span></label>
            </div>
          </aside>

          <div className="lg:col-span-3">
            <div className="flex justify-between items-center mb-6">
              <p className="text-[#5F6368]">{filteredProducts.length} productos encontrados</p>
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value as typeof sortBy)} className="border border-[#E5E2DA] rounded-xl px-4 py-2">
                <option value="nombre-asc">Nombre A-Z</option>
                <option value="precio-asc">Precio: Menor a Mayor</option>
                <option value="precio-desc">Precio: Mayor a Menor</option>
              </select>
            </div>
            {loadingProducts && <p className="text-[#5F6368]">Cargando productos...</p>}
            {productsError && <p className="text-red-600">{productsError}</p>}
            {!loadingProducts && !productsError && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredProducts.map((product) => <ProductCard key={product.id} product={product} onAddToCart={addToCart} />)}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
