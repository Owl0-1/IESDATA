import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { createHash } from 'crypto';
import { Request, Response } from 'express';
import { UsageService } from '../usage/usage.service';
import { ApiKeysService } from './api-keys.service';
import { IS_API_KEY_ROUTE } from './decorators/api-key-route.decorator';

type RequestWithApiKey = Request & { apiKeyId?: string; apiKeyUserId?: string };

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly apiKeysService: ApiKeysService,
    private readonly usageService: UsageService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isApiKeyRoute = this.reflector.getAllAndOverride<boolean>(
      IS_API_KEY_ROUTE,
      [context.getHandler(), context.getClass()],
    );
    if (!isApiKeyRoute) {
      return true;
    }

    const http = context.switchToHttp();
    const req = http.getRequest<RequestWithApiKey>();
    const res = http.getResponse<Response>();
    const header = req.header('x-api-key');
    if (!header) {
      throw new UnauthorizedException('X-API-Key obrigatório');
    }

    const keyHash = createHash('sha256').update(header).digest('hex');
    const apiKey = await this.apiKeysService.findActiveByHash(keyHash);
    if (!apiKey) {
      throw new UnauthorizedException('API Key inválida ou revogada');
    }

    req.apiKeyId = apiKey.id;
    req.apiKeyUserId = apiKey.userId;
    void this.apiKeysService.touchLastUsed(apiKey.id);

    const usage = await this.usageService.checkAndConsume(
      apiKey.userId,
      apiKey.id,
    );

    res.setHeader('X-Quota-Limit', String(this.usageService.getQuotaDaily()));
    res.setHeader('X-Quota-Remaining', String(usage.remainingToday));
    res.setHeader('X-Quota-Reset', usage.resetAt);
    res.setHeader(
      'X-RateLimit-Limit',
      String(this.usageService.getApiKeyRateLimit()),
    );
    res.setHeader('X-RateLimit-Remaining', String(usage.rateLimitRemaining));

    return true;
  }
}
