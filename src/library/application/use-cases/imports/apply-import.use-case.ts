import { Inject, Injectable } from '@nestjs/common';
import {
  BOOK_REPOSITORY,
  BookRepository,
} from '../../../domain/ports/book-repository.port';
import { CLOCK, Clock } from '../../../domain/ports/clock.port';
import {
  ID_GENERATOR,
  IdGenerator,
} from '../../../domain/ports/id-generator.port';
import {
  LIBRARY_FILE_PARSER_REGISTRY,
  LibraryFileParserRegistry,
} from '../../../domain/ports/library-file-parser.port';
import {
  LIBRARY_UNIT_OF_WORK,
  LibraryUnitOfWork,
} from '../../../domain/ports/library-unit-of-work.port';
import {
  SERIES_REPOSITORY,
  SeriesRepository,
} from '../../../domain/ports/series-repository.port';
import {
  SONG_REPOSITORY,
  SongRepository,
} from '../../../domain/ports/song-repository.port';
import {
  THEME_REPOSITORY,
  ThemeRepository,
} from '../../../domain/ports/theme-repository.port';
import {
  LibraryFileInvalidError,
  LibraryImportPlanChangedError,
} from '../../../domain/errors/library.errors';
import { LibraryBook } from '../../../domain/entities/library-book.entity';
import { LibrarySeries } from '../../../domain/entities/library-series.entity';
import { LibrarySong } from '../../../domain/entities/library-song.entity';
import { LibraryTheme } from '../../../domain/entities/library-theme.entity';
import {
  ImportPlan,
  ImportPlanSummary,
  PlanBookItem,
  PlanSeriesItem,
  PlanSongItem,
  PlanThemeItem,
} from '../../../domain/services/import-plan';
import {
  CatalogSnapshot,
  ImportPlanner,
  validateParsedFile,
} from '../../../domain/services/import-planner';
import { loadCatalogSnapshot } from './load-catalog-snapshot';

export interface ApplyImportCommand {
  buffer: Buffer;
  filename: string;
  expectedPlanHash: string;
}

export interface ApplyImportResult {
  planHash: string;
  summary: ImportPlanSummary;
}

interface ApplyContext {
  seriesIdMap: Map<string, string>;
  booksIdMap: Map<string, string>;
  themesIdMap: Map<string, string>;
  booksById: Map<string, LibraryBook>;
  snapshot: CatalogSnapshot;
}

@Injectable()
export class ApplyImportUseCase {
  constructor(
    @Inject(LIBRARY_FILE_PARSER_REGISTRY)
    private readonly parserRegistry: LibraryFileParserRegistry,
    @Inject(LIBRARY_UNIT_OF_WORK)
    private readonly uow: LibraryUnitOfWork,
    @Inject(SERIES_REPOSITORY)
    private readonly seriesRepo: SeriesRepository,
    @Inject(BOOK_REPOSITORY)
    private readonly bookRepo: BookRepository,
    @Inject(THEME_REPOSITORY)
    private readonly themeRepo: ThemeRepository,
    @Inject(SONG_REPOSITORY)
    private readonly songRepo: SongRepository,
    @Inject(ID_GENERATOR)
    private readonly idGenerator: IdGenerator,
    @Inject(CLOCK)
    private readonly clock: Clock,
  ) {}

