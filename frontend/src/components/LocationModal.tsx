'use client';

import React, { useState, useEffect } from 'react';
import { X, MapPin, Search, Navigation, LocateFixed, Loader2, Check } from 'lucide-react';
import { useSupermarketStore } from '@/store/useSupermarketStore';
import { getCurrentPosition, reverseGeocode, GeoError } from '@/lib/geolocation';

interface LocationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const POPULAR_ZONES = [
  { name: 'Punta Lara, Ensenada', lat: -34.8207, lng: -57.9675 },
  { name: 'La Plata (Plaza Moreno / Centro)', lat: -34.9214, lng: -57.9545 },
  { name: 'CABA (Obelisco / San Nicolás)', lat: -34.6037, lng: -58.3816 },
  { name: 'San Telmo / Puerto Madero', lat: -34.615, lng: -58.37 },
  { name: 'Abasto / Almagro (CABA)', lat: -34.6033, lng: -58.4105 },
];

export const LocationModal: React.FC<LocationModalProps> = ({ isOpen, onClose }) => {
  const { userLocation, setUserLocation, setLocationStatus } = useSupermarketStore();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Array<{ display_name: string; lat: string; lon: string }>>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLocatingGPS, setIsLocatingGPS] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setIsSearching(true);
    setError(null);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          query.trim(),
        )}&countrycodes=ar&limit=5`,
        {
          headers: {
            'Accept-Language': 'es',
            'User-Agent': 'SupermarketPlatform/1.0',
          },
        },
      );
      if (!res.ok) throw new Error('Error al consultar OpenStreetMap');
      const data = await res.json();
      setResults(data);
      if (data.length === 0) {
        setError('No se encontraron ubicaciones para esa búsqueda. Probá con otra calle o barrio.');
      }
    } catch (err) {
      setError('No se pudo conectar con el servicio de geocodificación.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelect = (lat: number, lng: number, addressName: string) => {
    setUserLocation(lat, lng, addressName);
    setLocationStatus('granted');
    onClose();
  };

  const handleUseGPS = async () => {
    setIsLocatingGPS(true);
    setError(null);
    try {
      const position = await getCurrentPosition();
      setUserLocation(position.latitude, position.longitude, 'Obteniendo dirección…');
      setLocationStatus('granted');
      const label = await reverseGeocode(position.latitude, position.longitude);
      setUserLocation(position.latitude, position.longitude, label);
      onClose();
    } catch (err) {
      if (err instanceof GeoError && err.code === 'PERMISSION_DENIED') {
        setError('El navegador denegó el permiso de ubicación. Podés elegir un barrio manualmente.');
      } else {
        setError('Ubicación GPS no disponible en este momento.');
      }
    } finally {
      setIsLocatingGPS(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-lg glass-panel rounded-3xl border border-slate-700/80 overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/80">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl gradient-bg flex items-center justify-center text-white shadow-glow">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-100">Seleccionar Ubicación</h2>
              <p className="text-[11px] text-slate-400">Encontrá sucursales y precios en tu zona</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Current GPS action */}
          <button
            onClick={handleUseGPS}
            disabled={isLocatingGPS}
            className="w-full flex items-center justify-between p-3 rounded-2xl bg-brand-500/10 hover:bg-brand-500/20 border border-brand-500/30 text-brand-400 text-xs font-semibold transition"
          >
            <span className="flex items-center gap-2">
              {isLocatingGPS ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <LocateFixed className="w-4 h-4" />
              )}
              <span>Usar mi ubicación GPS actual</span>
            </span>
            <Navigation className="w-3.5 h-3.5" />
          </button>

          {/* Search by Address / City */}
          <form onSubmit={handleSearch} className="space-y-2">
            <label className="text-xs font-semibold text-slate-300">
              O buscá una dirección, barrio o ciudad:
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Ej: Tolosa, Palermo, Ensenada, Calle 7 y 50..."
                  className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-100 placeholder-slate-400 focus:outline-none focus:border-brand-500/60"
                />
              </div>
              <button
                type="submit"
                disabled={isSearching || !query.trim()}
                className="px-4 py-2 rounded-xl gradient-bg text-white font-bold text-xs hover:opacity-95 transition disabled:opacity-40 flex items-center gap-1.5"
              >
                {isSearching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Buscar'}
              </button>
            </div>
          </form>

          {error && (
            <p className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/30 rounded-xl p-2.5">
              {error}
            </p>
          )}

          {/* Search results */}
          {results.length > 0 && (
            <div className="space-y-1.5 pt-1">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                Resultados encontrados ({results.length})
              </span>
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {results.map((r, i) => (
                  <button
                    key={i}
                    onClick={() =>
                      handleSelect(
                        parseFloat(r.lat),
                        parseFloat(r.lon),
                        r.display_name.split(',').slice(0, 2).join(', '),
                      )
                    }
                    className="w-full text-left p-2.5 rounded-xl bg-slate-900/60 hover:bg-slate-800/80 border border-slate-800 flex items-center justify-between text-xs text-slate-200 transition"
                  >
                    <span className="truncate pr-2">{r.display_name}</span>
                    <Check className="w-3.5 h-3.5 text-brand-400 shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Popular Zones */}
          <div className="space-y-2 pt-2 border-t border-slate-800">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
              Zonas Frecuentes
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {POPULAR_ZONES.map((zone) => {
                const isCurrent =
                  Math.abs(userLocation.latitude - zone.lat) < 0.01 &&
                  Math.abs(userLocation.longitude - zone.lng) < 0.01;
                return (
                  <button
                    key={zone.name}
                    onClick={() => handleSelect(zone.lat, zone.lng, zone.name)}
                    className={`p-2.5 rounded-xl text-left text-xs transition border flex items-center justify-between ${
                      isCurrent
                        ? 'bg-brand-500/15 border-brand-500/40 text-brand-300 font-bold'
                        : 'bg-slate-900/50 hover:bg-slate-800 border-slate-800 text-slate-300'
                    }`}
                  >
                    <span className="truncate">{zone.name}</span>
                    {isCurrent && <Check className="w-3.5 h-3.5 text-brand-400 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

