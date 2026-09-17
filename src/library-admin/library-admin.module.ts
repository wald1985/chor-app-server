import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity/identity.module';
import { LibraryModule } from '../library';
import { SuperAdminGuard } from './interface/guards/super-admin.guard';

@Module({
  imports: [IdentityModule, LibraryModule],
  providers: [SuperAdminGuard],
  exports: [SuperAdminGuard],
})
export class LibraryAdminModule {}
