import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SepaApiClient, SepaBranch, SepaProduct } from '../services/sepa-api.client';
import { computeUnitPrice, parsePresentation, suggestCategory } from '../services/catalog.mapper';
import { StoreBranchEntity } from '../../../stores/infrastructure/persistence/entities/store-branch.entity';
import { SupermarketEntity } from '../../../stores/infrastructure/persistence/entities/supermarket.entity';
import { ProductEntity } from '../../../catalog/infrastructure/persistence/entities/product.entity';
import { BrandEntity } from '../../../catalog/infrastructure/persistence/entities/brand.entity';
import { CategoryEntity } from '../../../catalog/infrastructure/persistence/entities/category.entity';
import { BranchProductEntity } from '../../../pricing/infrastructure/persistence/entities/branch-product.entity';
import { PriceHistoryEntity } from '../../../pricing/infrastructure/persistence/entities/price-history.entity';

export interface IngestSepaPricesOptions {
  latitude: number;
  longitude: number;
  radiusKm: number;
  maxBranches: number;
  maxProductsPerBranch: number;
  /** Pausa entre requests para no saturar la API oficial. */
  delayMs: number;
}

export interface IngestSepaPricesResult {
  branchesFound: number;
  branchesProcessed: number;
  supermarketsCreated: number;
  branchesCreated: number;
  productsCreated: number;
  pricesUpserted: number;
  priceChanges: number;
  historyRows: number;
  durationMs: number;
}

/** Fuente de los datos, guardada en price_history.source */
export const PRICE_SOURCE = 'SEPA';

@Injectable()
export class IngestSepaPricesUseCase {
  private readonly logger = new Logger(IngestSepaPricesUseCase.name);

  constructor(
    private readonly sepaClient: SepaApiClient,
    @InjectRepository(StoreBranchEntity)
    private readonly branchRepo: Repository<StoreBranchEntity>,
    @InjectRepository(SupermarketEntity)
    private readonly supermarketRepo: Repository<SupermarketEntity>,
    @InjectRepository(ProductEntity)
    private readonly productRepo: Repository<ProductEntity>,
    @InjectRepository(BrandEntity)
    private readonly brandRepo: Repository<BrandEntity>,
    @InjectRepository(CategoryEntity)
    private readonly categoryRepo: Repository<CategoryEntity>,
    @InjectRepository(BranchProductEntity)
    private readonly branchProductRepo: Repository<BranchProductEntity>,
    @InjectRepository(PriceHistoryEntity)
    private readonly priceHistoryRepo: Repository<PriceHistoryEntity>,
  ) {}

  async execute(options: IngestSepaPricesOptions): Promise<IngestSepaPricesResult> {
    const startedAt = Date.now();
    const result: IngestSepaPricesResult = {
      branchesFound: 0,
      branchesProcessed: 0,
      supermarketsCreated: 0,
      branchesCreated: 0,
      productsCreated: 0,
      pricesUpserted: 0,
      priceChanges: 0,
      historyRows: 0,
      durationMs: 0,
    };

    this.logger.log(
      `Iniciando ingesta SEPA en (${options.latitude}, ${options.longitude}) radio ${options.radiusKm} km`,
    );

    const nearby = await this.sepaClient.listNearbyBranches(
      options.latitude,
      options.longitude,
      Math.min(options.maxBranches * 3, 100),
    );

    const inRadius = nearby
      .filter((branch) => this.distanceKm(options.latitude, options.longitude, branch) <= options.radiusKm)
      .slice(0, options.maxBranches);

    result.branchesFound = nearby.length;

    if (inRadius.length === 0) {
      this.logger.warn(
        `No hay sucursales dentro de ${options.radiusKm} km. La API devolvió ${nearby.length} en total.`,
      );
      result.durationMs = Date.now() - startedAt;
      return result;
    }

    for (const sepaBranch of inRadius) {
      try {
        const products = await this.sepaClient.listBranchProducts(sepaBranch.id, options.maxProductsPerBranch);
        await this.ingestBranch(sepaBranch, products, result);
        result.branchesProcessed++;
      } catch (error) {
        this.logger.warn(
          `No se pudo ingerir la sucursal ${sepaBranch.id} (${sepaBranch.name}): ${(error as Error).message}`,
        );
      }

      if (options.delayMs > 0) {
        await this.sleep(options.delayMs);
      }
    }

    result.durationMs = Date.now() - startedAt;
    this.logger.log(
      `Ingesta SEPA finalizada: ${result.branchesProcessed} sucursales, ` +
        `${result.productsCreated} productos nuevos, ${result.pricesUpserted} precios, ` +
        `${result.priceChanges} cambios de precio.`,
    );

    return result;
  }

  private async ingestBranch(
    sepaBranch: SepaBranch,
    products: SepaProduct[],
    result: IngestSepaPricesResult,
  ): Promise<void> {
    if (products.length === 0) return;

    const supermarket = await this.upsertSupermarket(sepaBranch, result);
    const branch = await this.upsertBranch(sepaBranch, supermarket, result);

    for (const sepaProduct of products) {
      if (!sepaProduct.ean || !Number.isFinite(sepaProduct.priceMin) || sepaProduct.priceMin <= 0) {
        continue;
      }

      const product = await this.upsertProduct(sepaProduct, result);
      await this.upsertPrice(branch, product, sepaProduct, result);
    }
  }

  private async upsertSupermarket(sepaBranch: SepaBranch, result: IngestSepaPricesResult): Promise<SupermarketEntity> {
    const name = sepaBranch.chain || sepaBranch.commerce || 'Supermercado';
    let supermarket = await this.supermarketRepo.findOne({ where: { name } });

    if (!supermarket) {
      supermarket = await this.supermarketRepo.save(
        this.supermarketRepo.create({
          name,
          logoUrl: null,
          websiteUrl: sepaBranch.commerce && sepaBranch.commerce !== name ? null : null,
        }),
      );
      result.supermarketsCreated++;
    }

    return supermarket;
  }

