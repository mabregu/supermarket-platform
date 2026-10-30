import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PriceHistoryEntity } from '../../infrastructure/persistence/entities/price-history.entity';
import { BranchProductEntity } from '../../infrastructure/persistence/entities/branch-product.entity';
import { StoreBranchEntity } from '../../../stores/infrastructure/persistence/entities/store-branch.entity';
import { SupermarketEntity } from '../../../stores/infrastructure/persistence/entities/supermarket.entity';
import { ProductEntity } from '../../../catalog/infrastructure/persistence/entities/product.entity';

export interface PriceHistoryPoint {
  date: string;
  price: number;
  listPrice: number | null;
  source: string;
  branchId: string;
  branchName: string;
  supermarketName: string;
  distanceKm: number | null;
}

export interface PriceHistoryResult {
  productId: string;
  productName: string;
  eanCode: string;
  series: PriceHistoryPoint[];
  stats: {
    observations: number;
    min: number;
    max: number;
    average: number;
    first: number;
    last: number;
    changePercent: number;
  } | null;
}

export interface GetPriceHistoryOptions {
  productId: string;
  branchId?: string;
  from?: Date;
  to?: Date;
  limit?: number;
  /** Coordenadas del usuario, para acotar por distancia. */
  latitude?: number;
  longitude?: number;
  maxDistanceKm?: number;
}

/**
 * Serie historica de precios de un producto.
 *
 * `price_history` guarda una fila cada vez que el precio de un producto en una
 * sucursal CAMBIA (no un snapshot diario), asi que la serie es exactamente el
 * historial de movimientos de precio.
 */
@Injectable()
export class GetPriceHistoryUseCase {
  constructor(
    @InjectRepository(PriceHistoryEntity)
    private readonly historyRepo: Repository<PriceHistoryEntity>,
    @InjectRepository(BranchProductEntity)
    private readonly branchProductRepo: Repository<BranchProductEntity>,
    @InjectRepository(StoreBranchEntity)
    private readonly branchRepo: Repository<StoreBranchEntity>,
    @InjectRepository(SupermarketEntity)
    private readonly supermarketRepo: Repository<SupermarketEntity>,
    @InjectRepository(ProductEntity)
    private readonly productRepo: Repository<ProductEntity>,
  ) {}

  async execute(options: GetPriceHistoryOptions): Promise<PriceHistoryResult> {
    const product = await this.productRepo.findOne({ where: { id: options.productId } });
    if (!product) {
      throw new NotFoundException(`No existe el producto ${options.productId}`);
    }

    // branch_products del producto (opcionalmente de una sucursal puntual)
    const qb = this.branchProductRepo
      .createQueryBuilder('bp')
      .innerJoinAndSelect('bp.branch', 'branch')
      .innerJoinAndSelect('branch.supermarket', 'supermarket')
      .select([
        'bp.id AS "branchProductId"',
        'bp.currentPrice AS "currentPrice"',
        'branch.id AS "branchId"',
        'branch.branchName AS "branchName"',
        'branch.location AS "location"',
        'supermarket.name AS "supermarketName"',
      ])
      .where('bp.productId = :productId', { productId: options.productId });

    if (options.branchId) {
      qb.andWhere('bp.branchId = :branchId', { branchId: options.branchId });
    }

    const branchProducts = await qb.getRawMany();
    if (branchProducts.length === 0) {
      return {
        productId: product.id,
        productName: product.name,
        eanCode: product.eanCode,
        series: [],
        stats: null,
      };
    }

    const branchProductIds = branchProducts.map((bp) => bp.branchProductId);
    const bpById = new Map(branchProducts.map((bp) => [bp.branchProductId, bp]));

    const historyQb = this.historyRepo
      .createQueryBuilder('h')
      .where('h.branchProductId IN (:...ids)', { ids: branchProductIds })
      .orderBy('h.createdAt', 'ASC')
      .limit(options.limit ?? 200);

    if (options.from) {
      historyQb.andWhere('h.createdAt >= :from', { from: options.from });
    }
    if (options.to) {
      historyQb.andWhere('h.createdAt <= :to', { to: options.to });
    }

    const rows = await historyQb.getMany();

    const series: PriceHistoryPoint[] = rows.map((row) => {
      const bp = bpById.get(row.branchProductId);
      return {
        date: (row.sourceDate ?? row.createdAt).toISOString(),
        price: Number(row.price),
        listPrice: row.listPrice === null ? null : Number(row.listPrice),
        source: row.source,
        branchId: bp?.branchId ?? '',
        branchName: bp?.branchName ?? '',
        supermarketName: bp?.supermarketName ?? '',
        distanceKm: this.distanceKm(options, bp),
      };
    });

    return {
      productId: product.id,
      productName: product.name,
      eanCode: product.eanCode,
      series,
      stats: this.stats(series),
    };
  }

  private distanceKm(
    options: GetPriceHistoryOptions,
    bp: { location?: { coordinates?: number[] } } | undefined,
  ): number | null {
    if (!options.latitude || !options.longitude || !bp?.location?.coordinates) return null;
    const [lng, lat] = bp.location.coordinates;
    const R = 6371;
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const dLat = toRad(lat - options.latitude);
    const dLng = toRad(lng - options.longitude);
    const a =
      Math.sin(dLat / 2) ** 2 + Math.cos(toRad(options.latitude)) * Math.cos(toRad(lat)) * Math.sin(dLng / 2) ** 2;
    return Math.round(2 * R * Math.asin(Math.sqrt(a)) * 100) / 100;
  }

  private stats(series: PriceHistoryPoint[]) {
    if (series.length === 0) return null;
    const prices = series.map((p) => p.price);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const average = Math.round((prices.reduce((a, b) => a + b, 0) / prices.length) * 100) / 100;
    const first = prices[0];
    const last = prices[prices.length - 1];
    const changePercent = first > 0 ? Math.round(((last - first) / first) * 1000) / 10 : 0;

    return {
      observations: prices.length,
      min,
      max,
      average,
      first,
      last,
      changePercent,
    };
  }
}
