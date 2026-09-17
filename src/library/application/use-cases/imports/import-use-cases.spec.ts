import { PreviewImportUseCase } from './preview-import.use-case';
import { ApplyImportUseCase } from './apply-import.use-case';
import { JsonLibraryFileParser } from '../../../infrastructure/parsing/json-library-file-parser';
import { DefaultLibraryFileParserRegistry } from '../../../infrastructure/parsing/library-file-parser-registry';
import {
  LibraryFileInvalidError,
  LibraryImportPlanChangedError,
} from '../../../domain/errors/library.errors';
import { SeriesRepository } from '../../../domain/ports/series-repository.port';
import { BookRepository } from '../../../domain/ports/book-repository.port';
import { ThemeRepository } from '../../../domain/ports/theme-repository.port';
import { SongRepository } from '../../../domain/ports/song-repository.port';
import { IdGenerator } from '../../../domain/ports/id-generator.port';
import { Clock } from '../../../domain/ports/clock.port';
import { LibraryUnitOfWork } from '../../../domain/ports/library-unit-of-work.port';
import { LibrarySeries } from '../../../domain/entities/library-series.entity';
import { LibraryBook } from '../../../domain/entities/library-book.entity';
import { LibraryTheme } from '../../../domain/entities/library-theme.entity';
import { LibrarySong } from '../../../domain/entities/library-song.entity';

class InMemorySeriesRepo implements SeriesRepository {
  private items = new Map<string, LibrarySeries>();
  findById(id: string): Promise<LibrarySeries | null> {
    return Promise.resolve(this.items.get(id) ?? null);
  }
  findByTitleKey(key: string): Promise<LibrarySeries | null> {
    for (const item of this.items.values()) {
      if (item.titleKey === key) return Promise.resolve(item);
    }
    return Promise.resolve(null);
  }
  findAll(): Promise<LibrarySeries[]> {
    return Promise.resolve(Array.from(this.items.values()));
  }
  save(series: LibrarySeries): Promise<void> {
    this.items.set(series.id, series);
    return Promise.resolve();
  }
  create(series: LibrarySeries): Promise<void> {
    this.items.set(series.id, series);
    return Promise.resolve();
  }
}

class InMemoryBookRepo implements BookRepository {
  private items = new Map<string, LibraryBook>();
  findById(id: string): Promise<LibraryBook | null> {
    return Promise.resolve(this.items.get(id) ?? null);
  }
  findByTitleKey(key: string): Promise<LibraryBook | null> {
    for (const item of this.items.values()) {
      if (item.titleKey === key) return Promise.resolve(item);
    }
    return Promise.resolve(null);
  }
  findBySeriesAndVolume(
    seriesId: string,
    volume: number,
  ): Promise<LibraryBook | null> {
    for (const item of this.items.values()) {
      if (item.seriesId === seriesId && item.volumeValue === volume) {
        return Promise.resolve(item);
      }
    }
    return Promise.resolve(null);
  }
  findAll(): Promise<LibraryBook[]> {
    return Promise.resolve(Array.from(this.items.values()));
  }
  findByIds(ids: string[]): Promise<LibraryBook[]> {
    return Promise.resolve(
      ids
        .map((id) => this.items.get(id))
        .filter((b): b is LibraryBook => Boolean(b)),
    );
  }
  countActiveBySeriesId(seriesId: string): Promise<number> {
    return Promise.resolve(
      Array.from(this.items.values()).filter(
        (b) => b.seriesId === seriesId && !b.isArchived,
      ).length,
    );
  }
  findActiveIdsBySeriesId(seriesId: string): Promise<string[]> {
    return Promise.resolve(
      Array.from(this.items.values())
        .filter((b) => b.seriesId === seriesId && !b.isArchived)
        .map((b) => b.id),
    );
  }
  save(book: LibraryBook): Promise<void> {
    this.items.set(book.id, book);
    return Promise.resolve();
  }
  create(book: LibraryBook): Promise<void> {
    this.items.set(book.id, book);
    return Promise.resolve();
  }
}

