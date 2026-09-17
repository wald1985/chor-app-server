import { LibraryBook } from '../../domain/entities/library-book.entity';
import { LibrarySeries } from '../../domain/entities/library-series.entity';
import { LibrarySong } from '../../domain/entities/library-song.entity';
import { LibraryTheme } from '../../domain/entities/library-theme.entity';
import type { BookRepository } from '../../domain/ports/book-repository.port';
import type { SeriesRepository } from '../../domain/ports/series-repository.port';
import type { SongRepository } from '../../domain/ports/song-repository.port';
import type { ThemeRepository } from '../../domain/ports/theme-repository.port';
import { BookPlacement } from '../../domain/value-objects/book-placement';
import { GetBookQuery } from './get-book.query';
import { GetSongQuery } from './get-song.query';
import { ListBooksQuery } from './list-books.query';
import { ListSeriesQuery } from './list-series.query';
import { ListThemesQuery } from './list-themes.query';
import { LookupSongQuery } from './lookup-song.query';

class InMemorySeriesRepository implements SeriesRepository {
  private series: LibrarySeries[] = [];

  findById(id: string): Promise<LibrarySeries | null> {
    return Promise.resolve(this.series.find((s) => s.id === id) ?? null);
  }

  findByTitleKey(titleKey: string): Promise<LibrarySeries | null> {
    return Promise.resolve(
      this.series.find((s) => s.titleKey === titleKey) ?? null,
    );
  }

  findAll(options?: { includeArchived?: boolean }): Promise<LibrarySeries[]> {
    if (options?.includeArchived) {
      return Promise.resolve([...this.series]);
    }
    return Promise.resolve(this.series.filter((s) => !s.isArchived));
  }

  save(series: LibrarySeries): Promise<void> {
    const idx = this.series.findIndex((s) => s.id === series.id);
    if (idx !== -1) {
      this.series[idx] = series;
    }
    return Promise.resolve();
  }

  create(series: LibrarySeries): Promise<void> {
    this.series.push(series);
    return Promise.resolve();
  }
}

class InMemoryBookRepository implements BookRepository {
  private books: LibraryBook[] = [];

  findById(id: string): Promise<LibraryBook | null> {
    return Promise.resolve(this.books.find((b) => b.id === id) ?? null);
  }

  findByTitleKey(titleKey: string): Promise<LibraryBook | null> {
    return Promise.resolve(
      this.books.find((b) => b.titleKey === titleKey) ?? null,
    );
  }

  findBySeriesAndVolume(
    seriesId: string,
    volume: number,
  ): Promise<LibraryBook | null> {
    return Promise.resolve(
      this.books.find(
        (b) => b.seriesId === seriesId && b.volumeValue === volume,
      ) ?? null,
    );
  }

  findAll(options?: {
    seriesId?: string;
    search?: string;
    includeArchived?: boolean;
  }): Promise<LibraryBook[]> {
    let result = [...this.books];
    if (!options?.includeArchived) {
      result = result.filter((b) => !b.isArchived);
    }
    if (options?.seriesId !== undefined) {
      result = result.filter((b) => b.seriesId === options.seriesId);
    }
    if (options?.search) {
      const q = options.search.toLowerCase();
      result = result.filter((b) => b.title.value.toLowerCase().includes(q));
    }
    return Promise.resolve(result);
  }

  findByIds(ids: string[]): Promise<LibraryBook[]> {
    return Promise.resolve(this.books.filter((b) => ids.includes(b.id)));
  }

  countActiveBySeriesId(seriesId: string): Promise<number> {
    return Promise.resolve(
      this.books.filter((b) => b.seriesId === seriesId && !b.isArchived).length,
    );
  }

  findActiveIdsBySeriesId(seriesId: string): Promise<string[]> {
    return Promise.resolve(
      this.books
        .filter((b) => b.seriesId === seriesId && !b.isArchived)
        .map((b) => b.id),
    );
  }

  save(book: LibraryBook): Promise<void> {
    const idx = this.books.findIndex((b) => b.id === book.id);
    if (idx !== -1) {
      this.books[idx] = book;
    }
    return Promise.resolve();
  }

  create(book: LibraryBook): Promise<void> {
    this.books.push(book);
    return Promise.resolve();
  }
}

class InMemorySongRepository implements SongRepository {
  private songs: LibrarySong[] = [];

  findById(id: string): Promise<LibrarySong | null> {
    return Promise.resolve(this.songs.find((s) => s.id === id) ?? null);
  }

