import { Performance } from '../domain/entities/performance.entity';
import {
  PerformanceNotFoundError,
  PerformanceValueInvalidError,
  ReferencedPersonArchivedError,
  ReferencedPersonNotFoundError,
  ReferencedPersonRoleMismatchError,
  ReferencedSongNotFoundError,
} from '../domain/errors/performance-log.errors';
import type {
  ListPerformancesOptions,
  PerformanceRepository,
} from '../domain/ports/performance-repository.port';
import type {
  PersonReference,
  PersonResolver,
} from '../domain/ports/person-resolver.port';
import type {
  SongReference,
  SongResolver,
} from '../domain/ports/song-resolver.port';
import { PerformanceViewBuilder } from './services/performance-view-builder';
import { ReferenceValidator } from './services/reference-validator';
import { DeletePerformanceUseCase } from './use-cases/delete-performance.use-case';
import { GetPerformanceUseCase } from './use-cases/get-performance.use-case';
import { ListPerformancesUseCase } from './use-cases/list-performances.use-case';
import { RecordPerformanceUseCase } from './use-cases/record-performance.use-case';

class InMemoryPerformances implements PerformanceRepository {
  readonly items: Performance[] = [];
  lastListOptions?: ListPerformancesOptions;

  findById(communityId: string, id: string) {
    return Promise.resolve(
      this.items.find((p) => p.id === id && p.communityId === communityId) ??
        null,
    );
  }

  list(communityId: string, options: ListPerformancesOptions) {
    this.lastListOptions = options;
    return Promise.resolve(
      this.items.filter((p) => p.communityId === communityId),
    );
  }

  save(performance: Performance) {
    this.items.push(performance);
    return Promise.resolve();
  }

  delete(communityId: string, id: string) {
    const index = this.items.findIndex(
      (p) => p.id === id && p.communityId === communityId,
    );
    if (index < 0) return Promise.resolve(false);
    this.items.splice(index, 1);
    return Promise.resolve(true);
  }
}

const song = (id: string, archived = false): SongReference => ({
  id,
  number: '42',
  title: `Lied ${id}`,
  source: 'LIBRARY',
  container: { id: 'book-1', title: 'Buch 1', type: 'BOOK' },
  archived,
});

const person = (
  id: string,
  roles: PersonReference['roles'],
  archived = false,
): PersonReference => ({ id, name: `Person ${id}`, roles, archived });

