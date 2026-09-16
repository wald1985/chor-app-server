import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ResolveMembershipUseCase } from '../../application/use-cases/resolve-membership.use-case';
import { CommunityMembership } from '../../domain/entities/community-membership.entity';
import { NotCommunityMemberError } from '../../domain/errors/identity.errors';
import { CommunityPermission } from '../../domain/value-objects/community-permission';
import { CommunityRole } from '../../domain/value-objects/community-role';
import { CommunityContext } from '../decorators/current-membership.decorator';
import {
  REQUIRE_PERMISSION_KEY,
  REQUIRE_ROLE_KEY,
} from '../decorators/require-permission.decorator';

@Injectable()
export class CommunityMemberGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly resolveMembershipUseCase: ResolveMembershipUseCase,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{
      params?: { communityId?: string };
      user?: { id?: string };
      membership?: CommunityContext;
    }>();

    const communityId = request.params?.communityId;
    if (!communityId) {
      throw new InternalServerErrorException(
        'CommunityMemberGuard requires :communityId route param',
      );
    }

    const userId = request.user?.id;
    if (!userId) {
      throw new UnauthorizedException();
    }

    const membership = await this.resolveMembership(userId, communityId);
    this.verifyRole(membership, context);
    this.verifyPermission(membership, context);

    request.membership = {
      membershipId: membership.id,
      communityId: membership.communityId,
      role: membership.role,
      permissions: membership.effectivePermissions(),
    };

    return true;
  }

  private async resolveMembership(
    userId: string,
    communityId: string,
  ): Promise<CommunityMembership> {
    try {
      return await this.resolveMembershipUseCase.execute(userId, communityId);
    } catch (error) {
      if (error instanceof NotCommunityMemberError) {
        throw new ForbiddenException({
          statusCode: 403,
          error: 'Forbidden',
          message: 'Not a member of this community',
          code: 'NOT_COMMUNITY_MEMBER',
        });
      }
      throw error;
    }
  }

  private verifyRole(
    membership: CommunityMembership,
    context: ExecutionContext,
  ): void {
    const requiredRole = this.reflector.getAllAndOverride<CommunityRole>(
      REQUIRE_ROLE_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (requiredRole && membership.role !== requiredRole) {
      throw new ForbiddenException({
        statusCode: 403,
        error: 'Forbidden',
        message: `Role ${requiredRole} is required`,
        code: 'PERMISSION_DENIED',
        required: requiredRole,
      });
    }
  }

  private verifyPermission(
    membership: CommunityMembership,
    context: ExecutionContext,
  ): void {
    const requiredPermission =
      this.reflector.getAllAndOverride<CommunityPermission>(
        REQUIRE_PERMISSION_KEY,
        [context.getHandler(), context.getClass()],
      );

    if (requiredPermission && !membership.hasPermission(requiredPermission)) {
      throw new ForbiddenException({
        statusCode: 403,
        error: 'Forbidden',
        message: `Permission ${requiredPermission} is required`,
        code: 'PERMISSION_DENIED',
        required: requiredPermission,
      });
    }
  }
}