  findByScope(
    numberScopeId: string,
    numberKey: string,
  ): Promise<LibrarySong | null> {
    return Promise.resolve(
      this.songs.find(
        (s) => s.numberScopeId === numberScopeId && s.numberKey === numberKey,
      ) ?? null,
    );
  }

  listByBookIds(
    bookIds: string[],
    options?: { includeArchived?: boolean },
  ): Promise<LibrarySong[]> {
    let result = this.songs.filter((s) => bookIds.includes(s.bookId));
    if (!options?.includeArchived) {
      result = result.filter((s) => !s.isArchived);
    }
    return Promise.resolve(result);
  }

  findByIds(ids: string[]): Promise<LibrarySong[]> {
    return Promise.resolve(this.songs.filter((s) => ids.includes(s.id)));
  }

  findNumberKeys(numberScopeId: string): Promise<string[]> {
    return Promise.resolve(
      this.songs
        .filter((s) => s.numberScopeId === numberScopeId)
        .map((s) => s.numberKey),
    );
  }

  save(song: LibrarySong): Promise<void> {
    const idx = this.songs.findIndex((s) => s.id === song.id);
    if (idx !== -1) {
      this.songs[idx] = song;
    }
    return Promise.resolve();
  }

  create(song: LibrarySong): Promise<void> {
    this.songs.push(song);
    return Promise.resolve();
  }

  async saveMany(songs: LibrarySong[]): Promise<void> {
    for (const song of songs) {
      await this.save(song);
    }
  }

  createMany(songs: LibrarySong[]): Promise<void> {
    this.songs.push(...songs);
    return Promise.resolve();
  }

  rescope(bookId: string, newScopeId: string): Promise<void> {
    for (const song of this.songs) {
      if (song.bookId === bookId) {
        (song as any).props.numberScopeId = newScopeId;
      }
    }
    return Promise.resolve();
  }

  countActiveSongsByTheme(): Promise<Map<string, number>> {
    const map = new Map<string, number>();
    for (const song of this.songs) {
      if (!song.isArchived) {
        for (const tId of song.themeIds) {
          map.set(tId, (map.get(tId) ?? 0) + 1);
        }
      }
    }
    return Promise.resolve(map);
  }
}

class InMemoryThemeRepository implements ThemeRepository {
  private themes: LibraryTheme[] = [];

  findById(id: string): Promise<LibraryTheme | null> {
    return Promise.resolve(this.themes.find((t) => t.id === id) ?? null);
  }

  findByByNameKey(nameKey: string): Promise<LibraryTheme | null> {
    return Promise.resolve(
      this.themes.find((t) => t.nameKey === nameKey) ?? null,
    );
  }

  findByNameKey(nameKey: string): Promise<LibraryTheme | null> {
    return Promise.resolve(
      this.themes.find((t) => t.nameKey === nameKey) ?? null,
    );
  }

  findByIds(ids: string[]): Promise<LibraryTheme[]> {
    return Promise.resolve(
      this.themes.filter((idsItem) => ids.includes(idsItem.id)),
    );
  }

  findAll(options?: { includeArchived?: boolean }): Promise<LibraryTheme[]> {
    if (options?.includeArchived) {
      return Promise.resolve([...this.themes]);
    }
    return Promise.resolve(this.themes.filter((t) => !t.isArchived));
  }

  save(theme: LibraryTheme): Promise<void> {
    const idx = this.themes.findIndex((t) => t.id === theme.id);
    if (idx !== -1) {
      this.themes[idx] = theme;
    }
    return Promise.resolve();
  }

  create(theme: LibraryTheme): Promise<void> {
    this.themes.push(theme);
    return Promise.resolve();
  }

  createMany(themes: LibraryTheme[]): Promise<void> {
    this.themes.push(...themes);
    return Promise.resolve();
  }
}

