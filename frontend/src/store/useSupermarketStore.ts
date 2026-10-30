import { create } from 'zustand';

export type LocationStatus = 'idle' | 'loading' | 'granted' | 'denied' | 'unavailable';

export interface CartItem {
  productId: string;
  name: string;
  brand: string;
  imageUrl: string;
  quantity: number;
}

interface SupermarketState {
  searchQuery: string;
  selectedCategory: string;
  userLocation: { latitude: number; longitude: number; addressName: string };
  locationStatus: LocationStatus;
  locationError: string | null;
  radiusKm: number;
  cartItems: CartItem[];
  /** Id del reportante: se genera una vez y se persiste en el navegador. */
  reporterId: string;
  /** Puntos de reputacion acumulados por el reportante. */
  reputationPoints: number;

  setSearchQuery: (query: string) => void;
  setSelectedCategory: (category: string) => void;
  setUserLocation: (lat: number, lng: number, addressName?: string) => void;
  setLocationStatus: (status: LocationStatus, error?: string | null) => void;
  setRadiusKm: (radius: number) => void;
  setReputationPoints: (points: number) => void;
  addToCart: (product: { productId: string; name: string; brand: string; imageUrl: string }) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, delta: number) => void;
  clearCart: () => void;
}

/**
 * Id estable del reportante. Sin autenticacion, se usa un id aleatorio guardado
 * en localStorage: sirve para acumular reputacion en el dispositivo.
 */
function resolveReporterId(): string {
  if (typeof window === 'undefined') return 'server';
  const KEY = 'preciossmart.reporterId';
  const existing = window.localStorage.getItem(KEY);
  if (existing) return existing;
  const generated = `rep_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
  window.localStorage.setItem(KEY, generated);
  return generated;
}

/**
 * Fallback: Buenos Aires (Obelisco). Solo se usa si el usuario denies el
 * permiso de ubicación o el navegador no lo soporta.
 */
const FALLBACK_LOCATION = {
  latitude: -34.6037,
  longitude: -58.3816,
  addressName: 'Buenos Aires (ubicación por defecto)',
};

export const useSupermarketStore = create<SupermarketState>((set) => ({
  searchQuery: '',
  selectedCategory: '',
  userLocation: FALLBACK_LOCATION,
  locationStatus: 'idle',
  locationError: null,
  radiusKm: 10,
  // El carrito arranca vacio: los productos se eligen del catalogo real.
  // (Un carrito precargado con ids ficticios rompia la optimizacion contra la API.)
  cartItems: [],
  reporterId: resolveReporterId(),
  reputationPoints: 0,

  setSearchQuery: (query) => set({ searchQuery: query }),
  setSelectedCategory: (category) => set({ selectedCategory: category }),
  setUserLocation: (latitude, longitude, addressName = 'Ubicación Actual') =>
    set({ userLocation: { latitude, longitude, addressName } }),
  setLocationStatus: (locationStatus, locationError = null) => set({ locationStatus, locationError }),
  setRadiusKm: (radiusKm) => set({ radiusKm }),
  setReputationPoints: (reputationPoints) => set({ reputationPoints }),
  
  addToCart: (product) =>
    set((state) => {
      const existing = state.cartItems.find((i) => i.productId === product.productId);
      if (existing) {
        return {
          cartItems: state.cartItems.map((i) =>
            i.productId === product.productId ? { ...i, quantity: i.quantity + 1 } : i,
          ),
        };
      }
      return { cartItems: [...state.cartItems, { ...product, quantity: 1 }] };
    }),

  removeFromCart: (productId) =>
    set((state) => ({
      cartItems: state.cartItems.filter((i) => i.productId !== productId),
    })),

  updateQuantity: (productId, delta) =>
    set((state) => ({
      cartItems: state.cartItems
        .map((i) => {
          if (i.productId === productId) {
            const newQty = i.quantity + delta;
            return newQty > 0 ? { ...i, quantity: newQty } : null;
          }
          return i;
        })
        .filter(Boolean) as CartItem[],
    })),

  clearCart: () => set({ cartItems: [] }),
}));
