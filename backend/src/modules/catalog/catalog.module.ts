import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CategoryEntity } from './infrastructure/persistence/entities/category.entity';
import { BrandEntity } from './infrastructure/persistence/entities/brand.entity';
import { ProductEntity } from './infrastructure/persistence/entities/product.entity';
import { PricingModule } from '../pricing/pricing.module';
import { SearchProductsWithPricesUseCase } from './application/use-cases/search-products-with-prices.use-case';
import { CatalogController } from './presentation/http/catalog.controller';

@Module({
  imports: [TypeOrmModule.forFeature([CategoryEntity, BrandEntity, ProductEntity]), PricingModule],
  controllers: [CatalogController],
  providers: [SearchProductsWithPricesUseCase],
  exports: [SearchProductsWithPricesUseCase, TypeOrmModule],
})
export class CatalogModule {}
