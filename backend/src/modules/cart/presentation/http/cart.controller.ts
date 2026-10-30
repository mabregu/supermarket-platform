import { Controller, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { OptimizeCartUseCase } from '../../application/use-cases/optimize-cart.use-case';
import { OptimizeCartDto } from './dto/optimize-cart.dto';

@ApiTags('Carrito e Inteligencia de Compras')
@Controller('cart')
export class CartController {
  constructor(private readonly optimizeCartUseCase: OptimizeCartUseCase) {}

  @Post('optimize')
  @ApiOperation({
    summary: 'Optimizar lista de compras comparando opción mono-tienda vs multi-tienda (split-store routing)',
  })
  @ApiResponse({ status: 200, description: 'Estrategia de compra optimizada con ruta y cálculo de ahorro.' })
  async optimizeCart(@Body() dto: OptimizeCartDto) {
    const result = await this.optimizeCartUseCase.execute(dto);
    return {
      success: true,
      statusCode: 200,
      data: result,
    };
  }
}
