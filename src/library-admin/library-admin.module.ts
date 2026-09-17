import { Module } from '@nestjs/common';
import { LibraryModule } from '../library';
import { SuperadminModule } from '../superadmin';
import { ArchiveWithUsageCheck } from './application/archive-with-usage-check';
import { LIBRARY_USAGE_PROVIDER } from './application/ports/library-usage-provider.port';
import { SongAdminService } from './application/song-admin.service';
import { NoUsageProvider } from './infrastructure/no-usage-provider';
import { AdminBooksController } from './interface/controllers/admin-books.controller';
import { AdminImportsController } from './interface/controllers/admin-imports.controller';
import { AdminSeriesController } from './interface/controllers/admin-series.controller';
import { AdminSongsController } from './interface/controllers/admin-songs.controller';
import { AdminThemesController } from './interface/controllers/admin-themes.controller';

@Module({
  imports: [SuperadminModule, LibraryModule],
  controllers: [
    AdminSeriesController,
    AdminBooksController,
    AdminSongsController,
    AdminThemesController,
    AdminImportsController,
  ],
  providers: [
    ArchiveWithUsageCheck,
    SongAdminService,
    NoUsageProvider,
    { provide: LIBRARY_USAGE_PROVIDER, useClass: NoUsageProvider },
  ],
  exports: [LIBRARY_USAGE_PROVIDER],
})
export class LibraryAdminModule {}
