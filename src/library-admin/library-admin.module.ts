import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity/identity.module';
import { LibraryModule } from '../library';
import { ArchiveWithUsageCheck } from './application/archive-with-usage-check';
import { LIBRARY_USAGE_PROVIDER } from './application/ports/library-usage-provider.port';
import { SongAdminService } from './application/song-admin.service';
import { NoUsageProvider } from './infrastructure/no-usage-provider';
import { AdminBooksController } from './interface/controllers/admin-books.controller';
import { AdminImportsController } from './interface/controllers/admin-imports.controller';
import { AdminSeriesController } from './interface/controllers/admin-series.controller';
import { AdminSongsController } from './interface/controllers/admin-songs.controller';
import { AdminThemesController } from './interface/controllers/admin-themes.controller';
import { SuperAdminGuard } from './interface/guards/super-admin.guard';

@Module({
  imports: [IdentityModule, LibraryModule],
  controllers: [
    AdminSeriesController,
    AdminBooksController,
    AdminSongsController,
    AdminThemesController,
    AdminImportsController,
  ],
  providers: [
    SuperAdminGuard,
    ArchiveWithUsageCheck,
    SongAdminService,
    NoUsageProvider,
    { provide: LIBRARY_USAGE_PROVIDER, useClass: NoUsageProvider },
  ],
  exports: [SuperAdminGuard, LIBRARY_USAGE_PROVIDER],
})
export class LibraryAdminModule {}