  async execute(command: ApplyImportCommand): Promise<ApplyImportResult> {
    return this.uow.run(async () => {
      const parseResult = await this.parserRegistry.parse(
        command.buffer,
        command.filename,
      );
      if (!parseResult.ok) {
        throw new LibraryFileInvalidError(parseResult.errors);
      }

      const fileErrors = validateParsedFile(parseResult.file);
      if (fileErrors.length > 0) {
        throw new LibraryFileInvalidError(fileErrors);
      }

      const snapshot = await loadCatalogSnapshot(parseResult.file, {
        seriesRepo: this.seriesRepo,
        bookRepo: this.bookRepo,
        themeRepo: this.themeRepo,
        songRepo: this.songRepo,
      });

      const plan = ImportPlanner.plan(parseResult.file, snapshot);
      if (plan.errors.length > 0) {
        throw new LibraryFileInvalidError(plan.errors);
      }

      this.verifyPlanHash(plan, command.expectedPlanHash);

      const ctx: ApplyContext = {
        seriesIdMap: new Map(),
        booksIdMap: new Map(),
        themesIdMap: new Map(),
        booksById: new Map(),
        snapshot,
      };

      await this.applySeries(plan.series, ctx);
      await this.applyBooks(plan.books, ctx);
      await this.applyThemes(plan.themes, ctx);
      await this.applySongs(plan.songs, ctx);

      return {
        planHash: plan.hash(),
        summary: plan.summary(),
      };
    });
  }

  private verifyPlanHash(plan: ImportPlan, expectedHash: string): void {
    const normActual = plan.hash().replace(/^sha256:/, '');
    const normExpected = expectedHash.replace(/^sha256:/, '');
    if (normActual !== normExpected) {
      throw new LibraryImportPlanChangedError(plan.hash());
    }
  }

  private async applySeries(
    items: PlanSeriesItem[],
    ctx: ApplyContext,
  ): Promise<void> {
    const existingMap = new Map<string, LibrarySeries>();
    for (const s of ctx.snapshot.series) existingMap.set(s.titleKey, s);

    for (const item of items) {
      if (item.action === 'CREATE') {
        const id = this.idGenerator.generateId();
        const series = LibrarySeries.create({ title: item.title, id });
        await this.seriesRepo.create(series);
        ctx.seriesIdMap.set(item.titleKey, id);
      } else if (item.action === 'RESTORE') {
        const series = existingMap.get(item.titleKey)!;
        series.restore();
        await this.seriesRepo.save(series);
        ctx.seriesIdMap.set(item.titleKey, series.id);
      } else {
        const series = existingMap.get(item.titleKey)!;
        ctx.seriesIdMap.set(item.titleKey, series.id);
      }
    }
  }

  private async applyBooks(
    items: PlanBookItem[],
    ctx: ApplyContext,
  ): Promise<void> {
    const existingMap = new Map<string, LibraryBook>();
    for (const b of ctx.snapshot.books) existingMap.set(b.titleKey, b);

    for (const item of items) {
      const targetSeriesId = item.seriesId
        ? (ctx.seriesIdMap.get(item.seriesId.replace('series:', '')) ??
          item.seriesId)
        : null;

      if (item.action === 'CREATE') {
        await this.createBook(item, targetSeriesId, ctx);
      } else {
        await this.updateExistingBook(
          item,
          targetSeriesId,
          existingMap.get(item.titleKey)!,
          ctx,
        );
      }
    }
  }

  private async createBook(
    item: PlanBookItem,
    targetSeriesId: string | null,
    ctx: ApplyContext,
  ): Promise<void> {
    const id = this.idGenerator.generateId();
    const book = LibraryBook.create({
      id,
      title: item.title,
      placement: { seriesId: targetSeriesId, volume: item.volume },
    });
    await this.bookRepo.create(book);
    ctx.booksIdMap.set(item.titleKey, id);
    ctx.booksById.set(id, book);
  }

  private async updateExistingBook(
    item: PlanBookItem,
    targetSeriesId: string | null,
    book: LibraryBook,
    ctx: ApplyContext,
  ): Promise<void> {
    const placementChanged =
      book.seriesId !== targetSeriesId || book.volumeValue !== item.volume;

    if (item.action === 'RESTORE') {
      book.restore();
    }
    if (placementChanged) {
      book.place({ seriesId: targetSeriesId, volume: item.volume });
    }
    await this.bookRepo.save(book);
    ctx.booksIdMap.set(item.titleKey, book.id);
    ctx.booksById.set(book.id, book);

    if (placementChanged) {
      await this.songRepo.rescope(book.id, book.numberScopeId());
    }
  }

