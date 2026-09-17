import { InvalidCredentialsError } from '../../../domain/errors/superadmin.errors';
import { Superadmin } from '../../../domain/entities/superadmin.entity';
import type { PasswordHasher } from '../../../domain/ports/password-hasher.port';
import type { SuperadminRepository } from '../../../domain/ports/superadmin-repository.port';
import type { SuperadminTokenIssuer } from '../../../domain/ports/superadmin-token-issuer.port';
import { DUMMY_HASH } from '../../../infrastructure/security/bcrypt-password-hasher';
import { LoginUseCase } from './login.use-case';

function makeSuperadmin(): Superadmin {
  return Superadmin.create({
    id: 'sa-1',
    email: 'alex@example.org',
    name: 'Alex',
    passwordHash: 'real-hash',
    tokenVersion: 3,
  });
}

describe('LoginUseCase', () => {
  it('throws InvalidCredentialsError for an unknown email, comparing against the dummy hash', async () => {
    const compare = jest.fn().mockResolvedValue(false);
    const repo: Partial<SuperadminRepository> = {
      findByEmail: jest.fn().mockResolvedValue(null),
    };
    const hasher: Partial<PasswordHasher> = { compare };
    const issuer: Partial<SuperadminTokenIssuer> = { issue: jest.fn() };

    const useCase = new LoginUseCase(
      repo as SuperadminRepository,
      hasher as PasswordHasher,
      issuer as SuperadminTokenIssuer,
    );

    await expect(
      useCase.execute({ email: 'unknown@example.org', password: 'whatever1' }),
    ).rejects.toThrow(InvalidCredentialsError);
    expect(compare).toHaveBeenCalledWith('whatever1', DUMMY_HASH);
  });

  it('throws InvalidCredentialsError for a wrong password', async () => {
    const repo: Partial<SuperadminRepository> = {
      findByEmail: jest.fn().mockResolvedValue(makeSuperadmin()),
    };
    const hasher: Partial<PasswordHasher> = {
      compare: jest.fn().mockResolvedValue(false),
    };
    const issuer: Partial<SuperadminTokenIssuer> = { issue: jest.fn() };

    const useCase = new LoginUseCase(
      repo as SuperadminRepository,
      hasher as PasswordHasher,
      issuer as SuperadminTokenIssuer,
    );

    await expect(
      useCase.execute({ email: 'alex@example.org', password: 'wrong' }),
    ).rejects.toThrow(InvalidCredentialsError);
  });

  it('issues a token and returns the view on success', async () => {
    const sa = makeSuperadmin();
    const repo: Partial<SuperadminRepository> = {
      findByEmail: jest.fn().mockResolvedValue(sa),
    };
    const hasher: Partial<PasswordHasher> = {
      compare: jest.fn().mockResolvedValue(true),
    };
    const issue = jest.fn().mockReturnValue('token-abc');
    const issuer: Partial<SuperadminTokenIssuer> = { issue };

    const useCase = new LoginUseCase(
      repo as SuperadminRepository,
      hasher as PasswordHasher,
      issuer as SuperadminTokenIssuer,
    );

    const result = await useCase.execute({
      email: '  Alex@Example.ORG ',
      password: 'correct1',
    });

    expect(result.accessToken).toBe('token-abc');
    expect(result.superadmin).toMatchObject({
      id: 'sa-1',
      email: 'alex@example.org',
      isCurrent: true,
    });
    expect(issue).toHaveBeenCalledWith({
      sub: 'sa-1',
      email: 'alex@example.org',
      tokenVersion: 3,
    });
    expect(repo.findByEmail).toHaveBeenCalledWith('alex@example.org');
  });
});
