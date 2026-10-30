import { SearchProductsWithPricesUseCase } from './search-products-with-prices.use-case';

function productQbMock(products: any[]) {
  return {
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn().mockResolvedValue([products, products.length]),
  };
}

function priceQbMock(rows: any[]) {
  return {
    innerJoinAndSelect: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    setParameters: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    getRawMany: jest.fn().mockResolvedValue(rows),
  };
}

describe('SearchProductsWithPricesUseCase', () => {
  it('resuelve todos los precios en UNA sola query (sin N+1)', async () => {
    const products = [
      {
        id: 'p1',
        name: 'Leche',
        brand: { name: 'B1' },
        category: { name: 'C1' },
        eanCode: '1',
        imageUrl: '',
        measurementUnit: 'LITER',
        contentValue: '1.000',
      },
      {
        id: 'p2',
        name: 'Aceite',
        brand: { name: 'B2' },
        category: { name: 'C2' },
        eanCode: '2',
        imageUrl: '',
        measurementUnit: 'LITER',
        contentValue: '1.500',
      },
      {
        id: 'p3',
        name: 'Coca',
        brand: { name: 'B3' },
        category: { name: 'C2' },
        eanCode: '3',
        imageUrl: '',
        measurementUnit: 'LITER',
        contentValue: '2.250',
      },
    ];

    const priceRows = [
      {
        productId: 'p1',
        currentPrice: '100',
        unitPrice: '100',
        lastUpdatedAt: 'x',
        branchId: 'b1',
        branchName: 'br1',
        address: 'a',
        supermarketName: 'S1',
        distanceMeters: '1000',
      },
      {
        productId: 'p1',
        currentPrice: '120',
        unitPrice: '120',
        lastUpdatedAt: 'x',
        branchId: 'b2',
        branchName: 'br2',
        address: 'a',
        supermarketName: 'S2',
        distanceMeters: '2000',
      },
      {
        productId: 'p2',
        currentPrice: '200',
        unitPrice: '133',
        lastUpdatedAt: 'x',
        branchId: 'b1',
        branchName: 'br1',
        address: 'a',
        supermarketName: 'S1',
        distanceMeters: '1000',
      },
      {
        productId: 'p3',
        currentPrice: '300',
        unitPrice: '133',
        lastUpdatedAt: 'x',
        branchId: 'b2',
        branchName: 'br2',
        address: 'a',
        supermarketName: 'S2',
        distanceMeters: '2000',
      },
    ];

    const productRepo: any = { createQueryBuilder: jest.fn(() => productQbMock(products)) };
    const branchProductRepo: any = { createQueryBuilder: jest.fn(() => priceQbMock(priceRows)) };

    const useCase = new SearchProductsWithPricesUseCase(productRepo, branchProductRepo);
    const { products: results, total } = await useCase.execute({ q: '' });

    // Clave: una sola llamada al query builder de precios, sin importar cuántos productos haya.
    expect(branchProductRepo.createQueryBuilder).toHaveBeenCalledTimes(1);
    expect(total).toBe(3);
    expect(results).toHaveLength(3);

    const leche = results.find((r) => r.productId === 'p1')!;
    expect(leche.storePricesCount).toBe(2);
    expect(leche.bestDeal!.price).toBe(100); // ya vienen ordenados por precio asc
    expect(leche.priceRange.min).toBe(100);
    expect(leche.priceRange.max).toBe(120);
  });

  it('marca bestDeal en null cuando no hay precios en el radio', async () => {
    const products = [
      {
        id: 'p1',
        name: 'Leche',
        brand: null,
        category: null,
        eanCode: '1',
        imageUrl: '',
        measurementUnit: 'LITER',
        contentValue: '1',
      },
    ];
    const productRepo: any = { createQueryBuilder: jest.fn(() => productQbMock(products)) };
    const branchProductRepo: any = { createQueryBuilder: jest.fn(() => priceQbMock([])) };

    const useCase = new SearchProductsWithPricesUseCase(productRepo, branchProductRepo);
    const { products: results } = await useCase.execute({ q: 'leche' });

    expect(results[0].bestDeal).toBeNull();
    expect(results[0].storePricesCount).toBe(0);
    expect(results[0].brand).toBe('Desconocida');
    expect(results[0].category).toBe('Sin Categoría');
  });

  it('acepta búsqueda solo por categoría (q opcional) sin romper el query', async () => {
    const products = [
      {
        id: 'p1',
        name: 'Aceite',
        brand: { name: 'Natura' },
        category: { name: 'Almacén' },
        eanCode: '2',
        imageUrl: '',
        measurementUnit: 'LITER',
        contentValue: '1.500',
      },
    ];
    const productRepo: any = { createQueryBuilder: jest.fn(() => productQbMock(products)) };
    const branchProductRepo: any = { createQueryBuilder: jest.fn(() => priceQbMock([])) };

    const useCase = new SearchProductsWithPricesUseCase(productRepo, branchProductRepo);
    const { products: results, total } = await useCase.execute({ q: '', category: 'Almacén' });

    expect(total).toBe(1);
    expect(results[0].category).toBe('Almacén');
  });
});
