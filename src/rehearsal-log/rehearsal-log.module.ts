import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity/identity.module';
import { PeopleModule } from '../people';
import { RepertoireModule } from '../repertoire';
import { PrismaModule } from '../shared/prisma/prisma.module';
import { ReferenceValidator } from './application/services/reference-validator';
import { RehearsalViewBuilder } from './application/services/rehearsal-view-builder';
import { AddRehearsalEntryUseCase } from './application/use-cases/add-rehearsal-entry.use-case';
import { CreateRehearsalUseCase } from './application/use-cases/create-rehearsal.use-case';
import { DeleteRehearsalUseCase } from './application/use-cases/delete-rehearsal.use-case';
import { GetRehearsalUseCase } from './application/use-cases/get-rehearsal.use-case';
import { ListRehearsalsUseCase } from './application/use-cases/list-rehearsals.use-case';
import { RemoveRehearsalEntryUseCase } from './application/use-cases/remove-rehearsal-entry.use-case';
import { UpdateRehearsalUseCase } from './application/use-cases/update-rehearsal.use-case';
import { PERSON_RESOLVER } from './domain/ports/person-resolver.port';
import { REHEARSAL_REPOSITORY } from './domain/ports/rehearsal-repository.port';
import { SONG_RESOLVER } from './domain/ports/song-resolver.port';
import { PeoplePersonResolver } from './infrastructure/adapters/people-person-resolver';
import { RepertoireSongResolver } from './infrastructure/adapters/repertoire-song-resolver';
import { PrismaRehearsalRepository } from './infrastructure/prisma/prisma-rehearsal.repository';
import { RehearsalsController } from './interface/controllers/rehearsals.controller';

@Module({
  imports: [PrismaModule, IdentityModule, RepertoireModule, PeopleModule],
  controllers: [RehearsalsController],
  providers: [
    CreateRehearsalUseCase,
    UpdateRehearsalUseCase,
    DeleteRehearsalUseCase,
    AddRehearsalEntryUseCase,
    RemoveRehearsalEntryUseCase,
    ListRehearsalsUseCase,
    GetRehearsalUseCase,
    ReferenceValidator,
    RehearsalViewBuilder,
    { provide: REHEARSAL_REPOSITORY, useClass: PrismaRehearsalRepository },
    { provide: SONG_RESOLVER, useClass: RepertoireSongResolver },
    { provide: PERSON_RESOLVER, useClass: PeoplePersonResolver },
  ],
})
export class RehearsalLogModule {}
