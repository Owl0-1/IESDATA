import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

export const REDIS_CLIENT = 'REDIS_CLIENT';

export function createRedisClient(config: ConfigService): Redis {
  const sentinelsRaw = config.get<string>('REDIS_SENTINELS')?.trim();
  const masterName = config.get<string>('REDIS_MASTER_NAME') ?? 'mymaster';

  if (sentinelsRaw) {
    const sentinels = sentinelsRaw.split(',').map((entry) => {
      const [host, port] = entry.trim().split(':');
      return { host, port: Number(port || 26379) };
    });
    return new Redis({
      sentinels,
      name: masterName,
      maxRetriesPerRequest: 1,
      enableReadyCheck: true,
      lazyConnect: false,
    });
  }

  const url = config.get<string>('REDIS_URL') ?? 'redis://localhost:6379';
  return new Redis(url, {
    maxRetriesPerRequest: 1,
    enableReadyCheck: true,
    lazyConnect: false,
  });
}
