import { Person } from '../../domain/entities/person.entity';
import type { PersonRepository } from '../../domain/ports/person-repository.port';
import { DefaultPersonLookup } from './person-lookup.query';

describe('DefaultPersonLookup', () => {
  const active = Person.reconstitute({
    id: 'p-1',
    communityId: 'c-1',
    name: 'Alex',
    roles: ['PIANIST', 'CONDUCTOR'],
  });
  const archived = Person.reconstitute({
    id: 'p-2',
    communityId: 'c-1',
    name: 'Springer',
    roles: ['PIANIST'],
    archivedAt: new Date('2026-01-01'),
  });
  const findByIds = jest.fn();
  const lookup = new DefaultPersonLookup({
    findByIds,
  } as unknown as PersonRepository);

  beforeEach(() => {
    findByIds.mockReset();
  });

  it('returns active and archived people as summaries', async () => {
    findByIds.mockResolvedValue([active, archived]);

    const result = await lookup.findMany('c-1', ['p-1', 'p-2', 'p-1']);

    expect(findByIds).toHaveBeenCalledWith('c-1', ['p-1', 'p-2']);
    expect(result).toEqual([
      {
        id: 'p-1',
        name: 'Alex',
        roles: ['PIANIST', 'CONDUCTOR'],
        archived: false,
      },
      { id: 'p-2', name: 'Springer', roles: ['PIANIST'], archived: true },
    ]);
  });

  it('is empty for no ids', async () => {
    findByIds.mockResolvedValue([]);
    expect(await lookup.findMany('c-1', [])).toEqual([]);
  });
});
