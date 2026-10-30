'use client';

import React from 'react';
import Image from 'next/image';
import { Store, MapPin, Navigation, ShieldCheck, AlertTriangle } from 'lucide-react';
import { useSupermarketStore } from '@/store/useSupermarketStore';

interface NearbyStore {
  branchId: string;
  supermarketName: string;
  supermarketLogoUrl: string;
  branchName: string;
  address: string;
  distanceKm: number;
}

interface NearbyStoresBarProps {
  stores: NearbyStore[];
}

const RADIUS_OPTIONS = [2, 5, 10, 25, 50];

export const NearbyStoresBar: React.FC<NearbyStoresBarProps> = ({ stores }) => {
  const { userLocation, radiusKm, setRadiusKm, locationStatus } = useSupermarketStore();

  return (
    <div className="w-full glass-panel rounded-2xl p-4 border border-slate-800">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <Store className="w-4 h-4 text-brand-400" />
          <h3 className="text-sm font-semibold text-slate-200">
            Sucursales Detectadas por PostGIS (Radio {radiusKm} km)
          </h3>
          <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
            {stores.length} encontradas
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* Ubicación activa */}
          <div className="hidden md:flex items-center gap-1.5 text-[11px] text-slate-400 max-w-[260px]">
            <MapPin className="w-3.5 h-3.5 text-brand-400 shrink-0" />
            <span className="truncate" title={userLocation.addressName}>
              {userLocation.addressName}
            </span>
          </div>

          {/* Selector de radio */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-slate-500">Radio</span>
            <select
              value={radiusKm}
              onChange={(e) => setRadiusKm(Number(e.target.value))}
              className="bg-slate-900/80 border border-slate-700 rounded-lg px-2 py-1 text-[11px] font-semibold text-slate-200 focus:outline-none focus:border-brand-500/60"
              aria-label="Radio de búsqueda en kilómetros"
            >
              {RADIUS_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option} km
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 font-medium">
            <ShieldCheck className="w-3.5 h-3.5" />
            Precios verificados
          </div>
        </div>
      </div>

      {stores.length === 0 ? (
        <div className="flex items-start gap-3 p-4 rounded-xl border border-amber-500/30 bg-amber-500/5">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div className="text-xs text-slate-300 space-y-1">
            <p className="font-semibold text-amber-300">
              No hay sucursales dentro de {radiusKm} km
              {locationStatus === 'granted' ? ` de ${userLocation.addressName}` : ''}.
            </p>
            <p className="text-slate-400">
              Probá con un radio mayor. Las sucursales de la zona CABA (Obelisco, San Telmo, Abasto) están a
              unos 38 km; las de Ensenada y La Plata a 6-9 km.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {stores.map((store) => (
            <div
              key={store.branchId}
              className="glass-panel-hover p-3 rounded-xl border border-slate-800/80 bg-slate-900/50 flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-slate-800 flex items-center justify-center overflow-hidden p-1 border border-slate-700">
                  {store.supermarketLogoUrl ? (
                    <Image
                      src={store.supermarketLogoUrl}
                      alt={store.supermarketName}
                      width={36}
                      height={36}
                      className="object-contain w-full h-full"
                    />
                  ) : (
                    <Store className="w-5 h-5 text-slate-400" />
                  )}
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-100">{store.supermarketName}</h4>
                  <p className="text-[11px] text-slate-400 truncate max-w-[170px]" title={store.address}>
                    {store.address}
                  </p>
                </div>
              </div>

              <div className="text-right">
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand-400 bg-brand-500/10 px-2 py-0.5 rounded-lg border border-brand-500/20">
                  <Navigation className="w-3 h-3" />
                  {store.distanceKm} km
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
