import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { CursosModule } from './cursos/cursos.module';
import { GeoModule } from './geo/geo.module';
import { IesModule } from './ies/ies.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(helmet());
  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const corsOrigins = (process.env.CORS_ORIGINS ?? 'http://localhost:3000')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  app.enableCors({
    origin: corsOrigins,
    credentials: true,
  });

  const swaggerConfig = new DocumentBuilder()
    .setTitle('IESData API')
    .setDescription(
      'API de consumo: consulta a IES, cursos e geo (microdados INEP/MEC). Autenticação via X-API-Key.',
    )
    .setVersion('0.1.0')
    .addApiKey(
      { type: 'apiKey', name: 'X-API-Key', in: 'header' },
      'api-key',
    )
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig, {
    include: [IesModule, CursosModule, GeoModule],
  });
  SwaggerModule.setup('api/docs', app, document);

  const port = Number(process.env.PORT ?? 3001);
  await app.listen(port);
}

void bootstrap();
