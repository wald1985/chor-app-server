import { Superadmin } from '../../../domain/entities/superadmin.entity';
import { CannotDeleteSelfError } from '../../../domain/errors/superadmin.errors';
import type { SuperadminRepository } from '../../../domain/ports/superadmin-repository.port';
import { DeleteSuperadminUseCase } from './delete-superadmin.use-case';

function makeSuperadmin(id: string): Superadmin {
  return Superadmin.create({
    id,
    email: `${id}@example.org`,
    name: 'Alex',
    passwordHash: 'hash',
  });
}

describe('DeleteSuperadminUseCase', () => {
  it('throws CannotDeleteSelfError without calling the delete repository method', async () => {
    const deleteKeepingAtLeastOne = jest.fn();
    const repo: Partial<SuperadminRepository> = {
      findById: jest.fn().mockResolvedValue(makeSuperadmin('sa-1')),
      deleteKeepingAtLeastOne,
    };
    const useCase = new DeleteSuperadminUseCase(repo as SuperadminRepository);

    await expect(useCase.execute('sa-1', 'sa-1')).rejects.toThrow(
      CannotDeleteSelfError,
    );
    expect(deleteKeepingAtLeastOne).not.toHaveBeenCalled();
  });

  it('deletes a different superadmin', async () => {
    const deleteKeepingAtLeastOne = jest.fn().mockResolvedValue(undefined);
    const repo: Partial<SuperadminRepository> = {
      findById: jest.fn().mockResolvedValue(makeSuperadmin('sa-2')),
      deleteKeepingAtLeastOne,
    };
    const useCase = new DeleteSuperadminUseCase(repo as SuperadminRepository);

    await useCase.execute('sa-2', 'sa-1');
    expect(deleteKeepingAtLeastOne).toHaveBeenCalledWith('sa-2');
  });
});
