import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import { ProductEntity } from '../../infrastructure/persistence/entities/product.entity';
import { BranchProductEntity } from '../../../pricing/infrastructure/persistence/entities/branch-product.entity';
import { SearchProductQueryDto } from '../../presentation/http/dto/search-product-query.dto';

export interface StorePriceDeal {
  branchId: string;
  supermarketName: string;
  branchName: string;
  address: string;
  price: number;
  /** Precio de lista (sin promocion). */
  listPrice: number | null;
  /** true cuando el precio mostrado es una promocion (listPrice > price). */
  hasPromotion: boolean;
  unitPrice: number;
  distanceKm: number;
  lastUpdated: Date;
}

export interface ProductSearchResult {
  productId: string;
  name: string;
  brand: string;
  category: string;
  eanCode: string;
  imageUrl: string;
  measurementUnit: string;
  contentValue: number;
  bestDeal: StorePriceDeal | null;
  storePrices: StorePriceDeal[];
  storePricesCount: number;
  priceRange: {
    min: number;
    max: number;
    average: number;
  };
}

@Injectable()
export class SearchProductsWithPricesUseCase {
  constructor(
    @InjectRepository(ProductEntity)
    private readonly productRepository: Repository<ProductEntity>,
    @InjectRepository(BranchProductEntity)
    private readonly branchProductRepository: Repository<BranchProductEntity>,
  ) {}

  async execute(dto: SearchProductQueryDto): Promise<{ products: ProductSearchResult[]; total: number }> {
    const lat = dto.latitude || -34.8207;
    const lng = dto.longitude || -57.9675;
    const radiusKm = dto.radiusKm || 5;
    const radiusMeters = radiusKm * 1000;
    const page = dto.page || 1;
    const limit = dto.limit || 20;

    // Buscar productos por nombre, marca o EAN, y opcionalmente filtrar por categoría.
    // Una sola consulta con paginación; el filtro de texto y el de categoría se combinan con AND.
    const qb = this.productRepository
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.category', 'category')
      .leftJoinAndSelect('product.brand', 'brand');

    const term = dto.q?.trim();
    if (term) {
      qb.andWhere(
        new Brackets((sub) => {
          sub
            .where('LOWER(product.name) LIKE LOWER(:q)', { q: `%${term}%` })
            .orWhere('product.eanCode = :ean', { ean: term })
            .orWhere('LOWER(brand.name) LIKE LOWER(:q)', { q: `%${term}%` });
        }),
      );
    }

    if (dto.category?.trim()) {
      qb.andWhere('LOWER(category.name) = LOWER(:category)', { category: dto.category.trim() });
    }

    qb.orderBy('product.name', 'ASC')
      .skip((page - 1) * limit)
      .take(limit);

    const [products, total] = await qb.getManyAndCount();

    if (products.length === 0) {
      return { products: [], total };
    }

    const productIds = products.map((p) => p.id);

    // Una ÚNICA consulta para todos los precios de todas las sucursales dentro del radio.
    // Evita el patrón N+1 (antes se hacía una query por producto).
    const rawPrices = await this.branchProductRepository
      .createQueryBuilder('bp')
      .innerJoinAndSelect('bp.branch', 'branch')
      .innerJoinAndSelect('branch.supermarket', 'supermarket')
      .select([
        'bp.productId AS "productId"',
        'bp.currentPrice AS "currentPrice"',
        'bp.listPrice AS "listPrice"',
        'bp.unitPrice AS "unitPrice"',
        'bp.lastUpdatedAt AS "lastUpdatedAt"',
        'branch.id AS "branchId"',
        'branch.branchName AS "branchName"',
        'branch.address AS "address"',
        'supermarket.name AS "supermarketName"',
        `ST_DistanceSphere(branch.location, ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)) AS "distanceMeters"`,
      ])
      .where('bp.productId IN (:...productIds)', { productIds })
      .andWhere('branch.isActive = true')
      .andWhere(
        'ST_DWithin(branch.location::geography, ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography, :radiusMeters)',
        { radiusMeters },
      )
      .setParameters({ lat, lng })
      .orderBy('"currentPrice"', 'ASC')
      .getRawMany();

    // Agrupar los precios por producto (ya vienen ordenados por precio ascendente)
    const pricesByProduct = new Map<string, any[]>();
    for (const row of rawPrices) {
      if (!pricesByProduct.has(row.productId)) {
        pricesByProduct.set(row.productId, []);
      }
      pricesByProduct.get(row.productId)!.push(row);
    }

    return {
      products: products.map((prod) => {
        const branchPrices = pricesByProduct.get(prod.id) || [];

        if (branchPrices.length === 0) {
          return {
            productId: prod.id,
            name: prod.name,
            brand: prod.brand?.name || 'Desconocida',
            category: prod.category?.name || 'Sin Categoría',
            eanCode: prod.eanCode,
            imageUrl: prod.imageUrl,
            measurementUnit: prod.measurementUnit,
            contentValue: parseFloat(prod.contentValue as any),
            bestDeal: null,
            storePrices: [],
            storePricesCount: 0,
            priceRange: { min: 0, max: 0, average: 0 },
          };
        }

        const mappedStorePrices: StorePriceDeal[] = branchPrices.map((bp) => {
          const price = parseFloat(bp.currentPrice);
          const listPrice = bp.listPrice === null || bp.listPrice === undefined ? null : parseFloat(bp.listPrice);
          return {
            branchId: bp.branchId,
            supermarketName: bp.supermarketName,
            branchName: bp.branchName,
            address: bp.address,
            price,
            listPrice,
            hasPromotion: listPrice !== null && listPrice > price,
            unitPrice: parseFloat(bp.unitPrice),
            distanceKm: Math.round((parseFloat(bp.distanceMeters) / 1000) * 100) / 100,
            lastUpdated: bp.lastUpdatedAt,
          };
        });

        const prices = mappedStorePrices.map((bp) => bp.price);
        const minPrice = Math.min(...prices);
        const maxPrice = Math.max(...prices);
        const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;

        // El primer registro es el de menor precio (ORDER BY currentPrice ASC)
        const bestDeal = mappedStorePrices[0] || null;

        return {
          productId: prod.id,
          name: prod.name,
          brand: prod.brand?.name || 'Desconocida',
          category: prod.category?.name || 'Sin Categoría',
          eanCode: prod.eanCode,
          imageUrl: prod.imageUrl,
          measurementUnit: prod.measurementUnit,
          contentValue: parseFloat(prod.contentValue as any),
          bestDeal,
          storePrices: mappedStorePrices,
          storePricesCount: mappedStorePrices.length,
          priceRange: {
            min: minPrice,
            max: maxPrice,
            average: Math.round(avgPrice * 100) / 100,
          },
        };
      }),
      total,
    };
  }
}
