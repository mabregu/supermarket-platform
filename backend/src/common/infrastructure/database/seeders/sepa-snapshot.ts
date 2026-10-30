/**
 * SNAPSHOT DE PRECIOS OFICIALES — SEPA / "Precios Claros" (Secretaría de Comercio)
 *
 * Generado el 2026-10-21 desde la base oficial de precios por punto de venta.
 * Los valores NO son inventados: son los precios de lista observados en cada
 * sucursal en esa fecha.
 *
 * Para actualizarlo a los precios de hoy:
 *   npm run ingest:prices -- --lat=<tu lat> --lng=<tu lng> --radius=10
 *
 * Estructura de las claves de precios: EAN -> precio de lista en esa sucursal.
 */
export interface SnapshotProduct {
  eanCode: string;
  name: string;
  brand: string;
  presentation: string;
}

export interface SnapshotBranch {
  externalId: string;
  chain: string;
  branchName: string;
  address: string;
  city: string;
  latitude: number;
  longitude: number;
  prices: Record<string, number | { price: number; listPrice?: number }>;
}

export const SNAPSHOT_DATE = '2026-10-21';
export const SNAPSHOT_SOURCE = 'SEPA';

export const SNAPSHOT_PRODUCTS: SnapshotProduct[] = [
  {
    eanCode: '7792180001665',
    name: 'Aceite de Girasol Cañuelas 1.5 Lt',
    brand: 'CAÑUELAS',
    presentation: '1.5 lt',
  },
  {
    eanCode: '7790742192301',
    name: 'Casanto Leche Entera 3 Sachet Casanto 1 Lt',
    brand: 'CASANTO',
    presentation: '1.0 lt',
  },
  {
    eanCode: '7790895007217',
    name: 'Coca Cola 1.75 Lt',
    brand: 'COCA COLA',
    presentation: '1.75 lt',
  },
];

export const SNAPSHOT_BRANCHES: SnapshotBranch[] = [
  {
    externalId: '3-1-1736',
    chain: 'DEHEZA S.A.I.C.F. e I.',
    branchName: 'AUT BSAS-LA PLATA - A BS AS',
    address: 'AUTOPISTA LA PLATA - BS. AS MANO A CAPITAL FEDERAL 5700',
    city: 'Ensenada / La Plata',
    latitude: -34.86586,
    longitude: -58.003415,
    prices: {},
  },
  {
    externalId: '15-1-163',
    chain: 'Supermercados DIA',
    branchName: '163 - ENSENADA',
    address: 'CL BOSSIGNA 783',
    city: 'Ensenada / La Plata',
    latitude: -34.8571545,
    longitude: -57.9168134,
    prices: {
      '7792180001665': 6529,
      '7790742192301': 1940,
      '7790895007217': 5250,
    },
  },
  {
    externalId: '9-1-633',
    chain: 'Vea',
    branchName: 'La Plata SM 633',
    address: 'CALLE 525 1316',
    city: 'Ensenada / La Plata',
    latitude: -34.8955,
    longitude: -57.9801,
    prices: {
      '7792180001665': 6590,
      '7790742192301': 1785,
      '7790895007217': 4900,
    },
  },
  {
    externalId: '12-1-149',
    chain: 'COTO CICSA',
    branchName: 'LA PLATA',
    address: 'calle 43 782',
    city: 'Ensenada / La Plata',
    latitude: -34.9132587,
    longitude: -57.9601721,
    prices: {
      '7792180001665': 6990,
      '7790742192301': 1940,
      '7790895007217': 4900,
    },
  },
  {
    externalId: '2005-1-76',
    chain: 'Naldo',
    branchName: 'La Plata',
    address: 'Calle 47 630',
    city: 'Ensenada / La Plata',
    latitude: -34.9136105,
    longitude: -57.9528001,
    prices: {},
  },
  {
    externalId: '9-2-111',
    chain: 'Disco',
    branchName: 'City Bell.',
    address: 'Camino Gral Manuel Belgrano 167',
    city: 'Ensenada / La Plata',
    latitude: -34.8819,
    longitude: -58.0544,
    prices: {
      '7792180001665': 7200,
      '7790742192301': 2100,
      '7790895007217': 4900,
    },
  },
  {
    externalId: '15-1-454',
    chain: 'Supermercados DIA',
    branchName: '454 - PARQUE CHACABUCO',
    address: 'SARMIENTO 814 ( SAN NICOLAS) None',
    city: 'Buenos Aires',
    latitude: -34.6047958,
    longitude: -58.3783133,
    prices: {
      '7792180001665': 6529,
      '7790742192301': 1940,
      '7790895007217': 5250,
    },
  },
  {
    externalId: '2002-1-1',
    chain: 'Fravega',
    branchName: 'Microcentro',
    address: 'Corrientes 756',
    city: 'Buenos Aires',
    latitude: -34.6034701,
    longitude: -58.3774434,
    prices: {},
  },
  {
    externalId: '12-1-159',
    chain: 'COTO CICSA',
    branchName: 'MITRE',
    address: 'Bartolomé Mitre 1558',
    city: 'Buenos Aires',
    latitude: -34.6077047,
    longitude: -58.3879012,
    prices: {
      '7792180001665': 6990,
      '7790742192301': 1940,
      '7790895007217': 5250,
    },
  },
  {
    externalId: '9-2-2',
    chain: 'Disco',
    branchName: 'Talcahuano...',
    address: 'TALCAHUANO 1055',
    city: 'Buenos Aires',
    latitude: -34.5964,
    longitude: -58.3876,
    prices: {
      '7792180001665': 6900,
      '7790742192301': 2050,
      '7790895007217': 5250,
    },
  },
  {
    externalId: '9-3-5276',
    chain: 'Jumbo',
    branchName: 'Jumbo Arenales',
    address: 'ARENALES 870',
    city: 'Buenos Aires',
    latitude: -34.5941,
    longitude: -58.3791,
    prices: {
      '7792180001665': 7100,
      '7790895007217': 5250,
    },
  },
];
