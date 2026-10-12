import { RehearsalEntry } from '../domain/entities/rehearsal-entry.entity';
import { Rehearsal } from '../domain/entities/rehearsal.entity';
import {
  ReferencedPersonRoleMismatchError,
  ReferencedSongNotFoundError,
  RehearsalDateTakenError,
  RehearsalEntryNotFoundError,
  RehearsalNotEmptyError,
  RehearsalNotFoundError,
  RehearsalValueInvalidError,
} from '../domain/errors/rehearsal-log.errors';
import type {
  PersonReference,
  PersonResolver,
} from '../domain/ports/person-resolver.port';
import type {
  DeleteRehearsalOutcome,
  RehearsalRepository,
  RehearsalWithCount,
} from '../domain/ports/rehearsal-repository.port';
import type {
  SongReference,
  SongResolver,
} from '../domain/ports/song-resolver.port';
import { RehearsalDate } from '../domain/value-objects/rehearsal-date';
import { ReferenceValidator } from './services/reference-validator';
import { RehearsalViewBuilder } from './services/rehearsal-view-builder';
import { AddRehearsalEntryUseCase } from './use-cases/add-rehearsal-entry.use-case';
import { CreateRehearsalUseCase } from './use-cases/create-rehearsal.use-case';
import { DeleteRehearsalUseCase } from './use-cases/delete-rehearsal.use-case';
import { GetRehearsalUseCase } from './use-cases/get-rehearsal.use-case';
import { ListRehearsalsUseCase } from './use-cases/list-rehearsals.use-case';
import { RemoveRehearsalEntryUseCase } from './use-cases/remove-rehearsal-entry.use-case';
import { UpdateRehearsalUseCase } from './use-cases/update-rehearsal.use-case';

class InMemoryRehearsals implements RehearsalRepository {
  readonly rehearsals = new Map<string, Rehearsal>();
  readonly entries: RehearsalEntry[] = [];

  findById(communityId: string, id: string) {
    const r = this.rehearsals.get(id);
    return Promise.resolve(r?.communityId === communityId ? r : null);
  }

  findByDate(communityId: string, date: RehearsalDate) {
    const found = [...this.rehearsals.values()].find(
      (r) => r.communityId === communityId && r.date.iso === date.iso,
    );
    return Promise.resolve(found ?? null);
  }

  list(
    communityId: string,
    range: { from?: RehearsalDate; to?: RehearsalDate },
  ): Promise<RehearsalWithCount[]> {
    return Promise.resolve(
      [...this.rehearsals.values()]
        .filter((r) => r.communityId === communityId)
        .filter((r) => !range.from || r.date.value >= range.from.value)
        .filter((r) => !range.to || r.date.value <= range.to.value)
        .sort((a, b) => b.date.iso.localeCompare(a.date.iso))
        .map((rehearsal) => ({
          rehearsal,
          entryCount: this.entries.filter((e) => e.rehearsalId === rehearsal.id)
            .length,
        })),
    );
  }

  save(rehearsal: Rehearsal) {
    this.rehearsals.set(rehearsal.id, rehearsal);
    return Promise.resolve();
  }

  deleteIfEmpty(
    communityId: string,
    id: string,
  ): Promise<DeleteRehearsalOutcome> {
    const r = this.rehearsals.get(id);
    if (r?.communityId !== communityId) return Promise.resolve('not_found');
    if (this.entries.some((e) => e.rehearsalId === id)) {
      return Promise.resolve('not_empty');
    }
    this.rehearsals.delete(id);
    return Promise.resolve('deleted');
  }

  listEntries(rehearsalId: string) {
    return Promise.resolve(
      this.entries.filter((e) => e.rehearsalId === rehearsalId),
    );
  }

  addEntry(entry: RehearsalEntry) {
    this.entries.push(entry);
    return Promise.resolve();
  }

  removeEntry(rehearsalId: string, entryId: string) {
    const index = this.entries.findIndex(
      (e) => e.id === entryId && e.rehearsalId === rehearsalId,
    );
    if (index < 0) return Promise.resolve(false);
    this.entries.splice(index, 1);
    return Promise.resolve(true);
  }
}

const song = (id: string, archived = false): SongReference => ({
  id,
  number: '1',
  title: `Lied ${id}`,
  source: 'COMMUNITY',
  container: { id: 'f-1', title: 'Mappe', type: 'FOLDER' },
  archived,
});

const person = (
  id: string,
  roles: PersonReference['roles'],
): PersonReference => ({
  id,
  name: `Person ${id}`,
  roles,
  archived: false,
});

