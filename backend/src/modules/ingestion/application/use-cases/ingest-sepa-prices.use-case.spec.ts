import { IngestSepaPricesUseCase } from './ingest-sepa-prices.use-case';
import { SepaBranch, SepaProduct } from '../services/sepa-api.client';

/**
 * Repositorio en memoria con la misma superficie que usa el caso de uso.
 */
function inMemoryRepo<T extends { id: string }>(seed: Partial<T>[] = []) {
  const rows = new Map<string, any>();
  let seq = 0;

  const repo: any = {
    create: (data: any) => ({ ...data }),
    save: jest.fn(async (entity: any) => {
      const id = entity.id || `id-${++seq}`;
      const stored = { ...entity, id };
      rows.set(id, stored);
      return stored;
    }),
    findOne: jest.fn(async ({ where }: { where: Record<string, unknown> }) => {
      for (const row of rows.values()) {
        const matches = Object.entries(where).every(([key, value]) => row[key] === value);
        if (matches) return row;
      }
      return null;
    }),
    __rows: rows,
  };

  for (const row of seed) {
    repo.save(row);
  }

  return repo;
}

/** Filas guardadas en el repositorio en memoria. */
const rowsOf = (repo: any): any[] => Array.from(repo.__rows.values());

const branch = (over: Partial<SepaBranch> = {}): SepaBranch => ({
  id: '15-1-163',
  chain: 'Supermercados DIA',
  commerce: 'Supermercados DIA',
  name: '163 - ENSENADA',
  address: 'Uruguay 123',
  latitude: -34.857,
  longitude: -57.916,
  type: 'Autoservicio',
  ...over,
});

const product = (over: Partial<SepaProduct> = {}): SepaProduct => ({
  ean: '7792180001665',
  name: 'Aceite de Girasol Cañuelas 1.5 Lt',
  brand: 'CAÑUELAS',
  presentation: '1.5 lt',
  priceMin: 6529,
  priceMax: 6529,
  availableStores: 3,
  ...over,
});

function buildUseCase(products: SepaProduct[], branches: SepaBranch[] = [branch()]) {
  const sepaClient: any = {
    listNearbyBranches: jest.fn(async () => branches),
    listBranchProducts: jest.fn(async () => products),
  };

  const repos = {
    branch: inMemoryRepo(),
    supermarket: inMemoryRepo(),
    product: inMemoryRepo(),
    brand: inMemoryRepo(),
    category: inMemoryRepo(),
    branchProduct: inMemoryRepo(),
    priceHistory: inMemoryRepo(),
  };

  const useCase = new IngestSepaPricesUseCase(
    sepaClient,
    repos.branch,
    repos.supermarket,
    repos.product,
    repos.brand,
    repos.category,
    repos.branchProduct,
    repos.priceHistory,
  );

  return { useCase, sepaClient, repos };
}

const OPTIONS = {
  latitude: -34.8207,
  longitude: -57.9675,
  radiusKm: 10,
  maxBranches: 5,
  maxProductsPerBranch: 100,
  delayMs: 0,
};

describe('IngestSepaPricesUseCase', () => {
  it('crea la sucursal con su externalId y sus coordenadas reales', async () => {
    const { useCase, repos } = buildUseCase([product()]);

    const result = await useCase.execute(OPTIONS);

    expect(result.branchesCreated).toBe(1);
    expect(result.supermarketsCreated).toBe(1);

    const savedBranch = rowsOf(repos.branch)[0];
    expect(savedBranch.externalId).toBe('15-1-163');
    expect(savedBranch.location.coordinates).toEqual([-57.916, -34.857]);
  });

  it('crea el producto con EAN real y contenido normalizado', async () => {
    const { useCase, repos } = buildUseCase([product()]);

    await useCase.execute(OPTIONS);

    const savedProduct = rowsOf(repos.product)[0];
    expect(savedProduct.eanCode).toBe('7792180001665');
    expect(savedProduct.contentValue).toBe(1.5);
    expect(savedProduct.measurementUnit).toBe('LITER');
    expect(savedProduct.imageUrl).toBeNull();

    const savedBrand = rowsOf(repos.brand)[0];
    expect(savedBrand.name).toBe('CAÑUELAS');

    const savedCategory = rowsOf(repos.category)[0];
    expect(savedCategory.slug).toBe('almacen');
  });

  it('guarda el precio real y calcula el unitPrice', async () => {
    const { useCase, repos } = buildUseCase([product()]);

    await useCase.execute(OPTIONS);

    const price = rowsOf(repos.branchProduct)[0];
    expect(price.currentPrice).toBe(6529);
    expect(price.unitPrice).toBe(4352.67);
    expect(price.trustScore).toBe(100);
  });

  it('es idempotente: no duplica ni escribe historial si el precio no cambia', async () => {
    const { useCase, repos } = buildUseCase([product()]);

    await useCase.execute(OPTIONS);
    const first = await useCase.execute(OPTIONS);

    expect(first.branchesCreated).toBe(0);
    expect(first.productsCreated).toBe(0);
    expect(first.pricesUpserted).toBe(0);
    expect(first.priceChanges).toBe(0);
    expect(repos.branchProduct.__rows.size).toBe(1);
    expect(repos.priceHistory.__rows.size).toBe(1);
  });

  it('escribe historial cuando el precio cambia', async () => {
    const { useCase, repos, sepaClient } = buildUseCase([product()]);
    await useCase.execute(OPTIONS);

    // Segunda corrida con el precio actualizado
    sepaClient.listBranchProducts.mockResolvedValue([product({ priceMin: 5999 })]);

    const second = await useCase.execute(OPTIONS);

    expect(second.priceChanges).toBe(1);
    expect(repos.priceHistory.__rows.size).toBe(2);
  });

  it('descarta sucursales fuera del radio', async () => {
    const lejos = branch({ id: '9-9-9', latitude: -34.9, longitude: -57.9 });
    const { useCase, repos } = buildUseCase([product()], [lejos]);

    const result = await useCase.execute(OPTIONS);

    expect(result.branchesFound).toBe(1);
    expect(result.branchesProcessed).toBe(0);
    expect(repos.branch.__rows.size).toBe(0);
  });

  it('ignora productos con precio invalido', async () => {
    const { useCase, repos } = buildUseCase([product({ priceMin: 0 })]);

    await useCase.execute(OPTIONS);

    expect(repos.branchProduct.__rows.size).toBe(0);
  });
});
