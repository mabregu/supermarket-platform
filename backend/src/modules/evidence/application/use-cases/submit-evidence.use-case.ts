import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SubmitEvidenceDto } from '../../presentation/http/dto/submit-evidence.dto';
import { TrustScoreService } from '../services/trust-score.service';
import { ExtractedItem, ReceiptExtractor } from '../services/receipt-extractor';
import { PriceReportEntity } from '../../infrastructure/persistence/entities/price-report.entity';
import { ReporterReputationEntity } from '../../infrastructure/persistence/entities/reporter-reputation.entity';
import { StoreBranchEntity } from '../../../stores/infrastructure/persistence/entities/store-branch.entity';
import { ProductEntity } from '../../../catalog/infrastructure/persistence/entities/product.entity';
import { BranchProductEntity } from '../../../pricing/infrastructure/persistence/entities/branch-product.entity';
import { PriceHistoryEntity } from '../../../pricing/infrastructure/persistence/entities/price-history.entity';

export const SOURCE_USER_TICKET = 'USER_TICKET';

export interface SubmitEvidenceResult {
  reportId: string;
  status: 'APPROVED' | 'PENDING' | 'REJECTED';
  trustScore: number;
  pointsAwarded: number;
  factors: Array<{ factor: string; points: number; detail: string }>;
  product: { id: string; name: string; eanCode: string } | null;
  branch: { id: string; name: string; supermarketName: string } | null;
  currentPrice: number | null;
  previousPrice: number | null;
  priceChanged: boolean;
  extractor: string;
  extractedItemsCount: number;
  message: string;
}

@Injectable()
export class SubmitEvidenceUseCase {
  private readonly logger = new Logger(SubmitEvidenceUseCase.name);

  constructor(
    private readonly trustScore: TrustScoreService,
    private readonly extractor: ReceiptExtractor,
    @InjectRepository(PriceReportEntity)
    private readonly reportRepo: Repository<PriceReportEntity>,
    @InjectRepository(ReporterReputationEntity)
    private readonly reputationRepo: Repository<ReporterReputationEntity>,
    @InjectRepository(StoreBranchEntity)
    private readonly branchRepo: Repository<StoreBranchEntity>,
    @InjectRepository(ProductEntity)
    private readonly productRepo: Repository<ProductEntity>,
    @InjectRepository(BranchProductEntity)
    private readonly branchProductRepo: Repository<BranchProductEntity>,
    @InjectRepository(PriceHistoryEntity)
    private readonly priceHistoryRepo: Repository<PriceHistoryEntity>,
  ) {}

