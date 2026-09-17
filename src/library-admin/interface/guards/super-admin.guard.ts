import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

/**
 * SuperAdminGuard stub.
 *
 * References:
 * - ADR 0010 §6: Catalog editing is restricted to superadmin.
 * - OQ-3: Before capability SuperAdmin is introduced, any authenticated user
 *   passes this guard. However, JWT is required, so request.user must exist.
 */
@Injectable()
export class SuperAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{
      user?: unknown;
    }>();

    if (!request.user) {
      throw new UnauthorizedException('Authentication required');
    }

    return true;
  }
}
