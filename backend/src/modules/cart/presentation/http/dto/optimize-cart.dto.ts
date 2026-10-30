import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
  Min,
  Max,
} from 'class-validator';

export class CartItemDto {
  @ApiProperty({ description: 'ID del producto' })
  @IsString()
  @IsNotEmpty()
  productId: string;

  @ApiProperty({ description: 'Cantidad a comprar', example: 1, default: 1 })
  @IsNumber()
  @Min(1)
  quantity: number;
}

export class OptimizeCartDto {
  @ApiProperty({ description: 'Latitud del usuario', example: -34.8207 })
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude: number;

  @ApiProperty({ description: 'Longitud del usuario', example: -57.9675 })
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude: number;

  @ApiProperty({ description: 'Radio máximo de distancia en km', example: 5, default: 5, required: false })
  @IsOptional()
  @IsNumber()
  @Min(0.5)
  @Max(50)
  maxDistanceKm?: number = 10;

  @ApiProperty({
    description: 'Permitir dividir la compra entre múltiples supermercados',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  allowSplitStores?: boolean = true;

  @ApiProperty({ type: [CartItemDto], description: 'Lista de productos a comprar' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CartItemDto)
  items: CartItemDto[];
}
