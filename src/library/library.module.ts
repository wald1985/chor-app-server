import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity/identity.module';
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

@Module({
  imports: [IdentityModule],
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
  ],
  exports: [
    SERIES_REPOSITORY,
    BOOK_REPOSITORY,
    SONG_REPOSITORY,
    THEME_REPOSITORY,
    LIBRARY_UNIT_OF_WORK,
    ID_GENERATOR,
    CLOCK,
    PrismaTransactionContext,
    PrismaSeriesRepository,
    PrismaBookRepository,
    PrismaSongRepository,
    PrismaThemeRepository,
    PrismaLibraryUnitOfWork,
    CryptoIdGenerator,
    SystemClock,
  ],
})
export class LibraryModule {}
