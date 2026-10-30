import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { StoresModule } from './modules/stores/stores.module';
import { CatalogModule } from './modules/catalog/catalog.module';
import { PricingModule } from './modules/pricing/pricing.module';
import { CartModule } from './modules/cart/cart.module';
import { IngestionModule } from './modules/ingestion/ingestion.module';
import { EvidenceModule } from './modules/evidence/evidence.module';
import { resolvePostgresConfig } from './common/infrastructure/database/db-config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    EventEmitterModule.forRoot(),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        ...resolvePostgresConfig({
          DB_HOST: configService.get<string>('DB_HOST'),
          DB_PORT: configService.get<string>('DB_PORT'),
          DB_USERNAME: configService.get<string>('DB_USERNAME'),
          DB_PASSWORD: configService.get<string>('DB_PASSWORD'),
          DB_NAME: configService.get<string>('DB_NAME'),
          DATABASE_URL: configService.get<string>('DATABASE_URL'),
        }),
        autoLoadEntities: true,
        // En runtime NO se sincroniza el esquema automáticamente.
        // El esquema se crea/actualiza con `npm run seed` (dev) o migraciones (prod).
        synchronize: configService.get<boolean>('DB_SYNCHRONIZE', false),
        logging: configService.get<boolean>('DB_LOGGING', true),
      }),
    }),
    StoresModule,
    CatalogModule,
    PricingModule,
    CartModule,
    IngestionModule,
    EvidenceModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
