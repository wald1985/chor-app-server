import { INestApplication } from '@nestjs/common';
import { LibraryBook } from '../../src/library/domain/entities/library-book.entity';
import { LibrarySeries } from '../../src/library/domain/entities/library-series.entity';
import { LibrarySong } from '../../src/library/domain/entities/library-song.entity';
import { LibraryTheme } from '../../src/library/domain/entities/library-theme.entity';
import {
  BookTitleTakenError,
  LibraryBusyError,
  SongNumberTakenError,
  VolumeTakenError,
} from '../../src/library/domain/errors/library.errors';
import { BookPlacement } from '../../src/library/domain/value-objects/book-placement';
import {
  BookRepository,
  BOOK_REPOSITORY,
} from '../../src/library/domain/ports/book-repository.port';
import {
  IdGenerator,
  ID_GENERATOR,
} from '../../src/library/domain/ports/id-generator.port';
import {
  LibraryUnitOfWork,
  LIBRARY_UNIT_OF_WORK,
} from '../../src/library/domain/ports/library-unit-of-work.port';
import {
  SeriesRepository,
  SERIES_REPOSITORY,
} from '../../src/library/domain/ports/series-repository.port';
import {
  SongRepository,
  SONG_REPOSITORY,
} from '../../src/library/domain/ports/song-repository.port';
import {
  ThemeRepository,
  THEME_REPOSITORY,
} from '../../src/library/domain/ports/theme-repository.port';
import { PrismaService } from '../../src/shared/prisma/prisma.service';
import { createTestApp } from '../utils/create-test-app';
import { resetDb } from '../utils/reset-db';

