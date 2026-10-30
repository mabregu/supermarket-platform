import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { SepaApiClient } from '../application/services/sepa-api.client';
import { IngestSepaPricesUseCase } from '../application/use-cases/ingest-sepa-prices.use-case';
import { StoreBranchEntity } from '../../stores/infrastructure/persistence/entities/store-branch.entity';
import { SupermarketEntity } from '../../stores/infrastructure/persistence/entities/supermarket.entity';
import { ProductEntity } from '../../catalog/infrastructure/persistence/entities/product.entity';
import { BrandEntity } from '../../catalog/infrastructure/persistence/entities/brand.entity';
import { CategoryEntity } from '../../catalog/infrastructure/persistence/entities/category.entity';
import { BranchProductEntity } from '../../pricing/infrastructure/persistence/entities/branch-product.entity';
import { PriceHistoryEntity } from '../../pricing/infrastructure/persistence/entities/price-history.entity';
import { resolvePostgresConfig } from '../../../common/infrastructure/database/db-config';

config();

/**
 * CLI de ingesta de precios oficiales (SEPA / Precios Claros).
 *
 *   npm run ingest:prices -- --lat=-34.8207 --lng=-57.9675 --radius=10
 *   npm run ingest:prices -- --lat=-34.8207 --lng=-57.9675 --radius=10 --max-branches=5 --max-products=200
 *
 * Es idempotente: se puede volver a ejecutar. Solo escribe una fila en
 * price_history cuando el precio de un producto cambia de verdad.
 */

interface CliOptions {
  latitude: number;
  longitude: number;
  radiusKm: number;
  maxBranches: number;
  maxProductsPerBranch: number;
  delayMs: number;
}

function parseArgs(argv: string[]): CliOptions {
  const get = (name: string, fallback: number): number => {
    const found = argv.find((arg) => arg.startsWith(`--${name}=`));
    if (!found) return fallback;
    const value = Number(found.split('=')[1]);
    return Number.isFinite(value) ? value : fallback;
  };

  return {
    latitude: get('lat', -34.8207),
    longitude: get('lng', -57.9675),
    radiusKm: get('radius', 10),
    maxBranches: get('max-branches', 5),
    maxProductsPerBranch: get('max-products', 300),
    delayMs: get('delay', 250),
  };
}

async function run() {
  const options = parseArgs(process.argv.slice(2));

  const dataSource = new DataSource({
    type: 'postgres',
    ...resolvePostgresConfig(process.env as Record<string, string | undefined>),
    entities: [
      StoreBranchEntity,
      SupermarketEntity,
      ProductEntity,
      BrandEntity,
      CategoryEntity,
      BranchProductEntity,
      PriceHistoryEntity,
    ],
    synchronize: false,
  });

  await dataSource.initialize();
  console.log('🌱 Conectado a la base de datos.');

  const client = new SepaApiClient();
  const useCase = new IngestSepaPricesUseCase(
    client,
    dataSource.getRepository(StoreBranchEntity),
    dataSource.getRepository(SupermarketEntity),
    dataSource.getRepository(ProductEntity),
    dataSource.getRepository(BrandEntity),
    dataSource.getRepository(CategoryEntity),
    dataSource.getRepository(BranchProductEntity),
    dataSource.getRepository(PriceHistoryEntity),
  );

  try {
    const result = await useCase.execute({
      latitude: options.latitude,
      longitude: options.longitude,
      radiusKm: options.radiusKm,
      maxBranches: options.maxBranches,
      maxProductsPerBranch: options.maxProductsPerBranch,
      delayMs: options.delayMs,
    });

    console.log('\n================ RESUMEN DE LA INGESTA ================');
    console.log(`  Sucursales en la API      : ${result.branchesFound}`);
    console.log(`  Sucursales procesadas     : ${result.branchesProcessed}`);
    console.log(`  Supermercados nuevos      : ${result.supermarketsCreated}`);
    console.log(`  Sucursales nuevas         : ${result.branchesCreated}`);
    console.log(`  Productos nuevos          : ${result.productsCreated}`);
    console.log(`  Precios guardados/actualiz.: ${result.pricesUpserted}`);
    console.log(`  Cambios de precio         : ${result.priceChanges}`);
    console.log(`  Filas de historial        : ${result.historyRows}`);
    console.log(`  Duración                  : ${(result.durationMs / 1000).toFixed(1)}s`);
  } finally {
    await dataSource.destroy();
  }
}

run().catch((error) => {
  console.error('❌ Error en la ingesta:', error);
  process.exit(1);
});
