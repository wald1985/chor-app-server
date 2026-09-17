import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { SuperAdminGuard } from './super-admin.guard';

describe('SuperAdminGuard', () => {
  let guard: SuperAdminGuard;

  beforeEach(() => {
    guard = new SuperAdminGuard();
  });

  const createMockContext = (
    request: Record<string, unknown>,
  ): ExecutionContext =>
    ({
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    }) as unknown as ExecutionContext;

  it('should allow access when request.user is present', () => {
    const context = createMockContext({ user: { id: 'user-1' } });
    expect(guard.canActivate(context)).toBe(true);
  });

  it('should throw UnauthorizedException when request.user is missing', () => {
    const context = createMockContext({});
    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
  });
});
