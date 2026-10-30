import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TrustScoreService } from './application/services/trust-score.service';
import {
  AzureDocumentIntelligenceExtractor,
  ProvidedItemsExtractor,
  ReceiptExtractor,
} from './application/services/receipt-extractor';
import { SubmitEvidenceUseCase } from './application/use-cases/submit-evidence.use-case';
import { EvidenceController } from './presentation/http/evidence.controller';
import { PriceReportEntity } from './infrastructure/persistence/entities/price-report.entity';
import { ReporterReputationEntity } from './infrastructure/persistence/entities/reporter-reputation.entity';
import { StoreBranchEntity } from '../stores/infrastructure/persistence/entities/store-branch.entity';
import { ProductEntity } from '../catalog/infrastructure/persistence/entities/product.entity';
import { BranchProductEntity } from '../pricing/infrastructure/persistence/entities/branch-product.entity';
import { PriceHistoryEntity } from '../pricing/infrastructure/persistence/entities/price-history.entity';

/**
 * Loop de datos por comunidad: los usuarios reportan precios con evidencia
 * (foto de ticket) y el sistema valida cada reporte con un TrustScore.
 *
 * Complementa a SEPA, que solo cubre las grandes cadenas.
 */
@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([
      PriceReportEntity,
      ReporterReputationEntity,
      StoreBranchEntity,
      ProductEntity,
      BranchProductEntity,
      PriceHistoryEntity,
    ]),
  ],
  controllers: [EvidenceController],
  providers: [
    TrustScoreService,
    AzureDocumentIntelligenceExtractor,
    ProvidedItemsExtractor,
    SubmitEvidenceUseCase,
    {
      // Se usa Azure si hay credenciales; si no, el extractor por defecto.
      provide: ReceiptExtractor,
      inject: [AzureDocumentIntelligenceExtractor, ProvidedItemsExtractor],
      useFactory: (azure: AzureDocumentIntelligenceExtractor, provided: ProvidedItemsExtractor): ReceiptExtractor =>
        azure.isAvailable() ? azure : provided,
    },
  ],
  exports: [SubmitEvidenceUseCase, TrustScoreService],
})
export class EvidenceModule {}
