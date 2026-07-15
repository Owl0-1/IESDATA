import {
  HttpException,
  Inject,
  Injectable,
  Logger,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import Redis from 'ioredis';
import { Repository } from 'typeorm';
import { ApiKey } from '../api-keys/entities/api-key.entity';
import { ApiQuotaAccountDaily } from './entities/api-quota-account-daily.entity';
import { ApiThrottleMinute } from './entities/api-throttle-minute.entity';
import { ApiUsageDaily } from './entities/api-usage-daily.entity';
import { REDIS_CLIENT } from './redis.provider';
import {
  throwDailyQuotaExceeded,
  throwRateLimitExceeded,
} from './usage.errors';

const DAY_TZ = 'America/Sao_Paulo';

/** Calendar day in the product timezone → YYYY-MM-DD */
export function calendarDay(date = new Date(), timeZone = DAY_TZ): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

/** Normalize pg DATE / Date / ISO string → YYYY-MM-DD */
function toDayKey(value: unknown): string {
  if (typeof value === 'string') {
    const iso = value.match(/^(\d{4}-\d{2}-\d{2})/);
    if (iso) return iso[1];
  }
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return calendarDay(value);
  }
  const raw = String(value ?? '');
  const iso = raw.match(/^(\d{4}-\d{2}-\d{2})/);
  if (iso) return iso[1];
  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) {
    return calendarDay(parsed);
  }
  return raw.slice(0, 10);
}

function addCalendarDays(day: string, offset: number): string {
  const base = new Date(`${day}T12:00:00.000Z`);
  base.setUTCDate(base.getUTCDate() + offset);
  return base.toISOString().slice(0, 10);
}

/** Next midnight America/Sao_Paulo (fixed UTC−3, sem horário de verão). */
export function nextResetAtIso(from = new Date()): string {
  const tomorrow = addCalendarDays(calendarDay(from), 1);
  return new Date(`${tomorrow}T03:00:00.000Z`).toISOString();
}

function secondsUntilReset(from = new Date()): number {
  const reset = new Date(nextResetAtIso(from)).getTime();
  return Math.max(60, Math.ceil((reset - from.getTime()) / 1000));
}

function minuteBucketUtc(date = new Date()): Date {
  const d = new Date(date);
  d.setUTCSeconds(0, 0);
  return d;
}

const CONSUME_LUA = `
local rlKey = KEYS[1]
local quotaKey = KEYS[2]
local rlLimit = tonumber(ARGV[1])
local quotaLimit = tonumber(ARGV[2])
local rlTtl = tonumber(ARGV[3])
local quotaTtl = tonumber(ARGV[4])
local seed = tonumber(ARGV[5])

if redis.call('EXISTS', quotaKey) == 0 then
  redis.call('SET', quotaKey, seed, 'EX', quotaTtl)
end

local rl = redis.call('INCR', rlKey)
if rl == 1 then
  redis.call('EXPIRE', rlKey, rlTtl)
end
if rl > rlLimit then
  redis.call('DECR', rlKey)
  return {0, rlLimit, 0, 0}
end

local used = redis.call('INCR', quotaKey)
if used == 1 then
  redis.call('EXPIRE', quotaKey, quotaTtl)
end
if used > quotaLimit then
  redis.call('DECR', quotaKey)
  redis.call('DECR', rlKey)
  return {1, used - 1, rl, 0}
end

return {2, used, rl, quotaLimit - used}
`;

export type ConsumeResult = {
  requestsToday: number;
  remainingToday: number;
  rateLimitRemaining: number;
  resetAt: string;
  source: 'redis' | 'postgres';
};

@Injectable()
export class UsageService implements OnModuleDestroy {
  private readonly logger = new Logger(UsageService.name);

  constructor(
    @InjectRepository(ApiUsageDaily)
    private readonly usageRepo: Repository<ApiUsageDaily>,
    @InjectRepository(ApiQuotaAccountDaily)
    private readonly quotaRepo: Repository<ApiQuotaAccountDaily>,
    @InjectRepository(ApiThrottleMinute)
    private readonly throttleRepo: Repository<ApiThrottleMinute>,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    private readonly config: ConfigService,
  ) {}

  onModuleDestroy() {
    void this.redis.quit().catch(() => undefined);
  }

  getQuotaDaily(): number {
    return Number(this.config.get<string>('DAILY_REQUEST_QUOTA') ?? 2000);
  }

