'use client';

import React, { useState, useEffect } from 'react';
import { Header } from '@/components/Header';
import { NearbyStoresBar } from '@/components/NearbyStoresBar';
import { ProductCard } from '@/components/ProductCard';
import { SmartCartOptimizerModal } from '@/components/SmartCartOptimizerModal';
import { EvidenceUploadModal } from '@/components/EvidenceUploadModal';
import { LocationModal } from '@/components/LocationModal';
import { BarcodeScannerModal } from '@/components/BarcodeScannerModal';
import { useSupermarketStore } from '@/store/useSupermarketStore';
import { fetchNearbyStores, searchProducts } from '@/lib/api';
import { getCurrentPosition, reverseGeocode, GeoError } from '@/lib/geolocation';
import { useDebounce } from '@/lib/useDebounce';
import { Sparkles, Search, ShoppingBag, ShieldCheck, MapPin, Zap, Tag, ArrowRight } from 'lucide-react';

const CATEGORIES = [
  'Todos',
  'Lácteos y Frescos',
  'Almacén',
  'Bebidas',
  'Limpieza',
  'Panadería',
];

export default function Home() {
  const {
    searchQuery,
    setSearchQuery,
    selectedCategory,
    setSelectedCategory,
    userLocation,
    radiusKm,
    locationStatus,
    setLocationStatus,
    setUserLocation,
    cartItems,
  } = useSupermarketStore();

  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  const [stores, setStores] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [pagination, setPagination] = useState<{ page: number; totalPages: number; total: number } | null>(null);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [onlyPromotions, setOnlyPromotions] = useState(false);

  const [isCartModalOpen, setIsCartModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [isBarcodeModalOpen, setIsBarcodeModalOpen] = useState(false);

  // Al cambiar la búsqueda, la categoría o el radio, volvemos a la primera página
  useEffect(() => {
    setPage(1);
  }, [debouncedSearchQuery, selectedCategory, radiusKm, onlyPromotions]);

  // Geolocalización real: se pide la posición al navegador una vez al montar.
  useEffect(() => {
    let cancelled = false;

    async function resolveLocation() {
      setLocationStatus('loading');
      try {
        const position = await getCurrentPosition();
        if (cancelled) return;

        setUserLocation(position.latitude, position.longitude, 'Obteniendo dirección…');
        setLocationStatus('granted');

        const label = await reverseGeocode(position.latitude, position.longitude);
        if (!cancelled) {
          setUserLocation(position.latitude, position.longitude, label);
        }
      } catch (error) {
        if (cancelled) return;
        if (error instanceof GeoError && error.code === 'PERMISSION_DENIED') {
          setLocationStatus('denied', error.message);
        } else {
          setLocationStatus('unavailable', error instanceof Error ? error.message : 'Ubicación no disponible');
        }
      }
    }

    resolveLocation();
    return () => {
      cancelled = true;
    };
  }, [setLocationStatus, setUserLocation]);

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        const storesData = await fetchNearbyStores(userLocation.latitude, userLocation.longitude, radiusKm);
        setStores(storesData);

        const { products: productsData, pagination: paginationData } = await searchProducts(
          debouncedSearchQuery,
          userLocation.latitude,
          userLocation.longitude,
          radiusKm,
          page,
          20,
          selectedCategory,
        );
        setProducts(productsData);
        setPagination(paginationData);
      } catch (err) {
        console.error('Error loading data', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [debouncedSearchQuery, selectedCategory, userLocation.latitude, userLocation.longitude, radiusKm, page]);

  const displayedProducts = onlyPromotions
    ? products.filter(
        (p) =>
          p.bestDeal?.hasPromotion ||
          (p.storePrices && p.storePrices.some((sp: any) => sp.hasPromotion)),
      )
    : products;

  const totalCartCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);

  return (
    <div className="min-h-screen flex flex-col justify-between bg-[#F5F1E4] text-[#2C2E2A] pb-16">
      {/* Header */}
      <Header
        onOpenCartModal={() => setIsCartModalOpen(true)}
        onOpenUploadModal={() => setIsUploadModalOpen(true)}
        onOpenLocationModal={() => setIsLocationModalOpen(true)}
        onOpenBarcodeModal={() => setIsBarcodeModalOpen(true)}
      />

      <main className="max-w-7xl mx-auto w-full px-4 lg:px-8 py-6 space-y-6 flex-1">
        {/* Hero Section — Editorial ledger direction */}
        <div className="relative bg-[#FBF8F1] border border-[#2C2E2A]/20 rounded-2xl p-6 lg:p-10 overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-[#BE123C]/5 blur-3xl rounded-full pointer-events-none" />
          <div className="relative z-10 max-w-3xl space-y-3.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#2C2E2A]/25 text-[#2C2E2A] text-xs font-semibold">
              <Zap className="w-3.5 h-3.5 text-[#BE123C]" />
              Precios Claros Oficiales en Vivo + PostGIS
            </div>

            <h1 className="text-2xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-[#2C2E2A] leading-tight">
              Ahorra hasta un <span className="text-[#BE123C]">25% en tus compras</span> con IA y Geolocalización
            </h1>

            <p className="text-xs sm:text-sm lg:text-base text-[#5B574E]">
              Compara precios de supermercados cercanos, monitorea la evolución histórica y calcula la{' '}
              <strong className="text-[#2C2E2A]">combinación de ruta óptima</strong> entre sucursales.
            </p>

            {/* Quick Filter Categories + Promo Toggle */}
            <div className="flex flex-wrap items-center gap-2 pt-2">
              {CATEGORIES.map((cat, idx) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat === 'Todos' ? '' : cat)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition border ${
                    (idx === 0 && !selectedCategory) || (idx !== 0 && selectedCategory === cat)
                      ? 'bg-[#2C2E2A] text-[#F5F1E4] border-[#2C2E2A]'
                      : 'bg-transparent text-[#2C2E2A] border-[#2C2E2A]/30 hover:bg-[#2C2E2A]/5'
                  }`}
                >
                  {cat}
                </button>
              ))}

              {/* Only Promotions Toggle */}
              <button
                onClick={() => setOnlyPromotions(!onlyPromotions)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition flex items-center gap-1.5 border ${
                  onlyPromotions
                    ? 'bg-[#BE123C] text-white border-[#BE123C]'
                    : 'bg-transparent text-[#BE123C] border-[#BE123C]/50 hover:bg-[#BE123C]/5'
                }`}
              >
                <Tag className="w-3.5 h-3.5" />
                ⚡ Solo Promociones
              </button>
            </div>
          </div>
        </div>

        {/* PostGIS Nearby Stores Bar */}
        <NearbyStoresBar stores={stores} />

        {/* Product Catalog Grid */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-[#2C2E2A]/20 pb-3">
            <h2 className="text-base sm:text-lg font-bold text-[#2C2E2A] flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-[#BE123C]" />
              Catálogo de Productos y Comparativa de Precios
            </h2>
            <span className="text-xs text-[#5B574E]">
              {displayedProducts.length} {displayedProducts.length === 1 ? 'producto' : 'productos'} listados
            </span>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((n) => (
                <div key={n} className="h-64 rounded-2xl bg-[#2C2E2A]/5 animate-pulse p-4" />
              ))}
            </div>
          ) : displayedProducts.length === 0 ? (
            <div className="p-12 text-center bg-[#FBF8F1] border border-[#2C2E2A]/20 rounded-2xl space-y-3">
              <ShoppingBag className="w-12 h-12 text-[#2C2E2A]/30 mx-auto" />
              <h3 className="text-sm font-bold text-[#2C2E2A]">No encontramos productos con esos filtros</h3>
              <p className="text-xs text-[#5B574E] max-w-md mx-auto">
                Probá buscando otro término, desactivando el filtro de ofertas o aumentando el radio de búsqueda en la barra de sucursales.
              </p>
              {(selectedCategory || searchQuery || onlyPromotions) && (
                <button
                  onClick={() => {
                    setSelectedCategory('');
                    setSearchQuery('');
                    setOnlyPromotions(false);
                  }}
                  className="px-4 py-2 rounded-full bg-[#2C2E2A] text-[#F5F1E4] font-semibold text-xs shadow-glow hover:opacity-90 transition"
                >
                  Restablecer todos los filtros
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {displayedProducts.map((prod) => (
                  <ProductCard key={prod.productId} product={prod} />
                ))}
              </div>

              {pagination && pagination.totalPages > 1 && (
                <div className="flex items-center justify-center gap-3 pt-4">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="px-3.5 py-1.5 rounded-full text-xs font-semibold bg-transparent border border-[#2C2E2A]/30 text-[#2C2E2A] hover:bg-[#2C2E2A]/5 disabled:opacity-40 disabled:cursor-not-allowed transition"
                  >
                    Anterior
                  </button>
                  <span className="text-xs text-[#5B574E]">
                    Página {pagination.page} de {pagination.totalPages} ({pagination.total} resultados)
                  </span>
                  <button
                    onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                    disabled={page >= pagination.totalPages}
                    className="px-3.5 py-1.5 rounded-full text-xs font-semibold bg-transparent border border-[#2C2E2A]/30 text-[#2C2E2A] hover:bg-[#2C2E2A]/5 disabled:opacity-40 disabled:cursor-not-allowed transition"
                  >
                    Siguiente
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {/* Floating Bottom Cart Bar */}
      {totalCartCount > 0 && !isCartModalOpen && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-40 w-11/12 max-w-lg animate-fadeIn">
          <div className="bg-[#FBF8F1] p-3 sm:p-3.5 rounded-2xl border border-[#2C2E2A]/30 shadow-2xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#2C2E2A] flex items-center justify-center text-[#F5F1E4] shrink-0">
                <ShoppingBag className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-bold text-[#2C2E2A] block">
                  {totalCartCount} {totalCartCount === 1 ? 'producto' : 'productos'} en tu lista
                </span>
                <span className="text-[11px] text-[#BE123C] font-medium">
                  Listo para calcular ruta y ahorro
                </span>
              </div>
            </div>
            <button
              onClick={() => setIsCartModalOpen(true)}
              className="px-3.5 sm:px-4 py-2 rounded-full bg-[#2C2E2A] text-[#F5F1E4] font-bold text-xs shadow-glow hover:opacity-90 transition flex items-center gap-1.5 shrink-0"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Optimizar</span>
              <ArrowRight className="w-3.5 h-3.5 hidden sm:inline" />
            </button>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-[#2C2E2A]/20 py-6 px-4 lg:px-8 mt-12 bg-transparent">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#5B574E]">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#BE123C]" />
            <span>PreciosSmart Platform • Precios Claros SEPA + PostGIS + Next.js 14</span>
          </div>
          <div>Stack: NestJS, PostGIS, Next.js 14, TailwindCSS</div>
        </div>
      </footer>

      {/* Modals */}
      <SmartCartOptimizerModal
        isOpen={isCartModalOpen}
        onClose={() => setIsCartModalOpen(false)}
      />

      <EvidenceUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        stores={stores}
        products={products}
      />

      <LocationModal
        isOpen={isLocationModalOpen}
        onClose={() => setIsLocationModalOpen(false)}
      />

      <BarcodeScannerModal
        isOpen={isBarcodeModalOpen}
        onClose={() => setIsBarcodeModalOpen(false)}
        onDetected={(code) => setSearchQuery(code)}
      />
    </div>
  );
}
