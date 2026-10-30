/**
 * Geolocalización real del navegador.
 *
 * Antes la app usaba siempre unas coordenadas fijas (Obelisco, CABA), lo que
 * hacía que las sucursales Cercanas fueran incorrectas para cualquier usuario
 * fuera de esa zona. Acá se pide la posición real al navegador y se resuelve
 * la dirección legible con OpenStreetMap (Nominatim).
 */

export interface GeoPosition {
  latitude: number;
  longitude: number;
  accuracy?: number;
}

export type GeoErrorCode = 'PERMISSION_DENIED' | 'POSITION_UNAVAILABLE' | 'TIMEOUT' | 'UNSUPPORTED';

export class GeoError extends Error {
  constructor(
    public readonly code: GeoErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'GeoError';
  }
}

export function isGeolocationSupported(): boolean {
  return typeof window !== 'undefined' && 'geolocation' in navigator;
}

/** Pide la posición actual al navegador. Rechaza con `GeoError` si no se puede. */
export function getCurrentPosition(timeout = 10000): Promise<GeoPosition> {
  return new Promise((resolve, reject) => {
    if (!isGeolocationSupported()) {
      reject(new GeoError('UNSUPPORTED', 'Este navegador no soporta geolocalización.'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) =>
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        }),
      (error) => {
        switch (error.code) {
          case error.PERMISSION_DENIED:
            reject(new GeoError('PERMISSION_DENIED', 'Permiso de ubicación denegado.'));
            break;
          case error.TIMEOUT:
            reject(new GeoError('TIMEOUT', 'La solicitud de ubicación tardó demasiado.'));
            break;
          default:
            reject(new GeoError('POSITION_UNAVAILABLE', 'No se pudo determinar tu ubicación.'));
        }
      },
      { enableHighAccuracy: true, timeout, maximumAge: 60000 },
    );
  });
}

/**
 * Convierte coordenadas en una etiqueta legible ("Barrio, Localidad").
 * Si el servicio no responde, devuelve un fallback con las coordenadas.
 */
export async function reverseGeocode(latitude: number, longitude: number): Promise<string> {
  const fallback = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;

  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=16&addressdetails=1&lat=${latitude}&lon=${longitude}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    clearTimeout(timeout);

    if (!response.ok) return fallback;

    const data = await response.json();
    const address = data?.address ?? {};

    // "Punta Lara, Ensenada" (más legible que "Punta Lara, Partido de Ensenada")
    const cleanMunicipality = (value?: string) =>
      value ? value.replace(/^(Partido|Municipio|Comuna|Departamento)\s+de\s+/i, '') : undefined;

    const zone = address.neighbourhood || address.suburb || address.quarter;
    const locality = address.city || address.town || address.village;
    const municipality = cleanMunicipality(address.municipality || address.county || address.state_district);

    const parts: string[] = [];
    if (zone) parts.push(zone);
    if (locality) parts.push(locality);
    if (municipality && !parts.includes(municipality)) parts.push(municipality);

    if (parts.length > 0) {
      return Array.from(new Set(parts)).join(', ');
    }

    return data?.display_name ? String(data.display_name).split(',').slice(0, 2).join(',').trim() : fallback;
  } catch {
    return fallback;
  }
}
