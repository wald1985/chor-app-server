import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { IdentityModule } from './identity/identity.module';
import { LibraryModule } from './library';
import { LibraryAdminModule } from './library-admin';
import { NotificationsModule } from './notifications';
import { PrismaModule } from './shared/prisma/prisma.module';
import { SuperadminModule } from './superadmin';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    IdentityModule,
    NotificationsModule,
    SuperadminModule,
    LibraryModule,
    LibraryAdminModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
