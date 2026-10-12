import { Inject, Injectable } from '@nestjs/common';
import { Person } from '../../domain/entities/person.entity';
import { PERSON_REPOSITORY } from '../../domain/ports/person-repository.port';
import type { PersonRepository } from '../../domain/ports/person-repository.port';
import { PersonRole } from '../../domain/value-objects/person-role';

export interface ListPeopleQuery {
  communityId: string;
  role?: PersonRole;
  includeArchived?: boolean;
}

@Injectable()
export class ListPeopleUseCase {
  constructor(
    @Inject(PERSON_REPOSITORY)
    private readonly personRepo: PersonRepository,
  ) {}

  execute(query: ListPeopleQuery): Promise<Person[]> {
    return this.personRepo.list(query.communityId, {
      role: query.role,
      includeArchived: query.includeArchived,
    });
  }
}
