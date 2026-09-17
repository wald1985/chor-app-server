import { LibraryBook } from '../../domain/entities/library-book.entity';
import { LibrarySeries } from '../../domain/entities/library-series.entity';
import {
  SeriesArchivedError,
  SeriesHasActiveBooksError,
  SeriesNotFoundError,
  SeriesTitleTakenError,
} from '../../domain/errors/library.errors';
import { ArchiveSeriesUseCase } from './series/archive-series.use-case';
import { CreateSeriesUseCase } from './series/create-series.use-case';
import { RenameSeriesUseCase } from './series/rename-series.use-case';
import { RestoreSeriesUseCase } from './series/restore-series.use-case';
import {
  FakeClock,
  FakeIdGenerator,
  FakeUnitOfWork,
  InMemoryBookRepository,
  InMemorySeriesRepository,
} from './test-helpers';

describe('Series Use Cases (Unit)', () => {
  let seriesRepo: InMemorySeriesRepository;
  let bookRepo: InMemoryBookRepository;
  let uow: FakeUnitOfWork;
  let idGenerator: FakeIdGenerator;
  let clock: FakeClock;

  let createSeries: CreateSeriesUseCase;
  let renameSeries: RenameSeriesUseCase;
  let archiveSeries: ArchiveSeriesUseCase;
  let restoreSeries: RestoreSeriesUseCase;

  beforeEach(() => {
    seriesRepo = new InMemorySeriesRepository();
    bookRepo = new InMemoryBookRepository();
    uow = new FakeUnitOfWork();
    idGenerator = new FakeIdGenerator();
    clock = new FakeClock();

    createSeries = new CreateSeriesUseCase(seriesRepo, uow, idGenerator);
    renameSeries = new RenameSeriesUseCase(seriesRepo, uow);
    archiveSeries = new ArchiveSeriesUseCase(seriesRepo, bookRepo, uow, clock);
    restoreSeries = new RestoreSeriesUseCase(seriesRepo, uow);
  });

  describe('CreateSeriesUseCase', () => {
    it('creates a new series inside unit of work and returns SeriesView', async () => {
      const view = await createSeries.execute({ title: 'Liederbücher' });

      expect(uow.runCallCount).toBe(1);
      expect(view.id).toBe('id-1');
      expect(view.title).toBe('Liederbücher');
      expect(view.books).toEqual([]);

      const inRepo = await seriesRepo.findById('id-1');
      expect(inRepo).toBeDefined();
      expect(inRepo?.title.value).toBe('Liederbücher');
    });

    it('throws SeriesTitleTakenError if title exists (active)', async () => {
      await seriesRepo.create(
        LibrarySeries.create({ id: 's1', title: 'Liederbücher' }),
      );

      await expect(
        createSeries.execute({ title: 'liederbücher' }),
      ).rejects.toThrow(SeriesTitleTakenError);
    });

    it('throws SeriesTitleTakenError if title exists (archived)', async () => {
      const series = LibrarySeries.create({
        id: 's1',
        title: 'Archivierte Serie',
      });
      series.archive(clock.now(), 0, []);
      await seriesRepo.create(series);

      await expect(
        createSeries.execute({ title: 'archivierte serie' }),
      ).rejects.toThrow(SeriesTitleTakenError);
    });
  });

  describe('RenameSeriesUseCase', () => {
    it('renames series successfully inside UoW', async () => {
      await seriesRepo.create(LibrarySeries.create({ id: 's1', title: 'Alt' }));

      await renameSeries.execute({ id: 's1', title: 'Neu' });

      expect(uow.runCallCount).toBe(1);
      expect(seriesRepo.saveCallCount).toBe(1);
      const updated = await seriesRepo.findById('s1');
      expect(updated?.title.value).toBe('Neu');
    });

    it('throws SeriesNotFoundError when series does not exist', async () => {
      await expect(
        renameSeries.execute({ id: 's404', title: 'Neu' }),
      ).rejects.toThrow(SeriesNotFoundError);
    });

    it('throws SeriesArchivedError when series is archived', async () => {
      const series = LibrarySeries.create({ id: 's1', title: 'Serie' });
      series.archive(clock.now(), 0, []);
      await seriesRepo.create(series);

      await expect(
        renameSeries.execute({ id: 's1', title: 'Neu' }),
      ).rejects.toThrow(SeriesArchivedError);
    });

    it('throws SeriesTitleTakenError when new title belongs to another series', async () => {
      await seriesRepo.create(
        LibrarySeries.create({ id: 's1', title: 'Alpha' }),
      );
      await seriesRepo.create(
        LibrarySeries.create({ id: 's2', title: 'Beta' }),
      );

      await expect(
        renameSeries.execute({ id: 's2', title: 'Alpha' }),
      ).rejects.toThrow(SeriesTitleTakenError);
    });

    it('does not save when title is unchanged', async () => {
      await seriesRepo.create(
        LibrarySeries.create({ id: 's1', title: 'Gleich' }),
      );

      await renameSeries.execute({ id: 's1', title: 'Gleich' });

      expect(seriesRepo.saveCallCount).toBe(0);
    });
  });

  describe('ArchiveSeriesUseCase', () => {
    it('archives series when there are no active books', async () => {
      await seriesRepo.create(
        LibrarySeries.create({ id: 's1', title: 'Serie' }),
      );

      await archiveSeries.execute({ id: 's1' });

      expect(uow.runCallCount).toBe(1);
      expect(seriesRepo.saveCallCount).toBe(1);
      const updated = await seriesRepo.findById('s1');
      expect(updated?.isArchived).toBe(true);
    });

    it('throws SeriesHasActiveBooksError if series contains active books', async () => {
      await seriesRepo.create(
        LibrarySeries.create({ id: 's1', title: 'Serie' }),
      );
      await bookRepo.create(
        LibraryBook.create({
          id: 'b1',
          title: 'Buch 1',
          placement: { seriesId: 's1', volume: 1 },
        }),
      );

      await expect(archiveSeries.execute({ id: 's1' })).rejects.toThrow(
        SeriesHasActiveBooksError,
      );
      expect(seriesRepo.saveCallCount).toBe(0);
    });

    it('is idempotent and does not save if already archived', async () => {
      const s = LibrarySeries.create({ id: 's1', title: 'Serie' });
      s.archive(clock.now(), 0, []);
      await seriesRepo.create(s);

      await archiveSeries.execute({ id: 's1' });

      expect(seriesRepo.saveCallCount).toBe(0);
    });

    it('throws SeriesNotFoundError if series does not exist', async () => {
      await expect(archiveSeries.execute({ id: 's404' })).rejects.toThrow(
        SeriesNotFoundError,
      );
    });
  });

  describe('RestoreSeriesUseCase', () => {
    it('restores archived series inside UoW', async () => {
      const s = LibrarySeries.create({ id: 's1', title: 'Serie' });
      s.archive(clock.now(), 0, []);
      await seriesRepo.create(s);

      await restoreSeries.execute({ id: 's1' });

      expect(uow.runCallCount).toBe(1);
      expect(seriesRepo.saveCallCount).toBe(1);
      const updated = await seriesRepo.findById('s1');
      expect(updated?.isArchived).toBe(false);
    });

    it('is idempotent and does not save if already active', async () => {
      await seriesRepo.create(
        LibrarySeries.create({ id: 's1', title: 'Serie' }),
      );

      await restoreSeries.execute({ id: 's1' });

      expect(seriesRepo.saveCallCount).toBe(0);
    });

    it('throws SeriesNotFoundError if series does not exist', async () => {
      await expect(restoreSeries.execute({ id: 's404' })).rejects.toThrow(
        SeriesNotFoundError,
      );
    });
  });
});
