import { ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from './decorators/public.decorator';
import { IS_API_KEY_ROUTE } from '../api-keys/decorators/api-key-route.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const isApiKeyRoute = this.reflector.getAllAndOverride<boolean>(
      IS_API_KEY_ROUTE,
      [context.getHandler(), context.getClass()],
    );
    if (isApiKeyRoute) {
      return true;
    }

    return super.canActivate(context);
  }
}
