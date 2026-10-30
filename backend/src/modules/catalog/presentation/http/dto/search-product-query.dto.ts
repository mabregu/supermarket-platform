import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsNumber, IsOptional, IsString, Min, Max } from 'class-validator';

export class SearchProductQueryDto {
  @ApiProperty({
    description: 'Término de búsqueda (Nombre, Marca, EAN). Opcional si se filtra por categoría.',
    example: 'Leche',
    required: false,
  })
  @IsOptional()
  @IsString()
  q?: string = '';

  @ApiProperty({
    description: 'Filtrar por nombre exacto de categoría (ej. "Lácteos y Frescos")',
    example: 'Almacén',
    required: false,
  })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiProperty({ description: 'Latitud del usuario', example: -34.8207, required: false })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude?: number = -34.8207;

  @ApiProperty({ description: 'Longitud del usuario', example: -57.9675, required: false })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude?: number = -57.9675;

  @ApiProperty({ description: 'Radio de búsqueda en kilómetros', example: 5, required: false })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0.5)
  @Max(50)
  radiusKm?: number = 10;

  @ApiProperty({ description: 'Número de página (1-based)', example: 1, default: 1, required: false })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiProperty({ description: 'Cantidad de resultados por página', example: 20, default: 20, required: false })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number = 20;
}
