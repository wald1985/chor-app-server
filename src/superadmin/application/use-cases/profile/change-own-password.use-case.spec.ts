import { Superadmin } from '../../../domain/entities/superadmin.entity';
import { IncorrectCurrentPasswordError } from '../../../domain/errors/superadmin.errors';
import type { PasswordHasher } from '../../../domain/ports/password-hasher.port';
import type { SuperadminRepository } from '../../../domain/ports/superadmin-repository.port';
import type { SuperadminTokenIssuer } from '../../../domain/ports/superadmin-token-issuer.port';
import { ChangeOwnPasswordUseCase } from './change-own-password.use-case';

function makeSuperadmin(): Superadmin {
  return Superadmin.create({
    id: 'sa-1',
    email: 'alex@example.org',
    name: 'Alex',
    passwordHash: 'old-hash',
    tokenVersion: 0,
  });
}

describe('ChangeOwnPasswordUseCase', () => {
  it('throws IncorrectCurrentPasswordError and does not bump tokenVersion', async () => {
    const sa = makeSuperadmin();
    const updatePasswordHash = jest.fn();
    const repo: Partial<SuperadminRepository> = {
      findById: jest.fn().mockResolvedValue(sa),
      updatePasswordHash,
    };
    const hasher: Partial<PasswordHasher> = {
      compare: jest.fn().mockResolvedValue(false),
    };
    const issuer: Partial<SuperadminTokenIssuer> = { issue: jest.fn() };

    const useCase = new ChangeOwnPasswordUseCase(
      repo as SuperadminRepository,
      hasher as PasswordHasher,
      issuer as SuperadminTokenIssuer,
    );

    await expect(
      useCase.execute({
        actorId: 'sa-1',
        currentPassword: 'wrong',
        newPassword: 'newpassword1',
      }),
    ).rejects.toThrow(IncorrectCurrentPasswordError);
    expect(updatePasswordHash).not.toHaveBeenCalled();
  });

  it('updates the hash and issues a token with the new tokenVersion', async () => {
    const sa = makeSuperadmin();
    const repo: Partial<SuperadminRepository> = {
      findById: jest.fn().mockResolvedValue(sa),
      updatePasswordHash: jest.fn().mockResolvedValue(1),
    };
    const hasher: Partial<PasswordHasher> = {
      compare: jest.fn().mockResolvedValue(true),
      hash: jest.fn().mockResolvedValue('new-hash'),
    };
    const issue = jest.fn().mockReturnValue('new-token');
    const issuer: Partial<SuperadminTokenIssuer> = { issue };

    const useCase = new ChangeOwnPasswordUseCase(
      repo as SuperadminRepository,
      hasher as PasswordHasher,
      issuer as SuperadminTokenIssuer,
    );

    const result = await useCase.execute({
      actorId: 'sa-1',
      currentPassword: 'old-password',
      newPassword: 'newpassword1',
    });

    expect(result.accessToken).toBe('new-token');
    expect(repo.updatePasswordHash).toHaveBeenCalledWith('sa-1', 'new-hash');
    expect(issue).toHaveBeenCalledWith({
      sub: 'sa-1',
      email: 'alex@example.org',
      tokenVersion: 1,
    });
  });
});