describe('Library Queries (Unit)', () => {
  let seriesRepo: InMemorySeriesRepository;
  let bookRepo: InMemoryBookRepository;
  let songRepo: InMemorySongRepository;
  let themeRepo: InMemoryThemeRepository;

  let listSeriesQuery: ListSeriesQuery;
  let listBooksQuery: ListBooksQuery;
  let getBookQuery: GetBookQuery;
  let lookupSongQuery: LookupSongQuery;
  let getSongQuery: GetSongQuery;
  let listThemesQuery: ListThemesQuery;

  beforeEach(() => {
    seriesRepo = new InMemorySeriesRepository();
    bookRepo = new InMemoryBookRepository();
    songRepo = new InMemorySongRepository();
    themeRepo = new InMemoryThemeRepository();

    listSeriesQuery = new ListSeriesQuery(seriesRepo, bookRepo);
    listBooksQuery = new ListBooksQuery(bookRepo, seriesRepo, songRepo);
    getBookQuery = new GetBookQuery(bookRepo, seriesRepo, songRepo, themeRepo);
    lookupSongQuery = new LookupSongQuery(
      songRepo,
      bookRepo,
      seriesRepo,
      themeRepo,
    );
    getSongQuery = new GetSongQuery(songRepo, bookRepo, seriesRepo, themeRepo);
    listThemesQuery = new ListThemesQuery(themeRepo, songRepo);
  });

  describe('ListSeriesQuery', () => {
    it('returns series sorted by title with active book counts', async () => {
      const s2 = LibrarySeries.create({ id: 's2', title: 'Beta' });
      const s1 = LibrarySeries.create({ id: 's1', title: 'Alpha' });
      await seriesRepo.create(s2);
      await seriesRepo.create(s1);

      const b1 = LibraryBook.create({
        id: 'b1',
        title: 'Alpha 1',
        placement: { seriesId: 's1', volume: 1 },
      });
      await bookRepo.create(b1);

      const result = await listSeriesQuery.execute();
      expect(result).toHaveLength(2);
      expect(result[0].title).toBe('Alpha');
      expect(result[0].books).toHaveLength(1);
      expect(result[1].title).toBe('Beta');
      expect(result[1].books).toHaveLength(0);
    });
  });

  describe('ListBooksQuery sorting and filtering', () => {
    it('sorts books of a series by volume, then unplaced by title', async () => {
      const series = LibrarySeries.create({ id: 's1', title: 'Bücher' });
      await seriesRepo.create(series);

      const bookVol2 = LibraryBook.create({
        id: 'b2',
        title: 'Buch 2',
        placement: { seriesId: 's1', volume: 2 },
      });
      const bookVol1 = LibraryBook.create({
        id: 'b1',
        title: 'Buch 1',
        placement: { seriesId: 's1', volume: 1 },
      });
      const bookSolo = LibraryBook.create({
        id: 'bSolo',
        title: 'Einzellieder',
        placement: BookPlacement.unplaced(),
      });

      await bookRepo.create(bookVol2);
      await bookRepo.create(bookVol1);
      await bookRepo.create(bookSolo);

      const res = await listBooksQuery.execute();

      expect(res.map((b) => b.id)).toEqual(['b1', 'b2', 'bSolo']);
      expect(res[0].volume).toBe(1);
      expect(res[1].volume).toBe(2);
    });

    it('filters q case-insensitively', async () => {
      const b1 = LibraryBook.create({ id: 'b1', title: 'Glaubenslieder' });
      const b2 = LibraryBook.create({ id: 'b2', title: 'Jugendlieder' });
      await bookRepo.create(b1);
      await bookRepo.create(b2);

      const res = await listBooksQuery.execute({ q: 'GLAUB' });
      expect(res).toHaveLength(1);
      expect(res[0].id).toBe('b1');
    });

    it('hides archived items by default and shows them when includeArchived=true', async () => {
      const activeBook = LibraryBook.create({ id: 'b-act', title: 'Aktiv' });
      const archBook = LibraryBook.create({
        id: 'b-arch',
        title: 'Archiviert',
        archivedAt: new Date(),
      });
      await bookRepo.create(activeBook);
      await bookRepo.create(archBook);

      const defaultList = await listBooksQuery.execute();
      expect(defaultList.map((b) => b.id)).toEqual(['b-act']);

      const fullList = await listBooksQuery.execute({ includeArchived: true });
      expect(fullList.map((b) => b.id).sort()).toEqual(
        ['b-act', 'b-arch'].sort(),
      );
    });
  });

  describe('LookupSongQuery', () => {
    it('finds song in volume 2 when looking up by seriesId and number', async () => {
      const series = LibrarySeries.create({ id: 's1', title: 'Bücher' });
      await seriesRepo.create(series);

      const bookVol1 = LibraryBook.create({
        id: 'b1',
        title: 'Buch 1',
        placement: { seriesId: 's1', volume: 1 },
      });
      const bookVol2 = LibraryBook.create({
        id: 'b2',
        title: 'Buch 2',
        placement: { seriesId: 's1', volume: 2 },
      });
      await bookRepo.create(bookVol1);
      await bookRepo.create(bookVol2);

      const songVol2 = LibrarySong.create(bookVol2, {
        id: 'song-200',
        number: '200',
        title: 'Lied 200 in Buch 2',
      });
      await songRepo.create(songVol2);

      // Lookup by seriesId finds song in volume 2
      const found = await lookupSongQuery.execute({
        seriesId: 's1',
        number: '200',
      });

      expect(found).not.toBeNull();
      expect(found?.id).toBe('song-200');
      expect(found?.book.id).toBe('b2');
      expect(found?.book.volume).toBe(2);
    });

    it('returns null when looking up by the other book of the same series', async () => {
      const series = LibrarySeries.create({ id: 's1', title: 'Bücher' });
      await seriesRepo.create(series);

      const bookVol1 = LibraryBook.create({
        id: 'b1',
        title: 'Buch 1',
        placement: { seriesId: 's1', volume: 1 },
      });
      const bookVol2 = LibraryBook.create({
        id: 'b2',
        title: 'Buch 2',
        placement: { seriesId: 's1', volume: 2 },
      });
      await bookRepo.create(bookVol1);
      await bookRepo.create(bookVol2);

      const songVol2 = LibrarySong.create(bookVol2, {
        id: 'song-200',
        number: '200',
        title: 'Lied 200 in Buch 2',
      });
      await songRepo.create(songVol2);

      // Looking up song 200 with bookId of Buch 1 returns null because song is in Buch 2
      const notInBook1 = await lookupSongQuery.execute({
        bookId: 'b1',
        number: '200',
      });

      expect(notInBook1).toBeNull();

      // Looking up song 200 with bookId of Buch 2 finds it
      const inBook2 = await lookupSongQuery.execute({
        bookId: 'b2',
        number: '200',
      });
      expect(inBook2).not.toBeNull();
      expect(inBook2?.id).toBe('song-200');
    });
  });

  describe('ListThemesQuery & GetBookQuery & GetSongQuery', () => {
    it('returns theme views with active song count', async () => {
      const theme1 = LibraryTheme.create({ id: 't1', name: 'Lob' });
      const theme2 = LibraryTheme.create({ id: 't2', name: 'Dank' });
      await themeRepo.create(theme1);
      await themeRepo.create(theme2);

      const book = LibraryBook.create({ id: 'b1', title: 'Buch' });
      await bookRepo.create(book);

      const songActive = LibrarySong.create(book, {
        id: 's1',
        number: 1,
        title: 'Lied 1',
        themeIds: ['t1', 't2'],
      });
      const songArchived = LibrarySong.create(book, {
        id: 's2',
        number: 2,
        title: 'Lied 2',
        themeIds: ['t1'],
        archivedAt: new Date(),
      });
      await songRepo.create(songActive);
      await songRepo.create(songArchived);

      const themes = await listThemesQuery.execute();
      expect(themes).toHaveLength(2);

      const t1View = themes.find((t) => t.id === 't1');
      const t2View = themes.find((t) => t.id === 't2');

      // t1 is on 1 active song (and 1 archived song) -> songCount: 1
      expect(t1View?.songCount).toBe(1);
      // t2 is on 1 active song -> songCount: 1
      expect(t2View?.songCount).toBe(1);
    });

    it('getBook returns book with songs sorted by sortKey', async () => {
      const book = LibraryBook.create({ id: 'b1', title: 'Buch 1' });
      await bookRepo.create(book);

      const s2 = LibrarySong.create(book, {
        id: 's2',
        number: '100',
        title: 'Hundert',
      });
      const s1 = LibrarySong.create(book, {
        id: 's1',
        number: '22b',
        title: 'Zweiundzwanzig B',
      });
      await songRepo.create(s2);
      await songRepo.create(s1);

      const bookView = await getBookQuery.execute('b1');
      expect(bookView.id).toBe('b1');
      expect(bookView.songs.map((s) => s.number)).toEqual(['22b', '100']);
    });

    it('getSong returns song with book and themes', async () => {
      const theme = LibraryTheme.create({ id: 't1', name: 'Glaube' });
      await themeRepo.create(theme);

      const book = LibraryBook.create({ id: 'b1', title: 'Buch 1' });
      await bookRepo.create(book);

      const song = LibrarySong.create(book, {
        id: 's1',
        number: 1,
        title: 'Lied',
        themeIds: ['t1'],
      });
      await songRepo.create(song);

      const view = await getSongQuery.execute('s1');
      expect(view.id).toBe('s1');
      expect(view.book.title).toBe('Buch 1');
      expect(view.themes[0].name).toBe('Glaube');
    });
  });
});
