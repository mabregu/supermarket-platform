'use client';

import React from 'react';
import { ShoppingCart, MapPin, Search, Sparkles, Upload, Loader2, LocateFixed } from 'lucide-react';
import { useSupermarketStore } from '@/store/useSupermarketStore';
import { getCurrentPosition, reverseGeocode, GeoError } from '@/lib/geolocation';

interface HeaderProps {
  onOpenCartModal: () => void;
  onOpenUploadModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenCartModal, onOpenUploadModal }) => {
  const {
    searchQuery,
    setSearchQuery,
    userLocation,
    cartItems,
    locationStatus,
    setLocationStatus,
    setUserLocation,
    reputationPoints,
  } = useSupermarketStore();
  const totalCartCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);

  const isLocating = locationStatus === 'loading';

  const handleRelocate = async () => {
    setLocationStatus('loading');
    try {
      const position = await getCurrentPosition();
      setUserLocation(position.latitude, position.longitude, 'Obteniendo dirección…');
      setLocationStatus('granted');
      const label = await reverseGeocode(position.latitude, position.longitude);
      setUserLocation(position.latitude, position.longitude, label);
    } catch (error) {
      if (error instanceof GeoError && error.code === 'PERMISSION_DENIED') {
        setLocationStatus('denied', error.message);
      } else {
        setLocationStatus('unavailable', error instanceof Error ? error.message : 'Ubicación no disponible');
      }
    }
  };

  return (
    <header className="sticky top-0 z-50 glass-panel border-b border-slate-800/80 px-4 lg:px-8 py-3.5">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Brand Logo */}
        <div className="flex items-center gap-3 cursor-pointer">
          <div className="w-10 h-10 rounded-xl gradient-bg flex items-center justify-center shadow-glow">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <div>
            <span className="text-xl font-bold gradient-text tracking-tight">PreciosSmart</span>
            <span className="hidden sm:inline-block ml-2 text-xs font-semibold px-2 py-0.5 rounded-full bg-brand-500/10 text-brand-400 border border-brand-500/20">
              IA + PostGIS
            </span>
          </div>
        </div>

        {/* Search Input */}
        <div className="flex-1 max-w-xl relative hidden md:block">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por producto, marca (ej: Leche, Natura, Coca-Cola)..."
            className="w-full pl-10 pr-4 py-2 bg-slate-900/90 border border-slate-700/60 rounded-xl text-sm text-slate-100 placeholder-slate-400 focus:outline-none focus:border-brand-500/60 focus:ring-1 focus:ring-brand-500/50 transition-all"
          />
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-3">
          {/* Location Badge */}
          <button
            onClick={handleRelocate}
            disabled={isLocating}
            title={
              locationStatus === 'denied'
                ? 'Permiso de ubicación denegado. Se usa la ubicación por defecto.'
                : 'Usar mi ubicación actual'
            }
            className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-slate-300 hover:border-slate-700 transition disabled:opacity-60"
          >
            {isLocating ? (
              <Loader2 className="w-3.5 h-3.5 text-brand-400 animate-spin" />
            ) : (
              <MapPin className="w-3.5 h-3.5 text-brand-400" />
            )}
            <span className="truncate max-w-[140px] font-medium">{userLocation.addressName}</span>
            <LocateFixed className="w-3 h-3 text-slate-500" />
          </button>

          {/* Upload Ticket Evidence Button */}
          <button
            onClick={onOpenUploadModal}
            title={
              reputationPoints > 0
                ? `Tu reputacion: ${reputationPoints} puntos`
                : 'Reportar un precio con evidencia'
            }
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700/80 text-xs font-medium text-slate-200 transition"
          >
            <Upload className="w-4 h-4 text-emerald-400" />
            <span className="hidden sm:inline">Subir Ticket</span>
            {reputationPoints > 0 && (
              <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded">
                {reputationPoints}
              </span>
            )}
          </button>

          {/* Cart Button */}
          <button
            onClick={onOpenCartModal}
            className="relative flex items-center gap-2.5 px-4 py-2 rounded-xl gradient-bg hover:opacity-95 text-xs font-semibold text-white shadow-glow transition"
          >
            <ShoppingCart className="w-4 h-4" />
            <span className="hidden sm:inline">Optimizar Carrito</span>
            {totalCartCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-rose-500 text-white font-bold text-[10px] flex items-center justify-center shadow-md animate-bounce">
                {totalCartCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
