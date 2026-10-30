import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT', 3000);
  const apiPrefix = configService.get<string>('API_PREFIX', 'api/v1');

  app.setGlobalPrefix(apiPrefix);

  // CORS con whitelist configurable (separada por comas en CORS_ORIGINS).
  // En desarrollo, si no se define, se permite cualquier origen.
  const corsOrigins = configService.get<string>('CORS_ORIGINS', '');
  const allowedOrigins = corsOrigins
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  app.enableCors({
    origin: allowedOrigins.length > 0 ? allowedOrigins : true,
  });

  // Cabeceras de seguridad HTTP estándar.
  // Se desactiva la Content-Security-Policy por defecto porque bloquea la Swagger UI de /docs.
  app.use(helmet({ contentSecurityPolicy: false }));

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Configuración de OpenAPI Swagger Documentation
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Plataforma Inteligente de Precios & Comparador de Supermercados')
    .setDescription(
      'API RESTful empresarial para geolocalización de sucursales, comparación de precios en tiempo real y optimización del carrito multi-tienda (NestJS + PostGIS).',
    )
    .setVersion('1.0.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document);

  await app.listen(port);
  logger.log(`🚀 Servidor backend escuchando en: http://localhost:${port}/${apiPrefix}`);
  logger.log(`📚 Documentación Swagger disponible en: http://localhost:${port}/docs`);
}

bootstrap();
