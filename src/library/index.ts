export * from './library.module';
export {
  LIBRARY_READER,
  type LibraryReader,
  type LibraryBookRef,
  type LibrarySongRef,
  type LibrarySongThemeRef,
  type LibraryThemeRef,
} from './application/reader/library-reader';
export { toLibraryHttpException } from './interface/http/library-error-mapper';
export {
  LibraryItemInUseError,
  LibraryImportPlanChangedError,
} from './domain/errors/library.errors';
export { GetSongQuery } from './application/queries/get-song.query';
export { GetBookQuery } from './application/queries/get-book.query';
export type {
  SeriesView,
  BookSummaryView,
  BookView,
  SongView,
  ThemeView,
} from './application/views/library.views';

// Series Use Cases
export {
  CreateSeriesUseCase,
  type CreateSeriesCommand,
} from './application/use-cases/series/create-series.use-case';
export {
  RenameSeriesUseCase,
  type RenameSeriesCommand,
} from './application/use-cases/series/rename-series.use-case';
export {
  ArchiveSeriesUseCase,
  type ArchiveSeriesCommand,
} from './application/use-cases/series/archive-series.use-case';
export {
  RestoreSeriesUseCase,
  type RestoreSeriesCommand,
} from './application/use-cases/series/restore-series.use-case';

// Book Use Cases
export {
  CreateBookUseCase,
  type CreateBookCommand,
} from './application/use-cases/books/create-book.use-case';
export {
  UpdateBookUseCase,
  type UpdateBookCommand,
} from './application/use-cases/books/update-book.use-case';
export {
  PlaceBookUseCase,
  type PlaceBookCommand,
} from './application/use-cases/books/place-book.use-case';
export {
  ArchiveBookUseCase,
  type ArchiveBookCommand,
} from './application/use-cases/books/archive-book.use-case';
export {
  RestoreBookUseCase,
  type RestoreBookCommand,
} from './application/use-cases/books/restore-book.use-case';

// Song Use Cases
export {
  CreateSongUseCase,
  type CreateSongCommand,
} from './application/use-cases/songs/create-song.use-case';
export {
  UpdateSongUseCase,
  type UpdateSongCommand,
} from './application/use-cases/songs/update-song.use-case';
export {
  SetSongThemesUseCase,
  type SetSongThemesCommand,
} from './application/use-cases/songs/set-song-themes.use-case';
export {
  ArchiveSongUseCase,
  type ArchiveSongCommand,
} from './application/use-cases/songs/archive-song.use-case';
export {
  RestoreSongUseCase,
  type RestoreSongCommand,
} from './application/use-cases/songs/restore-song.use-case';

// Theme Use Cases
export {
  CreateThemeUseCase,
  type CreateThemeCommand,
} from './application/use-cases/themes/create-theme.use-case';
export {
  RenameThemeUseCase,
  type RenameThemeCommand,
} from './application/use-cases/themes/rename-theme.use-case';
export {
  ArchiveThemeUseCase,
  type ArchiveThemeCommand,
} from './application/use-cases/themes/archive-theme.use-case';
export {
  RestoreThemeUseCase,
  type RestoreThemeCommand,
} from './application/use-cases/themes/restore-theme.use-case';

// Domain Services & Import Planner
export {
  ImportPlan,
  type ImportPlanSummary,
  type PlanAction,
  type PlanSeriesItem,
  type PlanBookItem,
  type PlanThemeItem,
  type PlanSongItem,
  type PlanError,
  type ArchivedItemRef,
  type ParsedLibraryFile,
  type ParsedBook,
  type ParsedSong,
  type SourceRef,
} from './domain/services/import-plan';
export {
  ImportPlanner,
  validateParsedFile,
  type CatalogSnapshot,
} from './domain/services/import-planner';

// Import Ports & Use Cases
export {
  LIBRARY_FILE_PARSER_REGISTRY,
  type LibraryFileParserRegistry,
  type LibraryFileParser,
  type ParseResult,
} from './domain/ports/library-file-parser.port';
export { JsonLibraryFileParser } from './infrastructure/parsing/json-library-file-parser';
export { CsvLibraryFileParser } from './infrastructure/parsing/csv-library-file-parser';
export { XlsxLibraryFileParser } from './infrastructure/parsing/xlsx-library-file-parser';
export {
  PreviewImportUseCase,
  type PreviewImportCommand,
  type PreviewImportResult,
} from './application/use-cases/imports/preview-import.use-case';
export {
  ApplyImportUseCase,
  type ApplyImportCommand,
  type ApplyImportResult,
} from './application/use-cases/imports/apply-import.use-case';
