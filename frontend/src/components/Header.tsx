'use client';

import React from 'react';
import {
  ShoppingCart,
  MapPin,
  Search,
  Sparkles,
  Upload,
  Loader2,
  LocateFixed,
  Barcode,
} from 'lucide-react';
import { useSupermarketStore } from '@/store/useSupermarketStore';

interface HeaderProps {
  onOpenCartModal: () => void;
  onOpenUploadModal: () => void;
  onOpenLocationModal: () => void;
  onOpenBarcodeModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenCartModal,
  onOpenUploadModal,
  onOpenLocationModal,
  onOpenBarcodeModal,
}) => {
  const {
    searchQuery,
    setSearchQuery,
    userLocation,
    cartItems,
    locationStatus,
    reputationPoints,
  } = useSupermarketStore();
  const totalCartCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);
  const isLocating = locationStatus === 'loading';

  return (
    <header className="sticky top-0 z-50 glass-panel border-b border-slate-800/80 px-4 lg:px-8 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        {/* Brand Logo */}
        <div className="flex items-center gap-2.5 cursor-pointer shrink-0">
          <div className="w-9 h-9 rounded-xl gradient-bg flex items-center justify-center shadow-glow">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="text-lg font-bold gradient-text tracking-tight">PreciosSmart</span>
            <span className="hidden sm:inline-block ml-2 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-brand-500/10 text-brand-400 border border-brand-500/20">
              IA + SEPA
            </span>
          </div>
        </div>

        {/* Desktop Search Input with Barcode Scanner Button */}
        <div className="flex-1 max-w-xl relative hidden md:block">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por producto, marca (ej: Leche, Cañuelas, Coca-Cola)..."
            className="w-full pl-10 pr-10 py-2 bg-slate-900/90 border border-slate-700/60 rounded-xl text-sm text-slate-100 placeholder-slate-400 focus:outline-none focus:border-brand-500/60 focus:ring-1 focus:ring-brand-500/50 transition-all"
          />
          <button
            type="button"
            onClick={onOpenBarcodeModal}
            title="Escanear código de barras con la cámara"
            className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-brand-400 transition"
          >
            <Barcode className="w-4 h-4" />
          </button>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Location Badge (Click to open Location Modal) */}
          <button
            onClick={onOpenLocationModal}
            disabled={isLocating}
            title="Cambiar o buscar ubicación"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-slate-300 hover:border-slate-700 transition disabled:opacity-60"
          >
            {isLocating ? (
              <Loader2 className="w-3.5 h-3.5 text-brand-400 animate-spin" />
            ) : (
              <MapPin className="w-3.5 h-3.5 text-brand-400" />
            )}
            <span className="truncate max-w-[100px] sm:max-w-[130px] font-medium text-[11px] sm:text-xs">
              {userLocation.addressName}
            </span>
            <LocateFixed className="w-3 h-3 text-slate-500 hidden sm:inline" />
          </button>

          {/* Upload Ticket Evidence Button */}
          <button
            onClick={onOpenUploadModal}
            title={
              reputationPoints > 0
                ? `Tu reputación: ${reputationPoints} puntos`
                : 'Reportar un precio con evidencia'
            }
            className="flex items-center gap-1.5 px-3 py-1.5 sm:py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700/80 text-xs font-medium text-slate-200 transition"
          >
            <Upload className="w-3.5 h-3.5 text-emerald-400" />
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
            className="relative flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl gradient-bg hover:opacity-95 text-xs font-semibold text-white shadow-glow transition"
          >
            <ShoppingCart className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">Optimizar Carrito</span>
            {totalCartCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-rose-500 text-white font-bold text-[10px] flex items-center justify-center shadow-md animate-bounce">
                {totalCartCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Mobile Search Row */}
      <div className="mt-2.5 md:hidden flex items-center gap-2">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar producto o marca..."
            className="w-full pl-9 pr-9 py-2 bg-slate-900/90 border border-slate-700/60 rounded-xl text-xs text-slate-100 placeholder-slate-400 focus:outline-none focus:border-brand-500/60 transition-all"
          />
          <button
            type="button"
            onClick={onOpenBarcodeModal}
            title="Escanear código de barras con la cámara"
            className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-brand-400"
          >
            <Barcode className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
