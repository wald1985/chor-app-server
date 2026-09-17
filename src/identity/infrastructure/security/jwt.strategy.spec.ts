import { ConfigService } from '@nestjs/config';
import { User } from '../../domain/entities/user.entity';
import type { UserRepository } from '../../domain/ports/user-repository.port';
import { JwtStrategy } from './jwt.strategy';

function makeUser(overrides?: Partial<{ tokenVersion: number }>): User {
  return new User({
    id: 'user-1',
    email: 'user@example.com',
    passwordHash: 'hash',
    tokenVersion: overrides?.tokenVersion ?? 0,
    name: 'User',
    createdAt: new Date(),
  });
}

function makeConfigService(): ConfigService {
  return {
    getOrThrow: () => 'test-secret',
  } as unknown as ConfigService;
}

describe('JwtStrategy', () => {
  it('resolves the user when payload has no aud claim', async () => {
    const userRepository: UserRepository = {
      findByEmail: jest.fn(),
      findById: jest.fn().mockResolvedValue(makeUser()),
      updatePasswordHash: jest.fn(),
    };
    const strategy = new JwtStrategy(makeConfigService(), userRepository);

    const result = await strategy.validate({
      sub: 'user-1',
      email: 'user@example.com',
      tokenVersion: 0,
    });

    expect(result).toEqual({
      id: 'user-1',
      email: 'user@example.com',
      name: 'User',
    });
  });

  // Returns null (a Passport "fail") rather than throwing (a Passport
  // "error"), so that UserOrSuperadminAuthGuard's multi-strategy AuthGuard
  // can fall through to the superadmin-jwt strategy instead of aborting.
  it('resolves null for a token with the superadmin audience, without looking up a user', async () => {
    const findById = jest.fn();
    const userRepository: UserRepository = {
      findByEmail: jest.fn(),
      findById,
      updatePasswordHash: jest.fn(),
    };
    const strategy = new JwtStrategy(makeConfigService(), userRepository);

    const result = await strategy.validate({
      sub: 'sa-1',
      email: 'sa@example.com',
      tokenVersion: 0,
      aud: 'chor-app-superadmin',
    });

    expect(result).toBeNull();
    expect(findById).not.toHaveBeenCalled();
  });

  it('resolves null for a token whose aud array contains the superadmin audience', async () => {
    const userRepository: UserRepository = {
      findByEmail: jest.fn(),
      findById: jest.fn(),
      updatePasswordHash: jest.fn(),
    };
    const strategy = new JwtStrategy(makeConfigService(), userRepository);

    const result = await strategy.validate({
      sub: 'sa-1',
      email: 'sa@example.com',
      tokenVersion: 0,
      aud: ['other', 'chor-app-superadmin'],
    });

    expect(result).toBeNull();
  });

  it('resolves null when tokenVersion does not match (regression)', async () => {
    const userRepository: UserRepository = {
      findByEmail: jest.fn(),
      findById: jest.fn().mockResolvedValue(makeUser({ tokenVersion: 2 })),
      updatePasswordHash: jest.fn(),
    };
    const strategy = new JwtStrategy(makeConfigService(), userRepository);

    const result = await strategy.validate({
      sub: 'user-1',
      email: 'user@example.com',
      tokenVersion: 1,
    });

    expect(result).toBeNull();
  });
});
