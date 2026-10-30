'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { Tag, Plus, TrendingDown, Store, Check, History, TrendingUp, Loader2 } from 'lucide-react';
import { useSupermarketStore } from '@/store/useSupermarketStore';
import { fetchPriceHistory, PriceHistoryResponse } from '@/lib/api';

export interface ProductCardProps {
  product: {
    productId: string;
    name: string;
    brand: string;
    category: string;
    imageUrl: string;
    eanCode: string;
    measurementUnit: string;
    contentValue: number;
    storePricesCount: number;
    bestDeal: {
      branchId: string;
      supermarketName: string;
      branchName: string;
      address: string;
      price: number;
      listPrice?: number | null;
      hasPromotion?: boolean;
      unitPrice: number;
      distanceKm: number;
    } | null;
    priceRange: {
      min: number;
      max: number;
      average: number;
    };
  };
}

const formatARS = (value: number) =>
  `$${value.toLocaleString('es-AR', { maximumFractionDigits: 0 })}`;

export const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const { cartItems, addToCart, userLocation } = useSupermarketStore();
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<PriceHistoryResponse | null>(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  const isAdded = cartItems.some((item) => item.productId === product.productId);

  const handleAdd = () => {
    addToCart({
      productId: product.productId,
      name: product.name,
      brand: product.brand,
      imageUrl: product.imageUrl,
    });
  };

  const handleToggleHistory = async () => {
    const next = !showHistory;
    setShowHistory(next);
    if (!next || history) return;

    setIsLoadingHistory(true);
    try {
      const data = await fetchPriceHistory(product.productId, {
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
      });
      setHistory(data);
    } catch (error) {
      console.error('No se pudo cargar el historial de precios', error);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const hasPromotion = Boolean(product.bestDeal?.hasPromotion);

  return (
    <div className="glass-panel-hover rounded-2xl p-4 bg-slate-900/60 border border-slate-800 flex flex-col justify-between h-full group">
      <div>
        {/* Top Badges */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <span className="text-[10px] font-semibold tracking-wide uppercase px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700">
            {product.brand}
          </span>
          {product.bestDeal && (
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
              <TrendingDown className="w-3 h-3" />
              Mejor Oferta
            </span>
          )}
        </div>

        {/* Product Image & Info */}
        <div className="flex items-center gap-4 mb-4">
          <div className="w-20 h-20 rounded-xl bg-slate-800/80 p-2 border border-slate-700/60 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform duration-300">
            <Image
              src={product.imageUrl || '/placeholder-product.svg'}
              alt={product.name}
              width={80}
              height={80}
              className="w-full h-full object-contain rounded-lg"
            />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-100 group-hover:text-brand-400 transition-colors line-clamp-2">
              {product.name}
            </h3>
            <p className="text-xs text-slate-400 mt-1">EAN: {product.eanCode}</p>
            <div className="flex items-center gap-1.5 mt-1.5 text-xs text-slate-400">
              <Store className="w-3.5 h-3.5 text-slate-400" />
              <span>En {product.storePricesCount} tiendas cercanas</span>
            </div>
          </div>
        </div>

        {/* Price Box */}
        {product.bestDeal ? (
          <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 mb-4">
            <div className="flex items-baseline justify-between">
              <div>
                <span className="text-xs text-slate-400">Desde</span>
                <div className="text-2xl font-extrabold text-brand-400 tracking-tight">
                  {formatARS(product.bestDeal.price)}
                </div>
                {hasPromotion && product.bestDeal.listPrice && (
                  <div className="text-[11px] text-emerald-400">
                    precio lista {formatARS(product.bestDeal.listPrice)}
                  </div>
                )}
              </div>
              <div className="text-right">
                <span className="text-[11px] font-semibold text-slate-300 bg-slate-800 px-2 py-0.5 rounded">
                  {product.bestDeal.supermarketName}
                </span>
                <p className="text-[10px] text-slate-400 mt-0.5">a {product.bestDeal.distanceKm} km</p>
              </div>
            </div>

            {/* Price Range Pill */}
            <div className="mt-2.5 pt-2 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400">
              <span>Rango en zona:</span>
              <span className="font-semibold text-slate-300">
                {formatARS(product.priceRange.min)} - {formatARS(product.priceRange.max)}
              </span>
            </div>
          </div>
        ) : (
          <div className="p-3 rounded-xl bg-slate-950/50 text-center text-xs text-slate-400 mb-4">
            Sin datos de precios disponibles en la zona
          </div>
        )}

        {/* Price history */}
        <button
          onClick={handleToggleHistory}
          className="w-full flex items-center justify-center gap-1.5 text-[11px] font-medium text-slate-400 hover:text-brand-400 transition py-1"
        >
          {isLoadingHistory ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <History className="w-3.5 h-3.5" />
          )}
          {showHistory ? 'Ocultar historial de precios' : 'Ver historial de precios'}
        </button>

        {showHistory && (
          <div className="mt-1 p-3 rounded-xl bg-slate-950/60 border border-slate-800/70 text-[11px]">
            {isLoadingHistory ? (
              <p className="text-slate-500">Cargando historial...</p>
            ) : !history || history.series.length === 0 ? (
              <p className="text-slate-500">
                Todavia no hay variaciones de precio registradas para este producto.
              </p>
            ) : (
              <>
                {history.stats && (
                  <div className="grid grid-cols-4 gap-2 mb-3">
                    <div className="text-center">
                      <div className="text-[9px] uppercase text-slate-500">Min</div>
                      <div className="font-bold text-slate-200">{formatARS(history.stats.min)}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-[9px] uppercase text-slate-500">Max</div>
                      <div className="font-bold text-slate-200">{formatARS(history.stats.max)}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-[9px] uppercase text-slate-500">Prom</div>
                      <div className="font-bold text-slate-200">{formatARS(history.stats.average)}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-[9px] uppercase text-slate-500">Variación</div>
                      <div
                        className={`font-bold flex items-center justify-center gap-0.5 ${
                          history.stats.changePercent > 0
                            ? 'text-rose-400'
                            : history.stats.changePercent < 0
                              ? 'text-emerald-400'
                              : 'text-slate-300'
                        }`}
                      >
                        {history.stats.changePercent !== 0 && (
                          <TrendingUp
                            className={`w-3 h-3 ${history.stats.changePercent < 0 ? 'rotate-180' : ''}`}
                          />
                        )}
                        {history.stats.changePercent}%
                      </div>
                    </div>
                  </div>
                )}
                <ul className="space-y-1 max-h-32 overflow-y-auto">
                  {history.series
                    .slice()
                    .reverse()
                    .map((point, index) => (
                      <li
                        key={`${point.date}-${point.branchId}-${index}`}
                        className="flex items-center justify-between gap-2"
                      >
                        <span className="text-slate-400 truncate">
                          {new Date(point.date).toLocaleDateString('es-AR')} · {point.supermarketName}
                        </span>
                        <span className="font-semibold text-slate-200 whitespace-nowrap">
                          {formatARS(point.price)}
                        </span>
                      </li>
                    ))}
                </ul>
                <p className="text-[10px] text-slate-600 mt-2">
                  {history.stats?.observations ?? 0} observaciones · fuente: SEPA / comunidad
                </p>
              </>
            )}
          </div>
        )}
      </div>

      {/* Add button */}
      <button
        onClick={handleAdd}
        className={`w-full py-2.5 px-4 rounded-xl font-semibold text-xs flex items-center justify-center gap-2 transition-all mt-3 ${
          isAdded
            ? 'bg-slate-800 text-emerald-400 border border-emerald-500/40'
            : 'gradient-bg text-white hover:opacity-95 shadow-glow'
        }`}
      >
        {isAdded ? (
          <>
            <Check className="w-4 h-4 text-emerald-400" />
            Agregado al Carrito
          </>
        ) : (
          <>
            <Plus className="w-4 h-4" />
            Agregar para Optimizar
          </>
        )}
      </button>
    </div>
  );
};
