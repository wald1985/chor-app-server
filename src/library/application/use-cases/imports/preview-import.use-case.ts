import { Inject, Injectable } from '@nestjs/common';
import {
  BOOK_REPOSITORY,
  BookRepository,
} from '../../../domain/ports/book-repository.port';
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
  LIBRARY_FILE_PARSER_REGISTRY,
  LibraryFileParserRegistry,
} from '../../../domain/ports/library-file-parser.port';
import { LibraryFileInvalidError } from '../../../domain/errors/library.errors';
import {
  ImportPlan,
  ParsedLibraryFile,
} from '../../../domain/services/import-plan';
import {
  ImportPlanner,
  validateParsedFile,
} from '../../../domain/services/import-planner';
import { loadCatalogSnapshot } from './load-catalog-snapshot';

export interface PreviewImportCommand {
  buffer: Buffer;
  filename: string;
}

export interface PreviewImportResult {
  plan: ImportPlan;
  format: 'JSON' | 'CSV' | 'XLSX';
  parsedFile: ParsedLibraryFile;
}

@Injectable()
export class PreviewImportUseCase {
  constructor(
    @Inject(LIBRARY_FILE_PARSER_REGISTRY)
    private readonly parserRegistry: LibraryFileParserRegistry,
    @Inject(SERIES_REPOSITORY)
    private readonly seriesRepo: SeriesRepository,
    @Inject(BOOK_REPOSITORY)
    private readonly bookRepo: BookRepository,
    @Inject(THEME_REPOSITORY)
    private readonly themeRepo: ThemeRepository,
    @Inject(SONG_REPOSITORY)
    private readonly songRepo: SongRepository,
  ) {}

  async execute(command: PreviewImportCommand): Promise<PreviewImportResult> {
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

    return {
      plan,
      format: parseResult.format,
      parsedFile: parseResult.file,
    };
  }
}