  private async upsertBranch(
    sepaBranch: SepaBranch,
    supermarket: SupermarketEntity,
    result: IngestSepaPricesResult,
  ): Promise<StoreBranchEntity> {
    // La clave de matcheo es el externalId de SEPA: una sucursal fisica = un id.
    let branch = await this.branchRepo.findOne({ where: { externalId: sepaBranch.id } });

    if (!branch) {
      branch = await this.branchRepo.save(
        this.branchRepo.create({
          supermarketId: supermarket.id,
          branchName: sepaBranch.name || branchLabel(sepaBranch.id),
          address: sepaBranch.address || 'Sin dirección',
          city: '',
          location: { type: 'Point', coordinates: [sepaBranch.longitude, sepaBranch.latitude] },
          externalId: sepaBranch.id,
        }),
      );
      result.branchesCreated++;
      return branch;
    }

    // Actualiza la geolocalizacion por si la fuente la ajusto.
    const currentLat = branch.location?.coordinates?.[1];
    const currentLng = branch.location?.coordinates?.[0];
    if (currentLat !== sepaBranch.latitude || currentLng !== sepaBranch.longitude) {
      branch.location = { type: 'Point', coordinates: [sepaBranch.longitude, sepaBranch.latitude] };
      await this.branchRepo.save(branch);
    }

    return branch;
  }

  private async upsertProduct(sepaProduct: SepaProduct, result: IngestSepaPricesResult): Promise<ProductEntity> {
    const existing = await this.productRepo.findOne({ where: { eanCode: sepaProduct.ean } });
    if (existing) return existing;

    const brandName = sepaProduct.brand || 'Sin marca';
    let brand = await this.brandRepo.findOne({ where: { name: brandName } });
    if (!brand) {
      brand = await this.brandRepo.save(this.brandRepo.create({ name: brandName }));
    }

    const suggestion = suggestCategory(sepaProduct.name);
    let category = await this.categoryRepo.findOne({ where: { slug: suggestion.slug } });
    if (!category) {
      category = await this.categoryRepo.save(
        this.categoryRepo.create({ name: suggestion.name, slug: suggestion.slug }),
      );
    }

    const measurement = parsePresentation(sepaProduct.presentation);

    const product = await this.productRepo.save(
      this.productRepo.create({
        categoryId: category.id,
        brandId: brand.id,
        eanCode: sepaProduct.ean,
        name: sepaProduct.name,
        description: null,
        // SEPA no publica imagenes: el frontend usa un placeholder.
        imageUrl: null,
        measurementUnit: measurement.measurementUnit,
        contentValue: measurement.contentValue,
      }),
    );

    result.productsCreated++;
    return product;
  }

  private async upsertPrice(
    branch: StoreBranchEntity,
    product: ProductEntity,
    sepaProduct: SepaProduct,
    result: IngestSepaPricesResult,
  ): Promise<void> {
    // precioMin es el mejor precio disponible (incluye promos); precioMax es el de lista.
    const price = Math.round(sepaProduct.priceMin * 100) / 100;
    const listPrice =
      Number.isFinite(sepaProduct.priceMax) && sepaProduct.priceMax > 0
        ? Math.round(sepaProduct.priceMax * 100) / 100
        : null;
    const measurement = parsePresentation(sepaProduct.presentation);
    const unitPrice = computeUnitPrice(price, measurement);
    // SEPA publica a diario: la observacion es de hoy.
    const sourceDate = new Date();

    const existing = await this.branchProductRepo.findOne({
      where: { branchId: branch.id, productId: product.id },
    });

    if (!existing) {
      const created = await this.branchProductRepo.save(
        this.branchProductRepo.create({
          branchId: branch.id,
          productId: product.id,
          currentPrice: price,
          listPrice,
          unitPrice,
          inStock: true,
          trustScore: 100,
        }),
      );
      result.pricesUpserted++;
      await this.writeHistory(created, price, listPrice, sourceDate, result);
      return;
    }

    const priceChanged = Number(existing.currentPrice) !== price;
    const listChanged = (existing.listPrice ?? null) !== listPrice;

    if (priceChanged || listChanged) {
      existing.currentPrice = price;
      existing.listPrice = listPrice;
      existing.unitPrice = unitPrice;
      await this.branchProductRepo.save(existing);
      result.pricesUpserted++;
      if (priceChanged) {
        result.priceChanges++;
        await this.writeHistory(existing, price, listPrice, sourceDate, result);
      }
    }
  }

  /** Solo se escribe historial cuando el precio cambia: asi la serie es util. */
  private async writeHistory(
    branchProduct: BranchProductEntity,
    price: number,
    listPrice: number | null,
    sourceDate: Date,
    result: IngestSepaPricesResult,
  ): Promise<void> {
    await this.priceHistoryRepo.save(
      this.priceHistoryRepo.create({
        branchProductId: branchProduct.id,
        price,
        listPrice,
        source: PRICE_SOURCE,
        sourceDate,
        reportedByUserId: null,
      }),
    );
    result.historyRows++;
  }

  private distanceKm(lat1: number, lng1: number, branch: SepaBranch): number {
    const R = 6371;
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const dLat = toRad(branch.latitude - lat1);
    const dLng = toRad(branch.longitude - lng1);
    const a =
      Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(branch.latitude)) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(a));
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/** Nombre legible a partir del id de SEPA ("15-1-163" -> "Sucursal 163"). */
function branchLabel(sepaBranchId: string): string {
  return `Sucursal ${sepaBranchId.split('-').pop()}`;
}
