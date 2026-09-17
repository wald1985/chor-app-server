import { Superadmin } from '../../../domain/entities/superadmin.entity';
import { UseChangePasswordError } from '../../../domain/errors/superadmin.errors';
import type { PasswordHasher } from '../../../domain/ports/password-hasher.port';
import type { SuperadminRepository } from '../../../domain/ports/superadmin-repository.port';
import { SetSuperadminPasswordUseCase } from './set-superadmin-password.use-case';

function makeSuperadmin(id: string): Superadmin {
  return Superadmin.create({
    id,
    email: `${id}@example.org`,
    name: 'Alex',
    passwordHash: 'hash',
  });
}

describe('SetSuperadminPasswordUseCase', () => {
  it('throws UseChangePasswordError when targeting self', async () => {
    const repo: Partial<SuperadminRepository> = {
      findById: jest.fn().mockResolvedValue(makeSuperadmin('sa-1')),
      updatePasswordHash: jest.fn(),
    };
    const hasher: Partial<PasswordHasher> = { hash: jest.fn() };
    const useCase = new SetSuperadminPasswordUseCase(
      repo as SuperadminRepository,
      hasher as PasswordHasher,
    );

    await expect(
      useCase.execute({ id: 'sa-1', newPassword: 'newpassword1' }, 'sa-1'),
    ).rejects.toThrow(UseChangePasswordError);
    expect(repo.updatePasswordHash).not.toHaveBeenCalled();
  });

  it('sets the password and bumps tokenVersion for another superadmin', async () => {
    const repo: Partial<SuperadminRepository> = {
      findById: jest.fn().mockResolvedValue(makeSuperadmin('sa-2')),
      updatePasswordHash: jest.fn().mockResolvedValue(1),
    };
    const hasher: Partial<PasswordHasher> = {
      hash: jest.fn().mockResolvedValue('new-hash'),
    };
    const useCase = new SetSuperadminPasswordUseCase(
      repo as SuperadminRepository,
      hasher as PasswordHasher,
    );

    await useCase.execute({ id: 'sa-2', newPassword: 'newpassword1' }, 'sa-1');
    expect(repo.updatePasswordHash).toHaveBeenCalledWith('sa-2', 'new-hash');
  });
});
