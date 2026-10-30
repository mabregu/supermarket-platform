import { BadRequestException } from '@nestjs/common';
import { SubmitEvidenceUseCase } from './submit-evidence.use-case';
import { TrustScoreService } from '../services/trust-score.service';
import { ReceiptExtractor } from '../services/receipt-extractor';

function inMemoryRepo(seed: any[] = []) {
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
        if (Object.entries(where).every(([k, v]) => row[k] === v)) return row;
      }
      return null;
    }),
    __rows: rows,
  };

  for (const row of seed) repo.save(row);
  return repo;
}

const rowsOf = (repo: any): any[] => Array.from(repo.__rows.values());

describe('SubmitEvidenceUseCase', () => {
  const branch = { id: 'branch-1', branchName: '163 - ENSENADA', supermarket: { name: 'Supermercados DIA' } };
  const product = {
    id: 'prod-1',
    name: 'Aceite de Girasol Cañuelas 1.5 Lt',
    eanCode: '7792180001665',
    contentValue: 1.5,
    measurementUnit: 'LITER',
  };

  function build(
    options: {
      knownPrice?: number | null;
      extractedItems?: any[];
      branchRow?: any;
      productRow?: any;
    } = {},
  ) {
    const extractor: ReceiptExtractor = {
      name: 'provided',
      isAvailable: () => true,
      extract: jest.fn(async () => ({
        items: options.extractedItems ?? [],
        extractor: 'provided',
      })),
    } as any;

    const branchProductRow =
      options.knownPrice === null || options.knownPrice === undefined
        ? null
        : {
            id: 'bp-1',
            branchId: branch.id,
            productId: product.id,
            currentPrice: options.knownPrice,
            listPrice: null,
            unitPrice: 1,
            trustScore: 100,
          };

    const repos = {
      report: inMemoryRepo(),
      reputation: inMemoryRepo(),
      branch: inMemoryRepo([options.branchRow ?? branch]),
      product: inMemoryRepo([options.productRow ?? product]),
      branchProduct: inMemoryRepo(branchProductRow ? [branchProductRow] : []),
      history: inMemoryRepo(),
    };

    const useCase = new SubmitEvidenceUseCase(
      new TrustScoreService(),
      extractor,
      repos.report,
      repos.reputation,
      repos.branch,
      repos.product,
      repos.branchProduct,
      repos.history,
    );

    return { useCase, extractor, repos };
  }

  const dto = {
    branchId: branch.id,
    reporterId: 'device-abc',
    productId: product.id,
    reportedPrice: 6400,
    imageBase64: 'data:image/png;base64,AAAA',
  };

  it('aprueba un reporte coherente y actualiza el precio de la sucursal', async () => {
    const { useCase, repos } = build({ knownPrice: 6529 });

    const result = await useCase.execute(dto);

    expect(result.status).toBe('APPROVED');
    expect(result.trustScore).toBeGreaterThanOrEqual(85);
    expect(result.priceChanged).toBe(true);
    expect(result.currentPrice).toBe(6400);
    expect(result.previousPrice).toBe(6529);

    const price = rowsOf(repos.branchProduct)[0];
    expect(price.currentPrice).toBe(6400);
  });

  it('escribe en el historial con origen USER_TICKET', async () => {
    const { useCase, repos } = build({ knownPrice: 6529 });

    await useCase.execute(dto);

    const history = rowsOf(repos.history);
    expect(history).toHaveLength(1);
    expect(history[0].source).toBe('USER_TICKET');
    expect(history[0].price).toBe(6400);
    expect(history[0].sourceDate).toBeInstanceOf(Date);
  });

  it('acumula reputacion del reportante', async () => {
    const { useCase, repos } = build({ knownPrice: 6529 });

    const result = await useCase.execute(dto);

    const reputation = rowsOf(repos.reputation)[0];
    expect(reputation.acceptedCount).toBe(1);
    expect(reputation.reportsCount).toBe(1);
    expect(reputation.points).toBe(result.pointsAwarded);
  });

  it('rechaza un reporte sin imagen y con precio absurdo', async () => {
    const { useCase, repos } = build({ knownPrice: 6529 });

    const result = await useCase.execute({ ...dto, imageBase64: undefined, reportedPrice: 60000 });

    expect(result.status).toBe('REJECTED');
    // El precio de la sucursal no se toca
    expect(rowsOf(repos.branchProduct)[0].currentPrice).toBe(6529);
    expect(rowsOf(repos.history)).toHaveLength(0);
  });

  it('deja en revision un producto que la sucursal no tenia (sin precio de referencia)', async () => {
    const { useCase, repos } = build({ knownPrice: null });

    const result = await useCase.execute(dto);

    // Sin precio previo no hay contra que comparar: el reporte queda en revision.
    expect(result.status).toBe('PENDING');
    expect(rowsOf(repos.branchProduct)).toHaveLength(0);
    // El reporte si se guarda, para que pueda revisarse.
    expect(rowsOf(repos.report)).toHaveLength(1);
  });

  it('corrobora con el ticket cuando el item coincide con EAN y precio', async () => {
    const { useCase } = build({
      knownPrice: 6529,
      extractedItems: [{ eanCode: '7792180001665', name: 'Aceite Girasol', price: 6400 }],
    });

    const result = await useCase.execute(dto);

    const corroboracion = result.factors.find((f) => f.factor === 'CORROBORACION');
    expect(corroboracion?.points).toBe(15);
  });

  it('rechaza si la sucursal no existe', async () => {
    const { useCase } = build({ branchRow: null });

    await expect(useCase.execute({ ...dto, branchId: 'no-existe' })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rechaza si no se puede identificar el producto', async () => {
    const { useCase } = build({ productRow: null });

    await expect(useCase.execute({ ...dto, productId: undefined, eanCode: undefined })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});
