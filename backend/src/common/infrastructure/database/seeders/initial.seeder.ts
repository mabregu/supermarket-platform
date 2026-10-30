import 'reflect-metadata';
import { config } from 'dotenv';
import { DataSource, Repository } from 'typeorm';
import { SupermarketEntity } from '../../../../modules/stores/infrastructure/persistence/entities/supermarket.entity';
import { StoreBranchEntity } from '../../../../modules/stores/infrastructure/persistence/entities/store-branch.entity';
import { CategoryEntity } from '../../../../modules/catalog/infrastructure/persistence/entities/category.entity';
import { BrandEntity } from '../../../../modules/catalog/infrastructure/persistence/entities/brand.entity';
import { ProductEntity } from '../../../../modules/catalog/infrastructure/persistence/entities/product.entity';
import { BranchProductEntity } from '../../../../modules/pricing/infrastructure/persistence/entities/branch-product.entity';
import { PriceHistoryEntity } from '../../../../modules/pricing/infrastructure/persistence/entities/price-history.entity';
import {
  computeUnitPrice,
  parsePresentation,
  suggestCategory,
} from '../../../../modules/ingestion/application/services/catalog.mapper';
import { SNAPSHOT_BRANCHES, SNAPSHOT_DATE, SNAPSHOT_PRODUCTS, SNAPSHOT_SOURCE } from './sepa-snapshot';
import { resolvePostgresConfig } from '../../../../common/infrastructure/database/db-config';

config();

/**
 * Seeder inicial ejecutable de forma standalone (NO en el bootstrap de la app).
 *
 * Uso:  npm run seed
 *
 * Los precios NO son inventados: provienen de un snapshot de la base oficial
 * SEPA / "Precios Claros" (Secretaría de Comercio) con los precios de lista
 * observados porsucursal. Ver `sepa-snapshot.ts`.
 *
 * Para traer los precios de HOY de cualquier zona:
 *   npm run ingest:prices -- --lat=<tu lat> --lng=<tu lng> --radius=10
 *
 * Es IDEMPOTENTE POR ENTIDAD: cada supermercado, sucursal, producto y precio se
 * busca antes de insertarse, asi que se puede volver a ejecutar sin duplicar.
 */

const round2 = (n: number) => Math.round(n * 100) / 100;

async function upsertBy<T extends { id: string }>(
  repo: Repository<any>,
  where: Record<string, unknown>,
  data: Record<string, unknown>,
): Promise<T> {
  const existing = (await repo.findOne({ where })) as T | null;
  if (existing) {
    return existing;
  }
  return (await repo.save(repo.create(data))) as T;
}

