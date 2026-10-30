import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Cliente de la base oficial de precios SEPA / "Precios Claros"
 * (Secretaría de Industria y Comercio - Defensa del Consumidor).
 *
 * Los endpoints de lectura son públicos y requieren solo un User-Agent identificable.
 * La alternativa oficial para cargas masivas es el open data diario:
 * https://datos.gob.ar/dataset/precios-claros-base-sepa
 *
 * Endpoints usados:
 *  - prod/sucursales?lat&lng&limit      -> sucursales cercanas (con id, cadena, coords)
 *  - prod/productos?id_sucursal&offset&limit -> catalogo y precios de UNA sucursal
 */

export interface SepaBranch {
  /** id con formato "<comercio>-<bandera>-<sucursal>", ej. "15-1-163" */
  id: string;
  chain: string;
  commerce: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  type: string;
}

export interface SepaProduct {
  ean: string;
  name: string;
  brand: string;
  presentation: string;
  priceMin: number;
  priceMax: number;
  availableStores: number;
}

interface SepaProductsResponse {
  status: number;
  total: number;
  productos: Array<{
    id: string;
    nombre: string;
    marca: string;
    presentacion: string;
    precioMin: number;
    precioMax: number;
    cantSucursalesDisponible: number;
  }>;
}

interface SepaBranchesResponse {
  status: number;
  total: number;
  sucursales: Array<{
    id: string;
    banderaDescripcion: string;
    comercioRazonSocial: string;
    sucursalNombre: string;
    direccion: string;
    lat: string;
    lng: string;
    sucursalTipo: string;
  }>;
}

@Injectable()
export class SepaApiClient {
  private readonly logger = new Logger(SepaApiClient.name);
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly userAgent: string;

  constructor(configService?: ConfigService) {
    this.baseUrl = (
      configService?.get<string>('SEPA_BASE_URL') ?? 'https://d3e6htiiul5ek9.cloudfront.net/prod'
    ).replace(/\/+$/, '');
    this.timeoutMs = configService?.get<number>('SEPA_TIMEOUT_MS') ?? 20000;
    this.userAgent =
      configService?.get<string>('SEPA_USER_AGENT') ?? 'PreciosSmart/1.0 (+https://localhost) prices-intelligence-demo';
  }

  /** Sucursales ordenadas por cercanía a las coordenadas indicadas. */
  async listNearbyBranches(latitude: number, longitude: number, limit = 50): Promise<SepaBranch[]> {
    const data = await this.request<SepaBranchesResponse>('sucursales', {
      lat: latitude,
      lng: longitude,
      limit: Math.min(limit, 100),
    });

    return (data.sucursales || []).map((s) => ({
      id: s.id,
      chain: (s.banderaDescripcion || '').trim(),
      commerce: (s.comercioRazonSocial || '').trim(),
      name: (s.sucursalNombre || '').trim(),
      address: (s.direccion || '').trim(),
      latitude: Number(s.lat),
      longitude: Number(s.lng),
      type: s.sucursalTipo || '',
    }));
  }

  /**
   * Catalogo de una sucursal con los precios observados en ella.
   * Pagina internamente hasta `maxProducts` (o hasta el final del catalogo).
   */
  async listBranchProducts(sepaBranchId: string, maxProducts = 400): Promise<SepaProduct[]> {
    const pageSize = 100;
    const collected: SepaProduct[] = [];
    let offset = 0;
    let total = Infinity;

    while (offset < total && collected.length < maxProducts) {
      const data = await this.request<SepaProductsResponse>('productos', {
        id_sucursal: sepaBranchId,
        offset,
        limit: pageSize,
      });

      total = data.total || 0;
      const page = data.productos || [];

      for (const p of page) {
        collected.push({
          ean: p.id,
          name: (p.nombre || '').trim(),
          brand: (p.marca || '').trim(),
          presentation: (p.presentacion || '').trim(),
          priceMin: Number(p.precioMin),
          priceMax: Number(p.precioMax),
          availableStores: Number(p.cantSucursalesDisponible || 0),
        });
      }

      offset += pageSize;
      if (page.length === 0) break;
    }

    return collected.slice(0, maxProducts);
  }

  private async request<T>(path: string, params: Record<string, string | number>): Promise<T> {
    const url = new URL(`${this.baseUrl}/${path}`);
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, String(value));
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          Accept: 'application/json',
          'User-Agent': this.userAgent,
        },
      });

      if (!response.ok) {
        throw new Error(`SEPA ${path} respondió HTTP ${response.status}`);
      }

      const payload = (await response.json()) as T & {
        errorDescription?: string;
        errorCode?: number;
      };

      // La API oficial puede devolver HTTP 200 con un error adentro (fallo
      // transitorio de su base). Si no lo detectamos, el payload llega vacio y
      // el proceso parece "no encontro nada".
      if (payload && (payload.errorDescription || payload.errorCode)) {
        throw new Error(`SEPA ${path} devolvio un error interno: ${payload.errorDescription ?? 'desconocido'}`);
      }

      return payload;
    } catch (error) {
      this.logger.error(`Error consultando SEPA ${path}: ${(error as Error).message}`);
      throw error;
    } finally {
      clearTimeout(timer);
    }
  }
}