  private async applyThemes(
    items: PlanThemeItem[],
    ctx: ApplyContext,
  ): Promise<void> {
    const existingMap = new Map<string, LibraryTheme>();
    for (const t of ctx.snapshot.themes) existingMap.set(t.nameKey, t);

    const toCreate: LibraryTheme[] = [];

    for (const item of items) {
      if (item.action === 'CREATE') {
        const id = this.idGenerator.generateId();
        const theme = LibraryTheme.create({ name: item.name, id });
        toCreate.push(theme);
        ctx.themesIdMap.set(item.nameKey, id);
      } else if (item.action === 'RESTORE') {
        const theme = existingMap.get(item.nameKey)!;
        theme.restore();
        await this.themeRepo.save(theme);
        ctx.themesIdMap.set(item.nameKey, theme.id);
      } else {
        const theme = existingMap.get(item.nameKey)!;
        ctx.themesIdMap.set(item.nameKey, theme.id);
      }
    }

    if (toCreate.length > 0) {
      await this.themeRepo.createMany(toCreate);
    }
  }

  private async applySongs(
    items: PlanSongItem[],
    ctx: ApplyContext,
  ): Promise<void> {
    const songsById = new Map<string, LibrarySong>();
    for (const s of ctx.snapshot.songs) songsById.set(s.id, s);

    const toCreate: LibrarySong[] = [];

    for (const item of items) {
      const bookId = this.resolveBookId(item.bookId, ctx);
      const themeIds = this.resolveThemeIds(item.themeIds, ctx);

      if (item.action === 'CREATE') {
        const book = ctx.booksById.get(bookId)!;
        const song = LibrarySong.create(book, {
          id: this.idGenerator.generateId(),
          number: item.number,
          title: item.title,
          author: item.author,
          arranger: item.arranger,
          themeIds,
        });
        toCreate.push(song);
      } else {
        await this.applySongMutation(item, bookId, themeIds, songsById, ctx);
      }
    }

    if (toCreate.length > 0) {
      await this.songRepo.createMany(toCreate);
    }
  }

  private resolveBookId(rawBookId: string, ctx: ApplyContext): string {
    if (rawBookId.startsWith('book:')) {
      const key = rawBookId.replace('book:', '');
      return ctx.booksIdMap.get(key) ?? rawBookId;
    }
    return rawBookId;
  }

  private resolveThemeIds(rawThemeIds: string[], ctx: ApplyContext): string[] {
    return rawThemeIds.map((tid) => {
      if (tid.startsWith('theme:')) {
        const key = tid.replace('theme:', '');
        return ctx.themesIdMap.get(key) ?? tid;
      }
      return tid;
    });
  }

  private async applySongMutation(
    item: PlanSongItem,
    bookId: string,
    themeIds: string[],
    songsById: Map<string, LibrarySong>,
    ctx: ApplyContext,
  ): Promise<void> {
    const song = songsById.get(item.id!)!;
    if (item.action === 'MOVE') {
      const targetBook = ctx.booksById.get(bookId)!;
      song.moveTo(targetBook);
      song.update({
        title: item.title,
        author: item.author,
        arranger: item.arranger,
      });
      song.setThemes(themeIds);
      await this.songRepo.save(song);
    } else if (item.action === 'RESTORE') {
      song.restore();
      song.update({
        title: item.title,
        author: item.author,
        arranger: item.arranger,
      });
      song.setThemes(themeIds);
      await this.songRepo.save(song);
    } else if (item.action === 'UPDATE') {
      song.update({
        title: item.title,
        author: item.author,
        arranger: item.arranger,
      });
      song.setThemes(themeIds);
      await this.songRepo.save(song);
    } else if (item.action === 'ARCHIVE') {
      song.archive(this.clock.now());
      await this.songRepo.save(song);
    }
  }
}
