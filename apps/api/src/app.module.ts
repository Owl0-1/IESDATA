import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ApiKeyGuard } from './api-keys/api-key.guard';
import { ApiKeysModule } from './api-keys/api-keys.module';
import { ApiKey } from './api-keys/entities/api-key.entity';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { Curso } from './cursos/entities/curso.entity';
import { CursosModule } from './cursos/cursos.module';
import { GeoModule } from './geo/geo.module';
import { HealthModule } from './health/health.module';
import { Ies } from './ies/entities/ies.entity';
import { IesModule } from './ies/ies.module';
import { ApiQuotaAccountDaily } from './usage/entities/api-quota-account-daily.entity';
import { ApiThrottleMinute } from './usage/entities/api-throttle-minute.entity';
import { ApiUsageDaily } from './usage/entities/api-usage-daily.entity';
import { UsageModule } from './usage/usage.module';
import { User } from './users/entities/user.entity';

const PLACEHOLDER_JWT_SECRETS = new Set([
  'change-me-access-min-32-chars-long!!',
  'change-me-refresh-min-32-chars-long!',
]);

function validateEnv(env: Record<string, unknown>) {
  for (const key of ['JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET']) {
    const value = env[key];
    if (typeof value !== 'string' || value.length < 32) {
      throw new Error(`${key} deve ter pelo menos 32 caracteres.`);
    }
    if (PLACEHOLDER_JWT_SECRETS.has(value)) {
      throw new Error(
        `${key} está com o valor placeholder do .env.example. Gere um segredo forte (ex.: openssl rand -hex 32) antes de subir a API.`,
      );
    }
  }
  return env;
}

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../../.env'],
      validate: validateEnv,
    }),
    ThrottlerModule.forRoot({
      throttlers: [
        {
          ttl: Number(process.env.THROTTLE_TTL_MS ?? 60_000),
          limit: Number(process.env.THROTTLE_LIMIT ?? 60),
        },
      ],
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres' as const,
        url: config.getOrThrow<string>('DATABASE_URL'),
        entities: [
          User,
          ApiKey,
          ApiUsageDaily,
          ApiQuotaAccountDaily,
          ApiThrottleMinute,
          Ies,
          Curso,
        ],
        synchronize: config.get<string>('NODE_ENV') !== 'production',
      }),
    }),
    HealthModule,
    AuthModule,
    ApiKeysModule,
    UsageModule,
    GeoModule,
    IesModule,
    CursosModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: ApiKeyGuard },
  ],
})
export class AppModule {}
