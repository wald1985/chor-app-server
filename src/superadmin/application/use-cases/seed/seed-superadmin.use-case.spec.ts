import { Superadmin } from '../../../domain/entities/superadmin.entity';
import {
  SuperadminExistsError,
  SuperadminNotFoundError,
} from '../../../domain/errors/superadmin.errors';
import type { PasswordGenerator } from '../../../domain/ports/password-generator.port';
import type { PasswordHasher } from '../../../domain/ports/password-hasher.port';
import type { SuperadminRepository } from '../../../domain/ports/superadmin-repository.port';
import { SeedSuperadminUseCase } from './seed-superadmin.use-case';

function makeDeps(overrides?: { existing?: Superadmin | null }) {
  const findByEmail = jest.fn().mockResolvedValue(overrides?.existing ?? null);
  const create = jest.fn().mockResolvedValue(undefined);
  const updatePasswordHash = jest.fn().mockResolvedValue(1);
  const hash = jest.fn().mockResolvedValue('hashed');
  const generate = jest.fn().mockReturnValue('generated-password');

  const repo: Partial<SuperadminRepository> = {
    findByEmail,
    create,
    updatePasswordHash,
  };
  const hasher: Partial<PasswordHasher> = { hash };
  const generator: Partial<PasswordGenerator> = { generate };

  return {
    repo: repo as SuperadminRepository,
    hasher: hasher as PasswordHasher,
    generator: generator as PasswordGenerator,
    create,
    updatePasswordHash,
  };
}

describe('SeedSuperadminUseCase', () => {
  it('creates a superadmin with a generated password when the email is unknown', async () => {
    const { repo, hasher, generator, create } = makeDeps();
    const useCase = new SeedSuperadminUseCase(repo, hasher, generator);

    const result = await useCase.execute({
      email: 'new@example.org',
      name: 'Alex',
      resetPassword: false,
    });

    expect(result).toEqual({
      email: 'new@example.org',
      password: 'generated-password',
      action: 'CREATED',
    });
    expect(create).toHaveBeenCalled();
  });

  it('throws SuperadminExistsError when creating with a known email and no --reset-password', async () => {
    const existing = Superadmin.create({
      id: 'sa-1',
      email: 'known@example.org',
      name: 'Alex',
      passwordHash: 'old',
    });
    const { repo, hasher, generator, create } = makeDeps({ existing });
    const useCase = new SeedSuperadminUseCase(repo, hasher, generator);

    await expect(
      useCase.execute({
        email: 'known@example.org',
        name: 'Alex',
        resetPassword: false,
      }),
    ).rejects.toThrow(SuperadminExistsError);
    expect(create).not.toHaveBeenCalled();
  });

  it('resets the password and returns PASSWORD_RESET for a known email', async () => {
    const existing = Superadmin.create({
      id: 'sa-1',
      email: 'known@example.org',
      name: 'Alex',
      passwordHash: 'old',
    });
    const { repo, hasher, generator, updatePasswordHash } = makeDeps({
      existing,
    });
    const useCase = new SeedSuperadminUseCase(repo, hasher, generator);

    const result = await useCase.execute({
      email: 'known@example.org',
      resetPassword: true,
    });

    expect(result.action).toBe('PASSWORD_RESET');
    expect(updatePasswordHash).toHaveBeenCalledWith('sa-1', 'hashed');
  });

  it('throws SuperadminNotFoundError when resetting an unknown email', async () => {
    const { repo, hasher, generator } = makeDeps();
    const useCase = new SeedSuperadminUseCase(repo, hasher, generator);

    await expect(
      useCase.execute({ email: 'unknown@example.org', resetPassword: true }),
    ).rejects.toThrow(SuperadminNotFoundError);
  });
});
