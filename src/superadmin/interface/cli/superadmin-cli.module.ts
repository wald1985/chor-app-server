import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../../../shared/prisma/prisma.module';
import { SuperadminModule } from '../../superadmin.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    SuperadminModule,
  ],
})
export class SuperadminCliModule {}