class InMemoryThemeRepo implements ThemeRepository {
  private items = new Map<string, LibraryTheme>();
  findById(id: string): Promise<LibraryTheme | null> {
    return Promise.resolve(this.items.get(id) ?? null);
  }
  findByNameKey(key: string): Promise<LibraryTheme | null> {
    for (const item of this.items.values()) {
      if (item.nameKey === key) return Promise.resolve(item);
    }
    return Promise.resolve(null);
  }
  findByIds(ids: string[]): Promise<LibraryTheme[]> {
    return Promise.resolve(
      ids
        .map((id) => this.items.get(id))
        .filter((t): t is LibraryTheme => Boolean(t)),
    );
  }
  findAll(): Promise<LibraryTheme[]> {
    return Promise.resolve(Array.from(this.items.values()));
  }
  save(theme: LibraryTheme): Promise<void> {
    this.items.set(theme.id, theme);
    return Promise.resolve();
  }
  create(theme: LibraryTheme): Promise<void> {
    this.items.set(theme.id, theme);
    return Promise.resolve();
  }
  createMany(themes: LibraryTheme[]): Promise<void> {
    for (const t of themes) this.items.set(t.id, t);
    return Promise.resolve();
  }
}

class InMemorySongRepo implements SongRepository {
  private items = new Map<string, LibrarySong>();
  findById(id: string): Promise<LibrarySong | null> {
    return Promise.resolve(this.items.get(id) ?? null);
  }
  findByScope(scopeId: string, numberKey: string): Promise<LibrarySong | null> {
    for (const item of this.items.values()) {
      if (item.numberScopeId === scopeId && item.numberKey === numberKey) {
        return Promise.resolve(item);
      }
    }
    return Promise.resolve(null);
  }
  listByBookIds(bookIds: string[]): Promise<LibrarySong[]> {
    const set = new Set(bookIds);
    return Promise.resolve(
      Array.from(this.items.values()).filter((s) => set.has(s.bookId)),
    );
  }
  findByIds(ids: string[]): Promise<LibrarySong[]> {
    return Promise.resolve(
      ids
        .map((id) => this.items.get(id))
        .filter((s): s is LibrarySong => Boolean(s)),
    );
  }
  findNumberKeys(scopeId: string): Promise<string[]> {
    return Promise.resolve(
      Array.from(this.items.values())
        .filter((s) => s.numberScopeId === scopeId && !s.isArchived)
        .map((s) => s.numberKey),
    );
  }
  save(song: LibrarySong): Promise<void> {
    this.items.set(song.id, song);
    return Promise.resolve();
  }
  create(song: LibrarySong): Promise<void> {
    this.items.set(song.id, song);
    return Promise.resolve();
  }
  saveMany(songs: LibrarySong[]): Promise<void> {
    for (const s of songs) this.items.set(s.id, s);
    return Promise.resolve();
  }
  createMany(songs: LibrarySong[]): Promise<void> {
    for (const s of songs) this.items.set(s.id, s);
    return Promise.resolve();
  }
  rescope(bookId: string, newScopeId: string): Promise<void> {
    for (const s of this.items.values()) {
      if (s.bookId === bookId) {
        const updated = LibrarySong.reconstitute({
          id: s.id,
          bookId: s.bookId,
          numberScopeId: newScopeId,
          number: s.number,
          title: s.title,
          author: s.author,
          arranger: s.arranger,
          themeIds: s.themeIds,
          archivedAt: s.archivedAt ?? null,
        });
        this.items.set(s.id, updated);
      }
    }
    return Promise.resolve();
  }
  countActiveSongsByTheme(): Promise<Map<string, number>> {
    return Promise.resolve(new Map());
  }
}

class DirectUnitOfWork implements LibraryUnitOfWork {
  async run<T>(work: () => Promise<T>): Promise<T> {
    return await work();
  }
}

class FakeIdGenerator implements IdGenerator {
  private seq = 0;
  generateId(): string {
    this.seq += 1;
    return `gen-id-${this.seq}`;
  }
}

class FakeClock implements Clock {
  now(): Date {
    return new Date('2026-09-17T12:00:00Z');
  }
}

