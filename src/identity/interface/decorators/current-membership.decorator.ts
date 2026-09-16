import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { CommunityPermission } from '../../domain/value-objects/community-permission';
import { CommunityRole } from '../../domain/value-objects/community-role';

export interface CommunityContext {
  membershipId: string;
  communityId: string;
  role: CommunityRole;
  permissions: CommunityPermission[];
}

export const CurrentMembership = createParamDecorator(
  (
    data: keyof CommunityContext | undefined,
    ctx: ExecutionContext,
  ): CommunityContext | CommunityContext[keyof CommunityContext] | null => {
    const request = ctx
      .switchToHttp()
      .getRequest<{ membership?: CommunityContext }>();
    const membership = request.membership;
    if (!membership) {
      return null;
    }
    return data ? membership[data] : membership;
  },
);