  getApiKeyRateLimit(): number {
    return Number(this.config.get<string>('THROTTLE_API_KEY_LIMIT') ?? 120);
  }

  /** Prefers account-daily table, falls back to sum of per-key rows. */
  async getAccountUsedToday(userId: string, day = calendarDay()): Promise<number> {
    const accountRow = await this.quotaRepo.findOne({
      where: { userId, day },
    });
    if (accountRow) return accountRow.requestCount;

    const todayRow = await this.usageRepo
      .createQueryBuilder('u')
      .select('COALESCE(SUM(u.request_count), 0)', 'total')
      .where('u.user_id = :userId', { userId })
      .andWhere('u.day = :today', { today: day })
      .getRawOne<{ total: string }>();
    return Number(todayRow?.total ?? 0);
  }

  async checkAndConsume(
    userId: string,
    apiKeyId: string,
  ): Promise<ConsumeResult> {
    try {
      const result = await this.consumeRedis(userId, apiKeyId);
      void this.persistAnalytics(userId, apiKeyId, result.requestsToday).catch(
        (err: unknown) =>
          this.logger.warn(`persistAnalytics failed: ${String(err)}`),
      );
      return result;
    } catch (err) {
      if (err instanceof HttpException) throw err;
      this.logger.warn(
        `Redis unavailable, falling back to Postgres: ${String(err)}`,
      );
      return this.consumePostgres(userId, apiKeyId);
    }
  }

  private async consumeRedis(
    userId: string,
    apiKeyId: string,
  ): Promise<ConsumeResult> {
    const day = calendarDay();
    const quotaDaily = this.getQuotaDaily();
    const rateLimit = this.getApiKeyRateLimit();
    const resetAt = nextResetAtIso();
    const ttl = secondsUntilReset();
    const seed = await this.getAccountUsedToday(userId, day);

    const rlKey = `rl:${apiKeyId}`;
    const quotaKey = `quota:${userId}:${day}`;

    const raw = (await this.redis.eval(
      CONSUME_LUA,
      2,
      rlKey,
      quotaKey,
      rateLimit,
      quotaDaily,
      60,
      ttl,
      seed,
    )) as [number, number, number, number];

    const [status, usedOrLimit, rlCount] = raw;

    if (status === 0) {
      throwRateLimitExceeded({ limit: rateLimit, windowSeconds: 60 });
    }
    if (status === 1) {
      throwDailyQuotaExceeded({
        quotaDaily,
        used: usedOrLimit,
        resetAt,
      });
    }

    return {
      requestsToday: usedOrLimit,
      remainingToday: Math.max(0, quotaDaily - usedOrLimit),
      rateLimitRemaining: Math.max(0, rateLimit - rlCount),
      resetAt,
      source: 'redis',
    };
  }

  private async consumePostgres(
    userId: string,
    apiKeyId: string,
  ): Promise<ConsumeResult> {
    const day = calendarDay();
    const quotaDaily = this.getQuotaDaily();
    const rateLimit = this.getApiKeyRateLimit();
    const resetAt = nextResetAtIso();
    const bucket = minuteBucketUtc();

    const throttleRows = await this.throttleRepo.query(
      `
      INSERT INTO api_throttle_minute (id, api_key_id, minute_bucket, request_count)
      VALUES (gen_random_uuid(), $1, $2::timestamptz, 1)
      ON CONFLICT (api_key_id, minute_bucket)
      DO UPDATE SET request_count = api_throttle_minute.request_count + 1
      WHERE api_throttle_minute.request_count < $3
      RETURNING request_count
      `,
      [apiKeyId, bucket.toISOString(), rateLimit],
    );

    if (!throttleRows?.length) {
      throwRateLimitExceeded({ limit: rateLimit, windowSeconds: 60 });
    }

    const quotaRows = await this.quotaRepo.query(
      `
      INSERT INTO api_quota_account_daily (id, user_id, day, request_count)
      VALUES (gen_random_uuid(), $1, $2::date, 1)
      ON CONFLICT (user_id, day)
      DO UPDATE SET request_count = api_quota_account_daily.request_count + 1
      WHERE api_quota_account_daily.request_count < $3
      RETURNING request_count
      `,
      [userId, day, quotaDaily],
    );

    if (!quotaRows?.length) {
      const used = await this.getAccountUsedToday(userId, day);
      throwDailyQuotaExceeded({
        quotaDaily,
        used: Math.max(used, quotaDaily),
        resetAt,
      });
    }

    const requestsToday = Number(quotaRows[0].request_count);
    await this.incrementKeyDaily(userId, apiKeyId, day);

    return {
      requestsToday,
      remainingToday: Math.max(0, quotaDaily - requestsToday),
      rateLimitRemaining: Math.max(
        0,
        rateLimit - Number(throttleRows[0].request_count),
      ),
      resetAt,
      source: 'postgres',
    };
  }

