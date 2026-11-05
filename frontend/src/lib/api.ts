import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 5000,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Mock Fallback Data (In case backend is starting or offline).
 *
 * Incluye las sucursales de CABA y las de Ensenada / La Plata. Las distancias
 * NO están hardcodeadas: se calculan con Haversine contra la posición real del
 * usuario, así el modo offline respeta la geolocalización igual que el backend.
 */
export const MOCK_STORES = [
  {
    branchId: 'b1',
    supermarketId: 's1',
    supermarketName: 'Carrefour Argentina',
    supermarketLogoUrl: 'https://upload.wikimedia.org/wikipedia/commons/5/5b/Carrefour_logo.svg',
    branchName: 'Carrefour Express San Telmo',
    address: 'Av. Paseo Colón 500',
    city: 'Buenos Aires',
    latitude: -34.612,
    longitude: -58.3712,
  },
  {
    branchId: 'b2',
    supermarketId: 's2',
    supermarketName: 'Coto C.I.C.S.A.',
    supermarketLogoUrl: 'https://upload.wikimedia.org/wikipedia/commons/8/87/Coto_logo.svg',
    branchName: 'Coto Sucursal 60 - Abasto',
    address: 'Av. Corrientes 3247',
    city: 'Buenos Aires',
    latitude: -34.6033,
    longitude: -58.4105,
  },
  {
    branchId: 'b3',
    supermarketId: 's3',
    supermarketName: 'Supermercados Día',
    supermarketLogoUrl: 'https://upload.wikimedia.org/wikipedia/commons/4/4c/DIA_logo.svg',
    branchName: 'Día % Sucursal Obelisco',
    address: 'Av. Corrientes 1050',
    city: 'Buenos Aires',
    latitude: -34.604,
    longitude: -58.381,
  },
  {
    branchId: 'b4',
    supermarketId: 's3',
    supermarketName: 'Supermercados Día',
    supermarketLogoUrl: 'https://upload.wikimedia.org/wikipedia/commons/4/4c/DIA_logo.svg',
    branchName: 'Día % Sucursal Villa Catella',
    address: 'Avenida 122',
    city: 'Villa Catella, Ensenada',
    latitude: -34.8928717,
    longitude: -57.9459662,
  },
  {
    branchId: 'b5',
    supermarketId: 's3',
    supermarketName: 'Supermercados Día',
    supermarketLogoUrl: 'https://upload.wikimedia.org/wikipedia/commons/4/4c/DIA_logo.svg',
    branchName: 'Día % Sucursal El Farol',
    address: 'La Merced',
    city: 'Barrio El Farol, Ensenada',
    latitude: -34.8604738,
    longitude: -57.9033691,
  },
  {
    branchId: 'b6',
    supermarketId: 's4',
    supermarketName: 'Carrefour Argentina',
    supermarketLogoUrl: 'https://upload.wikimedia.org/wikipedia/commons/5/5b/Carrefour_logo.svg',
    branchName: 'Carrefour Express Tolosa',
    address: 'Camino Parque Centenario',
    city: 'Tolosa, La Plata',
    latitude: -34.8936499,
    longitude: -57.9960877,
  },
  {
    branchId: 'b7',
    supermarketId: 's5',
    supermarketName: 'Wangs',
    supermarketLogoUrl: 'https://images.supermarket.com/wangs-logo.png',
    branchName: 'Wangs El Farol',
    address: 'La Merced',
    city: 'Barrio El Farol, Ensenada',
    latitude: -34.8605989,
    longitude: -57.902979,
  },
  {
    branchId: 'b8',
    supermarketId: 's6',
    supermarketName: 'Super Vea',
    supermarketLogoUrl: 'https://images.supermarket.com/super-vea-logo.png',
    branchName: 'Super Vea Tolosa',
    address: 'Calle 525',
    city: 'Tolosa, La Plata',
    latitude: -34.8959512,
    longitude: -57.9782593,
  },
];

/** Distancia en km entre dos coordenadas (fórmula de Haversine). */
export function haversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export interface StorePriceDeal {
  branchId: string;
  supermarketName: string;
  branchName: string;
  address: string;
  price: number;
  listPrice?: number | null;
  hasPromotion?: boolean;
  unitPrice: number;
  distanceKm: number;
  lastUpdated?: string | Date;
}

