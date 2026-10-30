import { computeUnitPrice, parsePresentation, suggestCategory } from './catalog.mapper';

describe('catalog.mapper', () => {
  describe('parsePresentation', () => {
    it('normaliza litros', () => {
      expect(parsePresentation('1.5 lt')).toEqual({ contentValue: 1.5, measurementUnit: 'LITER' });
      expect(parsePresentation('2.25 lt')).toEqual({ contentValue: 2.25, measurementUnit: 'LITER' });
    });

    it('normaliza cc y ml a litros', () => {
      expect(parsePresentation('500.0 cc')).toEqual({ contentValue: 0.5, measurementUnit: 'LITER' });
      expect(parsePresentation('1.5 Lt'.toLowerCase())).toEqual({ contentValue: 1.5, measurementUnit: 'LITER' });
    });

    it('normaliza gramos y kilos', () => {
      expect(parsePresentation('200.0 gr')).toEqual({ contentValue: 200, measurementUnit: 'GRAM' });
      expect(parsePresentation('1.0 kg')).toEqual({ contentValue: 1, measurementUnit: 'KG' });
    });

    it('deja unidades tal cual', () => {
      expect(parsePresentation('1.0 unidad')).toEqual({ contentValue: 1, measurementUnit: 'UNIT' });
    });

    it('devuelve el default si la presentacion es inservible', () => {
      expect(parsePresentation('')).toEqual({ contentValue: 1, measurementUnit: 'UNIT' });
      expect(parsePresentation('sin datos')).toEqual({ contentValue: 1, measurementUnit: 'UNIT' });
    });

    it('acepta coma decimal', () => {
      expect(parsePresentation('1,5 lt')).toEqual({ contentValue: 1.5, measurementUnit: 'LITER' });
    });
  });

  describe('computeUnitPrice', () => {
    it('divide por el contenido', () => {
      expect(computeUnitPrice(6529, { contentValue: 1.5, measurementUnit: 'LITER' })).toBe(4352.67);
    });

    it('para UNIT devuelve el mismo precio', () => {
      expect(computeUnitPrice(1234.56, { contentValue: 1, measurementUnit: 'UNIT' })).toBe(1234.56);
    });
  });

  describe('suggestCategory', () => {
    it('clasifica lacteos', () => {
      expect(suggestCategory('Casanto Leche Entera 3 Sachet Casanto 1 Lt').slug).toBe('lacteos-y-frescos');
    });

    it('clasifica bebidas antes que almacen', () => {
      expect(suggestCategory('Coca Cola 1.75 Lt').slug).toBe('bebidas');
    });

    it('clasifica almacen', () => {
      expect(suggestCategory('Aceite de Girasol Cañuelas 1.5 Lt').slug).toBe('almacen');
    });

    it('clasifica limpieza', () => {
      expect(suggestCategory('Detergente Liquido 750 Cc').slug).toBe('limpieza');
    });

    it('cae en almacen por defecto', () => {
      expect(suggestCategory('Producto Desconocido XYZ').slug).toBe('almacen');
    });
  });
});