  async execute(dto: SubmitEvidenceDto): Promise<SubmitEvidenceResult> {
    const branch = await this.branchRepo.findOne({ where: { id: dto.branchId } });
    if (!branch) {
      throw new BadRequestException('La sucursal indicada no existe.');
    }

    const product = await this.resolveProduct(dto);
    if (!product) {
      throw new BadRequestException(
        'No se pudo identificar el producto: indicá productId o eanCode de un producto del catalogo.',
      );
    }

    // 1) Extraccion del ticket (Azure si esta configurado, si no los items del cliente)
    const extraction = await this.extractor.extract({
      imageBase64: dto.imageBase64,
      imageUrl: dto.imageUrl,
      items: dto.items,
    });

    const corroborated = this.isCorroborated(extraction.items, product, dto.reportedPrice);

    // 2) Reputacion previa del reportante
    const reputation = await this.getOrCreateReputation(dto.reporterId);
    const acceptanceRate = reputation.reportsCount > 0 ? reputation.acceptedCount / reputation.reportsCount : 0;

    // 3) Precio que ya teniamos para ese par (producto, sucursal)
    const existingPrice = await this.branchProductRepo.findOne({
      where: { branchId: branch.id, productId: product.id },
    });
    const knownPrice = existingPrice ? Number(existingPrice.currentPrice) : null;

    // 4) TrustScore
    const trust = this.trustScore.evaluate({
      hasImage: Boolean(dto.imageBase64 || dto.imageUrl),
      branchKnown: true,
      productKnown: true,
      reportedPrice: dto.reportedPrice,
      knownPrice,
      corroboratedByReceipt: corroborated,
      reporterAcceptanceRate: acceptanceRate,
    });

    // 5) Persistencia del reporte
    const report = await this.reportRepo.save(
      this.reportRepo.create({
        branchId: branch.id,
        productId: product.id,
        reporterId: dto.reporterId,
        reportedPrice: dto.reportedPrice,
        reportedListPrice: dto.reportedListPrice ?? null,
        imageUrl: dto.imageUrl ?? (dto.imageBase64 ? 'data:image/base64 (inline)' : null),
        trustScore: trust.score,
        pointsAwarded: 0,
        status: trust.decision,
        metadata: {
          factors: trust.factors,
          extractor: extraction.extractor,
          extractedItems: extraction.items.length,
          purchasedAt: dto.purchasedAt ?? extraction.purchasedAt?.toISOString() ?? null,
        },
      }),
    );

    // 6) Si el reporte es confiable, se aplica al precio de la sucursal
    let priceChanged = false;
    let currentPrice = knownPrice;

    if (trust.decision === 'APPROVED') {
      const points = this.pointsFor(trust.score);
      report.pointsAwarded = points;

      if (existingPrice) {
        const previous = Number(existingPrice.currentPrice);
        priceChanged = previous !== dto.reportedPrice;
        existingPrice.currentPrice = dto.reportedPrice;
        if (dto.reportedListPrice) {
          existingPrice.listPrice = dto.reportedListPrice;
        }
        // El peso relativo del reporte de usuario vs el dato oficial.
        existingPrice.trustScore = this.blendTrustScore(existingPrice.trustScore, trust.score);
        await this.branchProductRepo.save(existingPrice);
        currentPrice = dto.reportedPrice;

        if (priceChanged) {
          await this.priceHistoryRepo.save(
            this.priceHistoryRepo.create({
              branchProductId: existingPrice.id,
              price: dto.reportedPrice,
              listPrice: dto.reportedListPrice ?? existingPrice.listPrice ?? null,
              source: SOURCE_USER_TICKET,
              sourceDate: extraction.purchasedAt ? new Date(extraction.purchasedAt) : new Date(),
              reportedByUserId: null,
            }),
          );
        }
      } else {
        // El producto no estaba en la sucursal: se agrega con el precio reportado.
        const created = await this.branchProductRepo.save(
          this.branchProductRepo.create({
            branchId: branch.id,
            productId: product.id,
            currentPrice: dto.reportedPrice,
            listPrice: dto.reportedListPrice ?? null,
            unitPrice: this.computeUnitPrice(dto.reportedPrice, product),
            inStock: true,
            trustScore: trust.score,
          }),
        );
        priceChanged = true;
        currentPrice = dto.reportedPrice;

        await this.priceHistoryRepo.save(
          this.priceHistoryRepo.create({
            branchProductId: created.id,
            price: dto.reportedPrice,
            listPrice: dto.reportedListPrice ?? null,
            source: SOURCE_USER_TICKET,
            sourceDate: extraction.purchasedAt ? new Date(extraction.purchasedAt) : new Date(),
            reportedByUserId: null,
          }),
        );
      }

      await this.reportRepo.save(report);
      await this.updateReputation(reputation, 'accepted', trust.score);
    } else {
      await this.updateReputation(reputation, trust.decision === 'REJECTED' ? 'rejected' : 'pending', trust.score);
    }

    const supermarket = branch.supermarket;

    return {
      reportId: report.id,
      status: trust.decision,
      trustScore: trust.score,
      pointsAwarded: report.pointsAwarded,
      factors: trust.factors,
      product: { id: product.id, name: product.name, eanCode: product.eanCode },
      branch: {
        id: branch.id,
        name: branch.branchName,
        supermarketName: supermarket?.name ?? 'Desconocida',
      },
      currentPrice,
      previousPrice: knownPrice,
      priceChanged,
      extractor: extraction.extractor,
      extractedItemsCount: extraction.items.length,
      message: this.messageFor(trust.decision, report.pointsAwarded),
    };
  }

