import { Inject, Injectable } from '@nestjs/common';
import { PERSON_REPOSITORY } from '../../domain/ports/person-repository.port';
import type { PersonRepository } from '../../domain/ports/person-repository.port';
import { PersonRole } from '../../domain/value-objects/person-role';

export const PERSON_LOOKUP = Symbol('PERSON_LOOKUP');

export interface PersonSummary {
  id: string;
  name: string;
  roles: PersonRole[];
  archived: boolean;
}

/**
 * Read port for other bounded contexts that store a `personId`. Returns
 * archived People too; the caller decides whether to accept them.
 */
export interface PersonLookup {
  findMany(communityId: string, ids: string[]): Promise<PersonSummary[]>;
}

@Injectable()
export class DefaultPersonLookup implements PersonLookup {
  constructor(
    @Inject(PERSON_REPOSITORY)
    private readonly personRepo: PersonRepository,
  ) {}

  async findMany(communityId: string, ids: string[]): Promise<PersonSummary[]> {
    const unique = Array.from(new Set(ids));
    const people = await this.personRepo.findByIds(communityId, unique);
    return people.map((person) => ({
      id: person.id,
      name: person.nameValue,
      roles: [...person.roles],
      archived: person.isArchived,
    }));
  }
}