describe('Library Repositories & Infrastructure (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let seriesRepo: SeriesRepository;
  let bookRepo: BookRepository;
  let songRepo: SongRepository;
  let themeRepo: ThemeRepository;
  let uow: LibraryUnitOfWork;
  let idGen: IdGenerator;

  beforeAll(async () => {
    const testApp = await createTestApp();
    app = testApp.app;
    prisma = app.get(PrismaService);
    seriesRepo = app.get<SeriesRepository>(SERIES_REPOSITORY);
    bookRepo = app.get<BookRepository>(BOOK_REPOSITORY);
    songRepo = app.get<SongRepository>(SONG_REPOSITORY);
    themeRepo = app.get<ThemeRepository>(THEME_REPOSITORY);
    uow = app.get<LibraryUnitOfWork>(LIBRARY_UNIT_OF_WORK);
    idGen = app.get<IdGenerator>(ID_GENERATOR);
  });

  beforeEach(async () => {
    await resetDb(prisma);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('resetDb', () => {
    it('cleans all library tables in public schema', async () => {
      const series = LibrarySeries.create({
        id: idGen.generateId(),
        title: 'Series A',
      });
      await seriesRepo.create(series);

      const book = LibraryBook.create({
        id: idGen.generateId(),
        title: 'Book A',
        placement: { seriesId: series.id, volume: 1 },
      });
      await bookRepo.create(book);

      const theme = LibraryTheme.create({
        id: idGen.generateId(),
        name: 'Theme A',
      });
      await themeRepo.create(theme);

      const song = LibrarySong.create(book, {
        id: idGen.generateId(),
        number: 1,
        title: 'Song 1',
        themeIds: [theme.id],
      });
      await songRepo.create(song);

      expect(await prisma.librarySeries.count()).toBe(1);
      expect(await prisma.libraryBook.count()).toBe(1);
      expect(await prisma.librarySong.count()).toBe(1);
      expect(await prisma.libraryTheme.count()).toBe(1);
      expect(await prisma.librarySongTheme.count()).toBe(1);

      await resetDb(prisma);

      expect(await prisma.librarySeries.count()).toBe(0);
      expect(await prisma.libraryBook.count()).toBe(0);
      expect(await prisma.librarySong.count()).toBe(0);
      expect(await prisma.libraryTheme.count()).toBe(0);
      expect(await prisma.librarySongTheme.count()).toBe(0);
    });
  });

  describe('Uniqueness constraints and P2002 domain mapping', () => {
    it('throws BookTitleTakenError when book title conflicts (case-insensitive)', async () => {
      const book1 = LibraryBook.create({
        id: idGen.generateId(),
        title: 'Glaubenslieder',
      });
      await bookRepo.create(book1);

      const book2 = LibraryBook.create({
        id: idGen.generateId(),
        title: '  glaubenslieder  ',
      });

      await expect(bookRepo.create(book2)).rejects.toThrow(BookTitleTakenError);
      try {
        await bookRepo.create(book2);
      } catch (err) {
        expect(err).toBeInstanceOf(BookTitleTakenError);
        const taken = err as BookTitleTakenError;
        expect(taken.existingId).toBe(book1.id);
        expect(taken.existingArchived).toBe(false);
      }
    });

    it('throws VolumeTakenError when volume conflicts inside the same series', async () => {
      const series = LibrarySeries.create({
        id: idGen.generateId(),
        title: 'Bücher',
      });
      await seriesRepo.create(series);

      const book1 = LibraryBook.create({
        id: idGen.generateId(),
        title: 'Buch 1',
        placement: { seriesId: series.id, volume: 1 },
      });
      await bookRepo.create(book1);

      const book2 = LibraryBook.create({
        id: idGen.generateId(),
        title: 'Buch 2',
        placement: { seriesId: series.id, volume: 1 },
      });

      await expect(bookRepo.create(book2)).rejects.toThrow(VolumeTakenError);
      try {
        await bookRepo.create(book2);
      } catch (err) {
        expect(err).toBeInstanceOf(VolumeTakenError);
        const taken = err as VolumeTakenError;
        expect(taken.existingBookId).toBe(book1.id);
      }
    });

    it('allows (NULL, volume) and unplaced books without conflict', async () => {
      const book1 = LibraryBook.create({
        id: idGen.generateId(),
        title: 'Solo 1',
        placement: BookPlacement.unplaced(),
      });
      const book2 = LibraryBook.create({
        id: idGen.generateId(),
        title: 'Solo 2',
        placement: BookPlacement.unplaced(),
      });

      await bookRepo.create(book1);
      await bookRepo.create(book2);

      // Raw DB level: (NULL, volume) in postgres does not conflict with another (NULL, volume)
      const rawId1 = idGen.generateId();
      const rawId2 = idGen.generateId();
      await prisma.libraryBook.create({
        data: {
          id: rawId1,
          title: 'Raw 1',
          titleKey: 'raw 1',
          seriesId: null,
          volume: 1,
        },
      });
      await prisma.libraryBook.create({
        data: {
          id: rawId2,
          title: 'Raw 2',
          titleKey: 'raw 2',
          seriesId: null,
          volume: 1,
        },
      });

      expect(await prisma.libraryBook.count()).toBe(4);
    });

    it('throws SongNumberTakenError when song number conflicts in numberScopeId', async () => {
      const series = LibrarySeries.create({
        id: idGen.generateId(),
        title: 'Lieder',
      });
      await seriesRepo.create(series);

      const book1 = LibraryBook.create({
        id: idGen.generateId(),
        title: 'Band 1',
        placement: { seriesId: series.id, volume: 1 },
      });
      const book2 = LibraryBook.create({
        id: idGen.generateId(),
        title: 'Band 2',
        placement: { seriesId: series.id, volume: 2 },
      });
      await bookRepo.create(book1);
      await bookRepo.create(book2);

      const song1 = LibrarySong.create(book1, {
        id: idGen.generateId(),
        number: '22a',
        title: 'Lied 22a in Buch 1',
      });
      await songRepo.create(song1);

      // Creating same number key "22A" in book2 (same series scope) fails
      const song2 = LibrarySong.create(book2, {
        id: idGen.generateId(),
        number: ' 22 A ',
        title: 'Lied 22A in Buch 2',
      });

      await expect(songRepo.create(song2)).rejects.toThrow(
        SongNumberTakenError,
      );
      try {
        await songRepo.create(song2);
      } catch (err) {
        expect(err).toBeInstanceOf(SongNumberTakenError);
        const taken = err as SongNumberTakenError;
        expect(taken.existingSongId).toBe(song1.id);
        expect(taken.existingBookId).toBe(book1.id);
      }
    });
  });

  describe('rescope()', () => {
    it('updates numberScopeId for all songs belonging to the book', async () => {
      const book = LibraryBook.create({
        id: idGen.generateId(),
        title: 'Single Book',
        placement: BookPlacement.unplaced(),
      });
      await bookRepo.create(book);

      const song1 = LibrarySong.create(book, {
        id: idGen.generateId(),
        number: 1,
        title: 'Song 1',
      });
      const song2 = LibrarySong.create(book, {
        id: idGen.generateId(),
        number: 2,
        title: 'Song 2',
      });
      await songRepo.create(song1);
      await songRepo.create(song2);

      expect((await songRepo.findById(song1.id))?.numberScopeId).toBe(book.id);

      const newSeriesId = idGen.generateId();
      await songRepo.rescope(book.id, newSeriesId);

      const updated1 = await songRepo.findById(song1.id);
      const updated2 = await songRepo.findById(song2.id);

      expect(updated1?.numberScopeId).toBe(newSeriesId);
      expect(updated2?.numberScopeId).toBe(newSeriesId);
    });
  });

  describe('FK deletion restrictions (onDelete: Restrict)', () => {
    it('rejects deletion of series with books, books with songs, songs with themes, themes with songs', async () => {
      const series = LibrarySeries.create({
        id: idGen.generateId(),
        title: 'Series R',
      });
      await seriesRepo.create(series);

      const book = LibraryBook.create({
        id: idGen.generateId(),
        title: 'Book R',
        placement: { seriesId: series.id, volume: 1 },
      });
      await bookRepo.create(book);

      const theme = LibraryTheme.create({
        id: idGen.generateId(),
        name: 'Theme R',
      });
      await themeRepo.create(theme);

      const song = LibrarySong.create(book, {
        id: idGen.generateId(),
        number: 1,
        title: 'Song R',
        themeIds: [theme.id],
      });
      await songRepo.create(song);

      // Attempting to delete series with related book fails
      await expect(
        prisma.librarySeries.delete({ where: { id: series.id } }),
      ).rejects.toThrow();

      // Attempting to delete book with related song fails
      await expect(
        prisma.libraryBook.delete({ where: { id: book.id } }),
      ).rejects.toThrow();

      // Attempting to delete song with related theme link fails
      await expect(
        prisma.librarySong.delete({ where: { id: song.id } }),
      ).rejects.toThrow();

      // Attempting to delete theme with related song link fails
      await expect(
        prisma.libraryTheme.delete({ where: { id: theme.id } }),
      ).rejects.toThrow();
    });
  });

  describe('Parallel transactions & advisory lock', () => {
    it('second transaction waits for the first transaction to finish', async () => {
      const executionOrder: string[] = [];

      const p1 = uow.run(async () => {
        executionOrder.push('tx1:start');
        await new Promise((resolve) => setTimeout(resolve, 300));
        executionOrder.push('tx1:end');
        return 'res1';
      });

      // Start tx2 slightly after tx1 so tx1 acquires lock first
      await new Promise((resolve) => setTimeout(resolve, 50));

      const p2 = uow.run(async () => {
        await Promise.resolve();
        executionOrder.push('tx2:start');
        executionOrder.push('tx2:end');
        return 'res2';
      });

      const [r1, r2] = await Promise.all([p1, p2]);

      expect(r1).toBe('res1');
      expect(r2).toBe('res2');
      expect(executionOrder).toEqual([
        'tx1:start',
        'tx1:end',
        'tx2:start',
        'tx2:end',
      ]);
    });

    it('throws LibraryBusyError when lock is held longer than lock_timeout (5s)', async () => {
      let tx1Finished = false;

      const p1 = uow.run(async () => {
        await new Promise((resolve) => setTimeout(resolve, 5500));
        tx1Finished = true;
        return 'tx1-done';
      });

      // Start tx2 after tx1 has acquired advisory lock
      await new Promise((resolve) => setTimeout(resolve, 100));

      const p2 = uow.run(async () => {
        await Promise.resolve();
        return 'tx2-should-fail';
      });

      await expect(p2).rejects.toThrow(LibraryBusyError);

      const r1 = await p1;
      expect(r1).toBe('tx1-done');
      expect(tx1Finished).toBe(true);
    }, 12000);
  });

  describe('createMany & rollback within transaction', () => {
    it('creates songs with theme links in single tx, and rolls back everything on error', async () => {
      const book = LibraryBook.create({
        id: idGen.generateId(),
        title: 'Transactional Book',
      });
      await bookRepo.create(book);

      const theme1 = LibraryTheme.create({
        id: idGen.generateId(),
        name: 'T1',
      });
      const theme2 = LibraryTheme.create({
        id: idGen.generateId(),
        name: 'T2',
      });
      await themeRepo.create(theme1);
      await themeRepo.create(theme2);

      const song1 = LibrarySong.create(book, {
        id: idGen.generateId(),
        number: 10,
        title: 'Song 10',
        themeIds: [theme1.id, theme2.id],
      });
      const song2 = LibrarySong.create(book, {
        id: idGen.generateId(),
        number: 20,
        title: 'Song 20',
        themeIds: [theme2.id],
      });

      // Successful batch creation
      await uow.run(async () => {
        await songRepo.createMany([song1, song2]);
      });

      expect(await prisma.librarySong.count()).toBe(2);
      expect(await prisma.librarySongTheme.count()).toBe(3);

      // Now attempt a transaction that creates songs and then throws
      const song3 = LibrarySong.create(book, {
        id: idGen.generateId(),
        number: 30,
        title: 'Song 30',
        themeIds: [theme1.id],
      });

      await expect(
        uow.run(async () => {
          await songRepo.createMany([song3]);
          throw new Error('Intentional rollback failure');
        }),
      ).rejects.toThrow('Intentional rollback failure');

      // song3 was rolled back
      expect(await prisma.librarySong.count()).toBe(2);
      expect(await songRepo.findById(song3.id)).toBeNull();
    });
  });
});