  private async resolveProduct(dto: SubmitEvidenceDto): Promise<ProductEntity | null> {
    if (dto.productId) {
      const byId = await this.productRepo.findOne({ where: { id: dto.productId } });
      if (byId) return byId;
    }
    if (dto.eanCode) {
      return this.productRepo.findOne({ where: { eanCode: dto.eanCode } });
    }
    return null;
  }

  /** El ticket menciona el mismo producto (por EAN o nombre) con el mismo precio. */
  private isCorroborated(items: ExtractedItem[], product: ProductEntity, reportedPrice: number): boolean {
    return items.some((item) => {
      const sameEan = Boolean(item.eanCode) && item.eanCode === product.eanCode;
      const sameName = item.name.toLowerCase().includes(product.name.toLowerCase().split(' ')[0]);
      const samePrice = Math.abs(item.price - reportedPrice) < 1;
      return (sameEan || sameName) && samePrice;
    });
  }

  private async getOrCreateReputation(reporterId: string): Promise<ReporterReputationEntity> {
    const existing = await this.reputationRepo.findOne({ where: { reporterId } });
    if (existing) return existing;
    return this.reputationRepo.save(this.reputationRepo.create({ reporterId }));
  }

  private async updateReputation(
    reputation: ReporterReputationEntity,
    outcome: 'accepted' | 'rejected' | 'pending',
    trustScore: number,
  ): Promise<void> {
    // Los defaults los aplica la base, pero se acotan aqui para no depender de eso.
    reputation.reportsCount = (reputation.reportsCount ?? 0) + 1;
    if (outcome === 'accepted') {
      reputation.acceptedCount = (reputation.acceptedCount ?? 0) + 1;
      reputation.points = (reputation.points ?? 0) + this.pointsFor(trustScore);
    } else if (outcome === 'rejected') {
      reputation.rejectedCount = (reputation.rejectedCount ?? 0) + 1;
    }
    await this.reputationRepo.save(reputation);
  }

  /** Puntos = trustScore / 10 (0 a 10 por reporte aceptado). */
  private pointsFor(trustScore: number): number {
    return Math.round(trustScore / 10);
  }

  /**
   * El dato oficial pesa mas que un reporte individual: se promedia ponderando
   * por confianza, de modo que 1 ticket no pisa un precio oficial.
   */
  private blendTrustScore(current: number, incoming: number): number {
    const currentScore = Number(current) || 100;
    const incomingWeight = 1 - currentScore / 100;
    const blended = currentScore * (1 - incomingWeight) + incoming * incomingWeight;
    return Math.round(blended * 100) / 100;
  }

  private computeUnitPrice(price: number, product: ProductEntity): number {
    const content = Number(product.contentValue) || 1;
    if (product.measurementUnit === 'UNIT' || content <= 0) {
      return Math.round(price * 100) / 100;
    }
    return Math.round((price / content) * 100) / 100;
  }

  private messageFor(decision: 'APPROVED' | 'PENDING' | 'REJECTED', pointsAwarded: number): string {
    switch (decision) {
      case 'APPROVED':
        return `Reporte validado y aplicado al precio de la sucursal. Sumaste ${pointsAwarded} puntos de reputacion.`;
      case 'PENDING':
        return 'Reporte recibido. Quedo en revision: la evidencia no alcanza todavia para actualizar el precio.';
      default:
        return 'Reporte rechazado: no se pudo validar. Revisa la imagen y los datos cargados.';
    }
  }
}