describe('Import Use Cases (Phase C7)', () => {
  let seriesRepo: InMemorySeriesRepo;
  let bookRepo: InMemoryBookRepo;
  let themeRepo: InMemoryThemeRepo;
  let songRepo: InMemorySongRepo;
  let parserRegistry: DefaultLibraryFileParserRegistry;
  let previewUseCase: PreviewImportUseCase;
  let applyUseCase: ApplyImportUseCase;

  beforeEach(() => {
    seriesRepo = new InMemorySeriesRepo();
    bookRepo = new InMemoryBookRepo();
    themeRepo = new InMemoryThemeRepo();
    songRepo = new InMemorySongRepo();
    parserRegistry = new DefaultLibraryFileParserRegistry(
      new JsonLibraryFileParser(),
    );
    const uow = new DirectUnitOfWork();
    const idGen = new FakeIdGenerator();
    const clock = new FakeClock();

    previewUseCase = new PreviewImportUseCase(
      parserRegistry,
      seriesRepo,
      bookRepo,
      themeRepo,
      songRepo,
    );

    applyUseCase = new ApplyImportUseCase(
      parserRegistry,
      uow,
      seriesRepo,
      bookRepo,
      themeRepo,
      songRepo,
      idGen,
      clock,
    );
  });

  const validCatalogJson = JSON.stringify({
    format: 'chor-app-library/v1',
    books: [
      {
        title: 'Buch 1',
        series: 'Bücher',
        volume: 1,
        songs: [
          {
            number: '1',
            title: 'Song One',
            author: 'A',
            arranger: null,
            themes: ['T1'],
          },
        ],
      },
    ],
  });

  describe('PreviewImportUseCase', () => {
    it('successfully generates plan preview for valid JSON file', async () => {
      const buffer = Buffer.from(validCatalogJson);
      const res = await previewUseCase.execute({
        buffer,
        filename: 'catalog.json',
      });

      expect(res.format).toBe('JSON');
      expect(res.plan.hash()).toBeDefined();
      expect(res.plan.summary().songsCreated).toBe(1);
      expect(res.plan.summary().booksCreated).toBe(1);
    });

    it('throws LibraryFileInvalidError when file is unreadable', async () => {
      const buffer = Buffer.from('{ corrupt json');
      await expect(
        previewUseCase.execute({ buffer, filename: 'catalog.json' }),
      ).rejects.toThrow(LibraryFileInvalidError);
    });

    it('throws LibraryFileInvalidError when VO validation fails', async () => {
      const invalidJson = JSON.stringify({
        format: 'chor-app-library/v1',
        books: [
          {
            title: '', // empty title
            series: null,
            volume: null,
            songs: [],
          },
        ],
      });
      await expect(
        previewUseCase.execute({
          buffer: Buffer.from(invalidJson),
          filename: 'catalog.json',
        }),
      ).rejects.toThrow(LibraryFileInvalidError);
    });
  });

  describe('ApplyImportUseCase', () => {
    it('throws LibraryImportPlanChangedError if expectedPlanHash does not match, without writing', async () => {
      const buffer = Buffer.from(validCatalogJson);
      const wrongHash =
        'sha256:0000000000000000000000000000000000000000000000000000000000000000';

      await expect(
        applyUseCase.execute({
          buffer,
          filename: 'catalog.json',
          expectedPlanHash: wrongHash,
        }),
      ).rejects.toThrow(LibraryImportPlanChangedError);

      expect(await bookRepo.findAll()).toHaveLength(0);
      expect(await songRepo.listByBookIds([])).toHaveLength(0);
    });

    it('successfully applies import plan when expectedPlanHash matches', async () => {
      const buffer = Buffer.from(validCatalogJson);
      const previewRes = await previewUseCase.execute({
        buffer,
        filename: 'catalog.json',
      });

      const applyRes = await applyUseCase.execute({
        buffer,
        filename: 'catalog.json',
        expectedPlanHash: previewRes.plan.hash(),
      });

      expect(applyRes.planHash).toBe(previewRes.plan.hash());
      expect(applyRes.summary.songsCreated).toBe(1);

      const books = await bookRepo.findAll();
      expect(books).toHaveLength(1);
      expect(books[0].title.value).toBe('Buch 1');

      const songs = await songRepo.listByBookIds([books[0].id]);
      expect(songs).toHaveLength(1);
      expect(songs[0].title.value).toBe('Song One');
    });
  });
});
