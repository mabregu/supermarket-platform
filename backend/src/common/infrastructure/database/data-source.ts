import 'reflect-metadata';
import { config } from 'dotenv';
import { DataSource } from 'typeorm';
import { SupermarketEntity } from '../../../modules/stores/infrastructure/persistence/entities/supermarket.entity';
import { StoreBranchEntity } from '../../../modules/stores/infrastructure/persistence/entities/store-branch.entity';
import { CategoryEntity } from '../../../modules/catalog/infrastructure/persistence/entities/category.entity';
import { BrandEntity } from '../../../modules/catalog/infrastructure/persistence/entities/brand.entity';
import { ProductEntity } from '../../../modules/catalog/infrastructure/persistence/entities/product.entity';
import { BranchProductEntity } from '../../../modules/pricing/infrastructure/persistence/entities/branch-product.entity';
import { PriceHistoryEntity } from '../../../modules/pricing/infrastructure/persistence/entities/price-history.entity';
import { resolvePostgresConfig } from './db-config';

config();

/**
 * DataSource usado por la CLI de TypeORM para gestionar migraciones.
 *
 *   npm run migration:run
 *   npm run migration:generate -- src/common/infrastructure/database/migrations/Nombre
 *   npm run migration:revert
 *
 * Nota: `synchronize` siempre en false para forzar el uso de migraciones.
 */
export default new DataSource({
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
  migrations: ['src/common/infrastructure/database/migrations/*.ts'],
  synchronize: false,
});
