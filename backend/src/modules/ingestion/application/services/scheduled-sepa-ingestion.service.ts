import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IngestSepaPricesUseCase } from '../use-cases/ingest-sepa-prices.use-case';

/**
 * Corre la ingesta de SEPA una vez por dia.
 *
 * SEPA publica los precios a diario, asi que tiene sentido refrescar temprano.
 * Se activa con:
 *   SEPA_AUTO_INGEST=true
 *   SEPA_INGEST_LAT=-34.8207
 *   SEPA_INGEST_LNG=-57.9675
 *   SEPA_INGEST_RADIUS=10
 *   SEPA_INGEST_HOUR=6        (hora local, 0-23)
 *
 * No usa BullMQ a proposito: es un unico job diario y no vale la pena levantar
 * Redis para eso (Redis sigue siendo parte del roadmap).
 */
@Injectable()
export class ScheduledSepaIngestionService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ScheduledSepaIngestionService.name);
  private timer?: NodeJS.Timeout;

  private readonly enabled: boolean;
  private readonly latitude: number;
  private readonly longitude: number;
  private readonly radiusKm: number;
  private readonly hour: number;
  private readonly maxBranches: number;
  private readonly maxProductsPerBranch: number;

  constructor(
    private readonly config: ConfigService,
    private readonly ingestUseCase: IngestSepaPricesUseCase,
  ) {
    this.enabled = this.config.get<boolean>('SEPA_AUTO_INGEST', false);
    this.latitude = this.config.get<number>('SEPA_INGEST_LAT', -34.8207);
    this.longitude = this.config.get<number>('SEPA_INGEST_LNG', -57.9675);
    this.radiusKm = this.config.get<number>('SEPA_INGEST_RADIUS', 10);
    this.hour = this.config.get<number>('SEPA_INGEST_HOUR', 6);
    this.maxBranches = this.config.get<number>('SEPA_INGEST_MAX_BRANCHES', 5);
    this.maxProductsPerBranch = this.config.get<number>('SEPA_INGEST_MAX_PRODUCTS', 300);
  }

  onModuleInit(): void {
    if (!this.enabled) {
      this.logger.log('Ingesta automatica de SEPA: DESACTIVADA (SEPA_AUTO_INGEST=false).');
      return;
    }

    this.schedule();
    this.logger.log(
      `Ingesta automatica de SEPA: ACTIVADA. Corrara todos los dias a las ${String(this.hour).padStart(2, '0')}:00 ` +
        `para (${this.latitude}, ${this.longitude}) radio ${this.radiusKm} km.`,
    );
  }

  onModuleDestroy(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = undefined;
    }
  }

  /** Programa la proxima ejecucion y se rearma al terminar. */
  private schedule(): void {
    const now = new Date();
    const next = new Date(now);
    next.setHours(this.hour, 0, 0, 0);
    if (next <= now) {
      next.setDate(next.getDate() + 1);
    }

    const delay = next.getTime() - now.getTime();
    this.logger.log(`Proxima ingesta de SEPA en ${Math.round(delay / 60000)} minutos.`);

    this.timer = setTimeout(async () => {
      await this.runOnce();
      this.schedule();
    }, delay);

    // No mantiene vivo el proceso solo por el timer.
    this.timer.unref?.();
  }

  /** Ejecuta la ingesta una vez. Publica para poder dispararla desde la CLI/tests. */
  async runOnce(): Promise<void> {
    try {
      const result = await this.ingestUseCase.execute({
        latitude: this.latitude,
        longitude: this.longitude,
        radiusKm: this.radiusKm,
        maxBranches: this.maxBranches,
        maxProductsPerBranch: this.maxProductsPerBranch,
        delayMs: 250,
      });
      this.logger.log(
        `Ingesta programada: ${result.branchesProcessed} sucursales, ` +
          `${result.pricesUpserted} precios, ${result.priceChanges} cambios.`,
      );
    } catch (error) {
      this.logger.error(`Fallo la ingesta programada de SEPA: ${(error as Error).message}`);
    }
  }
}
