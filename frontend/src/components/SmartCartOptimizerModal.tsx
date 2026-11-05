'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { X, Sparkles, ShoppingBag, ArrowRight, Route, ShieldCheck, TrendingDown, Trash2, Plus, Minus, ExternalLink, MapPin } from 'lucide-react';
import { useSupermarketStore } from '@/store/useSupermarketStore';
import { optimizeCart } from '@/lib/api';

interface SmartCartOptimizerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SmartCartOptimizerModal: React.FC<SmartCartOptimizerModalProps> = ({ isOpen, onClose }) => {
  const { cartItems, updateQuantity, removeFromCart, clearCart, userLocation } = useSupermarketStore();
  const [optimizationResult, setOptimizationResult] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'split' | 'single'>('split');

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleRunOptimization = async () => {
    if (cartItems.length === 0) return;
    setIsLoading(true);
    try {
      const itemsPayload = cartItems.map((i) => ({ productId: i.productId, quantity: i.quantity }));
      const result = await optimizeCart(itemsPayload, userLocation.latitude, userLocation.longitude);
      setOptimizationResult(result);
    } catch (err) {
      console.error('Error optimizing cart', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenGoogleMaps = (suggestedRoute: any[]) => {
    if (!suggestedRoute || suggestedRoute.length === 0) return;
    const origin = `${userLocation.latitude},${userLocation.longitude}`;
    const destination = encodeURIComponent(suggestedRoute[suggestedRoute.length - 1].address);
    const waypoints = suggestedRoute
      .slice(0, -1)
      .map((s) => encodeURIComponent(s.address))
      .join('|');
    const url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}${
      waypoints ? `&waypoints=${waypoints}` : ''
    }`;
    window.open(url, '_blank');
  };

  const handleOpenSingleStoreMap = (address: string) => {
    if (!address) return;
    const origin = `${userLocation.latitude},${userLocation.longitude}`;
    const destination = encodeURIComponent(address);
    const url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}`;
    window.open(url, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn" role="dialog" aria-modal="true">
      <div className="w-full max-w-4xl glass-panel rounded-3xl border border-slate-700/80 overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl gradient-bg flex items-center justify-center shadow-glow">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-100">Carrito Optimizado por IA</h2>
              <p className="text-xs text-slate-400">Calculadora de rutas y división multi-tienda</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Cart Items List */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Productos en tu lista ({cartItems.length})
              </h3>
              {cartItems.length > 0 && (
                <button
                  onClick={clearCart}
                  className="text-[11px] text-slate-400 hover:text-rose-400 transition flex items-center gap-1 font-medium"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Vaciar lista
                </button>
              )}
            </div>

            {cartItems.length === 0 ? (
              <div className="p-8 text-center glass-panel rounded-2xl border border-slate-800">
                <ShoppingBag className="w-10 h-10 text-slate-500 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-300">Tu carrito está vacío</p>
                <p className="text-xs text-slate-400 mt-1">Agrega productos del catálogo para comparar rutas</p>
              </div>
            ) : (
              <div className="space-y-2">
                {cartItems.map((item) => (
                  <div key={item.productId} className="flex items-center justify-between p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                    <div className="flex items-center gap-3">
                      <Image
                        src={item.imageUrl || '/placeholder-product.svg'}
                        alt={item.name}
                        width={40}
                        height={40}
                        className="w-10 h-10 rounded-lg object-contain bg-slate-800 p-1"
                      />
                      <div>
                        <h4 className="text-xs font-bold text-slate-200">{item.name}</h4>
                        <span className="text-[10px] text-slate-400">{item.brand}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5 bg-slate-800 rounded-lg p-1 border border-slate-700">
                        <button onClick={() => updateQuantity(item.productId, -1)} className="p-1 hover:text-white text-slate-400">
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="text-xs font-bold text-slate-200 px-1">{item.quantity}</span>
                        <button onClick={() => updateQuantity(item.productId, 1)} className="p-1 hover:text-white text-slate-400">
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      <button onClick={() => removeFromCart(item.productId)} className="text-slate-400 hover:text-rose-400 p-1">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Calculate Optimization Action */}
          {cartItems.length > 0 && !optimizationResult && (
            <div className="text-center pt-2">
              <button
                onClick={handleRunOptimization}
                disabled={isLoading}
                className="w-full py-3.5 px-6 rounded-2xl gradient-bg text-white font-bold text-sm shadow-glow hover:opacity-95 transition flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Sparkles className="w-4 h-4 animate-spin" />
                    Calculando Combinaciones Multi-Tienda...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Calcular Ahorro Máximo e IA Routing
                  </>
                )}
              </button>
            </div>
          )}

          {/* Optimization Results View */}
          {optimizationResult && (
            <div className="space-y-6 pt-2 border-t border-slate-800">
              {/* Savings Headline Badge */}
              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                    <TrendingDown className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">Ahorro Máximo Encontrado</span>
                    <div className="text-xl font-extrabold text-white">
                      ${optimizationResult.optimizedSplitOption.totalSavings.toLocaleString('es-AR')}{' '}
                      <span className="text-sm font-semibold text-emerald-400">
                        ({optimizationResult.optimizedSplitOption.savingsPercentage}% de ahorro)
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 bg-slate-900/80 p-1.5 rounded-xl border border-slate-800 text-xs font-semibold">
                  <button
                    onClick={() => setActiveTab('split')}
                    className={`px-3 py-1.5 rounded-lg transition ${
                      activeTab === 'split' ? 'bg-brand-500 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Ruta Multi-Tienda (Split)
                  </button>
                  <button
                    onClick={() => setActiveTab('single')}
                    className={`px-3 py-1.5 rounded-lg transition ${
                      activeTab === 'single' ? 'bg-brand-500 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Un Solo Supermercado
                  </button>
                </div>
              </div>

              {/* Tab 1: Split Store Suggested Route */}
              {activeTab === 'split' && (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                      <Route className="w-4 h-4 text-brand-400" />
                      Ruta Sugerida ({optimizationResult.optimizedSplitOption.suggestedRoute.length} paradas)
                    </h4>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() =>
                          handleOpenGoogleMaps(optimizationResult.optimizedSplitOption.suggestedRoute)
                        }
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-[11px] text-brand-300 font-semibold border border-slate-700 transition shadow-sm"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        Navegar con Google Maps
                      </button>
                      <span className="text-xs font-extrabold text-brand-400">
                        Total: ${optimizationResult.optimizedSplitOption.totalCost.toLocaleString('es-AR')}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {optimizationResult.optimizedSplitOption.suggestedRoute.map((stop: any) => (
                      <div key={stop.step} className="glass-panel p-4 rounded-2xl border border-slate-800 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className="w-6 h-6 rounded-full bg-brand-500 text-white font-bold text-xs flex items-center justify-center shadow-glow">
                              {stop.step}
                            </span>
                            <div>
                              <h5 className="text-sm font-bold text-slate-100">{stop.supermarketName}</h5>
                              <p className="text-xs text-slate-400">{stop.address} ({stop.distanceKm} km)</p>
                            </div>
                          </div>
                          <span className="text-sm font-bold text-slate-200">
                            Subtotal: ${stop.subtotalForBranch.toLocaleString('es-AR')}
                          </span>
                        </div>

                        <div className="pl-9 space-y-1.5 border-l-2 border-slate-800 ml-3">
                          {stop.itemsToBuy.map((item: any) => (
                            <div key={item.productId} className="flex items-center justify-between text-xs text-slate-300 bg-slate-900/40 p-2 rounded-lg">
                              <span>
                                {item.quantity}x <strong className="text-slate-100">{item.productName}</strong>
                              </span>
                              <span className="font-semibold text-brand-400">${item.subtotal.toLocaleString('es-AR')}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tab 2: Single Store Option */}
              {activeTab === 'single' && (
                <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-3">
                  {optimizationResult.singleStoreOption ? (
                    <>
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <h4 className="text-sm font-bold text-slate-100">
                            {optimizationResult.singleStoreOption.supermarketName}
                          </h4>
                          <p className="text-xs text-slate-400">{optimizationResult.singleStoreOption.address}</p>
                          <button
                            onClick={() =>
                              handleOpenSingleStoreMap(optimizationResult.singleStoreOption.address)
                            }
                            className="inline-flex items-center gap-1.5 mt-2 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] text-brand-300 font-semibold border border-slate-700 transition"
                          >
                            <ExternalLink className="w-3 h-3" />
                            Cómo llegar en Google Maps
                          </button>
                        </div>
                        <div className="text-right">
                          <span className="text-xs text-slate-400">Costo Total Mono-Tienda</span>
                          <div className="text-xl font-extrabold text-slate-200">
                            ${optimizationResult.singleStoreOption.totalCost.toLocaleString('es-AR')}
                          </div>
                        </div>
                      </div>
                      <p className="text-xs text-slate-400 bg-slate-900/60 p-3 rounded-xl border border-slate-800/60">
                        💡 Comprar todo en un único lugar te ahorra tiempo de traslado, pero te cuesta{' '}
                        <strong className="text-rose-400">
                          ${optimizationResult.optimizedSplitOption.totalSavings.toLocaleString('es-AR')} más
                        </strong>{' '}
                        que la ruta dividida.
                      </p>
                    </>
                  ) : (
                    <p className="text-xs text-amber-400 bg-amber-500/10 p-3 rounded-xl border border-amber-500/30">
                      ⚠️ Ningún supermercado cercano tiene todos los productos de tu lista. La opción recomendada es
                      dividir la compra entre varias sucursales.
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
