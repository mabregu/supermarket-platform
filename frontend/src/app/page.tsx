'use client';

import React, { useState, useEffect } from 'react';
import { Header } from '@/components/Header';
import { NearbyStoresBar } from '@/components/NearbyStoresBar';
import { ProductCard } from '@/components/ProductCard';
import { SmartCartOptimizerModal } from '@/components/SmartCartOptimizerModal';
import { EvidenceUploadModal } from '@/components/EvidenceUploadModal';
import { useSupermarketStore } from '@/store/useSupermarketStore';
import { fetchNearbyStores, searchProducts } from '@/lib/api';
import { getCurrentPosition, reverseGeocode, GeoError } from '@/lib/geolocation';
import { Sparkles, Search, ShoppingBag, ShieldCheck, MapPin, Zap } from 'lucide-react';

export default function Home() {
  const {
    searchQuery,
    selectedCategory,
    setSelectedCategory,
    userLocation,
    radiusKm,
    locationStatus,
    setLocationStatus,
    setUserLocation,
  } = useSupermarketStore();
  const [stores, setStores] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [pagination, setPagination] = useState<{ page: number; totalPages: number; total: number } | null>(null);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  const [isCartModalOpen, setIsCartModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  // Al cambiar la búsqueda, la categoría o el radio, volvemos a la primera página
  useEffect(() => {
    setPage(1);
  }, [searchQuery, selectedCategory, radiusKm]);

  // Geolocalización real: se pide la posición al navegador una vez al montar.
  // Si el usuario denies el permiso se usa la ubicación por defecto.
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
          searchQuery,
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
    // OJO: se dependen lat/lng (no el objeto userLocation) para no volver a
    // pedir datos cuando solo cambia la etiqueta de la dirección.
  }, [searchQuery, selectedCategory, userLocation.latitude, userLocation.longitude, radiusKm, page]);

  return (
    <div className="min-h-screen flex flex-col justify-between bg-slate-950">
      {/* Header */}
      <Header
        onOpenCartModal={() => setIsCartModalOpen(true)}
        onOpenUploadModal={() => setIsUploadModalOpen(true)}
      />

      <main className="max-w-7xl mx-auto w-full px-4 lg:px-8 py-8 space-y-8 flex-1">
        {/* Hero Section */}
        <div className="relative glass-panel rounded-3xl p-8 lg:p-12 overflow-hidden border border-slate-800/80">
          <div className="absolute top-0 right-0 w-96 h-96 bg-brand-500/10 blur-3xl rounded-full pointer-events-none" />
          <div className="relative z-10 max-w-3xl space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-400 text-xs font-semibold">
              <Zap className="w-3.5 h-3.5" />
              Inteligencia de Precios en Tiempo Real
            </div>

            <h1 className="text-3xl lg:text-5xl font-extrabold tracking-tight text-slate-100 leading-tight">
              Ahorra hasta un <span className="gradient-text">25% en tus compras</span> con IA y Geolocalización
            </h1>

            <p className="text-sm lg:text-base text-slate-400">
              Compara precios de supermercados cercanos, monitorea la evolución histórica y calcula la{' '}
              <strong className="text-slate-200">combinación de ruta óptima</strong> entre sucursales.
            </p>

            {/* Quick Filter Categories */}
            <div className="flex flex-wrap gap-2 pt-2">
              {['Todos', 'Lácteos y Frescos', 'Almacén', 'Bebidas', 'Limpieza', 'Ofertas Destacadas'].map((cat, idx) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat === 'Todos' ? '' : cat)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition ${
                    (idx === 0 && !selectedCategory) || (idx !== 0 && selectedCategory === cat)
                      ? 'bg-brand-500 text-white shadow-glow'
                      : 'bg-slate-900/80 hover:bg-slate-800 text-slate-300 border border-slate-800'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* PostGIS Nearby Stores Bar */}
        <NearbyStoresBar stores={stores} />

        {/* Product Catalog Grid */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-brand-400" />
              Catálogo de Productos y Comparativa de Precios
            </h2>
            <span className="text-xs text-slate-400">{products.length} productos listados</span>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((n) => (
                <div key={n} className="h-64 rounded-2xl glass-panel animate-pulse p-4" />
              ))}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {products.map((prod) => (
                  <ProductCard key={prod.productId} product={prod} />
                ))}
              </div>

              {pagination && pagination.totalPages > 1 && (
                <div className="flex items-center justify-center gap-3 pt-4">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-slate-900/80 border border-slate-800 text-slate-300 hover:border-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
                  >
                    Anterior
                  </button>
                  <span className="text-xs text-slate-400">
                    Página {pagination.page} de {pagination.totalPages} ({pagination.total} resultados)
                  </span>
                  <button
                    onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                    disabled={page >= pagination.totalPages}
                    className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-slate-900/80 border border-slate-800 text-slate-300 hover:border-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
                  >
                    Siguiente
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 py-6 px-4 lg:px-8 mt-12 bg-slate-950">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-brand-400" />
            <span>PreciosSmart Platform • NestJS + PostGIS + Next.js 14</span>
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
    </div>
  );
}
