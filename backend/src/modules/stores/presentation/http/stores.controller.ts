import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { SearchNearbyStoresUseCase } from '../../application/use-cases/search-nearby-stores.use-case';
import { SearchNearbyStoresDto } from './dto/search-nearby-stores.dto';

@ApiTags('Supermercados y Sucursales')
@Controller('stores')
export class StoresController {
  constructor(private readonly searchNearbyStoresUseCase: SearchNearbyStoresUseCase) {}

  @Get('nearby')
  @ApiOperation({ summary: 'Obtener sucursales cercanas ordenadas por distancia geográfica (PostGIS)' })
  @ApiResponse({ status: 200, description: 'Lista de sucursales cercanas encontradas.' })
  async getNearbyStores(@Query() query: SearchNearbyStoresDto) {
    const stores = await this.searchNearbyStoresUseCase.execute(query);
    return {
      success: true,
      statusCode: 200,
      data: {
        stores,
        count: stores.length,
      },
    };
  }
}