  private async persistAnalytics(
    userId: string,
    apiKeyId: string,
    requestsToday: number,
  ): Promise<void> {
    const day = calendarDay();
    await this.quotaRepo.query(
      `
      INSERT INTO api_quota_account_daily (id, user_id, day, request_count)
      VALUES (gen_random_uuid(), $1, $2::date, $3)
      ON CONFLICT (user_id, day)
      DO UPDATE SET request_count = GREATEST(api_quota_account_daily.request_count, EXCLUDED.request_count)
      `,
      [userId, day, requestsToday],
    );
    await this.incrementKeyDaily(userId, apiKeyId, day);
  }

  private async incrementKeyDaily(
    userId: string,
    apiKeyId: string,
    day: string,
  ): Promise<void> {
    await this.usageRepo.query(
      `
      INSERT INTO api_usage_daily (id, user_id, api_key_id, day, request_count)
      VALUES (gen_random_uuid(), $1, $2, $3::date, 1)
      ON CONFLICT (user_id, api_key_id, day)
      DO UPDATE SET request_count = api_usage_daily.request_count + 1
      `,
      [userId, apiKeyId, day],
    );
  }

  /** @deprecated use checkAndConsume — kept for tests / direct calls */
  async increment(userId: string, apiKeyId: string): Promise<void> {
    await this.checkAndConsume(userId, apiKeyId);
  }

  async getSummary(userId: string, days = 30) {
    const quotaDaily = this.getQuotaDaily();
    const today = calendarDay();
    const sinceDay = addCalendarDays(today, -(days - 1));
    const resetAt = nextResetAtIso();

    let requestsToday = await this.getAccountUsedToday(userId, today);
    try {
      const cached = await this.redis.get(`quota:${userId}:${today}`);
      if (cached != null) {
        requestsToday = Math.max(requestsToday, Number(cached));
      }
    } catch {
      // ignore — PG already loaded
    }

    const seriesRows = await this.usageRepo
      .createQueryBuilder('u')
      .select(`to_char(u.day, 'YYYY-MM-DD')`, 'day')
      .addSelect('COALESCE(SUM(u.request_count), 0)', 'count')
      .where('u.user_id = :userId', { userId })
      .andWhere('u.day >= :sinceDay', { sinceDay })
      .groupBy('u.day')
      .orderBy('u.day', 'ASC')
      .getRawMany<{ day: string; count: string }>();

    const byKeyRows = await this.usageRepo
      .createQueryBuilder('u')
      .innerJoin(ApiKey, 'k', 'k.id = u.api_key_id')
      .select('u.api_key_id', 'apiKeyId')
      .addSelect('k.name', 'name')
      .addSelect('COALESCE(SUM(u.request_count), 0)', 'count')
      .where('u.user_id = :userId', { userId })
      .andWhere('u.day = :today', { today })
      .groupBy('u.api_key_id')
      .addGroupBy('k.name')
      .orderBy('count', 'DESC')
      .getRawMany<{ apiKeyId: string; name: string; count: string }>();

    const countByDay = new Map(
      seriesRows.map((row) => [toDayKey(row.day), Number(row.count)]),
    );
    const series: { date: string; count: number }[] = [];
    for (let i = 0; i < days; i++) {
      const key = addCalendarDays(sinceDay, i);
      series.push({ date: key, count: countByDay.get(key) ?? 0 });
    }

    return {
      requestsToday,
      quotaDaily,
      remainingToday: Math.max(0, quotaDaily - requestsToday),
      resetPeriod: 'Daily' as const,
      paymentPeriod: 'None' as const,
      resetAt,
      series,
      byKey: byKeyRows.map((row) => ({
        apiKeyId: row.apiKeyId,
        name: row.name,
        count: Number(row.count),
      })),
    };
  }
}
