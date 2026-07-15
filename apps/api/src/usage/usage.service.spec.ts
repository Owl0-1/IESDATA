import { HttpException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  calendarDay,
  nextResetAtIso,
  UsageService,
} from './usage.service';

describe('UsageService helpers', () => {
  it('calendarDay uses America/Sao_Paulo', () => {
    // 2026-07-16 02:30 UTC = still 2026-07-15 in SP (UTC-3)
    const day = calendarDay(new Date('2026-07-16T02:30:00.000Z'));
    expect(day).toBe('2026-07-15');
  });

  it('nextResetAtIso is next midnight SP as UTC', () => {
    const reset = nextResetAtIso(new Date('2026-07-15T18:00:00.000Z'));
    expect(reset).toBe('2026-07-16T03:00:00.000Z');
  });
});

describe('UsageService.checkAndConsume', () => {
  function buildService(overrides: {
    evalImpl?: (...args: unknown[]) => Promise<unknown>;
    accountUsed?: number;
  }) {
    const redis = {
      eval: jest.fn(overrides.evalImpl ?? (async () => [2, 1, 1, 1999])),
      get: jest.fn(async () => null),
      quit: jest.fn(async () => 'OK'),
    };
    const usageRepo = {
      query: jest.fn(async () => undefined),
      createQueryBuilder: jest.fn(),
    };
    const quotaRepo = {
      findOne: jest.fn(async () =>
        overrides.accountUsed != null
          ? { requestCount: overrides.accountUsed }
          : null,
      ),
      query: jest.fn(async () => [{ request_count: (overrides.accountUsed ?? 0) + 1 }]),
    };
    const throttleRepo = {
      query: jest.fn(async () => [{ request_count: 1 }]),
    };
    const config = {
      get: (key: string) => {
        if (key === 'DAILY_REQUEST_QUOTA') return '2000';
        if (key === 'THROTTLE_API_KEY_LIMIT') return '120';
        return undefined;
      },
    } as unknown as ConfigService;

    const service = new UsageService(
      usageRepo as never,
      quotaRepo as never,
      throttleRepo as never,
      redis as never,
      config,
    );
    return { service, redis, usageRepo, quotaRepo, throttleRepo };
  }

  it('allows request under quota via Redis', async () => {
    const { service, redis } = buildService({
      evalImpl: async () => [2, 10, 3, 1990],
      accountUsed: 9,
    });
    const result = await service.checkAndConsume('user-1', 'key-1');
    expect(result.source).toBe('redis');
    expect(result.requestsToday).toBe(10);
    expect(result.remainingToday).toBe(1990);
    expect(redis.eval).toHaveBeenCalled();
  });

  it('throws DAILY_QUOTA_EXCEEDED when Redis reports over quota', async () => {
    const { service } = buildService({
      evalImpl: async () => [1, 2000, 5, 0],
      accountUsed: 2000,
    });
    try {
      await service.checkAndConsume('user-1', 'key-1');
      fail('expected HttpException');
    } catch (err) {
      expect(err).toBeInstanceOf(HttpException);
      const body = (err as HttpException).getResponse() as { code: string };
      expect(body.code).toBe('DAILY_QUOTA_EXCEEDED');
    }
  });

  it('falls back to Postgres when Redis fails', async () => {
    const { service, quotaRepo, throttleRepo } = buildService({
      evalImpl: async () => {
        throw Object.assign(new Error('connect ECONNREFUSED'), {
          code: 'ECONNREFUSED',
        });
      },
      accountUsed: 0,
    });
    const result = await service.checkAndConsume('user-1', 'key-1');
    expect(result.source).toBe('postgres');
    expect(throttleRepo.query).toHaveBeenCalled();
    expect(quotaRepo.query).toHaveBeenCalled();
  });
});
