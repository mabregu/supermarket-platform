import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';

export class EvidenceItemDto {
  @ApiPropertyOptional({ description: 'EAN del producto detectado en el ticket', example: '7792180001665' })
  @IsOptional()
  @IsString()
  eanCode?: string;

  @ApiProperty({ description: 'Nombre del producto como figura en el ticket' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Precio total del item en el ticket' })
  @IsNumber()
  @Min(0)
  price: number;

  @ApiPropertyOptional({ description: 'Cantidad', example: 1, default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  quantity?: number;
}

export class SubmitEvidenceDto {
  @ApiProperty({ description: 'Sucursal donde se realizo la compra' })
  @IsUUID()
  branchId: string;

  @ApiProperty({ description: 'Identificador del reportante (lo genera y persiste el cliente)' })
  @IsString()
  reporterId: string;

  @ApiPropertyOptional({ description: 'EAN del producto reportado' })
  @IsOptional()
  @IsString()
  eanCode?: string;

  @ApiPropertyOptional({ description: 'Id interno del producto (alternativa a eanCode)' })
  @IsOptional()
  @IsUUID()
  productId?: string;

  @ApiProperty({ description: 'Precio observado en el ticket' })
  @IsNumber()
  @Min(0)
  reportedPrice: number;

  @ApiPropertyOptional({ description: 'Precio de lista, si el ticket lo muestra' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  reportedListPrice?: number;

  @ApiPropertyOptional({ description: 'Imagen del ticket en base64 (data URL o payload)' })
  @IsOptional()
  @IsString()
  imageBase64?: string;

  @ApiPropertyOptional({ description: 'URL de la imagen del ticket' })
  @IsOptional()
  @IsString()
  imageUrl?: string;

  @ApiPropertyOptional({ description: 'Fecha de compra (ISO)' })
  @IsOptional()
  @IsDateString()
  purchasedAt?: string;

  @ApiPropertyOptional({
    type: [EvidenceItemDto],
    description: 'Items ya extraidos del ticket (modo sin OCR)',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EvidenceItemDto)
  items?: EvidenceItemDto[];
}
