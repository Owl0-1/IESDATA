import { HttpException, HttpStatus } from '@nestjs/common';

export type UsageDenialCode =
  | 'DAILY_QUOTA_EXCEEDED'
  | 'RATE_LIMIT_EXCEEDED';

export function throwDailyQuotaExceeded(params: {
  quotaDaily: number;
  used: number;
  resetAt: string;
}): never {
  throw new HttpException(
    {
      statusCode: HttpStatus.TOO_MANY_REQUESTS,
      code: 'DAILY_QUOTA_EXCEEDED' satisfies UsageDenialCode,
      message: `Limite diário da conta atingido (${params.quotaDaily} requisições). O limite é por conta, não por API key. Renova à meia-noite (America/Sao_Paulo).`,
      quotaDaily: params.quotaDaily,
      used: params.used,
      resetAt: params.resetAt,
    },
    HttpStatus.TOO_MANY_REQUESTS,
  );
}

export function throwRateLimitExceeded(params: {
  limit: number;
  windowSeconds: number;
}): never {
  throw new HttpException(
    {
      statusCode: HttpStatus.TOO_MANY_REQUESTS,
      code: 'RATE_LIMIT_EXCEEDED' satisfies UsageDenialCode,
      message: `Mais de ${params.limit} requisições por minuto nesta API key. Aguarde e tente novamente.`,
      limit: params.limit,
      windowSeconds: params.windowSeconds,
    },
    HttpStatus.TOO_MANY_REQUESTS,
  );
}