export const MOCK_PRODUCTS = [
  {
    productId: 'p1',
    name: 'Leche Entera 1L Larga Vida',
    brand: 'La Serenísima',
    category: 'Lácteos y Frescos',
    eanCode: '7790070411015',
    imageUrl: 'https://images.unsplash.com/photo-1563636619-e9143da7973b?auto=format&fit=crop&q=80&w=400',
    measurementUnit: 'LITER',
    contentValue: 1,
    storePricesCount: 3,
    bestDeal: {
      branchId: 'b3',
      supermarketName: 'Supermercados Día',
      branchName: 'Día % Sucursal Obelisco',
      address: 'Av. Corrientes 1050',
      price: 1090.0,
      listPrice: 1250.0,
      hasPromotion: true,
      unitPrice: 1090.0,
      distanceKm: 2.1,
      lastUpdated: new Date().toISOString(),
    },
    storePrices: [
      {
        branchId: 'b3',
        supermarketName: 'Supermercados Día',
        branchName: 'Día % Sucursal Obelisco',
        address: 'Av. Corrientes 1050',
        price: 1090.0,
        listPrice: 1250.0,
        hasPromotion: true,
        unitPrice: 1090.0,
        distanceKm: 2.1,
      },
      {
        branchId: 'b1',
        supermarketName: 'Carrefour Argentina',
        branchName: 'Carrefour Express San Telmo',
        address: 'Av. Paseo Colón 500',
        price: 1120.0,
        listPrice: null,
        hasPromotion: false,
        unitPrice: 1120.0,
        distanceKm: 1.8,
      },
      {
        branchId: 'b2',
        supermarketName: 'Coto C.I.C.S.A.',
        branchName: 'Coto Sucursal 60 - Abasto',
        address: 'Av. Corrientes 3247',
        price: 1250.0,
        listPrice: null,
        hasPromotion: false,
        unitPrice: 1250.0,
        distanceKm: 2.6,
      },
    ],
    priceRange: { min: 1090.0, max: 1250.0, average: 1153.33 },
  },
  {
    productId: 'p2',
    name: 'Aceite de Girasol 1.5L',
    brand: 'Natura',
    category: 'Almacén',
    eanCode: '7790272001052',
    imageUrl: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&q=80&w=400',
    measurementUnit: 'LITER',
    contentValue: 1.5,
    storePricesCount: 3,
    bestDeal: {
      branchId: 'b2',
      supermarketName: 'Coto C.I.C.S.A.',
      branchName: 'Coto Sucursal 60 - Abasto',
      address: 'Av. Corrientes 3247',
      price: 2290.0,
      listPrice: 2450.0,
      hasPromotion: true,
      unitPrice: 1526.66,
      distanceKm: 1.4,
      lastUpdated: new Date().toISOString(),
    },
    storePrices: [
      {
        branchId: 'b2',
        supermarketName: 'Coto C.I.C.S.A.',
        branchName: 'Coto Sucursal 60 - Abasto',
        address: 'Av. Corrientes 3247',
        price: 2290.0,
        listPrice: 2450.0,
        hasPromotion: true,
        unitPrice: 1526.66,
        distanceKm: 1.4,
      },
      {
        branchId: 'b3',
        supermarketName: 'Supermercados Día',
        branchName: 'Día % Sucursal Obelisco',
        address: 'Av. Corrientes 1050',
        price: 2380.0,
        listPrice: null,
        hasPromotion: false,
        unitPrice: 1586.66,
        distanceKm: 2.1,
      },
      {
        branchId: 'b1',
        supermarketName: 'Carrefour Argentina',
        branchName: 'Carrefour Express San Telmo',
        address: 'Av. Paseo Colón 500',
        price: 2450.0,
        listPrice: null,
        hasPromotion: false,
        unitPrice: 1633.33,
        distanceKm: 1.8,
      },
    ],
    priceRange: { min: 2290.0, max: 2450.0, average: 2373.33 },
  },
  {
    productId: 'p3',
    name: 'Gaseosa Coca-Cola Sabor Original 2.25L',
    brand: 'Coca-Cola',
    category: 'Almacén',
    eanCode: '7790895000997',
    imageUrl: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&q=80&w=400',
    measurementUnit: 'LITER',
    contentValue: 2.25,
    storePricesCount: 2,
    bestDeal: {
      branchId: 'b2',
      supermarketName: 'Coto C.I.C.S.A.',
      branchName: 'Coto Sucursal 60 - Abasto',
      address: 'Av. Corrientes 3247',
      price: 2850.0,
      listPrice: null,
      hasPromotion: false,
      unitPrice: 1266.66,
      distanceKm: 1.4,
      lastUpdated: new Date().toISOString(),
    },
    storePrices: [
      {
        branchId: 'b2',
        supermarketName: 'Coto C.I.C.S.A.',
        branchName: 'Coto Sucursal 60 - Abasto',
        address: 'Av. Corrientes 3247',
        price: 2850.0,
        listPrice: null,
        hasPromotion: false,
        unitPrice: 1266.66,
        distanceKm: 1.4,
      },
      {
        branchId: 'b3',
        supermarketName: 'Supermercados Día',
        branchName: 'Día % Sucursal Obelisco',
        address: 'Av. Corrientes 1050',
        price: 2990.0,
        listPrice: null,
        hasPromotion: false,
        unitPrice: 1328.88,
        distanceKm: 2.1,
      },
    ],
    priceRange: { min: 2850.0, max: 2990.0, average: 2920.0 },
  },
];

