import { LibraryBook } from '../../domain/entities/library-book.entity';
import { LibrarySeries } from '../../domain/entities/library-series.entity';
import { LibrarySong } from '../../domain/entities/library-song.entity';
import {
  BookArchivedError,
  BookNotFoundError,
  BookPlacementInvalidError,
  BookTitleTakenError,
  NumberScopeConflictError,
  SeriesArchivedError,
  SeriesNotFoundError,
  VolumeTakenError,
} from '../../domain/errors/library.errors';
import { BookPlacement } from '../../domain/value-objects/book-placement';
import { ArchiveBookUseCase } from './books/archive-book.use-case';
import { CreateBookUseCase } from './books/create-book.use-case';
import { PlaceBookUseCase } from './books/place-book.use-case';
import { RestoreBookUseCase } from './books/restore-book.use-case';
import { UpdateBookUseCase } from './books/update-book.use-case';
import {
  FakeClock,
  FakeIdGenerator,
  FakeUnitOfWork,
  InMemoryBookRepository,
  InMemorySeriesRepository,
  InMemorySongRepository,
} from './test-helpers';

describe('Book Use Cases (Unit)', () => {
  let bookRepo: InMemoryBookRepository;
  let seriesRepo: InMemorySeriesRepository;
  let songRepo: InMemorySongRepository;
  let uow: FakeUnitOfWork;
  let idGenerator: FakeIdGenerator;
  let clock: FakeClock;

  let createBook: CreateBookUseCase;
  let updateBook: UpdateBookUseCase;
  let placeBook: PlaceBookUseCase;
  let archiveBook: ArchiveBookUseCase;
  let restoreBook: RestoreBookUseCase;

  beforeEach(() => {
    bookRepo = new InMemoryBookRepository();
    seriesRepo = new InMemorySeriesRepository();
    songRepo = new InMemorySongRepository();
    uow = new FakeUnitOfWork();
    idGenerator = new FakeIdGenerator();
    clock = new FakeClock();

    createBook = new CreateBookUseCase(bookRepo, seriesRepo, uow, idGenerator);
    updateBook = new UpdateBookUseCase(bookRepo, uow);
    placeBook = new PlaceBookUseCase(bookRepo, seriesRepo, songRepo, uow);
    archiveBook = new ArchiveBookUseCase(bookRepo, uow, clock);
    restoreBook = new RestoreBookUseCase(bookRepo, seriesRepo, uow);
  });

  describe('CreateBookUseCase', () => {
    it('creates an unplaced book successfully', async () => {
      const view = await createBook.execute({ title: 'Einzelgesänge' });

      expect(uow.runCallCount).toBe(1);
      expect(view.id).toBe('id-1');
      expect(view.title).toBe('Einzelgesänge');
      expect(view.series).toBeNull();
      expect(view.volume).toBeNull();
    });

    it('creates a book placed in a series with volume', async () => {
      await seriesRepo.create(
        LibrarySeries.create({ id: 's1', title: 'Chorbuch' }),
      );

      const view = await createBook.execute({
        title: 'Chorbuch 1',
        seriesId: 's1',
        volume: 1,
      });

      expect(view.series?.id).toBe('s1');
      expect(view.volume).toBe(1);
    });

    it('throws BookTitleTakenError if title already exists (case insensitive)', async () => {
      await bookRepo.create(LibraryBook.create({ id: 'b1', title: 'Buch A' }));

      await expect(createBook.execute({ title: 'buch a' })).rejects.toThrow(
        BookTitleTakenError,
      );
    });

    it('throws SeriesNotFoundError if seriesId does not exist', async () => {
      await expect(
        createBook.execute({
          title: 'Buch B',
          seriesId: 's404',
          volume: 1,
        }),
      ).rejects.toThrow(SeriesNotFoundError);
    });

    it('throws SeriesArchivedError if series is archived', async () => {
      const s = LibrarySeries.create({ id: 's1', title: 'Chorbuch' });
      s.archive(clock.now(), 0, []);
      await seriesRepo.create(s);

      await expect(
        createBook.execute({
          title: 'Buch B',
          seriesId: 's1',
          volume: 1,
        }),
      ).rejects.toThrow(SeriesArchivedError);
    });

    it('throws VolumeTakenError if volume is already taken in the series', async () => {
      await seriesRepo.create(
        LibrarySeries.create({ id: 's1', title: 'Chorbuch' }),
      );
      await bookRepo.create(
        LibraryBook.create({
          id: 'b1',
          title: 'Buch 1',
          placement: { seriesId: 's1', volume: 1 },
        }),
      );

      await expect(
        createBook.execute({
          title: 'Buch 1 Wiederholung',
          seriesId: 's1',
          volume: 1,
        }),
      ).rejects.toThrow(VolumeTakenError);
    });

    it('throws BookPlacementInvalidError if seriesId is provided without volume', async () => {
      await expect(
        createBook.execute({
          title: 'Buch ohne Band',
          seriesId: 's1',
        }),
      ).rejects.toThrow(BookPlacementInvalidError);
    });
  });

  describe('UpdateBookUseCase', () => {
    it('renames book successfully', async () => {
      await bookRepo.create(LibraryBook.create({ id: 'b1', title: 'Alt' }));

      await updateBook.execute({ id: 'b1', title: 'Neu' });

      expect(bookRepo.saveCallCount).toBe(1);
      const updated = await bookRepo.findById('b1');
      expect(updated?.title.value).toBe('Neu');
    });

    it('throws BookNotFoundError if book does not exist', async () => {
      await expect(
        updateBook.execute({ id: 'b404', title: 'Neu' }),
      ).rejects.toThrow(BookNotFoundError);
    });

    it('throws BookArchivedError if book is archived', async () => {
      const b = LibraryBook.create({ id: 'b1', title: 'Alt' });
      b.archive(clock.now());
      await bookRepo.create(b);

      await expect(
        updateBook.execute({ id: 'b1', title: 'Neu' }),
      ).rejects.toThrow(BookArchivedError);
    });

    it('does not save if title is unchanged', async () => {
      await bookRepo.create(
        LibraryBook.create({ id: 'b1', title: 'Identisch' }),
      );

      await updateBook.execute({ id: 'b1', title: 'Identisch' });

      expect(bookRepo.saveCallCount).toBe(0);
    });
  });

  describe('PlaceBookUseCase', () => {
    it('places unplaced book into series with songs rescoped without conflict', async () => {
      await seriesRepo.create(
        LibrarySeries.create({ id: 's1', title: 'Chorbuch' }),
      );
      const book = LibraryBook.create({ id: 'b1', title: 'Solo Buch' });
      await bookRepo.create(book);

      const song1 = LibrarySong.create(book, {
        id: 'sg1',
        number: 1,
        title: 'Lied 1',
      });
      const song2 = LibrarySong.create(book, {
        id: 'sg2',
        number: 2,
        title: 'Lied 2',
      });
      await songRepo.create(song1);
      await songRepo.create(song2);

      await placeBook.execute({ bookId: 'b1', seriesId: 's1', volume: 1 });

      expect(bookRepo.saveCallCount).toBe(1);
      expect(songRepo.rescopedCalls).toEqual([
        { bookId: 'b1', newScopeId: 's1' },
      ]);
      const updatedBook = await bookRepo.findById('b1');
      expect(updatedBook?.seriesId).toBe('s1');
      expect(updatedBook?.volumeValue).toBe(1);
    });

    it('throws NumberScopeConflictError when songs collide in target series and changes nothing', async () => {
      await seriesRepo.create(
        LibrarySeries.create({ id: 's1', title: 'Chorbuch' }),
      );
      const existingBook = LibraryBook.create({
        id: 'bOld',
        title: 'Chorbuch 1',
        placement: { seriesId: 's1', volume: 1 },
      });
      await bookRepo.create(existingBook);

      const existingSong = LibrarySong.create(existingBook, {
        id: 'sgExisting',
        number: '15',
        title: 'Bestehendes Lied',
      });
      await songRepo.create(existingSong);

      const movingBook = LibraryBook.create({
        id: 'bMove',
        title: 'Wanderbuch',
      });
      await bookRepo.create(movingBook);

      const conflictSong = LibrarySong.create(movingBook, {
        id: 'sgConflict',
        number: '15',
        title: 'Kollidierendes Lied',
      });
      await songRepo.create(conflictSong);

      await expect(
        placeBook.execute({ bookId: 'bMove', seriesId: 's1', volume: 2 }),
      ).rejects.toThrow(NumberScopeConflictError);

      expect(songRepo.rescopedCalls).toHaveLength(0);
      expect(bookRepo.saveCallCount).toBe(0);
    });

    it('rescopes songs to bookId when moved out of series', async () => {
      await seriesRepo.create(
        LibrarySeries.create({ id: 's1', title: 'Chorbuch' }),
      );
      const book = LibraryBook.create({
        id: 'b1',
        title: 'Chorbuch 1',
        placement: { seriesId: 's1', volume: 1 },
      });
      await bookRepo.create(book);

      const song = LibrarySong.create(book, {
        id: 'sg1',
        number: 1,
        title: 'Lied',
      });
      await songRepo.create(song);

      await placeBook.execute({ bookId: 'b1', seriesId: null, volume: null });

      expect(songRepo.rescopedCalls).toEqual([
        { bookId: 'b1', newScopeId: 'b1' },
      ]);
      const updatedBook = await bookRepo.findById('b1');
      expect(updatedBook?.seriesId).toBeNull();
    });

    it('does not save when placement is unchanged', async () => {
      const book = LibraryBook.create({
        id: 'b1',
        title: 'Unplaced',
        placement: BookPlacement.unplaced(),
      });
      await bookRepo.create(book);

      await placeBook.execute({ bookId: 'b1', seriesId: null, volume: null });

      expect(bookRepo.saveCallCount).toBe(0);
    });
  });

  describe('ArchiveBookUseCase', () => {
    it('archives book inside UoW', async () => {
      await bookRepo.create(LibraryBook.create({ id: 'b1', title: 'Buch' }));

      await archiveBook.execute({ id: 'b1' });

      expect(bookRepo.saveCallCount).toBe(1);
      const updated = await bookRepo.findById('b1');
      expect(updated?.isArchived).toBe(true);
    });

    it('is idempotent and does not save if already archived', async () => {
      const b = LibraryBook.create({ id: 'b1', title: 'Buch' });
      b.archive(clock.now());
      await bookRepo.create(b);

      await archiveBook.execute({ id: 'b1' });

      expect(bookRepo.saveCallCount).toBe(0);
    });
  });

  describe('RestoreBookUseCase', () => {
    it('restores archived book successfully', async () => {
      const b = LibraryBook.create({ id: 'b1', title: 'Buch' });
      b.archive(clock.now());
      await bookRepo.create(b);

      await restoreBook.execute({ id: 'b1' });

      expect(bookRepo.saveCallCount).toBe(1);
      const updated = await bookRepo.findById('b1');
      expect(updated?.isArchived).toBe(false);
    });

    it('throws SeriesArchivedError if book belongs to an archived series', async () => {
      const s = LibrarySeries.create({ id: 's1', title: 'Serie' });
      s.archive(clock.now(), 0, []);
      await seriesRepo.create(s);

      const b = LibraryBook.create({
        id: 'b1',
        title: 'Buch',
        placement: { seriesId: 's1', volume: 1 },
      });
      b.archive(clock.now());
      await bookRepo.create(b);

      await expect(restoreBook.execute({ id: 'b1' })).rejects.toThrow(
        SeriesArchivedError,
      );
    });

    it('is idempotent and does not save if already active', async () => {
      await bookRepo.create(LibraryBook.create({ id: 'b1', title: 'Buch' }));

      await restoreBook.execute({ id: 'b1' });

      expect(bookRepo.saveCallCount).toBe(0);
    });
  });
});
