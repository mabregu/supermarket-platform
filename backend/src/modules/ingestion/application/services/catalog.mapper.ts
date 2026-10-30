/**
 * Mapeo de datos de SEPA al modelo de catálogo de la plataforma.
 *
 * SEPA expone cada producto con:
 *   - `nombre`        -> "Aceite de Girasol Cañuelas 1.5 Lt"
 *   - `marca`         -> "CAÑUELAS"
 *   - `presentacion`  -> "1.5 lt"
 *   - `id` (EAN)      -> "7792180001665"
 *
 * De la presentación se deriva el contenido y la unidad, normalizando todo a
 * las unidades base que usa la plataforma (LITER, GRAM, KG, UNIT) para que el
 * `unitPrice` (precio por unidad de contenido) sea comparable entre productos.
 */

export interface Measurement {
  contentValue: number;
  measurementUnit: string;
}

/** Multiplicador a la unidad base por token de presentacion. */
const UNIT_MAP: Record<string, { unit: string; factor: number }> = {
  lt: { unit: 'LITER', factor: 1 },
  l: { unit: 'LITER', factor: 1 },
  litro: { unit: 'LITER', factor: 1 },
  litros: { unit: 'LITER', factor: 1 },
  ml: { unit: 'LITER', factor: 0.001 },
  cc: { unit: 'LITER', factor: 0.001 },
  cm3: { unit: 'LITER', factor: 0.001 },
  gr: { unit: 'GRAM', factor: 1 },
  g: { unit: 'GRAM', factor: 1 },
  kg: { unit: 'KG', factor: 1 },
  unidad: { unit: 'UNIT', factor: 1 },
  un: { unit: 'UNIT', factor: 1 },
  und: { unit: 'UNIT', factor: 1 },
  u: { unit: 'UNIT', factor: 1 },
};

const DEFAULT_MEASUREMENT: Measurement = { contentValue: 1, measurementUnit: 'UNIT' };

/**
 * Parsea una presentacion de SEPA ("1.5 lt", "500.0 cc", "2.25 lt") y la
 * normaliza a la unidad base. Si no se puede parsear, devuelve 1 UNIT.
 */
export function parsePresentation(presentation: string): Measurement {
  if (!presentation) return { ...DEFAULT_MEASUREMENT };

  const normalized = presentation.toLowerCase().replace(',', '.');
  const match = normalized.match(/([\d.]+)\s*([a-z0-9³]+)?/);
  if (!match) return { ...DEFAULT_MEASUREMENT };

  const value = Number.parseFloat(match[1]);
  if (!Number.isFinite(value) || value <= 0) return { ...DEFAULT_MEASUREMENT };

  const token = (match[2] || 'unidad').replace('³', '3');
  const mapping = UNIT_MAP[token] ?? UNIT_MAP[token.replace('3', '')];

  if (!mapping) return { contentValue: value, measurementUnit: 'UNIT' };

  const contentValue = Math.round(value * mapping.factor * 1000) / 1000;
  return { contentValue, measurementUnit: mapping.unit };
}

/** Precio por unidad de contenido. Para UNIT, es el mismo precio. */
export function computeUnitPrice(price: number, measurement: Measurement): number {
  if (!measurement || measurement.contentValue <= 0 || measurement.measurementUnit === 'UNIT') {
    return Math.round(price * 100) / 100;
  }
  return Math.round((price / measurement.contentValue) * 100) / 100;
}

export interface CategorySuggestion {
  name: string;
  slug: string;
}

/**
 * Infiere la categoria a partir del nombre del producto.
 * El orden importa: se evalúan de mas especifico a mas generico.
 */
const CATEGORY_RULES: Array<{ category: CategorySuggestion; patterns: RegExp[] }> = [
  {
    category: { name: 'Lácteos y Frescos', slug: 'lacteos-y-frescos' },
    patterns: [/leche/i, /yogurt/i, /queso/i, /manteca/i, /crema de leche/i, /huevo/i],
  },
  {
    category: { name: 'Bebidas', slug: 'bebidas' },
    patterns: [/gaseosa/i, /cola/i, /soda/i, /agua mineral/i, /jugo/i, /cerveza/i, /vino/i, /bebida/i],
  },
  {
    category: { name: 'Limpieza', slug: 'limpieza' },
    patterns: [/detergente/i, /lavandina/i, /jab[oó]n/i, /lej[ií]a/i, /suavizante/i, /limpieza/i, /desodorante/i],
  },
  {
    category: { name: 'Panadería', slug: 'panaderia' },
    patterns: [/pan\b/i, /galletita/i, /factura/i, /medialunas/i, /bizcocho/i],
  },
  {
    category: { name: 'Almacén', slug: 'almacen' },
    patterns: [
      /aceite/i,
      /arroz/i,
      /fideos/i,
      /harina/i,
      /az[uú]car/i,
      /sal\b/i,
      /cafe/i,
      /yerba/i,
      /gaseosa/i,
      /leche/i,
      /at[uú]n/i,
      /frijol/i,
      /lenteja/i,
      /pasta/i,
      /vinagre/i,
      /mayonesa/i,
    ],
  },
];

export function suggestCategory(productName: string): CategorySuggestion {
  for (const rule of CATEGORY_RULES) {
    if (rule.patterns.some((pattern) => pattern.test(productName))) {
      return rule.category;
    }
  }
  return { name: 'Almacén', slug: 'almacen' };
}