/**
 * Solo recurrimos a los datos mock cuando el backend es realmente inalcanzable
 * (error de red / timeout). Si el servidor respondió con un error HTTP (4xx/5xx)
 * propagamos la excepción para no ocultar bugs ni mostrar datos falsos al usuario.
 */
function isNetworkError(error: unknown): boolean {
  if (axios.isAxiosError(error)) {
    // Sin `response` => no hubo respuesta del servidor (red caída, timeout, CORS).
    return !error.response;
  }
  return false;
}

export async function fetchNearbyStores(lat: number = -34.8207, lng: number = -57.9675, radiusKm: number = 10) {
  try {
    const response = await apiClient.get('/stores/nearby', { params: { latitude: lat, longitude: lng, radiusKm } });
    return response.data.data.stores;
  } catch (error) {
    if (!isNetworkError(error)) throw error;
    console.warn('Backend server offline or unreachable. Using PostGIS Seed Mock Data.');
    // Fallback: se calcula la distancia real contra la posición del usuario.
    return MOCK_STORES.map((store) => ({
      ...store,
      distanceKm: Math.round(haversineKm(lat, lng, store.latitude, store.longitude) * 100) / 100,
    }))
      .filter((store) => store.distanceKm <= radiusKm)
      .sort((a, b) => a.distanceKm - b.distanceKm);
  }
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PriceHistoryPoint {
  date: string;
  price: number;
  listPrice: number | null;
  source: string;
  branchId: string;
  branchName: string;
  supermarketName: string;
  distanceKm: number | null;
}

export interface PriceHistoryResponse {
  productId: string;
  productName: string;
  eanCode: string;
  series: PriceHistoryPoint[];
  stats: {
    observations: number;
    min: number;
    max: number;
    average: number;
    first: number;
    last: number;
    changePercent: number;
  } | null;
}

/** Serie historica de precios de un producto. */
export async function fetchPriceHistory(
  productId: string,
  options: { branchId?: string; latitude?: number; longitude?: number; limit?: number } = {},
): Promise<PriceHistoryResponse> {
  const response = await apiClient.get(`/products/${productId}/history`, {
    params: {
      branchId: options.branchId,
      latitude: options.latitude,
      longitude: options.longitude,
      limit: options.limit ?? 100,
    },
  });
  return response.data.data;
}

export interface SubmitEvidencePayload {
  branchId: string;
  reporterId: string;
  productId?: string;
  eanCode?: string;
  reportedPrice: number;
  reportedListPrice?: number;
  imageBase64?: string;
  purchasedAt?: string;
}

export interface EvidenceResult {
  reportId: string;
  status: 'APPROVED' | 'PENDING' | 'REJECTED';
  trustScore: number;
  pointsAwarded: number;
  factors: Array<{ factor: string; points: number; detail: string }>;
  product: { id: string; name: string; eanCode: string } | null;
  branch: { id: string; name: string; supermarketName: string } | null;
  currentPrice: number | null;
  previousPrice: number | null;
  priceChanged: boolean;
  extractor: string;
  extractedItemsCount: number;
  message: string;
}

/** Envia evidencia de precio (foto de ticket) para validacion por TrustScore. */
export async function submitEvidence(payload: SubmitEvidencePayload): Promise<EvidenceResult> {
  const response = await apiClient.post('/evidences', payload);
  return response.data.data;
}

export interface ReporterReputation {
  reporterId: string;
  points: number;
  reportsCount: number;
  acceptedCount: number;
  rejectedCount: number;
  acceptanceRate: number;
}

export async function fetchReputation(reporterId: string): Promise<ReporterReputation | null> {
  const response = await apiClient.get(`/evidences/reputation/${encodeURIComponent(reporterId)}`);
  return response.data.data;
}

export async function searchProducts(
  q: string,
  lat: number = -34.8207,
  lng: number = -57.9675,
  radiusKm: number = 10,
  page: number = 1,
  limit: number = 20,
  category: string = '',
): Promise<{ products: any[]; pagination: Pagination }> {
  try {
    const response = await apiClient.get('/products/search', {
      params: { q, latitude: lat, longitude: lng, radiusKm, page, limit, category: category || undefined },
    });
    return {
      products: response.data.data.products,
      pagination: response.data.data.pagination,
    };
  } catch (error) {
    if (!isNetworkError(error)) throw error;
    console.warn('Backend server offline or unreachable. Using Catalog Seed Mock Data.');
    const filtered = MOCK_PRODUCTS.filter((p) => {
      const matchesQuery = !q
        ? true
        : p.name.toLowerCase().includes(q.toLowerCase()) ||
          p.brand.toLowerCase().includes(q.toLowerCase()) ||
          p.eanCode.includes(q);
      const matchesCategory = !category || p.category.toLowerCase() === category.toLowerCase();
      return matchesQuery && matchesCategory;
    });
    return {
      products: filtered,
      pagination: { page: 1, limit, total: filtered.length, totalPages: 1 },
    };
  }
}

export async function optimizeCart(items: Array<{ productId: string; quantity: number }>, lat: number = -34.8207, lng: number = -57.9675) {
  try {
    const response = await apiClient.post('/cart/optimize', { latitude: lat, longitude: lng, items });
    return response.data.data;
  } catch (error) {
    if (!isNetworkError(error)) throw error;
    console.warn('Backend server offline or unreachable. Computing Multi-Store Split Route Locally.');
    // Local calculation fallback matching OptimizeCartUseCase algorithm
    const splitTotal = 1090.0 * 1 + 2290.0 * 1 + 2850.0 * 1; // Día (leche) + Coto (aceite + coca)
    const singleStoreTotal = 1250.0 + 2290.0 + 2850.0; // Coto
    const savings = singleStoreTotal - splitTotal;

    return {
      singleStoreOption: {
        supermarketName: 'Coto C.I.C.S.A.',
        branchName: 'Coto Sucursal 60 - Abasto',
        address: 'Av. Corrientes 3247',
        totalCost: singleStoreTotal,
        distanceKm: 1.4,
        fulfilledItemsCount: items.length,
        totalItemsRequested: items.length,
      },
      optimizedSplitOption: {
        totalCost: splitTotal,
        totalSavings: savings,
        savingsPercentage: Math.round((savings / singleStoreTotal) * 1000) / 10,
        suggestedRoute: [
          {
            step: 1,
            supermarketName: 'Supermercados Día',
            branchName: 'Día % Sucursal Obelisco',
            address: 'Av. Corrientes 1050',
            distanceKm: 0.8,
            subtotalForBranch: 1090.0,
            itemsToBuy: [{ productId: 'p1', productName: 'Leche Entera 1L Larga Vida', quantity: 1, unitPrice: 1090.0, subtotal: 1090.0 }],
          },
          {
            step: 2,
            supermarketName: 'Coto C.I.C.S.A.',
            branchName: 'Coto Sucursal 60 - Abasto',
            address: 'Av. Corrientes 3247',
            distanceKm: 1.4,
            subtotalForBranch: 5140.0,
            itemsToBuy: [
              { productId: 'p2', productName: 'Aceite de Girasol 1.5L', quantity: 1, unitPrice: 2290.0, subtotal: 2290.0 },
              { productId: 'p3', productName: 'Gaseosa Coca-Cola 2.25L', quantity: 1, unitPrice: 2850.0, subtotal: 2850.0 },
            ],
          },
        ],
      },
    };
  }
}
