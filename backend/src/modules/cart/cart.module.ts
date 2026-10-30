import { Module } from '@nestjs/common';
import { PricingModule } from '../pricing/pricing.module';
import { OptimizeCartUseCase } from './application/use-cases/optimize-cart.use-case';
import { CartController } from './presentation/http/cart.controller';

@Module({
  imports: [PricingModule],
  controllers: [CartController],
  providers: [OptimizeCartUseCase],
  exports: [OptimizeCartUseCase],
})
export class CartModule {}
