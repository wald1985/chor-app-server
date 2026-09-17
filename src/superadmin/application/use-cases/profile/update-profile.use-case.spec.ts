import { Superadmin } from '../../../domain/entities/superadmin.entity';
import { SuperadminEmailTakenError } from '../../../domain/errors/superadmin.errors';
import type { SuperadminRepository } from '../../../domain/ports/superadmin-repository.port';
import { UpdateProfileUseCase } from './update-profile.use-case';

function makeSuperadmin(): Superadmin {
  return Superadmin.create({
    id: 'sa-1',
    email: 'alex@example.org',
    name: 'Alex',
    passwordHash: 'hash',
  });
}

describe('UpdateProfileUseCase', () => {
  it('updates the name and keeps the email unchanged', async () => {
    const sa = makeSuperadmin();
    const repo: Partial<SuperadminRepository> = {
      findById: jest.fn().mockResolvedValue(sa),
      save: jest.fn().mockResolvedValue(undefined),
    };
    const useCase = new UpdateProfileUseCase(repo as SuperadminRepository);

    const result = await useCase.execute({
      actorId: 'sa-1',
      name: 'Alexander',
    });

    expect(result.name).toBe('Alexander');
    expect(result.email).toBe('alex@example.org');
  });

  it('propagates SuperadminEmailTakenError from save() when the new email is taken', async () => {
    const sa = makeSuperadmin();
    const repo: Partial<SuperadminRepository> = {
      findById: jest.fn().mockResolvedValue(sa),
      save: jest
        .fn()
        .mockRejectedValue(
          new SuperadminEmailTakenError('taken@example.org', 'other-id'),
        ),
    };
    const useCase = new UpdateProfileUseCase(repo as SuperadminRepository);

    await expect(
      useCase.execute({ actorId: 'sa-1', email: 'taken@example.org' }),
    ).rejects.toThrow(SuperadminEmailTakenError);
  });

  it('allows changing email to the same value in a different case', async () => {
    const sa = makeSuperadmin();
    const repo: Partial<SuperadminRepository> = {
      findById: jest.fn().mockResolvedValue(sa),
      save: jest.fn().mockResolvedValue(undefined),
    };
    const useCase = new UpdateProfileUseCase(repo as SuperadminRepository);

    const result = await useCase.execute({
      actorId: 'sa-1',
      email: 'ALEX@example.org',
    });

    expect(result.email).toBe('alex@example.org');
  });
});
