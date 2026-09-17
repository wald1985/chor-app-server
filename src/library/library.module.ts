import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity/identity.module';
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
import { PrismaModule } from '../shared/prisma/prisma.module';
import { LibraryController } from './interface/controllers/library.controller';

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
    ListSeriesQuery,
    ListBooksQuery,
    GetBookQuery,
    LookupSongQuery,
    GetSongQuery,
    ListThemesQuery,
    DefaultLibraryReader,
    { provide: LIBRARY_READER, useClass: DefaultLibraryReader },
  ],
  exports: [LIBRARY_READER],
})
export class LibraryModule {}
