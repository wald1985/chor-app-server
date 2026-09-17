import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity/identity.module';
import { PrismaModule } from '../shared/prisma/prisma.module';
import { GetBookQuery } from './application/queries/get-book.query';
import { GetSongQuery } from './application/queries/get-song.query';
import { ListBooksQuery } from './application/queries/list-books.query';
import { ListSeriesQuery } from './application/queries/list-series.query';
import { ListThemesQuery } from './application/queries/list-themes.query';
import { LookupSongQuery } from './application/queries/lookup-song.query';
import {
  DefaultLibraryReader,
  LIBRARY_READER,
} from './application/reader/library-reader';
import { ArchiveBookUseCase } from './application/use-cases/books/archive-book.use-case';
import { CreateBookUseCase } from './application/use-cases/books/create-book.use-case';
import { PlaceBookUseCase } from './application/use-cases/books/place-book.use-case';
import { RestoreBookUseCase } from './application/use-cases/books/restore-book.use-case';
import { UpdateBookUseCase } from './application/use-cases/books/update-book.use-case';
import { ArchiveSeriesUseCase } from './application/use-cases/series/archive-series.use-case';
import { CreateSeriesUseCase } from './application/use-cases/series/create-series.use-case';
import { RenameSeriesUseCase } from './application/use-cases/series/rename-series.use-case';
import { RestoreSeriesUseCase } from './application/use-cases/series/restore-series.use-case';
import { ArchiveSongUseCase } from './application/use-cases/songs/archive-song.use-case';
import { CreateSongUseCase } from './application/use-cases/songs/create-song.use-case';
import { RestoreSongUseCase } from './application/use-cases/songs/restore-song.use-case';
import { SetSongThemesUseCase } from './application/use-cases/songs/set-song-themes.use-case';
import { UpdateSongUseCase } from './application/use-cases/songs/update-song.use-case';
import { ArchiveThemeUseCase } from './application/use-cases/themes/archive-theme.use-case';
import { CreateThemeUseCase } from './application/use-cases/themes/create-theme.use-case';
import { RenameThemeUseCase } from './application/use-cases/themes/rename-theme.use-case';
import { RestoreThemeUseCase } from './application/use-cases/themes/restore-theme.use-case';
import { BOOK_REPOSITORY } from './domain/ports/book-repository.port';
import { CLOCK } from './domain/ports/clock.port';
import { ID_GENERATOR } from './domain/ports/id-generator.port';
import { LIBRARY_UNIT_OF_WORK } from './domain/ports/library-unit-of-work.port';
import { SERIES_REPOSITORY } from './domain/ports/series-repository.port';
import { SONG_REPOSITORY } from './domain/ports/song-repository.port';
import { THEME_REPOSITORY } from './domain/ports/theme-repository.port';
import { CryptoIdGenerator } from './infrastructure/crypto-id-generator';
import { PrismaBookRepository } from './infrastructure/prisma/prisma-book.repository';
import { PrismaLibraryUnitOfWork } from './infrastructure/prisma/prisma-library-unit-of-work';
import { PrismaSeriesRepository } from './infrastructure/prisma/prisma-series.repository';
import { PrismaSongRepository } from './infrastructure/prisma/prisma-song.repository';
import { PrismaThemeRepository } from './infrastructure/prisma/prisma-theme.repository';
import { PrismaTransactionContext } from './infrastructure/prisma/prisma-transaction-context';
import { SystemClock } from './infrastructure/system-clock';
import { LibraryController } from './interface/controllers/library.controller';

import { LIBRARY_FILE_PARSER_REGISTRY } from './domain/ports/library-file-parser.port';
import { JsonLibraryFileParser } from './infrastructure/parsing/json-library-file-parser';
import { CsvLibraryFileParser } from './infrastructure/parsing/csv-library-file-parser';
import { XlsxLibraryFileParser } from './infrastructure/parsing/xlsx-library-file-parser';
import { DefaultLibraryFileParserRegistry } from './infrastructure/parsing/library-file-parser-registry';
import { PreviewImportUseCase } from './application/use-cases/imports/preview-import.use-case';
import { ApplyImportUseCase } from './application/use-cases/imports/apply-import.use-case';

const USE_CASES = [
  CreateSeriesUseCase,
  RenameSeriesUseCase,
  ArchiveSeriesUseCase,
  RestoreSeriesUseCase,
  CreateBookUseCase,
  UpdateBookUseCase,
  PlaceBookUseCase,
  ArchiveBookUseCase,
  RestoreBookUseCase,
  CreateSongUseCase,
  UpdateSongUseCase,
  SetSongThemesUseCase,
  ArchiveSongUseCase,
  RestoreSongUseCase,
  CreateThemeUseCase,
  RenameThemeUseCase,
  ArchiveThemeUseCase,
  RestoreThemeUseCase,
  PreviewImportUseCase,
  ApplyImportUseCase,
];

@Module({
  imports: [IdentityModule, PrismaModule],
  controllers: [LibraryController],
  providers: [
    PrismaTransactionContext,
    CryptoIdGenerator,
    SystemClock,
    PrismaSeriesRepository,
    PrismaBookRepository,
    PrismaSongRepository,
    PrismaThemeRepository,
    PrismaLibraryUnitOfWork,
    { provide: SERIES_REPOSITORY, useClass: PrismaSeriesRepository },
    { provide: BOOK_REPOSITORY, useClass: PrismaBookRepository },
    { provide: SONG_REPOSITORY, useClass: PrismaSongRepository },
    { provide: THEME_REPOSITORY, useClass: PrismaThemeRepository },
    { provide: LIBRARY_UNIT_OF_WORK, useClass: PrismaLibraryUnitOfWork },
    { provide: ID_GENERATOR, useClass: CryptoIdGenerator },
    { provide: CLOCK, useClass: SystemClock },
    JsonLibraryFileParser,
    CsvLibraryFileParser,
    XlsxLibraryFileParser,
    DefaultLibraryFileParserRegistry,
    {
      provide: LIBRARY_FILE_PARSER_REGISTRY,
      useClass: DefaultLibraryFileParserRegistry,
    },
    ListSeriesQuery,
    ListBooksQuery,
    GetBookQuery,
    LookupSongQuery,
    GetSongQuery,
    ListThemesQuery,
    DefaultLibraryReader,
    { provide: LIBRARY_READER, useClass: DefaultLibraryReader },
    ...USE_CASES,
  ],
  exports: [
    LIBRARY_READER,
    GetSongQuery,
    GetBookQuery,
    LIBRARY_FILE_PARSER_REGISTRY,
    ...USE_CASES,
  ],
})
export class LibraryModule {}
