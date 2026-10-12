import { Person } from '../../domain/entities/person.entity';
import {
  PersonArchivedError,
  PersonNameTakenError,
  PersonNotFoundError,
} from '../../domain/errors/people.errors';
import type {
  ListPeopleOptions,
  PersonRepository,
} from '../../domain/ports/person-repository.port';
import { PersonRole } from '../../domain/value-objects/person-role';
import { ArchivePersonUseCase } from './archive-person.use-case';
import { CreatePersonUseCase } from './create-person.use-case';
import { GetPersonUseCase } from './get-person.use-case';
import { ListPeopleUseCase } from './list-people.use-case';
import { RestorePersonUseCase } from './restore-person.use-case';
import { UpdatePersonUseCase } from './update-person.use-case';

class InMemoryPersonRepository implements PersonRepository {
  readonly items = new Map<string, Person>();

  findById(communityId: string, id: string) {
    const person = this.items.get(id);
    return Promise.resolve(person?.communityId === communityId ? person : null);
  }

  findByNameKey(communityId: string, nameKey: string) {
    const found = [...this.items.values()].find(
      (p) => p.communityId === communityId && p.nameKey === nameKey,
    );
    return Promise.resolve(found ?? null);
  }

  list(communityId: string, options?: ListPeopleOptions) {
    return Promise.resolve(
      [...this.items.values()]
        .filter((p) => p.communityId === communityId)
        .filter((p) => options?.includeArchived || !p.isArchived)
        .filter((p) => !options?.role || p.hasRole(options.role))
        .sort((a, b) => a.nameKey.localeCompare(b.nameKey)),
    );
  }

  save(person: Person) {
    this.items.set(person.id, person);
    return Promise.resolve();
  }
}

describe('People use cases', () => {
  let repo: InMemoryPersonRepository;
  let create: CreatePersonUseCase;
  let update: UpdatePersonUseCase;
  let archive: ArchivePersonUseCase;
  let restore: RestorePersonUseCase;
  let get: GetPersonUseCase;
  let list: ListPeopleUseCase;

  beforeEach(() => {
    repo = new InMemoryPersonRepository();
    create = new CreatePersonUseCase(repo);
    update = new UpdatePersonUseCase(repo);
    archive = new ArchivePersonUseCase(repo);
    restore = new RestorePersonUseCase(repo);
    get = new GetPersonUseCase(repo);
    list = new ListPeopleUseCase(repo);
  });

  it('rejects a duplicate name case-insensitively and reports an archived holder', async () => {
    const paul = await create.execute({
      communityId: 'c1',
      name: 'Paul',
      roles: ['PIANIST'],
    });
    await archive.execute({ communityId: 'c1', personId: paul.id });

    const error = await create
      .execute({ communityId: 'c1', name: ' paul ', roles: ['CONDUCTOR'] })
      .catch((e: unknown) => e);
    expect(error).toBeInstanceOf(PersonNameTakenError);
    expect((error as PersonNameTakenError).existingPersonId).toBe(paul.id);
    expect((error as PersonNameTakenError).existingArchived).toBe(true);
  });

  it('allows the same name in another community', async () => {
    await create.execute({
      communityId: 'c1',
      name: 'Paul',
      roles: ['PIANIST'],
    });
    const other = await create.execute({
      communityId: 'c2',
      name: 'Paul',
      roles: ['PIANIST'],
    });
    expect(other.communityId).toBe('c2');
  });

  it('update: allows re-casing own name, rejects a taken name, keeps state on invalid roles', async () => {
    const paul = await create.execute({
      communityId: 'c1',
      name: 'Paul',
      roles: ['PIANIST'],
    });
    await create.execute({
      communityId: 'c1',
      name: 'Alex',
      roles: ['PIANIST'],
    });

    const renamed = await update.execute({
      communityId: 'c1',
      personId: paul.id,
      name: 'PAUL',
    });
    expect(renamed.nameValue).toBe('PAUL');

    await expect(
      update.execute({ communityId: 'c1', personId: paul.id, name: 'alex' }),
    ).rejects.toBeInstanceOf(PersonNameTakenError);

    await expect(
      update.execute({
        communityId: 'c1',
        personId: paul.id,
        name: 'Paula',
        roles: [],
      }),
    ).rejects.toThrow();
    expect(paul.nameValue).toBe('PAUL');
  });

  it('update: rejects archived persons and foreign communities', async () => {
    const paul = await create.execute({
      communityId: 'c1',
      name: 'Paul',
      roles: ['PIANIST'],
    });
    await expect(
      update.execute({ communityId: 'c2', personId: paul.id, name: 'X' }),
    ).rejects.toBeInstanceOf(PersonNotFoundError);

    await archive.execute({ communityId: 'c1', personId: paul.id });
    await expect(
      update.execute({ communityId: 'c1', personId: paul.id, name: 'X' }),
    ).rejects.toBeInstanceOf(PersonArchivedError);
  });

  it('archive and restore are idempotent and keep the id', async () => {
    const paul = await create.execute({
      communityId: 'c1',
      name: 'Paul',
      roles: ['PIANIST'],
    });
    const first = await archive.execute({
      communityId: 'c1',
      personId: paul.id,
    });
    const second = await archive.execute({
      communityId: 'c1',
      personId: paul.id,
    });
    expect(second.archivedAt).toBe(first.archivedAt);

    const restored = await restore.execute({
      communityId: 'c1',
      personId: paul.id,
    });
    expect(restored.isArchived).toBe(false);
    expect(
      (await restore.execute({ communityId: 'c1', personId: paul.id })).id,
    ).toBe(paul.id);
  });

  it('list filters by role (dual-role included) and archived state; get returns archived', async () => {
    const both = await create.execute({
      communityId: 'c1',
      name: 'Alex',
      roles: ['PIANIST', 'CONDUCTOR'],
    });
    await create.execute({
      communityId: 'c1',
      name: 'Daniel',
      roles: ['CONDUCTOR'],
    });
    const gone = await create.execute({
      communityId: 'c1',
      name: 'Springer',
      roles: ['PIANIST'],
    });
    await archive.execute({ communityId: 'c1', personId: gone.id });

    const pianists = await list.execute({
      communityId: 'c1',
      role: PersonRole.PIANIST,
    });
    expect(pianists.map((p) => p.nameValue)).toEqual(['Alex']);

    const all = await list.execute({
      communityId: 'c1',
      includeArchived: true,
    });
    expect(all.map((p) => p.nameValue)).toEqual(['Alex', 'Daniel', 'Springer']);

    expect(
      (await get.execute({ communityId: 'c1', personId: gone.id })).isArchived,
    ).toBe(true);
    expect(both.hasRole(PersonRole.CONDUCTOR)).toBe(true);
  });
});
