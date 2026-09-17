import {
  createParamDecorator,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import type { SuperadminPrincipal } from '../../infrastructure/security/superadmin-jwt.strategy';

export const CurrentSuperadmin = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): SuperadminPrincipal => {
    const request = ctx
      .switchToHttp()
      .getRequest<
        Request & { user?: SuperadminPrincipal | { kind?: string } }
      >();
    const user = request.user;
    if (!user || user.kind !== 'superadmin') {
      throw new UnauthorizedException();
    }
    return user as SuperadminPrincipal;
  },
);
