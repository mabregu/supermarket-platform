import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SupermarketEntity } from './infrastructure/persistence/entities/supermarket.entity';
import { StoreBranchEntity } from './infrastructure/persistence/entities/store-branch.entity';
import { SearchNearbyStoresUseCase } from './application/use-cases/search-nearby-stores.use-case';
import { StoresController } from './presentation/http/stores.controller';

@Module({
  imports: [TypeOrmModule.forFeature([SupermarketEntity, StoreBranchEntity])],
  controllers: [StoresController],
  providers: [SearchNearbyStoresUseCase],
  exports: [SearchNearbyStoresUseCase, TypeOrmModule],
})
export class StoresModule {}
