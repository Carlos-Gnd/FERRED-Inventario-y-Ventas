import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { crearPedidoOnline, getProductosPublicos, getZonasEnvio } from '../services/ecommerceApi';
import { useAuth } from './AuthContext';
import type { CartItem, PedidoPayload, Product, ZonaEnvio } from '../types';

type EcommerceContextType = {
  selectedSucursalId: number;
  setSelectedSucursalId: (id: number) => void;
  products: Product[];
  loadingProducts: boolean;
  productsError: string | null;
  refreshProducts: () => Promise<void>;
  cartItems: CartItem[];
  addToCart: (product: Product, quantity?: number) => void;
  removeFromCart: (productId: number) => void;
  updateQuantity: (productId: number, quantity: number) => void;
  clearCart: () => void;
  cartCount: number;
  subtotal: number;
  zonasEnvio: ZonaEnvio[];
  loadingZonas: boolean;
  createOrder: (payload: PedidoPayload) => Promise<{ ok: true; pedido: any }>;
};

const EcommerceContext = createContext<EcommerceContextType | null>(null);
const CART_STORAGE_KEY = 'ferred-ecommerce-cart';

export function EcommerceProvider({ children }: { children: React.ReactNode }) {
  const { token } = useAuth();
  const [selectedSucursalId, setSelectedSucursalId] = useState(1);
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [productsError, setProductsError] = useState<string | null>(null);
  const [cartItems, setCartItems] = useState<CartItem[]>(() => {
    const raw = localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return [];
    try { return JSON.parse(raw) as CartItem[]; }
    catch { localStorage.removeItem(CART_STORAGE_KEY); return []; }
  });
  const [zonasEnvio, setZonasEnvio] = useState<ZonaEnvio[]>([]);
  const [loadingZonas, setLoadingZonas] = useState(false);

  useEffect(() => {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cartItems));
  }, [cartItems]);

  const refreshProducts = useCallback(async () => {
    setLoadingProducts(true);
    setProductsError(null);
    try {
      const data = await getProductosPublicos(selectedSucursalId);
      setProducts(data);
    } catch (error) {
      setProductsError(error instanceof Error ? error.message : 'No se pudieron cargar productos');
      setProducts([]);
    } finally {
      setLoadingProducts(false);
    }
  }, [selectedSucursalId]);

  useEffect(() => {
    void refreshProducts();
  }, [refreshProducts]);

  useEffect(() => {
    const loadZonas = async () => {
      setLoadingZonas(true);
      try {
        const zonas = await getZonasEnvio();
        setZonasEnvio(zonas);
      } catch {
        setZonasEnvio([]);
      } finally {
        setLoadingZonas(false);
      }
    };
    void loadZonas();
  }, []);

  const addToCart = (product: Product, quantity = 1) => {
    setCartItems((prev) => {
      const idx = prev.findIndex((item) => item.product.id === product.id);
      if (idx === -1) return [...prev, { product, quantity }];
      const copy = [...prev];
      copy[idx] = {
        ...copy[idx],
        quantity: Math.min(copy[idx].quantity + quantity, product.stockDisponible),
      };
      return copy;
    });
    toast.success(`${product.nombre} agregado al carrito`);
  };

  const removeFromCart = (productId: number) => {
    setCartItems((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const updateQuantity = (productId: number, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    setCartItems((prev) => prev.map((item) => item.product.id === productId
      ? { ...item, quantity: Math.min(quantity, item.product.stockDisponible) }
      : item));
  };

  const clearCart = () => setCartItems([]);

  const subtotal = useMemo(
    () => cartItems.reduce((acc, item) => acc + item.product.precioConIva * item.quantity, 0),
    [cartItems],
  );
  const cartCount = useMemo(() => cartItems.reduce((acc, item) => acc + item.quantity, 0), [cartItems]);

  const value = useMemo<EcommerceContextType>(
    () => ({
      selectedSucursalId,
      setSelectedSucursalId,
      products,
      loadingProducts,
      productsError,
      refreshProducts,
      cartItems,
      addToCart,
      removeFromCart,
      updateQuantity,
      clearCart,
      cartCount,
      subtotal,
      zonasEnvio,
      loadingZonas,
      createOrder: async (payload) => {
        if (!token) throw new Error('Inicia sesión para confirmar tu pedido');
        return crearPedidoOnline(payload, token);
      },
    }),
    [selectedSucursalId, products, loadingProducts, productsError, refreshProducts, cartItems, cartCount, subtotal, zonasEnvio, loadingZonas, token],
  );

  return <EcommerceContext.Provider value={value}>{children}</EcommerceContext.Provider>;
}

export function useEcommerce() {
  const ctx = useContext(EcommerceContext);
  if (!ctx) throw new Error('useEcommerce debe usarse dentro de EcommerceProvider');
  return ctx;
}
