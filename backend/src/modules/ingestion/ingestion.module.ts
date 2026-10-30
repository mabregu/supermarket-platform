import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SepaApiClient } from './application/services/sepa-api.client';
import { ScheduledSepaIngestionService } from './application/services/scheduled-sepa-ingestion.service';
import { IngestSepaPricesUseCase } from './application/use-cases/ingest-sepa-prices.use-case';
import { StoreBranchEntity } from '../stores/infrastructure/persistence/entities/store-branch.entity';
import { SupermarketEntity } from '../stores/infrastructure/persistence/entities/supermarket.entity';
import { ProductEntity } from '../catalog/infrastructure/persistence/entities/product.entity';
import { BrandEntity } from '../catalog/infrastructure/persistence/entities/brand.entity';
import { CategoryEntity } from '../catalog/infrastructure/persistence/entities/category.entity';
import { BranchProductEntity } from '../pricing/infrastructure/persistence/entities/branch-product.entity';
import { PriceHistoryEntity } from '../pricing/infrastructure/persistence/entities/price-history.entity';

/**
 * Modulo de ingesta de precios desde fuentes externas oficiales.
 *
 * Hoy implementa SEPA / "Precios Claros" (Secretaria de Comercio), que es la
 * base de datos oficial de precios por punto de venta. Es el modulo que
 * reemplaza a los precios inventados del seed.
 */
@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([
      StoreBranchEntity,
      SupermarketEntity,
      ProductEntity,
      BrandEntity,
      CategoryEntity,
      BranchProductEntity,
      PriceHistoryEntity,
    ]),
  ],
  providers: [SepaApiClient, IngestSepaPricesUseCase, ScheduledSepaIngestionService],
  exports: [SepaApiClient, IngestSepaPricesUseCase, ScheduledSepaIngestionService],
})
export class IngestionModule {}
