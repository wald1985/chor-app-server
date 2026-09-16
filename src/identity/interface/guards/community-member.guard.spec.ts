import {
  ExecutionContext,
  ForbiddenException,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ResolveMembershipUseCase } from '../../application/use-cases/resolve-membership.use-case';
import { CommunityMembership } from '../../domain/entities/community-membership.entity';
import { NotCommunityMemberError } from '../../domain/errors/identity.errors';
import { CommunityPermission } from '../../domain/value-objects/community-permission';
import { CommunityRole } from '../../domain/value-objects/community-role';
import { CommunityMemberGuard } from './community-member.guard';

describe('CommunityMemberGuard', () => {
  let guard: CommunityMemberGuard;
  let reflector: jest.Mocked<Reflector>;
  let resolveMembershipUseCase: jest.Mocked<ResolveMembershipUseCase>;

  beforeEach(() => {
    reflector = {
      getAllAndOverride: jest.fn(),
    } as unknown as jest.Mocked<Reflector>;

    resolveMembershipUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<ResolveMembershipUseCase>;

    guard = new CommunityMemberGuard(reflector, resolveMembershipUseCase);
  });

  function createMockExecutionContext(params?: {
    communityId?: string;
    user?: { id?: string };
    request?: Record<string, any>;
  }): ExecutionContext {
    const request = {
      params: params?.communityId ? { communityId: params.communityId } : {},
      user: params?.user,
      ...params?.request,
    };

    return {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as unknown as ExecutionContext;
  }

  it('throws InternalServerErrorException when :communityId param is missing', async () => {
    const context = createMockExecutionContext({
      user: { id: 'u1' },
    });

    await expect(guard.canActivate(context)).rejects.toThrow(
      InternalServerErrorException,
    );
  });

  it('throws UnauthorizedException when user is not present', async () => {
    const context = createMockExecutionContext({
      communityId: 'c1',
    });

    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('throws ForbiddenException with NOT_COMMUNITY_MEMBER when not a member', async () => {
    const context = createMockExecutionContext({
      communityId: 'c1',
      user: { id: 'u1' },
    });

    resolveMembershipUseCase.execute.mockRejectedValue(
      new NotCommunityMemberError(),
    );

    await expect(guard.canActivate(context)).rejects.toThrow(
      ForbiddenException,
    );

    try {
      await guard.canActivate(context);
    } catch (err) {
      expect((err as ForbiddenException).getResponse()).toMatchObject({
        code: 'NOT_COMMUNITY_MEMBER',
      });
    }
  });

  it('allows member without requirements and sets request.membership', async () => {
    const context = createMockExecutionContext({
      communityId: 'c1',
      user: { id: 'u1' },
    });

    const membership = new CommunityMembership({
      id: 'm1',
      userId: 'u1',
      communityId: 'c1',
      role: CommunityRole.MEMBER,
      permissions: [],
      createdAt: new Date(),
    });

    resolveMembershipUseCase.execute.mockResolvedValue(membership);
    reflector.getAllAndOverride.mockReturnValue(undefined);

    const result = await guard.canActivate(context);
    expect(result).toBe(true);

    const request = context.switchToHttp().getRequest<any>();
    expect(request.membership).toEqual({
      membershipId: 'm1',
      communityId: 'c1',
      role: CommunityRole.MEMBER,
      permissions: [],
    });
  });

  it('throws ForbiddenException with PERMISSION_DENIED for MEMBER without required permission', async () => {
    const context = createMockExecutionContext({
      communityId: 'c1',
      user: { id: 'u1' },
    });

    const membership = new CommunityMembership({
      id: 'm1',
      userId: 'u1',
      communityId: 'c1',
      role: CommunityRole.MEMBER,
      permissions: [],
      createdAt: new Date(),
    });

    resolveMembershipUseCase.execute.mockResolvedValue(membership);
    reflector.getAllAndOverride.mockImplementation((key) => {
      if (key === 'require_permission')
        return CommunityPermission.PEOPLE_MANAGE;
      return undefined;
    });

    try {
      await guard.canActivate(context);
      fail('expected error');
    } catch (err) {
      expect((err as ForbiddenException).getResponse()).toMatchObject({
        code: 'PERMISSION_DENIED',
        required: CommunityPermission.PEOPLE_MANAGE,
      });
    }
  });

  it('allows MEMBER with required permission', async () => {
    const context = createMockExecutionContext({
      communityId: 'c1',
      user: { id: 'u1' },
    });

    const membership = new CommunityMembership({
      id: 'm1',
      userId: 'u1',
      communityId: 'c1',
      role: CommunityRole.MEMBER,
      permissions: [CommunityPermission.PEOPLE_MANAGE],
      createdAt: new Date(),
    });

    resolveMembershipUseCase.execute.mockResolvedValue(membership);
    reflector.getAllAndOverride.mockImplementation((key) => {
      if (key === 'require_permission')
        return CommunityPermission.PEOPLE_MANAGE;
      return undefined;
    });

    const result = await guard.canActivate(context);
    expect(result).toBe(true);
  });

  it('allows ADMINISTRATOR even if required permission was not in stored permissions', async () => {
    const context = createMockExecutionContext({
      communityId: 'c1',
      user: { id: 'u1' },
    });

    const membership = new CommunityMembership({
      id: 'm1',
      userId: 'u1',
      communityId: 'c1',
      role: CommunityRole.ADMINISTRATOR,
      permissions: [],
      createdAt: new Date(),
    });

    resolveMembershipUseCase.execute.mockResolvedValue(membership);
    reflector.getAllAndOverride.mockImplementation((key) => {
      if (key === 'require_permission')
        return CommunityPermission.PEOPLE_MANAGE;
      return undefined;
    });

    const result = await guard.canActivate(context);
    expect(result).toBe(true);
  });

  it('throws ForbiddenException with PERMISSION_DENIED when RequireRole is not satisfied', async () => {
    const context = createMockExecutionContext({
      communityId: 'c1',
      user: { id: 'u1' },
    });

    const membership = new CommunityMembership({
      id: 'm1',
      userId: 'u1',
      communityId: 'c1',
      role: CommunityRole.MEMBER,
      createdAt: new Date(),
    });

    resolveMembershipUseCase.execute.mockResolvedValue(membership);
    reflector.getAllAndOverride.mockImplementation((key) => {
      if (key === 'require_role') return CommunityRole.ADMINISTRATOR;
      return undefined;
    });

    try {
      await guard.canActivate(context);
      fail('expected error');
    } catch (err) {
      expect((err as ForbiddenException).getResponse()).toMatchObject({
        code: 'PERMISSION_DENIED',
        required: CommunityRole.ADMINISTRATOR,
      });
    }
  });

  it('allows user when RequireRole is satisfied', async () => {
    const context = createMockExecutionContext({
      communityId: 'c1',
      user: { id: 'u1' },
    });

    const membership = new CommunityMembership({
      id: 'm1',
      userId: 'u1',
      communityId: 'c1',
      role: CommunityRole.ADMINISTRATOR,
      createdAt: new Date(),
    });

    resolveMembershipUseCase.execute.mockResolvedValue(membership);
    reflector.getAllAndOverride.mockImplementation((key) => {
      if (key === 'require_role') return CommunityRole.ADMINISTRATOR;
      return undefined;
    });

    const result = await guard.canActivate(context);
    expect(result).toBe(true);
  });
});