async function run() {
  const dataSource = new DataSource({
    type: 'postgres',
    ...resolvePostgresConfig(process.env as Record<string, string | undefined>),
    entities: [
      SupermarketEntity,
      StoreBranchEntity,
      CategoryEntity,
      BrandEntity,
      ProductEntity,
      BranchProductEntity,
      PriceHistoryEntity,
    ],
    synchronize: true,
  });

  await dataSource.initialize();
  console.log(`🌱 Conectado a la base de datos. Seed con snapshot SEPA del ${SNAPSHOT_DATE}...`);

  const supermarketRepo = dataSource.getRepository(SupermarketEntity);
  const branchRepo = dataSource.getRepository(StoreBranchEntity);
  const categoryRepo = dataSource.getRepository(CategoryEntity);
  const brandRepo = dataSource.getRepository(BrandEntity);
  const productRepo = dataSource.getRepository(ProductEntity);
  const branchProductRepo = dataSource.getRepository(BranchProductEntity);
  const priceHistoryRepo = dataSource.getRepository(PriceHistoryEntity);

  let branchesCreated = 0;
  let pricesCreated = 0;

  // 1) Categorias (se crean todas las base + las inferidas de los productos)
  const baseCategories = [
    { name: 'Lácteos y Frescos', slug: 'lacteos-y-frescos' },
    { name: 'Almacén', slug: 'almacen' },
    { name: 'Bebidas', slug: 'bebidas' },
    { name: 'Limpieza', slug: 'limpieza' },
  ];
  const categoryIds = new Map<string, string>();
  for (const category of baseCategories) {
    const saved = await upsertBy<CategoryEntity>(
      categoryRepo,
      { slug: category.slug },
      { name: category.name, slug: category.slug },
    );
    categoryIds.set(category.slug, saved.id);
  }

  // 2) Marcas + Productos (EAN reales de SEPA)
  const productIds = new Map<string, string>();
  for (const product of SNAPSHOT_PRODUCTS) {
    const brand = await upsertBy<BrandEntity>(brandRepo, { name: product.brand }, { name: product.brand });

    const suggestion = suggestCategory(product.name);
    if (!categoryIds.has(suggestion.slug)) {
      const category = await upsertBy<CategoryEntity>(
        categoryRepo,
        { slug: suggestion.slug },
        { name: suggestion.name, slug: suggestion.slug },
      );
      categoryIds.set(suggestion.slug, category.id);
    }

    const measurement = parsePresentation(product.presentation);

    const saved = await upsertBy<ProductEntity>(
      productRepo,
      { eanCode: product.eanCode },
      {
        categoryId: categoryIds.get(suggestion.slug),
        brandId: brand.id,
        eanCode: product.eanCode,
        name: product.name,
        description: null,
        imageUrl: null,
        measurementUnit: measurement.measurementUnit,
        contentValue: measurement.contentValue,
      },
    );
    productIds.set(product.eanCode, saved.id);
  }

  // 3) Supermercados, sucursales y precios reales
  for (const branch of SNAPSHOT_BRANCHES) {
    const supermarket = await upsertBy<SupermarketEntity>(
      supermarketRepo,
      { name: branch.chain },
      { name: branch.chain, logoUrl: null, websiteUrl: null },
    );

    const existingBranch = await branchRepo.findOne({ where: { externalId: branch.externalId } });
    const savedBranch =
      existingBranch ||
      (await branchRepo.save(
        branchRepo.create({
          supermarketId: supermarket.id,
          branchName: branch.branchName,
          address: branch.address,
          city: branch.city,
          location: { type: 'Point', coordinates: [branch.longitude, branch.latitude] },
          externalId: branch.externalId,
        }),
      ));

    if (!existingBranch) {
      branchesCreated++;
    }

    for (const [eanCode, raw] of Object.entries(branch.prices)) {
      const productId = productIds.get(eanCode);
      if (!productId) continue;

      // Acepta las dos formas del snapshot: { price, listPrice? } o un numero.
      const entry = typeof raw === 'number' ? { price: raw, listPrice: undefined } : raw;
      const price = entry.price;
      const listPrice = entry.listPrice ?? null;

      const product = SNAPSHOT_PRODUCTS.find((p) => p.eanCode === eanCode)!;
      const measurement = parsePresentation(product.presentation);
      const unitPrice = computeUnitPrice(price, measurement);

      const existingPrice = await branchProductRepo.findOne({
        where: { branchId: savedBranch.id, productId },
      });

      if (existingPrice) {
        existingPrice.currentPrice = price;
        existingPrice.listPrice = listPrice;
        existingPrice.unitPrice = unitPrice;
        await branchProductRepo.save(existingPrice);
        continue;
      }

      const created = await branchProductRepo.save(
        branchProductRepo.create({
          branchId: savedBranch.id,
          productId,
          currentPrice: price,
          listPrice,
          unitPrice,
          inStock: true,
          trustScore: 100,
        }),
      );
      pricesCreated++;

      // Historial: la primera observacion proviene de la fuente oficial.
      await priceHistoryRepo.save(
        priceHistoryRepo.create({
          branchProductId: created.id,
          price: round2(price),
          listPrice,
          source: SNAPSHOT_SOURCE,
          sourceDate: new Date(SNAPSHOT_DATE),
          reportedByUserId: null,
        }),
      );
    }
  }

  console.log(
    `✅ Seed OK — ${SNAPSHOT_PRODUCTS.length} productos, ${SNAPSHOT_BRANCHES.length} sucursales ` +
      `(${branchesCreated} nuevas, ${pricesCreated} precios nuevos). Fuente: ${SNAPSHOT_SOURCE} ${SNAPSHOT_DATE}`,
  );

  await dataSource.destroy();
}

run().catch((error) => {
  console.error('❌ Error ejecutando el seeder:', error);
  process.exit(1);
});
