import { BadRequestException } from '@nestjs/common';
import { OptimizeCartUseCase } from './optimize-cart.use-case';

function createQueryBuilderMock(rawRows: any[]) {
  const qb: any = {
    innerJoinAndSelect: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    setParameters: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    getRawMany: jest.fn().mockResolvedValue(rawRows),
  };
  return qb;
}

const priceRow = (
  productId: string,
  branchId: string,
  supermarketName: string,
  currentPrice: number,
  distanceMeters = 1000,
) => ({
  productId,
  productName: `Product ${productId}`,
  currentPrice: String(currentPrice),
  branchId,
  branchName: `${supermarketName} branch`,
  address: 'Some address',
  supermarketName,
  distanceMeters: String(distanceMeters),
});

describe('OptimizeCartUseCase', () => {
  it('calcula la mejor opción mono-tienda y la ruta split con ahorro', async () => {
    const rows = [
      priceRow('p1', 'b1', 'Store B1', 10),
      priceRow('p2', 'b1', 'Store B1', 20),
      priceRow('p3', 'b1', 'Store B1', 30),
      priceRow('p1', 'b2', 'Store B2', 8),
      priceRow('p2', 'b2', 'Store B2', 25),
      priceRow('p3', 'b3', 'Store B3', 5),
    ];
    const repo: any = { createQueryBuilder: jest.fn(() => createQueryBuilderMock(rows)) };
    const useCase = new OptimizeCartUseCase(repo);

    const result = await useCase.execute({
      latitude: -34.6,
      longitude: -58.38,
      items: [
        { productId: 'p1', quantity: 1 },
        { productId: 'p2', quantity: 1 },
        { productId: 'p3', quantity: 1 },
      ],
    });

    // Solo b1 tiene los 3 productos => única opción mono-tienda válida
    expect(result.singleStoreOption).not.toBeNull();
    expect(result.singleStoreOption!.branchId).toBe('b1');
    expect(result.singleStoreOption!.totalCost).toBe(60);

    // Split: p1 desde b2 (8), p2 desde b1 (20), p3 desde b3 (5) => 33
    expect(result.splitStoresEnabled).toBe(true);
    expect(result.optimizedSplitOption.totalCost).toBe(33);
    expect(result.optimizedSplitOption.totalSavings).toBe(27);
    expect(result.optimizedSplitOption.suggestedRoute).toHaveLength(3);
  });

  it('cuando allowSplitStores=false usa una sola sucursal', async () => {
    const rows = [
      priceRow('p1', 'b1', 'Store B1', 10),
      priceRow('p2', 'b1', 'Store B1', 20),
      priceRow('p1', 'b2', 'Store B2', 5),
    ];
    const repo: any = { createQueryBuilder: jest.fn(() => createQueryBuilderMock(rows)) };
    const useCase = new OptimizeCartUseCase(repo);

    const result = await useCase.execute({
      latitude: -34.6,
      longitude: -58.38,
      allowSplitStores: false,
      items: [
        { productId: 'p1', quantity: 1 },
        { productId: 'p2', quantity: 1 },
      ],
    });

    expect(result.splitStoresEnabled).toBe(false);
    expect(result.optimizedSplitOption.totalCost).toBe(30);
    expect(result.optimizedSplitOption.totalSavings).toBe(0);
    expect(result.optimizedSplitOption.suggestedRoute).toHaveLength(1);
  });

  it('lanza BadRequest si allowSplitStores=false y ninguna sucursal tiene todo', async () => {
    const rows = [priceRow('p1', 'b1', 'Store B1', 10), priceRow('p2', 'b2', 'Store B2', 20)];
    const repo: any = { createQueryBuilder: jest.fn(() => createQueryBuilderMock(rows)) };
    const useCase = new OptimizeCartUseCase(repo);

    await expect(
      useCase.execute({
        latitude: -34.6,
        longitude: -58.38,
        allowSplitStores: false,
        items: [
          { productId: 'p1', quantity: 1 },
          { productId: 'p2', quantity: 1 },
        ],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('lanza BadRequest si la lista de items está vacía', async () => {
    const repo: any = { createQueryBuilder: jest.fn() };
    const useCase = new OptimizeCartUseCase(repo);

    await expect(useCase.execute({ latitude: -34.6, longitude: -58.38, items: [] })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});
