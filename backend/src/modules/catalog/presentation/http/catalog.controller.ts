import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { SearchProductsWithPricesUseCase } from '../../application/use-cases/search-products-with-prices.use-case';
import { SearchProductQueryDto } from './dto/search-product-query.dto';
import { GetPriceHistoryUseCase } from '../../../pricing/application/use-cases/get-price-history.use-case';
import { PriceHistoryQueryDto } from '../../../pricing/presentation/http/dto/price-history-query.dto';

@ApiTags('Catálogo y Búsqueda de Productos')
@Controller('products')
export class CatalogController {
  constructor(
    private readonly searchProductsWithPricesUseCase: SearchProductsWithPricesUseCase,
    private readonly getPriceHistoryUseCase: GetPriceHistoryUseCase,
  ) {}

  @Get(':productId/history')
  @ApiOperation({
    summary: 'Serie historica de precios de un producto',
    description:
      'Devuelve las variaciones de precio registradas por sucursal, con estadisticas ' +
      '(minimo, maximo, promedio, variacion) y su origen (SEPA / USER_TICKET).',
  })
  @ApiResponse({ status: 200, description: 'Serie historica de precios.' })
  async priceHistory(@Param('productId') productId: string, @Query() query: PriceHistoryQueryDto) {
    const result = await this.getPriceHistoryUseCase.execute({
      productId,
      branchId: query.branchId,
      from: query.from ? new Date(query.from) : undefined,
      to: query.to ? new Date(query.to) : undefined,
      limit: query.limit,
      latitude: query.latitude,
      longitude: query.longitude,
    });

    return {
      success: true,
      statusCode: 200,
      data: result,
    };
  }

  @Get('search')
  @ApiOperation({ summary: 'Buscar productos por nombre, marca o EAN con comparación de precios cercana' })
  @ApiResponse({ status: 200, description: 'Resultados de productos con mejor oferta y rango de precios.' })
  async searchProducts(@Query() query: SearchProductQueryDto) {
    const { products, total } = await this.searchProductsWithPricesUseCase.execute(query);
    const page = query.page || 1;
    const limit = query.limit || 20;
    return {
      success: true,
      statusCode: 200,
      data: {
        products,
        totalFound: products.length,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    };
  }
}
