import { Superadmin } from '../../../domain/entities/superadmin.entity';
import { SuperadminEmailTakenError } from '../../../domain/errors/superadmin.errors';
import type { PasswordHasher } from '../../../domain/ports/password-hasher.port';
import type { SuperadminRepository } from '../../../domain/ports/superadmin-repository.port';
import { CreateSuperadminUseCase } from './create-superadmin.use-case';

describe('CreateSuperadminUseCase', () => {
  it('propagates SuperadminEmailTakenError from create()', async () => {
    const repo: Partial<SuperadminRepository> = {
      create: jest
        .fn()
        .mockRejectedValue(
          new SuperadminEmailTakenError('taken@example.org', 'existing-id'),
        ),
    };
    const hasher: Partial<PasswordHasher> = {
      hash: jest.fn().mockResolvedValue('hash'),
    };
    const useCase = new CreateSuperadminUseCase(
      repo as SuperadminRepository,
      hasher as PasswordHasher,
    );

    await expect(
      useCase.execute(
        { email: 'taken@example.org', name: 'Alex', password: 'password1' },
        'actor-1',
      ),
    ).rejects.toThrow(SuperadminEmailTakenError);
  });

  it('creates with a hashed password and returns the view marked not current', async () => {
    let created: Superadmin | undefined;
    const repo: Partial<SuperadminRepository> = {
      create: jest.fn().mockImplementation((sa: Superadmin) => {
        created = sa;
        return Promise.resolve();
      }),
    };
    const hasher: Partial<PasswordHasher> = {
      hash: jest.fn().mockResolvedValue('hashed-value'),
    };
    const useCase = new CreateSuperadminUseCase(
      repo as SuperadminRepository,
      hasher as PasswordHasher,
    );

    const result = await useCase.execute(
      { email: 'new@example.org', name: 'New', password: 'password1' },
      'actor-1',
    );

    expect(hasher.hash).toHaveBeenCalledWith('password1');
    expect(created?.passwordHash).toBe('hashed-value');
    expect(result.isCurrent).toBe(false);
    expect(result.email).toBe('new@example.org');
  });
});
