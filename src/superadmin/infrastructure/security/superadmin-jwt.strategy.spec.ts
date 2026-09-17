import { ConfigService } from '@nestjs/config';
import { Superadmin } from '../../domain/entities/superadmin.entity';
import type { SuperadminRepository } from '../../domain/ports/superadmin-repository.port';
import { SuperadminJwtStrategy } from './superadmin-jwt.strategy';

function makeSuperadmin(tokenVersion = 0): Superadmin {
  return Superadmin.create({
    id: 'sa-1',
    email: 'sa@example.org',
    name: 'Alex',
    passwordHash: 'hash',
    tokenVersion,
  });
}

function makeConfigService(): ConfigService {
  return {
    getOrThrow: () => 'test-secret',
  } as unknown as ConfigService;
}

function makeRepo(
  overrides: Partial<SuperadminRepository>,
): SuperadminRepository {
  return {
    findById: jest.fn(),
    findByEmail: jest.fn(),
    list: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    updatePasswordHash: jest.fn(),
    deleteKeepingAtLeastOne: jest.fn(),
    ...overrides,
  };
}

describe('SuperadminJwtStrategy', () => {
  // Resolving null (a Passport "fail") rather than throwing (a Passport
  // "error") lets UserOrSuperadminAuthGuard fall through to the jwt
  // strategy instead of aborting.
  it('resolves null when no matching superadmin exists', async () => {
    const repo = makeRepo({ findById: jest.fn().mockResolvedValue(null) });
    const strategy = new SuperadminJwtStrategy(makeConfigService(), repo);

    const result = await strategy.validate({
      sub: 'sa-1',
      email: 'sa@example.org',
      tokenVersion: 0,
    });
    expect(result).toBeNull();
  });

  it('resolves null when tokenVersion does not match', async () => {
    const repo = makeRepo({
      findById: jest.fn().mockResolvedValue(makeSuperadmin(2)),
    });
    const strategy = new SuperadminJwtStrategy(makeConfigService(), repo);

    const result = await strategy.validate({
      sub: 'sa-1',
      email: 'sa@example.org',
      tokenVersion: 1,
    });
    expect(result).toBeNull();
  });

  it('resolves a principal without the password hash on success', async () => {
    const repo = makeRepo({
      findById: jest.fn().mockResolvedValue(makeSuperadmin(0)),
    });
    const strategy = new SuperadminJwtStrategy(makeConfigService(), repo);

    const principal = await strategy.validate({
      sub: 'sa-1',
      email: 'sa@example.org',
      tokenVersion: 0,
    });

    expect(principal).toEqual({
      kind: 'superadmin',
      id: 'sa-1',
      email: 'sa@example.org',
      name: 'Alex',
    });
    expect(principal).not.toHaveProperty('passwordHash');
  });
});
