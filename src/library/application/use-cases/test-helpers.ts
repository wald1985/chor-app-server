import { LibraryBook } from '../../domain/entities/library-book.entity';
import { LibrarySeries } from '../../domain/entities/library-series.entity';
import { LibrarySong } from '../../domain/entities/library-song.entity';
import { LibraryTheme } from '../../domain/entities/library-theme.entity';
import { BookRepository } from '../../domain/ports/book-repository.port';
import { Clock } from '../../domain/ports/clock.port';
import { IdGenerator } from '../../domain/ports/id-generator.port';
import { LibraryUnitOfWork } from '../../domain/ports/library-unit-of-work.port';
import { SeriesRepository } from '../../domain/ports/series-repository.port';
import { SongRepository } from '../../domain/ports/song-repository.port';
import { ThemeRepository } from '../../domain/ports/theme-repository.port';

export class FakeUnitOfWork implements LibraryUnitOfWork {
  public runCallCount = 0;

  run<T>(work: () => Promise<T>): Promise<T> {
    this.runCallCount += 1;
    return work();
  }
}

export class FakeClock implements Clock {
  constructor(public currentDate = new Date('2026-09-17T12:00:00.000Z')) {}

  now(): Date {
    return this.currentDate;
  }
}

export class FakeIdGenerator implements IdGenerator {
  private counter = 1;

  generateId(): string {
    const id = `id-${this.counter}`;
    this.counter += 1;
    return id;
  }
}

export class InMemorySeriesRepository implements SeriesRepository {
  public series: LibrarySeries[] = [];
  public saveCallCount = 0;

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
    this.saveCallCount += 1;
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

export class InMemoryBookRepository implements BookRepository {
  public books: LibraryBook[] = [];
  public saveCallCount = 0;

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
    this.saveCallCount += 1;
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

export class InMemorySongRepository implements SongRepository {
  public songs: LibrarySong[] = [];
  public saveCallCount = 0;
  public rescopedCalls: { bookId: string; newScopeId: string }[] = [];

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
    this.saveCallCount += 1;
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
    this.rescopedCalls.push({ bookId, newScopeId });
    for (const song of this.songs) {
      if (song.bookId === bookId) {
        (
          song as unknown as { props: { numberScopeId: string } }
        ).props.numberScopeId = newScopeId;
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

export class InMemoryThemeRepository implements ThemeRepository {
  public themes: LibraryTheme[] = [];
  public saveCallCount = 0;

  findById(id: string): Promise<LibraryTheme | null> {
    return Promise.resolve(this.themes.find((t) => t.id === id) ?? null);
  }

  findByNameKey(nameKey: string): Promise<LibraryTheme | null> {
    return Promise.resolve(
      this.themes.find((t) => t.nameKey === nameKey) ?? null,
    );
  }

  findByIds(ids: string[]): Promise<LibraryTheme[]> {
    return Promise.resolve(this.themes.filter((item) => ids.includes(item.id)));
  }

  findAll(options?: { includeArchived?: boolean }): Promise<LibraryTheme[]> {
    if (options?.includeArchived) {
      return Promise.resolve([...this.themes]);
    }
    return Promise.resolve(this.themes.filter((t) => !t.isArchived));
  }

  save(theme: LibraryTheme): Promise<void> {
    this.saveCallCount += 1;
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
