import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';
import { User } from '../../users/entities/user.entity';

type RequestWithUser = Request & { user?: User };

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): User => {
    const req = ctx.switchToHttp().getRequest<RequestWithUser>();
    return req.user as User;
  },
);
