import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BranchProductEntity } from './infrastructure/persistence/entities/branch-product.entity';
import { PriceHistoryEntity } from './infrastructure/persistence/entities/price-history.entity';
import { GetPriceHistoryUseCase } from './application/use-cases/get-price-history.use-case';
import { StoreBranchEntity } from '../stores/infrastructure/persistence/entities/store-branch.entity';
import { SupermarketEntity } from '../stores/infrastructure/persistence/entities/supermarket.entity';
import { ProductEntity } from '../catalog/infrastructure/persistence/entities/product.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      BranchProductEntity,
      PriceHistoryEntity,
      StoreBranchEntity,
      SupermarketEntity,
      ProductEntity,
    ]),
  ],
  providers: [GetPriceHistoryUseCase],
  exports: [GetPriceHistoryUseCase, TypeOrmModule],
})
export class PricingModule {}