describe('Rehearsal use cases', () => {
  let repo: InMemoryRehearsals;
  let create: CreateRehearsalUseCase;
  let update: UpdateRehearsalUseCase;
  let remove: DeleteRehearsalUseCase;
  let addEntry: AddRehearsalEntryUseCase;
  let removeEntry: RemoveRehearsalEntryUseCase;
  let list: ListRehearsalsUseCase;
  let get: GetRehearsalUseCase;

  beforeEach(() => {
    repo = new InMemoryRehearsals();
    const songs: SongResolver = {
      findActive: (_c, id) =>
        Promise.resolve(id === 's-1' || id === 's-2' ? song(id) : null),
      findManyForHistory: (_c, ids) =>
        Promise.resolve(
          ids.filter((id) => id.startsWith('s-')).map((id) => song(id)),
        ),
    };
    const people = new Map([
      ['con', person('con', ['CONDUCTOR'])],
      ['pia', person('pia', ['PIANIST'])],
    ]);
    const resolver: PersonResolver = {
      findMany: (_c, ids) =>
        Promise.resolve(
          ids.flatMap((id) => (people.has(id) ? [people.get(id)!] : [])),
        ),
    };
    const views = new RehearsalViewBuilder(songs, resolver);
    const refs = new ReferenceValidator(songs, resolver);
    create = new CreateRehearsalUseCase(repo, refs, views);
    update = new UpdateRehearsalUseCase(repo, refs, views);
    remove = new DeleteRehearsalUseCase(repo);
    addEntry = new AddRehearsalEntryUseCase(repo, refs, views);
    removeEntry = new RemoveRehearsalEntryUseCase(repo);
    list = new ListRehearsalsUseCase(repo, views);
    get = new GetRehearsalUseCase(repo, views);
  });

  const base = { communityId: 'c-1', date: '2026-10-08' };

  it('creates a rehearsal with a warm-up leader and note', async () => {
    const view = await create.execute({
      ...base,
      warmUpLeaderId: 'con',
      note: ' Gemeindesaal ',
    });
    expect(view.date).toBe('2026-10-08');
    expect(view.warmUpLeader?.name).toBe('Person con');
    expect(view.note).toBe('Gemeindesaal');
    expect(view.entries).toEqual([]);
  });

  it('creates with only a date', async () => {
    const view = await create.execute(base);
    expect(view.warmUpLeader).toBeNull();
    expect(view.note).toBeNull();
  });

  it('names the existing rehearsal when the date is taken, per community', async () => {
    const first = await create.execute(base);
    const error = await create.execute(base).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(RehearsalDateTakenError);
    expect((error as RehearsalDateTakenError).existingRehearsalId).toBe(
      first.id,
    );

    await expect(
      create.execute({ ...base, communityId: 'c-2' }),
    ).resolves.toBeDefined();
  });

  it('rejects an invalid date and a warm-up leader without the conductor role', async () => {
    await expect(
      create.execute({ ...base, date: '2026-02-30' }),
    ).rejects.toBeInstanceOf(RehearsalValueInvalidError);
    await expect(
      create.execute({ ...base, warmUpLeaderId: 'pia' }),
    ).rejects.toBeInstanceOf(ReferencedPersonRoleMismatchError);
    expect(repo.rehearsals.size).toBe(0);
  });

  it('update changes and clears warm-up leader and note, leaves the rest alone', async () => {
    const created = await create.execute({
      ...base,
      warmUpLeaderId: 'con',
      note: 'alt',
    });

    const noteOnly = await update.execute({
      communityId: 'c-1',
      rehearsalId: created.id,
      note: 'neu',
    });
    expect(noteOnly.note).toBe('neu');
    expect(noteOnly.warmUpLeader?.id).toBe('con');

    const cleared = await update.execute({
      communityId: 'c-1',
      rehearsalId: created.id,
      warmUpLeaderId: null,
      note: null,
    });
    expect(cleared.warmUpLeader).toBeNull();
    expect(cleared.note).toBeNull();
    expect(cleared.date).toBe('2026-10-08');
  });

  it('update with a bad leader changes nothing', async () => {
    const created = await create.execute({ ...base, note: 'bleibt' });
    await expect(
      update.execute({
        communityId: 'c-1',
        rehearsalId: created.id,
        warmUpLeaderId: 'pia',
      }),
    ).rejects.toBeInstanceOf(ReferencedPersonRoleMismatchError);
    expect(
      (await get.execute({ communityId: 'c-1', rehearsalId: created.id }))
        .warmUpLeader,
    ).toBeNull();
  });

  it('adds entries in order, allows the same song twice, resolves people', async () => {
    const r = await create.execute(base);
    const ref = { communityId: 'c-1', rehearsalId: r.id };

    await addEntry.execute({
      ...ref,
      songId: 's-1',
      pianistId: 'pia',
      conductorId: 'con',
    });
    await addEntry.execute({ ...ref, songId: 's-2', note: 'zweite Strophe' });
    await addEntry.execute({ ...ref, songId: 's-1' });

    const detail = await get.execute(ref);
    expect(detail.entries.map((e) => e.songId)).toEqual(['s-1', 's-2', 's-1']);
    expect(detail.entryCount).toBe(3);
    expect(detail.entries[0].pianist?.id).toBe('pia');
    expect(detail.entries[1].note).toBe('zweite Strophe');
  });

  it('rejects unusable songs and mismatched people without storing', async () => {
    const r = await create.execute(base);
    const ref = { communityId: 'c-1', rehearsalId: r.id };

    await expect(
      addEntry.execute({ ...ref, songId: 'nope' }),
    ).rejects.toBeInstanceOf(ReferencedSongNotFoundError);
    await expect(
      addEntry.execute({ ...ref, songId: 's-1', conductorId: 'pia' }),
    ).rejects.toBeInstanceOf(ReferencedPersonRoleMismatchError);
    expect(repo.entries).toHaveLength(0);
  });

  it('entries of a foreign community are not found', async () => {
    const r = await create.execute(base);
    await expect(
      addEntry.execute({
        communityId: 'c-2',
        rehearsalId: r.id,
        songId: 's-1',
      }),
    ).rejects.toBeInstanceOf(RehearsalNotFoundError);
  });

  it('removes an entry and keeps the order of the others', async () => {
    const r = await create.execute(base);
    const ref = { communityId: 'c-1', rehearsalId: r.id };
    await addEntry.execute({ ...ref, songId: 's-1' });
    const middle = await addEntry.execute({ ...ref, songId: 's-2' });
    await addEntry.execute({ ...ref, songId: 's-1', note: 'letztes' });

    await removeEntry.execute({ ...ref, entryId: middle.id });

    const detail = await get.execute(ref);
    expect(detail.entries.map((e) => e.songId)).toEqual(['s-1', 's-1']);
    await expect(
      removeEntry.execute({ ...ref, entryId: middle.id }),
    ).rejects.toBeInstanceOf(RehearsalEntryNotFoundError);
  });

  it('deletes only an empty rehearsal and frees the date', async () => {
    const r = await create.execute(base);
    const ref = { communityId: 'c-1', rehearsalId: r.id };
    const entry = await addEntry.execute({ ...ref, songId: 's-1' });

    await expect(remove.execute(ref)).rejects.toBeInstanceOf(
      RehearsalNotEmptyError,
    );
    await removeEntry.execute({ ...ref, entryId: entry.id });
    await remove.execute(ref);

    await expect(get.execute(ref)).rejects.toBeInstanceOf(
      RehearsalNotFoundError,
    );
    await expect(create.execute(base)).resolves.toBeDefined();
    await expect(
      remove.execute({ communityId: 'c-1', rehearsalId: 'missing' }),
    ).rejects.toBeInstanceOf(RehearsalNotFoundError);
  });

  it('lists newest first with entry counts, filters by range and validates it', async () => {
    const a = await create.execute({ ...base, date: '2026-09-10' });
    await create.execute({
      ...base,
      date: '2026-10-08',
      warmUpLeaderId: 'con',
    });
    await addEntry.execute({
      communityId: 'c-1',
      rehearsalId: a.id,
      songId: 's-1',
    });

    const all = await list.execute({ communityId: 'c-1' });
    expect(all.map((r) => [r.date, r.entryCount])).toEqual([
      ['2026-10-08', 0],
      ['2026-09-10', 1],
    ]);
    expect(all[0].warmUpLeader?.id).toBe('con');

    const ranged = await list.execute({
      communityId: 'c-1',
      from: '2026-09-01',
      to: '2026-09-30',
    });
    expect(ranged.map((r) => r.date)).toEqual(['2026-09-10']);

    await expect(
      list.execute({
        communityId: 'c-1',
        from: '2026-10-02',
        to: '2026-10-01',
      }),
    ).rejects.toBeInstanceOf(RehearsalValueInvalidError);
  });
});
