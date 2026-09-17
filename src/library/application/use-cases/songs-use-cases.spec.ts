import { LibraryBook } from '../../domain/entities/library-book.entity';
import { LibrarySong } from '../../domain/entities/library-song.entity';
import { LibraryTheme } from '../../domain/entities/library-theme.entity';
import {
  BookArchivedError,
  BookNotFoundError,
  SongArchivedError,
  SongNotFoundError,
  SongNumberTakenError,
  ThemeArchivedError,
  ThemeNotFoundError,
} from '../../domain/errors/library.errors';
import { ArchiveSongUseCase } from './songs/archive-song.use-case';
import { CreateSongUseCase } from './songs/create-song.use-case';
import { RestoreSongUseCase } from './songs/restore-song.use-case';
import { SetSongThemesUseCase } from './songs/set-song-themes.use-case';
import { UpdateSongUseCase } from './songs/update-song.use-case';
import {
  FakeClock,
  FakeIdGenerator,
  FakeUnitOfWork,
  InMemoryBookRepository,
  InMemorySongRepository,
  InMemoryThemeRepository,
} from './test-helpers';

describe('Song Use Cases (Unit)', () => {
  let songRepo: InMemorySongRepository;
  let bookRepo: InMemoryBookRepository;
  let themeRepo: InMemoryThemeRepository;
  let uow: FakeUnitOfWork;
  let idGenerator: FakeIdGenerator;
  let clock: FakeClock;

  let createSong: CreateSongUseCase;
  let updateSong: UpdateSongUseCase;
  let setSongThemes: SetSongThemesUseCase;
  let archiveSong: ArchiveSongUseCase;
  let restoreSong: RestoreSongUseCase;

  beforeEach(() => {
    songRepo = new InMemorySongRepository();
    bookRepo = new InMemoryBookRepository();
    themeRepo = new InMemoryThemeRepository();
    uow = new FakeUnitOfWork();
    idGenerator = new FakeIdGenerator();
    clock = new FakeClock();

    createSong = new CreateSongUseCase(
      songRepo,
      bookRepo,
      themeRepo,
      uow,
      idGenerator,
    );
    updateSong = new UpdateSongUseCase(songRepo, uow);
    setSongThemes = new SetSongThemesUseCase(songRepo, themeRepo, uow);
    archiveSong = new ArchiveSongUseCase(songRepo, uow, clock);
    restoreSong = new RestoreSongUseCase(songRepo, bookRepo, uow);
  });

  describe('CreateSongUseCase', () => {
    it('creates a song in an active book successfully', async () => {
      const book = LibraryBook.create({ id: 'b1', title: 'Buch 1' });
      await bookRepo.create(book);

      const theme = LibraryTheme.create({ id: 't1', name: 'Glaube' });
      await themeRepo.create(theme);

      const song = await createSong.execute({
        bookId: 'b1',
        number: '42a',
        title: 'Mein Lied',
        author: 'Komponist',
        themeIds: ['t1'],
      });

      expect(song.id).toBe('id-1');
      expect(song.numberValue).toBe('42a');
      expect(song.titleValue).toBe('Mein Lied');
      expect(song.themeIds).toEqual(['t1']);
    });

    it('throws BookNotFoundError if book does not exist', async () => {
      await expect(
        createSong.execute({
          bookId: 'b404',
          number: 1,
          title: 'Lied',
        }),
      ).rejects.toThrow(BookNotFoundError);
    });

    it('throws BookArchivedError if book is archived', async () => {
      const book = LibraryBook.create({ id: 'b1', title: 'Buch 1' });
      book.archive(clock.now());
      await bookRepo.create(book);

      await expect(
        createSong.execute({
          bookId: 'b1',
          number: 1,
          title: 'Lied',
        }),
      ).rejects.toThrow(BookArchivedError);
    });

    it('throws SongNumberTakenError if number already exists in book scope', async () => {
      const book = LibraryBook.create({ id: 'b1', title: 'Buch 1' });
      await bookRepo.create(book);
      const existing = LibrarySong.create(book, {
        id: 's1',
        number: '10',
        title: 'Erstes Lied',
      });
      await songRepo.create(existing);

      await expect(
        createSong.execute({
          bookId: 'b1',
          number: '10',
          title: 'Zweites Lied',
        }),
      ).rejects.toThrow(SongNumberTakenError);
    });

    it('throws ThemeNotFoundError if a themeId does not exist', async () => {
      const book = LibraryBook.create({ id: 'b1', title: 'Buch 1' });
      await bookRepo.create(book);

      await expect(
        createSong.execute({
          bookId: 'b1',
          number: 1,
          title: 'Lied',
          themeIds: ['t404'],
        }),
      ).rejects.toThrow(ThemeNotFoundError);
    });

    it('throws ThemeArchivedError if a theme is archived', async () => {
      const book = LibraryBook.create({ id: 'b1', title: 'Buch 1' });
      await bookRepo.create(book);

      const theme = LibraryTheme.create({
        id: 't1',
        name: 'Archiviertes Thema',
      });
      theme.archive(clock.now());
      await themeRepo.create(theme);

      await expect(
        createSong.execute({
          bookId: 'b1',
          number: 1,
          title: 'Lied',
          themeIds: ['t1'],
        }),
      ).rejects.toThrow(ThemeArchivedError);
    });
  });

  describe('UpdateSongUseCase', () => {
    it('renumbers song while preserving id (ADR10 Q6)', async () => {
      const book = LibraryBook.create({ id: 'b1', title: 'Buch 1' });
      await bookRepo.create(book);
      const song = LibrarySong.create(book, {
        id: 's1',
        number: '10',
        title: 'Lied',
      });
      await songRepo.create(song);

      await updateSong.execute({ id: 's1', number: '20' });

      expect(songRepo.saveCallCount).toBe(1);
      const updated = await songRepo.findById('s1');
      expect(updated?.id).toBe('s1');
      expect(updated?.numberValue).toBe('20');
    });

    it('throws SongNumberTakenError when renumbering to an existing number', async () => {
      const book = LibraryBook.create({ id: 'b1', title: 'Buch 1' });
      await bookRepo.create(book);
      const s1 = LibrarySong.create(book, {
        id: 's1',
        number: '10',
        title: 'Lied 1',
      });
      const s2 = LibrarySong.create(book, {
        id: 's2',
        number: '20',
        title: 'Lied 2',
      });
      await songRepo.create(s1);
      await songRepo.create(s2);

      await expect(
        updateSong.execute({ id: 's1', number: '20' }),
      ).rejects.toThrow(SongNumberTakenError);
    });

    it('updates text fields and does not save if unchanged', async () => {
      const book = LibraryBook.create({ id: 'b1', title: 'Buch 1' });
      await bookRepo.create(book);
      const song = LibrarySong.create(book, {
        id: 's1',
        number: '10',
        title: 'Titel',
      });
      await songRepo.create(song);

      await updateSong.execute({ id: 's1', title: 'Titel' });
      expect(songRepo.saveCallCount).toBe(0);

      await updateSong.execute({
        id: 's1',
        title: 'Neuer Titel',
        author: 'Autor',
      });
      expect(songRepo.saveCallCount).toBe(1);
      const updated = await songRepo.findById('s1');
      expect(updated?.titleValue).toBe('Neuer Titel');
      expect(updated?.authorValue).toBe('Autor');
    });

    it('throws SongNotFoundError if song does not exist', async () => {
      await expect(
        updateSong.execute({ id: 's404', title: 'Neuer Titel' }),
      ).rejects.toThrow(SongNotFoundError);
    });

    it('throws SongArchivedError when updating an archived song', async () => {
      const book = LibraryBook.create({ id: 'b1', title: 'Buch 1' });
      await bookRepo.create(book);
      const song = LibrarySong.create(book, {
        id: 's1',
        number: '10',
        title: 'Lied',
      });
      song.archive(clock.now());
      await songRepo.create(song);

      await expect(
        updateSong.execute({ id: 's1', title: 'Neuer Titel' }),
      ).rejects.toThrow(SongArchivedError);
    });
  });

  describe('SetSongThemesUseCase', () => {
    it('sets themes and updates song', async () => {
      const book = LibraryBook.create({ id: 'b1', title: 'Buch 1' });
      await bookRepo.create(book);
      const t1 = LibraryTheme.create({ id: 't1', name: 'Thema 1' });
      await themeRepo.create(t1);

      const song = LibrarySong.create(book, {
        id: 's1',
        number: '1',
        title: 'Lied',
      });
      await songRepo.create(song);

      await setSongThemes.execute({ songId: 's1', themeIds: ['t1'] });

      expect(songRepo.saveCallCount).toBe(1);
      const updated = await songRepo.findById('s1');
      expect(updated?.themeIds).toEqual(['t1']);
    });

    it('allows keeping an already attached archived theme (D§6.2)', async () => {
      const book = LibraryBook.create({ id: 'b1', title: 'Buch 1' });
      await bookRepo.create(book);

      const tArchived = LibraryTheme.create({
        id: 'tArch',
        name: 'Archiviert',
      });
      tArchived.archive(clock.now());
      await themeRepo.create(tArchived);

      const tActive = LibraryTheme.create({ id: 'tAct', name: 'Aktiv' });
      await themeRepo.create(tActive);

      // Song already has the archived theme
      const song = LibrarySong.create(book, {
        id: 's1',
        number: '1',
        title: 'Lied',
        themeIds: ['tArch'],
      });
      await songRepo.create(song);

      // Keeping tArch and adding tAct is allowed!
      await setSongThemes.execute({
        songId: 's1',
        themeIds: ['tArch', 'tAct'],
      });

      const updated = await songRepo.findById('s1');
      expect(updated?.themeIds).toEqual(['tArch', 'tAct']);
    });

    it('rejects adding a NEW archived theme to the song (D§6.2)', async () => {
      const book = LibraryBook.create({ id: 'b1', title: 'Buch 1' });
      await bookRepo.create(book);

      const tArchived = LibraryTheme.create({
        id: 'tArch',
        name: 'Archiviert',
      });
      tArchived.archive(clock.now());
      await themeRepo.create(tArchived);

      const song = LibrarySong.create(book, {
        id: 's1',
        number: '1',
        title: 'Lied',
        themeIds: [],
      });
      await songRepo.create(song);

      await expect(
        setSongThemes.execute({ songId: 's1', themeIds: ['tArch'] }),
      ).rejects.toThrow(ThemeArchivedError);
    });

    it('does not save when themes are unchanged', async () => {
      const book = LibraryBook.create({ id: 'b1', title: 'Buch 1' });
      await bookRepo.create(book);
      const t1 = LibraryTheme.create({ id: 't1', name: 'Thema 1' });
      await themeRepo.create(t1);

      const song = LibrarySong.create(book, {
        id: 's1',
        number: '1',
        title: 'Lied',
        themeIds: ['t1'],
      });
      await songRepo.create(song);

      await setSongThemes.execute({ songId: 's1', themeIds: ['t1'] });

      expect(songRepo.saveCallCount).toBe(0);
    });
  });

  describe('ArchiveSongUseCase', () => {
    it('archives song successfully', async () => {
      const book = LibraryBook.create({ id: 'b1', title: 'Buch 1' });
      await bookRepo.create(book);
      const song = LibrarySong.create(book, {
        id: 's1',
        number: '1',
        title: 'Lied',
      });
      await songRepo.create(song);

      await archiveSong.execute({ id: 's1' });

      expect(songRepo.saveCallCount).toBe(1);
      const updated = await songRepo.findById('s1');
      expect(updated?.isArchived).toBe(true);
    });

    it('is idempotent and does not save if already archived', async () => {
      const book = LibraryBook.create({ id: 'b1', title: 'Buch 1' });
      await bookRepo.create(book);
      const song = LibrarySong.create(book, {
        id: 's1',
        number: '1',
        title: 'Lied',
      });
      song.archive(clock.now());
      await songRepo.create(song);

      await archiveSong.execute({ id: 's1' });

      expect(songRepo.saveCallCount).toBe(0);
    });
  });

  describe('RestoreSongUseCase', () => {
    it('restores archived song', async () => {
      const book = LibraryBook.create({ id: 'b1', title: 'Buch 1' });
      await bookRepo.create(book);
      const song = LibrarySong.create(book, {
        id: 's1',
        number: '1',
        title: 'Lied',
      });
      song.archive(clock.now());
      await songRepo.create(song);

      await restoreSong.execute({ id: 's1' });

      expect(songRepo.saveCallCount).toBe(1);
      const updated = await songRepo.findById('s1');
      expect(updated?.isArchived).toBe(false);
    });

    it('throws BookArchivedError if song book is archived', async () => {
      const book = LibraryBook.create({ id: 'b1', title: 'Buch 1' });
      book.archive(clock.now());
      await bookRepo.create(book);

      const song = LibrarySong.reconstitute({
        id: 's1',
        bookId: 'b1',
        numberScopeId: 'b1',
        number: '1',
        title: 'Lied',
        archivedAt: clock.now(),
      });
      await songRepo.create(song);

      await expect(restoreSong.execute({ id: 's1' })).rejects.toThrow(
        BookArchivedError,
      );
    });

    it('is idempotent and does not save if already active', async () => {
      const book = LibraryBook.create({ id: 'b1', title: 'Buch 1' });
      await bookRepo.create(book);
      const song = LibrarySong.create(book, {
        id: 's1',
        number: '1',
        title: 'Lied',
      });
      await songRepo.create(song);

      await restoreSong.execute({ id: 's1' });

      expect(songRepo.saveCallCount).toBe(0);
    });
  });
});
