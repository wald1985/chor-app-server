import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity/identity.module';
import { PeopleModule } from '../people';
import { RepertoireModule } from '../repertoire';
import { PrismaModule } from '../shared/prisma/prisma.module';
import { PerformanceViewBuilder } from './application/services/performance-view-builder';
import { ReferenceValidator } from './application/services/reference-validator';
import { DeletePerformanceUseCase } from './application/use-cases/delete-performance.use-case';
import { GetPerformanceUseCase } from './application/use-cases/get-performance.use-case';
import { ListPerformancesUseCase } from './application/use-cases/list-performances.use-case';
import { RecordPerformanceUseCase } from './application/use-cases/record-performance.use-case';
import { PERFORMANCE_REPOSITORY } from './domain/ports/performance-repository.port';
import { PERSON_RESOLVER } from './domain/ports/person-resolver.port';
import { SONG_RESOLVER } from './domain/ports/song-resolver.port';
import { PeoplePersonResolver } from './infrastructure/adapters/people-person-resolver';
import { RepertoireSongResolver } from './infrastructure/adapters/repertoire-song-resolver';
import { PrismaPerformanceRepository } from './infrastructure/prisma/prisma-performance.repository';
import { PerformancesController } from './interface/controllers/performances.controller';

@Module({
  imports: [PrismaModule, IdentityModule, RepertoireModule, PeopleModule],
  controllers: [PerformancesController],
  providers: [
    RecordPerformanceUseCase,
    ListPerformancesUseCase,
    GetPerformanceUseCase,
    DeletePerformanceUseCase,
    ReferenceValidator,
    PerformanceViewBuilder,
    { provide: PERFORMANCE_REPOSITORY, useClass: PrismaPerformanceRepository },
    { provide: SONG_RESOLVER, useClass: RepertoireSongResolver },
    { provide: PERSON_RESOLVER, useClass: PeoplePersonResolver },
  ],
})
export class PerformanceLogModule {}
