import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity/identity.module';
import { PrismaModule } from '../shared/prisma/prisma.module';
import { ArchivePersonUseCase } from './application/use-cases/archive-person.use-case';
import { CreatePersonUseCase } from './application/use-cases/create-person.use-case';
import { GetPersonUseCase } from './application/use-cases/get-person.use-case';
import { ListPeopleUseCase } from './application/use-cases/list-people.use-case';
import { RestorePersonUseCase } from './application/use-cases/restore-person.use-case';
import { UpdatePersonUseCase } from './application/use-cases/update-person.use-case';
import {
  DefaultPersonLookup,
  PERSON_LOOKUP,
} from './application/queries/person-lookup.query';
import { PERSON_REPOSITORY } from './domain/ports/person-repository.port';
import { PrismaPersonRepository } from './infrastructure/prisma/prisma-person.repository';
import { PeopleController } from './interface/controllers/people.controller';

@Module({
  imports: [PrismaModule, IdentityModule],
  controllers: [PeopleController],
  providers: [
    CreatePersonUseCase,
    UpdatePersonUseCase,
    ArchivePersonUseCase,
    RestorePersonUseCase,
    GetPersonUseCase,
    ListPeopleUseCase,
    { provide: PERSON_REPOSITORY, useClass: PrismaPersonRepository },
    { provide: PERSON_LOOKUP, useClass: DefaultPersonLookup },
  ],
  exports: [PERSON_LOOKUP],
})
export class PeopleModule {}
