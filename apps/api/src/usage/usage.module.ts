import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ApiQuotaAccountDaily } from './entities/api-quota-account-daily.entity';
import { ApiThrottleMinute } from './entities/api-throttle-minute.entity';
import { ApiUsageDaily } from './entities/api-usage-daily.entity';
import { createRedisClient, REDIS_CLIENT } from './redis.provider';
import { UsageController } from './usage.controller';
import { UsageService } from './usage.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ApiUsageDaily,
      ApiQuotaAccountDaily,
      ApiThrottleMinute,
    ]),
  ],
  controllers: [UsageController],
  providers: [
    {
      provide: REDIS_CLIENT,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => createRedisClient(config),
    },
    UsageService,
  ],
  exports: [UsageService],
})
export class UsageModule {}