describe('Performance use cases', () => {
  let repo: InMemoryPerformances;
  let activeSongs: Map<string, SongReference>;
  let historySongs: Map<string, SongReference>;
  let people: Map<string, PersonReference>;
  let record: RecordPerformanceUseCase;
  let list: ListPerformancesUseCase;
  let get: GetPerformanceUseCase;
  let remove: DeletePerformanceUseCase;

  beforeEach(() => {
    repo = new InMemoryPerformances();
    activeSongs = new Map([['s-1', song('s-1')]]);
    historySongs = new Map([
      ['s-1', song('s-1')],
      ['s-old', song('s-old', true)],
    ]);
    people = new Map([
      ['pia', person('pia', ['PIANIST'])],
      ['both', person('both', ['PIANIST', 'CONDUCTOR'])],
      ['con', person('con', ['CONDUCTOR'])],
      ['gone', person('gone', ['PIANIST'], true)],
    ]);
    const songs: SongResolver = {
      findActive: (_c, id) => Promise.resolve(activeSongs.get(id) ?? null),
      findManyForHistory: (_c, ids) =>
        Promise.resolve(
          ids.flatMap((id) =>
            historySongs.has(id) ? [historySongs.get(id)!] : [],
          ),
        ),
    };
    const resolver: PersonResolver = {
      findMany: (_c, ids) =>
        Promise.resolve(
          ids.flatMap((id) => (people.has(id) ? [people.get(id)!] : [])),
        ),
    };
    const views = new PerformanceViewBuilder(songs, resolver);
    record = new RecordPerformanceUseCase(
      repo,
      new ReferenceValidator(songs, resolver),
      views,
    );
    list = new ListPerformancesUseCase(repo, views);
    get = new GetPerformanceUseCase(repo, views);
    remove = new DeletePerformanceUseCase(repo);
  });

  const base = { communityId: 'c-1', date: '2026-10-04', songId: 's-1' };

  it('records with all fields and returns the resolved view', async () => {
    const view = await record.execute({
      ...base,
      pianistId: 'pia',
      conductorId: 'con',
      note: ' Gottesdienst ',
    });

    expect(repo.items).toHaveLength(1);
    expect(view.date).toBe('2026-10-04');
    expect(view.song?.title).toBe('Lied s-1');
    expect(view.pianist).toEqual({
      id: 'pia',
      name: 'Person pia',
      archived: false,
    });
    expect(view.conductor?.id).toBe('con');
    expect(view.note).toBe('Gottesdienst');
  });

  it('records with only the required fields', async () => {
    const view = await record.execute(base);
    expect(view.pianist).toBeNull();
    expect(view.conductor).toBeNull();
    expect(view.note).toBeNull();
  });

  it('accepts one person holding both roles as pianist and conductor', async () => {
    const view = await record.execute({
      ...base,
      pianistId: 'both',
      conductorId: 'both',
    });
    expect(view.pianist?.id).toBe('both');
    expect(view.conductor?.id).toBe('both');
  });

  it.each([
    ['unknown song', { songId: 'nope' }, ReferencedSongNotFoundError],
    ['archived song', { songId: 's-old' }, ReferencedSongNotFoundError],
    ['unknown pianist', { pianistId: 'x' }, ReferencedPersonNotFoundError],
    ['archived pianist', { pianistId: 'gone' }, ReferencedPersonArchivedError],
    [
      'conductor without the role',
      { conductorId: 'pia' },
      ReferencedPersonRoleMismatchError,
    ],
    [
      'pianist without the role',
      { pianistId: 'con' },
      ReferencedPersonRoleMismatchError,
    ],
    ['invalid date', { date: '2026-02-30' }, PerformanceValueInvalidError],
    ['too long note', { note: 'x'.repeat(501) }, PerformanceValueInvalidError],
  ])('rejects %s and stores nothing', async (_name, patch, errorType) => {
    activeSongs.set('s-old', song('s-old', true));
    await expect(record.execute({ ...base, ...patch })).rejects.toBeInstanceOf(
      errorType,
    );
    expect(repo.items).toHaveLength(0);
  });

  it('list resolves archived songs and people for history and tolerates missing songs', async () => {
    repo.items.push(
      Performance.create({
        ...base,
        songId: 's-old',
        pianistId: 'gone',
      }),
      Performance.create({ ...base, songId: 'vanished' }),
    );

    const views = await list.execute({ communityId: 'c-1' });

    expect(views[0].song?.archived).toBe(true);
    expect(views[0].pianist).toEqual({
      id: 'gone',
      name: 'Person gone',
      archived: true,
    });
    expect(views[1].song).toBeNull();
    expect(views[1].songId).toBe('vanished');
  });

  it('list passes the range, clamps the limit and validates the range', async () => {
    await list.execute({
      communityId: 'c-1',
      from: '2026-09-01',
      to: '2026-09-30',
      limit: 5000,
    });
    expect(repo.lastListOptions?.from?.iso).toBe('2026-09-01');
    expect(repo.lastListOptions?.to?.iso).toBe('2026-09-30');
    expect(repo.lastListOptions?.limit).toBe(200);

    await list.execute({ communityId: 'c-1' });
    expect(repo.lastListOptions?.limit).toBe(50);

    await expect(
      list.execute({
        communityId: 'c-1',
        from: '2026-10-02',
        to: '2026-10-01',
      }),
    ).rejects.toBeInstanceOf(PerformanceValueInvalidError);
    await expect(
      list.execute({ communityId: 'c-1', from: 'bad' }),
    ).rejects.toBeInstanceOf(PerformanceValueInvalidError);
  });

  it('get and delete are scoped to the community', async () => {
    const view = await record.execute(base);

    await expect(
      get.execute({ communityId: 'other', performanceId: view.id }),
    ).rejects.toBeInstanceOf(PerformanceNotFoundError);
    await expect(
      remove.execute({ communityId: 'other', performanceId: view.id }),
    ).rejects.toBeInstanceOf(PerformanceNotFoundError);
    expect(repo.items).toHaveLength(1);

    await remove.execute({ communityId: 'c-1', performanceId: view.id });
    expect(repo.items).toHaveLength(0);
    await expect(
      get.execute({ communityId: 'c-1', performanceId: view.id }),
    ).rejects.toBeInstanceOf(PerformanceNotFoundError);
  });
});
